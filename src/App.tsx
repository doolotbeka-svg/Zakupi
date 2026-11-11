/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { CurrencySymbol, Language, SpecificationItem, TenderParams } from './types';
import { DEFAULT_SPECIFICATION_ITEMS, INITIAL_TENDER_PARAMS, TenderTemplate } from './data/defaultTemplates';
import { calculateTender, TAX_REGIMES } from './utils/taxCalculator';
import { translations } from './i18n/translations';
import { Header } from './components/Header';
import { TenderParamsBlock } from './components/TenderParamsBlock';
import { BiddingSimulator } from './components/BiddingSimulator';
import { SpecificationTable } from './components/SpecificationTable';
import { FinancialLedger } from './components/FinancialLedger';
import { TemplatesModal } from './components/TemplatesModal';
import { PrintModal } from './components/PrintModal';

const STORAGE_KEY_PARAMS = 'kg_tender_calc_params_v1';
const STORAGE_KEY_ITEMS = 'kg_tender_calc_items_v1';
const STORAGE_KEY_DISCOUNT = 'kg_tender_calc_discount_v1';
const STORAGE_KEY_LANG = 'kg_tender_calc_lang_v1';
const STORAGE_KEY_CURRENCY = 'kg_tender_calc_currency_v1';

const MAX_DISCOUNT = 40;

const toNonNegative = (value: unknown, fallback: number): number => {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(num) && num >= 0 ? num : fallback;
};

/** Validates specification rows restored from localStorage. */
function sanitizeItems(raw: unknown): SpecificationItem[] | null {
  if (!Array.isArray(raw)) return null;
  return raw
    .filter((it): it is Record<string, unknown> => typeof it === 'object' && it !== null)
    .map((it, idx) => {
      const quantity = toNonNegative(it.quantity, 0);
      const unitPrice = toNonNegative(it.unitPrice, 0);
      return {
        id: typeof it.id === 'string' && it.id ? it.id : `item-restored-${idx}`,
        name: typeof it.name === 'string' ? it.name : '',
        unit: typeof it.unit === 'string' ? it.unit : '',
        quantity,
        unitPrice,
        total: quantity * unitPrice
      };
    });
}

/** Validates tender parameters restored from localStorage. */
function sanitizeParams(raw: unknown): TenderParams {
  if (typeof raw !== 'object' || raw === null) return INITIAL_TENDER_PARAMS;
  const p = raw as Record<string, unknown>;
  const d = INITIAL_TENDER_PARAMS;
  return {
    plannedPrice: toNonNegative(p.plannedPrice, d.plannedPrice),
    taxRegime: typeof p.taxRegime === 'string' && p.taxRegime in TAX_REGIMES
      ? (p.taxRegime as TenderParams['taxRegime'])
      : d.taxRegime,
    customTaxRate: Math.min(100, toNonNegative(p.customTaxRate, d.customTaxRate)),
    customTaxBase: p.customTaxBase === 'profit' ? 'profit' : 'revenue',
    inputVatIncluded: typeof p.inputVatIncluded === 'boolean' ? p.inputVatIncluded : d.inputVatIncluded,
    logisticsCost: toNonNegative(p.logisticsCost, d.logisticsCost),
    guaranteeType: p.guaranteeType === 'fixed' ? 'fixed' : 'percent',
    guaranteeValue: toNonNegative(p.guaranteeValue, d.guaranteeValue),
    otherExpenses: toNonNegative(p.otherExpenses, d.otherExpenses),
    directGoodsCost: toNonNegative(p.directGoodsCost, d.directGoodsCost),
    syncWithSpec: typeof p.syncWithSpec === 'boolean' ? p.syncWithSpec : d.syncWithSpec
  };
}

export default function App() {
  // Main language state: DEFAULT IS KYRGYZ ('ky') as strictly required
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LANG);
      if (saved === 'ru' || saved === 'ky') return saved;
    } catch {
      // ignore
    }
    return 'ky';
  });

  const [currency, setCurrency] = useState<CurrencySymbol>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENCY);
      if (saved === 'KGS' || saved === 'RUB') return saved;
    } catch {
      // ignore
    }
    return 'KGS';
  });

  // Specification items
  const [items, setItems] = useState<SpecificationItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (saved) {
        const restored = sanitizeItems(JSON.parse(saved));
        if (restored) return restored;
      }
    } catch {
      // ignore
    }
    return DEFAULT_SPECIFICATION_ITEMS;
  });

  // Calculate sum of specification items
  const specTotalCost = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  }, [items]);

  // Tender parameters
  const [params, setParams] = useState<TenderParams>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PARAMS);
      if (saved) {
        return sanitizeParams(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    return INITIAL_TENDER_PARAMS;
  });

  // Bidding discount percentage (0% to 40% with 0.5% step)
  const [discount, setDiscount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DISCOUNT);
      if (saved) {
        const num = parseFloat(saved);
        if (!isNaN(num) && num >= 0 && num <= MAX_DISCOUNT) return num;
      }
    } catch {
      // ignore
    }
    return 5.0; // 5% default realistic drop
  });

  // Modals
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Sync specification total with directGoodsCost if syncWithSpec is true
  useEffect(() => {
    if (params.syncWithSpec && params.directGoodsCost !== specTotalCost) {
      setParams(prev => ({
        ...prev,
        directGoodsCost: specTotalCost
      }));
    }
  }, [params.syncWithSpec, specTotalCost, params.directGoodsCost]);

  // Local storage auto-sync
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PARAMS, JSON.stringify(params));
    } catch {
      // ignore
    }
  }, [params]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DISCOUNT, discount.toString());
    } catch {
      // ignore
    }
  }, [discount]);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY_LANG, lang);
    } catch {
      // ignore
    }
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CURRENCY, currency);
    } catch {
      // ignore
    }
  }, [currency]);

  // Close modals with the Escape key
  useEffect(() => {
    if (!isTemplatesOpen && !isPrintOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsTemplatesOpen(false);
        setIsPrintOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isTemplatesOpen, isPrintOpen]);

  // Main calculation result
  const calculationResult = useMemo(() => {
    return calculateTender(params, discount);
  }, [params, discount]);

  const handleParamsChange = (updates: Partial<TenderParams>) => {
    setParams(prev => ({ ...prev, ...updates }));
  };

  const handleApplySpecToCost = () => {
    setParams(prev => ({
      ...prev,
      syncWithSpec: true,
      directGoodsCost: specTotalCost
    }));
  };

  const handleSelectTemplate = (tmpl: TenderTemplate) => {
    setParams(tmpl.params);
    setItems(tmpl.items);
    setDiscount(Math.max(0, Math.min(MAX_DISCOUNT, tmpl.defaultDiscount)));
  };

  const handleReset = () => {
    if (window.confirm(lang === 'ky' ? 'Баштапкы маанилерге кайтаргыңыз келеби?' : 'Сбросить все параметры на стандартные?')) {
      setParams(INITIAL_TENDER_PARAMS);
      setItems(DEFAULT_SPECIFICATION_ITEMS);
      setDiscount(5.0);
    }
  };

  const t = translations[lang];

  return (
    <div className="min-h-screen print:min-h-0 print:bg-white bg-slate-100/70 text-slate-900 flex flex-col selection:bg-slate-300">
      {/* While the print preview is open only the report itself must be printed */}
      <div className={isPrintOpen ? 'no-print contents' : 'contents'}>
      {/* 3-Zone Top Navigation Contract */}
      <Header
        lang={lang}
        onLanguageChange={setLang}
        currency={currency}
        onCurrencyChange={setCurrency}
        onReset={handleReset}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onPrint={() => setIsPrintOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Block 1: Tender Parameters (Top) */}
        <TenderParamsBlock
          params={params}
          onChange={handleParamsChange}
          lang={lang}
          currency={currency}
          specTotalCost={specTotalCost}
        />

        {/* Block 2: Bidding Simulator (Center) */}
        <BiddingSimulator
          params={params}
          result={calculationResult}
          discount={discount}
          onDiscountChange={setDiscount}
          lang={lang}
          currency={currency}
        />

        {/* Financial Ledger Breakdown */}
        <FinancialLedger
          params={params}
          result={calculationResult}
          lang={lang}
          currency={currency}
        />

        {/* Block 3: Specification / Product Table (Bottom) */}
        <SpecificationTable
          items={items}
          onItemsChange={setItems}
          lang={lang}
          currency={currency}
          params={params}
          result={calculationResult}
          onApplyToCost={handleApplySpecToCost}
        />
      </main>
      </div>

      {/* Strict Financial Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-6 mt-12 no-print text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-tight">{t.appTitle}</span>
            <span aria-hidden="true">·</span>
            <span>{lang === 'ky' ? 'Кыргыз Республикасынын Салык кодекси' : 'Налоговый кодекс Кыргызской Республики'}</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <a
              href="https://zakupki.okmot.kg"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors underline"
            >
              zakupki.okmot.kg ({lang === 'ky' ? 'Мамлекеттик сатып алуулар' : 'Государственные закупки'})
            </a>
            <span aria-hidden="true">·</span>
            <span>Валюта: KGS / RUB</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={handleSelectTemplate}
        lang={lang}
        currency={currency}
      />

      <PrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        params={params}
        result={calculationResult}
        items={items}
        discount={discount}
        lang={lang}
        currency={currency}
      />
    </div>
  );
}
