import React from 'react';
import { CurrencySymbol, Language } from '../types';
import { translations } from '../i18n/translations';
import { RotateCcw, Printer, BookmarkCheck, Save, Share2 } from 'lucide-react';

interface HeaderProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  currency: CurrencySymbol;
  onCurrencyChange: (c: CurrencySymbol) => void;
  onReset: () => void;
  onOpenTemplates: () => void;
  onOpenSaved: () => void;
  savedCount: number;
  onPrint: () => void;
  onShare: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onLanguageChange,
  currency,
  onCurrencyChange,
  onReset,
  onOpenTemplates,
  onOpenSaved,
  savedCount,
  onPrint,
  onShare
}) => {
  const t = translations[lang];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-3 max-[359px]:px-2 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-1.5 max-[359px]:gap-1 sm:gap-4">
        {/* Zone 1: Brand & Wordmark */}
        <div className="flex items-center gap-3 min-w-0 max-[359px]:hidden">
          <div className="w-9 h-9 shrink-0 rounded-md bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm ring-1 ring-emerald-400/30">
            <span className="text-sm font-mono tracking-tighter">KG</span>
          </div>
          <div className="hidden md:flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-sm md:text-base xl:text-lg font-bold tracking-tight text-white truncate"
                title={t.appTitle}
              >
                {lang === 'ky' ? 'Тендер калькулятору' : 'Калькулятор тендеров'}
              </span>
              <span className="hidden lg:inline text-xs font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-700/50 px-2 py-0.5 rounded">
                zakupki.okmot.kg
              </span>
            </div>
            <span className="text-xs text-slate-400 hidden xl:inline truncate max-w-md">
              {t.appSubtitle}
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation & Quick Utilities */}
        <div className="flex items-center gap-0.5 max-[359px]:gap-0 md:gap-2 text-xs font-medium text-slate-300">
          <button
            type="button"
            onClick={onOpenTemplates}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-slate-800 hover:text-white transition-colors cursor-pointer border border-transparent hover:border-slate-700 whitespace-nowrap max-xl:px-2 max-sm:px-1.5 max-[359px]:px-1"
            title={t.loadTemplates}
            aria-label={t.loadTemplates}
          >
            <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xl:inline">{t.loadTemplates}</span>
          </button>

          <button
            type="button"
            onClick={onOpenSaved}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-slate-800 hover:text-white transition-colors cursor-pointer border border-transparent hover:border-slate-700 whitespace-nowrap max-xl:px-2 max-sm:px-1.5 max-[359px]:px-1"
            title={t.savedScenariosTitle}
            aria-label={t.savedScenariosTitle}
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xl:inline">{lang === 'ky' ? 'Сакталгандар' : 'Сохранённые'}</span>
            {savedCount > 0 && (
              <span className="max-[419px]:hidden font-mono text-[10px] leading-none px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                {savedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-slate-800 hover:text-white transition-colors cursor-pointer border border-transparent hover:border-slate-700 whitespace-nowrap max-xl:px-2 max-sm:px-1.5 max-[359px]:px-1"
            title={t.printReport}
            aria-label={t.printReport}
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden xl:inline">{lang === 'ky' ? 'Басып чыгаруу' : 'Печать'}</span>
          </button>

          <button
            type="button"
            onClick={onShare}
            className="flex items-center px-2 py-1.5 rounded-md hover:bg-slate-800 hover:text-white transition-colors cursor-pointer border border-transparent hover:border-slate-700 max-sm:px-1.5 max-[359px]:px-1"
            title={lang === 'ky' ? 'Эсептөөгө шилтеме көчүрүү' : 'Скопировать ссылку на расчёт'}
            aria-label={lang === 'ky' ? 'Эсептөөгө шилтеме көчүрүү' : 'Скопировать ссылку на расчёт'}
          >
            <Share2 className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer border border-transparent hover:border-slate-700 whitespace-nowrap max-xl:px-2 max-sm:px-1.5 max-[359px]:px-1"
            title={t.resetData}
            aria-label={t.resetData}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zone 3: Language & Currency controls (Right-aligned) */}
        <div className="flex items-center gap-1.5 max-[359px]:gap-1 sm:gap-3 shrink-0">
          {/* Currency format toggle: KGS and RUB */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-md border border-slate-700/70 text-xs font-mono">
            <button
              type="button"
              onClick={() => onCurrencyChange('KGS')}
              className={`px-2 max-[359px]:px-1.5 py-1 rounded transition-colors cursor-pointer ${
                currency === 'KGS'
                  ? 'bg-slate-700 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              KGS
            </button>
            <button
              type="button"
              onClick={() => onCurrencyChange('RUB')}
              className={`px-2 max-[359px]:px-1.5 py-1 rounded transition-colors cursor-pointer ${
                currency === 'RUB'
                  ? 'bg-slate-700 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              RUB
            </button>
          </div>

          {/* Bilingual Switcher: КЫР / РУС (Default Kyrgyz) */}
          <div className="flex items-center bg-emerald-950/80 p-0.5 rounded-md border border-emerald-600/40 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onLanguageChange('ky')}
              className={`px-2.5 max-sm:px-2 max-[359px]:px-1.5 py-1 rounded transition-all cursor-pointer ${
                lang === 'ky'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'text-emerald-300 hover:text-white'
              }`}
              aria-label="Кыргызча"
            >
              КЫР
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('ru')}
              className={`px-2.5 max-sm:px-2 max-[359px]:px-1.5 py-1 rounded transition-all cursor-pointer ${
                lang === 'ru'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'text-emerald-300 hover:text-white'
              }`}
              aria-label="Русский"
            >
              РУС
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
