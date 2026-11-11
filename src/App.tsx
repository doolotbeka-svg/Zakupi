/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { CurrencySymbol, Language, SavedTender, SpecificationItem, TenderParams } from './types';
import { DEFAULT_SPECIFICATION_ITEMS, INITIAL_TENDER_PARAMS, TenderTemplate } from './data/defaultTemplates';
import { calculateTender } from './utils/taxCalculator';
import {
  DEFAULT_DISCOUNT,
  MAX_DISCOUNT,
  removeSavedTender,
  sanitizeDiscount,
  sanitizeItems,
  sanitizeParams,
  sanitizeSavedTenders,
  upsertSavedTender
} from './utils/storage';
import { translations } from './i18n/translations';
import { Header } from './components/Header';
import { TenderParamsBlock } from './components/TenderParamsBlock';
import { BiddingSimulator } from './components/BiddingSimulator';
import { SpecificationTable } from './components/SpecificationTable';
import { FinancialLedger } from './components/FinancialLedger';
import { TemplatesModal } from './components/TemplatesModal';
import { PrintModal } from './components/PrintModal';
import { SavedTendersModal } from './components/SavedTendersModal';

const STORAGE_KEY_PARAMS = 'kg_tender_calc_params_v1';
const STORAGE_KEY_ITEMS = 'kg_tender_calc_items_v1';
const STORAGE_KEY_DISCOUNT = 'kg_tender_calc_discount_v1';
const STORAGE_KEY_LANG = 'kg_tender_calc_lang_v1';
const STORAGE_KEY_CURRENCY = 'kg_tender_calc_currency_v1';
const STORAGE_KEY_SAVED = 'kg_tender_calc_saved_v1';
const STORAGE_KEY_TITLE = 'kg_tender_calc_title_v1';

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
      if (saved) return sanitizeDiscount(saved);
    } catch {
      // ignore
    }
    return DEFAULT_DISCOUNT; // 5% default realistic drop
  });

  // Saved calculations (several tenders kept side by side)
  const [savedTenders, setSavedTenders] = useState<SavedTender[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAVED);
      if (saved) return sanitizeSavedTenders(JSON.parse(saved));
    } catch {
      // ignore
    }
    return [];
  });
  const [savedStorageFailed, setSavedStorageFailed] = useState(false);

  // Title of the saved calculation the current state was loaded from / saved as
  const [currentTitle, setCurrentTitle] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_TITLE) ?? '';
    } catch {
      return '';
    }
  });

  // Modals
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isSavedOpen, setIsSavedOpen] = useState(false);

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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(savedTenders));
      setSavedStorageFailed(false);
    } catch {
      // Storage is full or unavailable: the list lives only until the page is closed
      setSavedStorageFailed(true);
    }
  }, [savedTenders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TITLE, currentTitle);
    } catch {
      // ignore
    }
  }, [currentTitle]);

  // Close modals with the Escape key
  useEffect(() => {
    if (!isTemplatesOpen && !isPrintOpen && !isSavedOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsTemplatesOpen(false);
        setIsPrintOpen(false);
        setIsSavedOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isTemplatesOpen, isPrintOpen, isSavedOpen]);

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
    setCurrentTitle('');
  };

  const handleSaveTender = (title: string) => {
    setSavedTenders(prev => upsertSavedTender(prev, { title, params, items, discount }));
    setCurrentTitle(title);
  };

  const handleLoadTender = (tender: SavedTender) => {
    setParams(tender.params);
    setItems(tender.items);
    setDiscount(tender.discount);
    setCurrentTitle(tender.title);
    setIsSavedOpen(false);
  };

  const handleDeleteTender = (id: string) => {
    setSavedTenders(prev => removeSavedTender(prev, id));
  };

  const handleReset = () => {
    if (window.confirm(lang === 'ky' ? 'Баштапкы маанилерге кайтаргыңыз келеби?' : 'Сбросить все параметры на стандартные?')) {
      setParams(INITIAL_TENDER_PARAMS);
      setItems(DEFAULT_SPECIFICATION_ITEMS);
      setDiscount(DEFAULT_DISCOUNT);
      setCurrentTitle('');
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
        onOpenSaved={() => setIsSavedOpen(true)}
        savedCount={savedTenders.length}
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

      <SavedTendersModal
        isOpen={isSavedOpen}
        onClose={() => setIsSavedOpen(false)}
        savedTenders={savedTenders}
        currentTitle={currentTitle}
        storageFailed={savedStorageFailed}
        onSave={handleSaveTender}
        onLoad={handleLoadTender}
        onDelete={handleDeleteTender}
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
