/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { DEFAULT_KGS_PER_RUB, sanitizeRate, setKgsPerRub } from './utils/currency';
import { LONG_LINK_LENGTH, SharedTender, buildShareUrl, readSharedTenderFromHash } from './utils/share';
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
const STORAGE_KEY_RATE = 'kg_tender_calc_rub_rate_v1';

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

  // Display rate for RUB: how many soms one ruble costs (entered manually)
  const [rubRate, setRubRate] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RATE);
      if (saved) return sanitizeRate(saved);
    } catch {
      // ignore
    }
    return DEFAULT_KGS_PER_RUB;
  });
  const [rubRateText, setRubRateText] = useState(() => String(rubRate));
  // Every amount formatted during this render uses the current rate
  setKgsPerRub(rubRate);

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

  // Bidding discount percentage (slider 0–40% in 0.5% steps, exact field up to 99.99%)
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

  // Short status message at the bottom of the screen
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | undefined>(undefined);
  const showToast = (message: string) => {
    window.clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
  };
  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

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
      localStorage.setItem(STORAGE_KEY_RATE, String(rubRate));
    } catch {
      // ignore
    }
  }, [rubRate]);

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

  const applySharedTender = (shared: SharedTender) => {
    setParams(shared.params);
    setItems(shared.items);
    setDiscount(shared.discount);
    setCurrentTitle(shared.title);
  };

  // Open a calculation passed in the link (#s=...). The visitor's own calculation
  // is only replaced after confirmation; the hash is removed either way.
  const sharedLinkHandled = useRef(false);
  useEffect(() => {
    if (sharedLinkHandled.current) return;
    sharedLinkHandled.current = true;

    const hash = window.location.hash;
    if (!hash.startsWith('#s=')) return;
    const shared = readSharedTenderFromHash(hash);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    const ky = lang === 'ky';
    if (!shared) {
      showToast(ky ? 'Шилтемедеги эсептөөнү окуу мүмкүн болгон жок' : 'Не удалось прочитать расчёт из ссылки');
      return;
    }
    const name = shared.title ? ` «${shared.title}»` : '';
    if (
      window.confirm(
        ky
          ? `Шилтемедеги эсептөө${name} ачылсынбы? Учурдагы эсептөө алмаштырылат.`
          : `Открыть расчёт${name} из ссылки? Текущий расчёт будет заменён.`
      )
    ) {
      applySharedTender(shared);
      showToast(ky ? 'Шилтемедеги эсептөө ачылды' : 'Расчёт из ссылки открыт');
    }
    // Runs once on start
  }, []);

  const handleShare = async () => {
    const ky = lang === 'ky';
    const url = buildShareUrl(
      { title: currentTitle, params, items, discount },
      window.location.origin + window.location.pathname
    );
    const lengthNote =
      url.length > LONG_LINK_LENGTH
        ? ky
          ? ' Шилтеме узун — айрым мессенджерлер аны кесип салышы мүмкүн.'
          : ' Ссылка длинная — некоторые мессенджеры могут её обрезать.'
        : '';
    try {
      await navigator.clipboard.writeText(url);
      showToast((ky ? 'Шилтеме көчүрүлдү.' : 'Ссылка на расчёт скопирована.') + lengthNote);
    } catch {
      // Clipboard is unavailable (old browser or no permission): let the user copy it manually
      window.prompt(ky ? 'Шилтемени көчүрүңүз:' : 'Скопируйте ссылку:', url);
    }
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
        onShare={handleShare}
      />

      {/* RUB is a display currency: show the rate it is converted with */}
      {currency === 'RUB' && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-950 text-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <label htmlFor="rubRate" className="font-semibold">
              {lang === 'ky' ? 'Рублдин курсу' : 'Курс рубля'}: 1 RUB =
            </label>
            <div className="flex items-center rounded border border-amber-300 bg-white focus-within:border-amber-600">
              <input
                id="rubRate"
                type="text"
                inputMode="decimal"
                value={rubRateText}
                onChange={(e) => {
                  setRubRateText(e.target.value);
                  const value = parseFloat(e.target.value.replace(',', '.'));
                  if (Number.isFinite(value) && value > 0) setRubRate(sanitizeRate(value));
                }}
                onBlur={() => setRubRateText(String(rubRate))}
                className="w-16 bg-transparent text-right font-mono font-semibold py-1 pl-2 focus:outline-none tabular-nums"
              />
              <span className="pr-2 pl-1 font-mono text-amber-800">KGS</span>
            </div>
            <span className="text-amber-900/80">
              {lang === 'ky'
                ? 'Суммалар ушул курс боюнча рубль менен көрсөтүлөт. Киргизүү талаалары сом менен калат.'
                : 'Суммы показаны в рублях по этому курсу. Поля ввода остаются в сомах.'}
            </span>
          </div>
        </div>
      )}

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
            <span>{lang === 'ky' ? 'Эсеп сом менен жүргүзүлөт' : 'Расчёт ведётся в сомах'}</span>
          </div>
        </div>
      </footer>

      {toast && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] max-w-[calc(100vw-2rem)] px-4 py-2.5 rounded-md bg-slate-900 text-white text-xs font-medium shadow-lg no-print"
        >
          {toast}
        </div>
      )}

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
