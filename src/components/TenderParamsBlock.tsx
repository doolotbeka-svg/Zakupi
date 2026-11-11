import React, { useState } from 'react';
import { CurrencySymbol, Language, TaxRegimeId, TenderParams } from '../types';
import { translations } from '../i18n/translations';
import { TAX_REGIMES, calculateGuaranteeCost, formatCurrency } from '../utils/taxCalculator';
import { 
  Building2, 
  Info, 
  Percent, 
  Truck, 
  ShieldAlert, 
  Layers, 
  HelpCircle, 
  CheckCircle2, 
  Sliders, 
  Receipt,
  FileCheck2
} from 'lucide-react';

interface TenderParamsBlockProps {
  params: TenderParams;
  onChange: (updated: Partial<TenderParams>) => void;
  lang: Language;
  currency: CurrencySymbol;
  specTotalCost: number;
}

export const TenderParamsBlock: React.FC<TenderParamsBlockProps> = ({
  params,
  onChange,
  lang,
  currency,
  specTotalCost
}) => {
  const t = translations[lang];
  const L = (ky: string, ru: string) => (lang === 'ky' ? ky : ru);
  const [showTaxDetails, setShowTaxDetails] = useState(false);

  const selectedRegime = TAX_REGIMES[params.taxRegime] || TAX_REGIMES.unified_05;
  const isCustomRegime = params.taxRegime === 'custom';
  const isGeneralRegime = params.taxRegime === 'general';

  // Calculate estimated incoming VAT for display if general regime and goods cost > 0
  const estimatedInputVat = params.directGoodsCost * (12 / 112);

  return (
    <section className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      {/* Section Header */}
      <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
            1
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              {t.section1Title}
            </h2>
            <p className="text-xs text-slate-500">
              {t.section1Subtitle}
            </p>
          </div>
        </div>

        {/* Sync with Spec Badge / Indicator */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const newSync = !params.syncWithSpec;
              onChange({
                syncWithSpec: newSync,
                directGoodsCost: newSync ? specTotalCost : params.directGoodsCost
              });
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors border ${
              params.syncWithSpec
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
            title={t.syncSwitchTooltip}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${params.syncWithSpec ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>{params.syncWithSpec ? t.syncWithSpecActive : t.syncWithSpecDisabled}</span>
          </button>
        </div>
      </div>

      {/* Inputs Grid */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Field 1: Planned Procurement Sum */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="plannedPrice" className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>{t.plannedPriceLabel}</span>
            </label>
            <span className="text-xs font-mono text-slate-400">{currency}</span>
          </div>
          <div className="relative">
            <input
              id="plannedPrice"
              type="number"
              min="0"
              step="1000"
              value={params.plannedPrice || ''}
              onChange={(e) => onChange({ plannedPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
              className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-mono text-base font-semibold px-3.5 py-2.5 rounded border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none transition-all tabular-nums"
              placeholder="1 500 000"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
            <span className="truncate max-w-[240px]">{t.plannedPriceHelp}</span>
            <span className="font-mono font-medium text-slate-700 whitespace-nowrap">
              {formatCurrency(params.plannedPrice, currency)}
            </span>
          </div>
        </div>

        {/* Field 2: Tax Regime Dropdown (Enhanced with 7 presets + Custom manual option) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="taxRegime" className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <span>{t.taxRegimeLabel}</span>
            </label>
            <button
              type="button"
              onClick={() => setShowTaxDetails(!showTaxDetails)}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-0.5 cursor-pointer"
              title={L('Маалымат', 'Справка')}
            >
              <Info className="w-3.5 h-3.5" />
              <span className="text-[11px] underline">{L('КР Салык кодекси', 'Налоговый кодекс КР')}</span>
            </button>
          </div>
          
          <select
            id="taxRegime"
            value={params.taxRegime}
            onChange={(e) => onChange({ taxRegime: e.target.value as TaxRegimeId })}
            className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 text-sm font-medium px-3.5 py-2.5 rounded border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none transition-all cursor-pointer"
          >
            <option value="unified_00">
              1. {TAX_REGIMES.unified_00.name[lang]}
            </option>
            <option value="unified_05">
              2. {TAX_REGIMES.unified_05.name[lang]}
            </option>
            <option value="unified_10">
              3. {TAX_REGIMES.unified_10.name[lang]}
            </option>
            <option value="unified_20">
              4. {TAX_REGIMES.unified_20.name[lang]}
            </option>
            <option value="unified_40">
              5. {TAX_REGIMES.unified_40.name[lang]}
            </option>
            <option value="unified_60">
              6. {TAX_REGIMES.unified_60.name[lang]}
            </option>
            <option value="general">
              7. {TAX_REGIMES.general.name[lang]}
            </option>
            <option value="custom" className="font-bold text-emerald-800">
              ✎ {TAX_REGIMES.custom.name[lang]}
            </option>
          </select>

          <p className="text-xs text-slate-500 truncate" title={selectedRegime.description[lang]}>
            {selectedRegime.description[lang]}
          </p>
        </div>

        {/* Field 3: Goods COGS (Товарлардын өздүк наркы) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="directGoodsCost" className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>{t.directGoodsCostLabel}</span>
            </label>
            <span className="text-xs font-mono text-slate-400">{currency}</span>
          </div>
          <div className="relative">
            <input
              id="directGoodsCost"
              type="number"
              min="0"
              step="1000"
              disabled={params.syncWithSpec}
              value={params.syncWithSpec ? specTotalCost : params.directGoodsCost || ''}
              onChange={(e) => {
                if (!params.syncWithSpec) {
                  onChange({ directGoodsCost: Math.max(0, parseFloat(e.target.value) || 0) });
                }
              }}
              className={`w-full text-slate-900 font-mono text-base font-semibold px-3.5 py-2.5 rounded border transition-all tabular-nums ${
                params.syncWithSpec
                  ? 'bg-slate-100 text-slate-700 border-slate-300 cursor-not-allowed'
                  : 'bg-slate-50 hover:bg-white focus:bg-white border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none'
              }`}
              placeholder="1 000 000"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
            <span>
              {params.syncWithSpec ? L('Таблицадан (3-блок)', 'Из таблицы (блок 3)') : L('Кол менен киргизилген', 'Введено вручную')}
            </span>
            <span className="font-mono font-medium text-slate-700">
              {formatCurrency(params.syncWithSpec ? specTotalCost : params.directGoodsCost, currency)}
            </span>
          </div>
        </div>

        {/* Field 4: Logistics and Delivery (в сомах) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="logisticsCost" className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-slate-600" />
              <span>{t.logisticsLabel}</span>
            </label>
            <span className="text-xs font-mono text-slate-400">{currency}</span>
          </div>
          <input
            id="logisticsCost"
            type="number"
            min="0"
            step="500"
            value={params.logisticsCost || ''}
            onChange={(e) => onChange({ logisticsCost: Math.max(0, parseFloat(e.target.value) || 0) })}
            className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-mono text-base font-semibold px-3.5 py-2.5 rounded border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none transition-all tabular-nums"
            placeholder="25 000"
          />
          <p className="text-xs text-slate-500 truncate" title={t.logisticsHelp}>
            {t.logisticsHelp}
          </p>
        </div>

        {/* Field 5: Guarantee (Кепилдик камсыздоо / Банковская гарантия: % же сом) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="guaranteeValue" className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-600" />
              <span>{t.guaranteeLabel}</span>
            </label>

            {/* Toggle: % vs сом */}
            <div className="inline-flex rounded border border-slate-300 bg-slate-100 p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => onChange({ guaranteeType: 'percent' })}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  params.guaranteeType === 'percent'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title={t.guaranteeTypePercent}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => onChange({ guaranteeType: 'fixed' })}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  params.guaranteeType === 'fixed'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title={t.guaranteeTypeFixed}
              >
                {currency}
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              id="guaranteeValue"
              type="number"
              min="0"
              step={params.guaranteeType === 'percent' ? '0.5' : '1000'}
              value={params.guaranteeValue || ''}
              onChange={(e) => onChange({ guaranteeValue: Math.max(0, parseFloat(e.target.value) || 0) })}
              className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-mono text-base font-semibold px-3.5 py-2.5 rounded border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none transition-all tabular-nums"
              placeholder={params.guaranteeType === 'percent' ? '2.0' : '30 000'}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
            <span className="truncate max-w-[200px]" title={t.guaranteeHelp}>{t.guaranteeHelp}</span>
            <span className="font-mono font-medium text-slate-700 whitespace-nowrap">
              = {formatCurrency(
                calculateGuaranteeCost(params.plannedPrice, params.guaranteeType, params.guaranteeValue),
                currency
              )}
            </span>
          </div>
        </div>

        {/* Field 6: Other Expenses (Прочие расходы) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="otherExpenses" className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-slate-600" />
              <span>{t.otherExpensesLabel}</span>
            </label>
            <span className="text-xs font-mono text-slate-400">{currency}</span>
          </div>
          <input
            id="otherExpenses"
            type="number"
            min="0"
            step="500"
            value={params.otherExpenses || ''}
            onChange={(e) => onChange({ otherExpenses: Math.max(0, parseFloat(e.target.value) || 0) })}
            className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-mono text-base font-semibold px-3.5 py-2.5 rounded border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none transition-all tabular-nums"
            placeholder="15 000"
          />
          <p className="text-xs text-slate-500 truncate" title={t.otherExpensesHelp}>
            {t.otherExpensesHelp}
          </p>
        </div>
      </div>

      {/* Dynamic Sub-panel 1: Manual / Custom Tax Rate Settings («Өзүңүз киргизиңиз / Ввести ставку вручную») */}
      {isCustomRegime && (
        <div className="mx-5 mb-5 p-4 rounded-lg bg-emerald-50/70 border border-emerald-200 text-slate-900 transition-all">
          <div className="flex items-center gap-2 mb-3">
            <Sliders className="w-4 h-4 text-emerald-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
              {t.customTaxSettingsHeading}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Custom Rate Input */}
            <div className="space-y-1.5">
              <label htmlFor="customTaxRate" className="text-xs font-bold text-slate-800">
                {t.customTaxRateLabel}
              </label>
              <div className="relative">
                <input
                  id="customTaxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={params.customTaxRate ?? ''}
                  onChange={(e) => onChange({ customTaxRate: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })}
                  className="w-full bg-white text-slate-900 font-mono text-base font-semibold px-3.5 py-2 rounded border border-emerald-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none tabular-nums"
                  placeholder={t.customTaxRatePlaceholder}
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-mono font-bold text-slate-500">%</span>
              </div>
              <p className="text-[11px] text-slate-600">
                {L('Мисалы: 0.1%, 3%, 8% же башка атайын режимдеги ченем', 'Например: 0.1%, 3%, 8% или ставка иного специального режима')}
              </p>
            </div>

            {/* Custom Tax Base Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                {t.customTaxBaseLabel}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => onChange({ customTaxBase: 'revenue' })}
                  className={`px-3 py-2 rounded text-xs font-medium cursor-pointer border transition-all text-left flex items-center justify-between ${
                    params.customTaxBase === 'revenue'
                      ? 'bg-emerald-600 text-white font-bold border-emerald-700 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span>{t.customTaxBaseRevenue}</span>
                  {params.customTaxBase === 'revenue' && <CheckCircle2 className="w-3.5 h-3.5 ml-1 shrink-0" />}
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ customTaxBase: 'profit' })}
                  className={`px-3 py-2 rounded text-xs font-medium cursor-pointer border transition-all text-left flex items-center justify-between ${
                    params.customTaxBase === 'profit'
                      ? 'bg-emerald-600 text-white font-bold border-emerald-700 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span>{t.customTaxBaseProfit}</span>
                  {params.customTaxBase === 'profit' && <CheckCircle2 className="w-3.5 h-3.5 ml-1 shrink-0" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-600">
                {params.customTaxBase === 'revenue'
                  ? L('Салык контракттын акыркы баасынан кармалат', 'Налог рассчитывается от итоговой цены контракта')
                  : L('Салык чыгашалар кемитилгенден кийинки пайдадан кармалат', 'Налог рассчитывается от прибыли после вычета расходов')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Sub-panel 2: General Regime VAT Credit Checkbox («Сатып алуу КНС менен / Закуп товара с входящим НДС») */}
      {isGeneralRegime && (
        <div className="mx-5 mb-5 p-4 rounded-lg bg-indigo-50/70 border border-indigo-200 text-slate-900 transition-all">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <input
                id="inputVatIncluded"
                type="checkbox"
                checked={params.inputVatIncluded}
                onChange={(e) => onChange({ inputVatIncluded: e.target.checked })}
                className="w-4 h-4 mt-0.5 rounded text-indigo-600 border-indigo-300 focus:ring-indigo-500 cursor-pointer"
              />
              <div>
                <label htmlFor="inputVatIncluded" className="text-xs sm:text-sm font-bold text-indigo-950 cursor-pointer flex items-center gap-2">
                  <span>{t.inputVatIncludedLabel}</span>
                  <FileCheck2 className="w-4 h-4 text-indigo-600 inline" />
                </label>
                <p className="text-xs text-indigo-900/80 mt-1 leading-relaxed">
                  {t.inputVatIncludedHelp}
                </p>
              </div>
            </div>

            {params.inputVatIncluded && (
              <div className="shrink-0 bg-white px-3 py-2 rounded border border-indigo-200 text-right font-mono hidden sm:block">
                <div className="text-[10px] text-indigo-600 font-sans uppercase font-bold">{t.vatInputLabel}:</div>
                <div className="text-xs font-bold text-indigo-950 mt-0.5">
                  {formatCurrency(estimatedInputVat, currency)}
                </div>
              </div>
            )}
          </div>

          {params.inputVatIncluded && (
            <div className="mt-3 pt-3 border-t border-indigo-200/80 text-xs text-indigo-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>{L('Зачет колдонулду', 'Зачёт применён')}:</strong> {L('бюджетке төлөнүүчү КНС', 'НДС к уплате в бюджет')} = <em>{L('Чыгуучу КНС', 'Исходящий НДС')} (12/112) − {L('Кирүүчү КНС', 'Входящий НДС')} ({formatCurrency(estimatedInputVat, currency)})</em>.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tax Info Details Drawer (Collapsible) */}
      {showTaxDetails && (
        <div className="bg-slate-50 border-t border-slate-200 p-4 text-xs text-slate-600 space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-slate-700" />
              <span>{L('Кыргыз Республикасынын Салык кодекси боюнча маалымат', 'Справка по Налоговому кодексу Кыргызской Республики')}:</span>
            </div>
            <button
              type="button"
              onClick={() => setShowTaxDetails(false)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer text-xs"
            >
              ✕ {t.closeModal}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            <div className="p-2.5 bg-white rounded border border-slate-200">
              <div className="font-semibold text-slate-900">{L('0% — Тигүү тармагы', '0% — Швейная отрасль')}</div>
              <p className="mt-1 text-slate-600 leading-relaxed">
                {L('Тигүү жана текстиль продукциясын өндүрүүчүлөр үчүн жеңилдетилген 0% ставка.', 'Льготная ставка 0% для производителей швейной и текстильной продукции.')}
              </p>
            </div>
            <div className="p-2.5 bg-white rounded border border-slate-200">
              <div className="font-semibold text-slate-900">{L('0.5% жана 1% — Соода', '0.5% и 1% — Торговля')}</div>
              <p className="mt-1 text-slate-600 leading-relaxed">
                {L('Электрондук эсеп-фактура (ЭСФ) жана ККМ менен соода жүргүзгөндө накталай эмес эсептешүүлөр.', 'Безналичные расчёты в торговле с применением ЭСФ и ККМ.')}
              </p>
            </div>
            <div className="p-2.5 bg-white rounded border border-slate-200">
              <div className="font-semibold text-slate-900">{L('2% жана 4% — Кызмат жана өндүрүш', '2% и 4% — Услуги и производство')}</div>
              <p className="mt-1 text-slate-600 leading-relaxed">
                {L('Подряддык жумуштар, курулуш, техникалык тейлөө жана накталай эмес өндүрүштүк камсыздоо.', 'Подрядные работы, строительство, техобслуживание и безналичные производственные поставки.')}
              </p>
            </div>
            <div className="p-2.5 bg-white rounded border border-slate-200">
              <div className="font-semibold text-slate-900">{L('6% — Накталай эсептешүү', '6% — Наличный расчёт')}</div>
              <p className="mt-1 text-slate-600 leading-relaxed">
                {L('Төлөмдөр накталай акчалай жүргүзүлгөндө колдонулуучу ставка.', 'Ставка, применяемая при расчётах наличными.')}
              </p>
            </div>
            <div className="p-2.5 bg-white rounded border border-slate-200 md:col-span-2">
              <div className="font-semibold text-slate-900">{L('Жалпы режим (КНС 12% + Сатуудан салык 1% + Пайда салыгы 10%)', 'Общий режим (НДС 12% + НсП 1% + налог на прибыль 10%)')}</div>
              <p className="mt-1 text-slate-600 leading-relaxed">
                {L('КНС эсепке алуу (зачет) мүмкүнчүлүгү менен. Эгер товар ЭСФ жана КНС менен алынса, сатуу КНСинен зачет алынат жана бюджетке айырмасы гана төлөнөт.', 'С возможностью зачёта НДС. Если товар закуплен с ЭСФ и НДС, входящий НДС принимается к зачёту и в бюджет уплачивается только разница.')}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
