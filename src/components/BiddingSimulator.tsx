import React, { useState } from 'react';
import { CalculationResult, CurrencySymbol, Language, TenderParams } from '../types';
import { translations } from '../i18n/translations';
import { formatCurrency, formatPercent, generateSensitivityMatrix, TAX_REGIMES } from '../utils/taxCalculator';
import { 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Target, 
  Table as TableIcon 
} from 'lucide-react';

interface BiddingSimulatorProps {
  params: TenderParams;
  result: CalculationResult;
  discount: number;
  onDiscountChange: (discount: number) => void;
  lang: Language;
  currency: CurrencySymbol;
}

export const BiddingSimulator: React.FC<BiddingSimulatorProps> = ({
  params,
  result,
  discount,
  onDiscountChange,
  lang,
  currency
}) => {
  const t = translations[lang];
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);

  const sensitivityMatrix = generateSensitivityMatrix(params, discount);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDiscountChange(parseFloat(e.target.value));
  };

  const handleStep = (delta: number) => {
    const next = Math.max(0, Math.min(40, Math.round((discount + delta) * 10) / 10));
    onDiscountChange(next);
  };

  // Determine status
  const isLoss = result.netProfit < 0;
  const isBreakEven = Math.abs(result.netProfit) < 100;
  const isProfitable = result.netProfit > 0;

  return (
    <section className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      {/* Section Header */}
      <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
            2
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              {t.section2Title}
            </h2>
            <p className="text-xs text-slate-500">
              {t.section2Subtitle}
            </p>
          </div>
        </div>

        {/* Break-even point summary chip */}
        <button
          type="button"
          onClick={() => {
            if (result.breakEvenDiscount <= 40) {
              onDiscountChange(result.breakEvenDiscount);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100 transition-colors cursor-pointer text-xs font-mono font-medium"
          title={`${t.breakEvenPoint}: ${result.breakEvenDiscount}% (${formatCurrency(result.breakEvenPrice, currency)})`}
        >
          <Target className="w-3.5 h-3.5 text-amber-600" />
          <span>{t.breakEvenPoint}:</span>
          <span className="font-bold underline">{result.breakEvenDiscount}%</span>
        </button>
      </div>

      <div className="p-5 space-y-6">
        {/* Slider & Controls Area */}
        <div className="bg-slate-50 rounded-lg p-5 border border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span>{t.discountSliderLabel}</span>
                <span className="text-xs font-normal text-slate-500">({t.stepLabel})</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {t.currentDropSum}: <strong className="font-mono text-slate-800">{formatCurrency(result.priceDropSum, currency)}</strong>
              </div>
            </div>

            {/* Current percentage badge & steppers */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleStep(-1)}
                className="w-8 h-8 rounded bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer flex items-center justify-center text-sm shadow-2xs"
                title="-1%"
              >
                -1%
              </button>
              <button
                type="button"
                onClick={() => handleStep(-0.5)}
                className="w-8 h-8 rounded bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer flex items-center justify-center text-xs shadow-2xs"
                title="-0.5%"
              >
                -0.5
              </button>

              <div className="px-4 py-1.5 bg-slate-900 text-white font-mono text-lg font-bold rounded shadow-inner min-w-[90px] text-center tabular-nums">
                {discount.toFixed(1)}%
              </div>

              <button
                type="button"
                onClick={() => handleStep(0.5)}
                className="w-8 h-8 rounded bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer flex items-center justify-center text-xs shadow-2xs"
                title="+0.5%"
              >
                +0.5
              </button>
              <button
                type="button"
                onClick={() => handleStep(1)}
                className="w-8 h-8 rounded bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer flex items-center justify-center text-sm shadow-2xs"
                title="+1%"
              >
                +1%
              </button>
            </div>
          </div>

          {/* Slider Input (0% to 40% with step 0.5%) */}
          <div className="relative pt-2 pb-1">
            <input
              type="range"
              min="0"
              max="40"
              step="0.5"
              value={discount}
              onChange={handleSliderChange}
              className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />

            {/* Slider Scale Ticks */}
            <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1.5">
              <span>0%</span>
              <span>5%</span>
              <span>10%</span>
              <span>15%</span>
              <span>20%</span>
              <span>25%</span>
              <span>30%</span>
              <span>35%</span>
              <span>40%</span>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-200">
            <span className="text-xs text-slate-500 mr-1 font-medium">{t.quickPresets}:</span>
            {[0, 2.5, 5, 7.5, 10, 15, 20, 25].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => onDiscountChange(val)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium cursor-pointer transition-colors border ${
                  Math.abs(discount - val) < 0.01
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {val}%
              </button>
            ))}

            {/* Break-even button in presets */}
            {result.breakEvenDiscount <= 40 && (
              <button
                type="button"
                onClick={() => onDiscountChange(result.breakEvenDiscount)}
                className="ml-auto px-2.5 py-1 rounded text-xs font-mono font-bold cursor-pointer transition-colors border bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200"
              >
                ★ {t.breakEvenPoint}: {result.breakEvenDiscount}%
              </button>
            )}
          </div>
        </div>

        {/* Warning Banner if below break-even point (Loss) */}
        {isLoss && (
          <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-900">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <strong className="font-bold">{t.statusLoss}!</strong> {t.statusLossWarning}
              <div className="mt-1 font-mono text-xs text-rose-700">
                Максималдык төмөндөтүү чеги: <strong>{result.breakEvenDiscount}%</strong> | Мин. баа: <strong>{formatCurrency(result.breakEvenPrice, currency)}</strong>
              </div>
            </div>
          </div>
        )}

        {/* 5 Financial KPI Cards (instant recomputation) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Final Contract Price */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                {t.kpiContractPrice}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {t.kpiContractPriceSub}
              </div>
            </div>
            <div className="mt-3">
              <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 tabular-nums">
                {formatCurrency(result.finalContractPrice, currency)}
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                -{discount.toFixed(1)}% ({formatCurrency(result.priceDropSum, currency)})
              </div>
            </div>
          </div>

          {/* Card 2: Total Expenses (Себестоимость с расходами) */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                {t.kpiTotalExpenses}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {t.kpiTotalExpensesSub}
              </div>
            </div>
            <div className="mt-3">
              <div className="text-lg sm:text-xl font-bold font-mono text-slate-800 tabular-nums">
                {formatCurrency(result.totalExpenses, currency)}
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                Товар: {formatCurrency(result.totalGoodsCost, currency)}
              </div>
            </div>
          </div>

          {/* Card 3: Taxes (Налоги в сомах) */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col justify-between relative">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {t.kpiTaxes}
                </span>
                <button
                  type="button"
                  onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Салык чечмелениши"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {t.kpiTaxesSub}
              </div>
            </div>
            <div className="mt-3">
              <div className="text-lg sm:text-xl font-bold font-mono text-slate-800 tabular-nums">
                {formatCurrency(result.taxes.totalTax, currency)}
              </div>
              <button
                type="button"
                onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
                className="text-[11px] text-slate-500 hover:text-slate-900 underline mt-0.5 flex items-center gap-0.5 cursor-pointer"
              >
                <span>Деталдар</span>
                {showTaxBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Card 4: Net Profit (Чистая прибыль в сомах) — HIGHLIGHTED IN GREEN IF PROFITABLE, RED IF LOSS */}
          <div className={`p-4 rounded-lg border flex flex-col justify-between transition-colors ${
            isProfitable 
              ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400/40' 
              : isLoss
              ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-400/40'
              : 'bg-amber-50 border-amber-300'
          }`}>
            <div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  isProfitable ? 'text-emerald-900' : isLoss ? 'text-rose-900' : 'text-amber-900'
                }`}>
                  {t.kpiNetProfit}
                </span>
                {isProfitable ? (
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                )}
              </div>
              <div className={`text-xs mt-0.5 ${
                isProfitable ? 'text-emerald-700' : isLoss ? 'text-rose-700' : 'text-amber-700'
              }`}>
                {isProfitable ? t.statusProfitable : isLoss ? t.statusLoss : t.statusBreakEven}
              </div>
            </div>
            <div className="mt-3">
              <div className={`text-xl sm:text-2xl font-bold font-mono tabular-nums ${
                isProfitable ? 'text-emerald-700' : isLoss ? 'text-rose-700' : 'text-amber-800'
              }`}>
                {formatCurrency(result.netProfit, currency)}
              </div>
              <div className={`text-[11px] font-mono mt-0.5 ${
                isProfitable ? 'text-emerald-600' : isLoss ? 'text-rose-600' : 'text-amber-600'
              }`}>
                {result.netProfit >= 0 ? `Пайда маржасы` : `Зыяндын көлөмү`}
              </div>
            </div>
          </div>

          {/* Card 5: Profitability (Рентабельность %) — HIGHLIGHTED IN GREEN / RED */}
          <div className={`p-4 rounded-lg border flex flex-col justify-between transition-colors ${
            isProfitable 
              ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400/40' 
              : isLoss
              ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-400/40'
              : 'bg-amber-50 border-amber-300'
          }`}>
            <div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  isProfitable ? 'text-emerald-900' : isLoss ? 'text-rose-900' : 'text-amber-900'
                }`}>
                  {t.kpiProfitability}
                </span>
                {isProfitable ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                )}
              </div>
              <div className={`text-xs mt-0.5 ${
                isProfitable ? 'text-emerald-700' : isLoss ? 'text-rose-700' : 'text-amber-700'
              }`}>
                {t.kpiProfitabilitySub}
              </div>
            </div>
            <div className="mt-3">
              <div className={`text-xl sm:text-2xl font-bold font-mono tabular-nums ${
                isProfitable ? 'text-emerald-700' : isLoss ? 'text-rose-700' : 'text-amber-800'
              }`}>
                {formatPercent(result.profitabilityPercent)}
              </div>
              <div className={`text-[11px] font-mono mt-0.5 ${
                isProfitable ? 'text-emerald-600' : isLoss ? 'text-rose-600' : 'text-amber-600'
              }`}>
                ROI чыгымдан: {formatPercent(result.roiPercent)}
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Tax Breakdown Popover */}
        {showTaxBreakdown && (
          <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-xs font-mono">
            <div className="font-bold font-sans text-slate-800 mb-2 flex items-center justify-between">
              <span>Кыргызстан салыктарынын деталдуу эсеби:</span>
              <span className="text-slate-500 font-mono">{formatCurrency(result.taxes.totalTax, currency)}</span>
            </div>
            
            {result.taxes.regimeId === 'general' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-slate-700">
                  <div className="p-2.5 bg-white rounded border border-slate-200">
                    <div className="text-slate-500 font-sans">{t.vatOutputLabel}:</div>
                    <div className="text-sm font-bold text-slate-900 mt-1">{formatCurrency(result.taxes.vatOutput, currency)}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-sans">12/112 контракттан</div>
                  </div>
                  <div className="p-2.5 bg-white rounded border border-indigo-200 bg-indigo-50/30">
                    <div className="text-indigo-800 font-sans font-semibold">{t.vatInputLabel}:</div>
                    <div className="text-sm font-bold text-indigo-900 mt-1">
                      {result.taxes.inputVatOffsetApplied ? `-${formatCurrency(result.taxes.vatInput, currency)}` : `${formatCurrency(0, currency)} (${lang === 'ky' ? 'зачет жок' : 'без зачета'})`}
                    </div>
                    <div className="text-[10px] text-indigo-700/80 mt-0.5 font-sans">
                      {result.taxes.inputVatOffsetApplied ? 'Закуп товардын КНСи' : 'Галочка коюлган эмес'}
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded border border-slate-200">
                    <div className="text-slate-500 font-sans">{t.vatPayableLabel}:</div>
                    <div className="text-sm font-bold text-slate-900 mt-1">{formatCurrency(result.taxes.vat, currency)}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-sans">Сатуу КНС - Зачет</div>
                  </div>
                  <div className="p-2.5 bg-white rounded border border-slate-200">
                    <div className="text-slate-500 font-sans">{t.ledgerSalesTax}:</div>
                    <div className="text-sm font-bold text-slate-900 mt-1">{formatCurrency(result.taxes.salesTax, currency)}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-sans">1% выручкадан</div>
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded border border-slate-200 flex flex-wrap items-center justify-between text-slate-700">
                  <div>
                    <span className="font-sans font-bold text-slate-900">{t.ledgerProfitTax}: </span>
                    <span className="text-[11px] text-slate-500 font-sans">10% таза салык салынуучу пайдадан</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 font-mono">
                    {formatCurrency(result.taxes.profitTax, currency)}
                  </div>
                </div>
              </div>
            ) : result.taxes.regimeId === 'custom' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                <div className="p-2.5 bg-white rounded border border-emerald-200 bg-emerald-50/20">
                  <div className="text-slate-600 font-sans font-semibold">Өз алдынча киргизилген ченем:</div>
                  <div className="text-base font-bold text-emerald-800 mt-1 font-mono">
                    {params.customTaxRate || 0}% ({params.customTaxBase === 'profit' ? 'пайдадан' : 'выручкадан'})
                  </div>
                </div>
                <div className="p-2.5 bg-white rounded border border-emerald-200 bg-emerald-50/20">
                  <div className="text-slate-600 font-sans font-semibold">Төлөнүүчү салык суммасы:</div>
                  <div className="text-base font-bold text-slate-900 mt-1 font-mono">
                    {formatCurrency(result.taxes.totalTax, currency)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                <div className="p-2.5 bg-white rounded border border-slate-200">
                  <div className="text-slate-500 font-sans">Бирдиктүү салык ченеми:</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {TAX_REGIMES[params.taxRegime]?.rateLabel || '0%'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-sans">Келишимдин акыркы баасынан</div>
                </div>
                <div className="p-2.5 bg-white rounded border border-slate-200">
                  <div className="text-slate-500 font-sans">Салыктын жалпы суммасы:</div>
                  <div className="text-sm font-bold text-slate-900 mt-1 font-mono">
                    {formatCurrency(result.taxes.totalTax, currency)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Toggle Sensitivity Matrix & Financial Ledger */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setShowMatrix(!showMatrix)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium cursor-pointer transition-colors"
          >
            <TableIcon className="w-3.5 h-3.5 text-slate-600" />
            <span>{t.sensitivityTitle}</span>
            {showMatrix ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <div className="text-slate-500 font-mono text-[11px]">
            {t.breakEvenDiscountLabel}: <strong className="text-slate-800">{result.breakEvenDiscount}%</strong> ({t.minPriceLabel}: <strong className="text-slate-800">{formatCurrency(result.breakEvenPrice, currency)}</strong>)
          </div>
        </div>

        {/* Sensitivity Matrix Table (Strict Financial Spreadsheet Look) */}
        {showMatrix && (
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-100/90 text-slate-800 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5 text-center">{t.colDropPercent}</th>
                  <th className="px-3.5 py-2.5 text-right">{t.colContractPrice}</th>
                  <th className="px-3.5 py-2.5 text-right">{t.colTaxes}</th>
                  <th className="px-3.5 py-2.5 text-right">{t.colProfit}</th>
                  <th className="px-3.5 py-2.5 text-right">{t.colMargin}</th>
                  <th className="px-3.5 py-2.5 text-center">{t.colStatus}</th>
                  <th className="px-3.5 py-2.5 text-center">Аракет</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                {sensitivityMatrix.map((step, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      step.isCurrent
                        ? 'bg-slate-900 text-white font-bold'
                        : step.isProfitable
                        ? 'hover:bg-slate-50'
                        : 'bg-rose-50/50 hover:bg-rose-50 text-rose-950'
                    }`}
                  >
                    <td className="px-3.5 py-2 text-center font-bold">
                      {step.discount.toFixed(1)}%
                    </td>
                    <td className="px-3.5 py-2 text-right">
                      {formatCurrency(step.finalPrice, currency)}
                    </td>
                    <td className="px-3.5 py-2 text-right">
                      {formatCurrency(step.taxes, currency)}
                    </td>
                    <td className={`px-3.5 py-2 text-right font-bold ${
                      step.isCurrent ? 'text-white' : step.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {formatCurrency(step.netProfit, currency)}
                    </td>
                    <td className={`px-3.5 py-2 text-right ${
                      step.isCurrent ? 'text-white' : step.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {formatPercent(step.profitability)}
                    </td>
                    <td className="px-3.5 py-2 text-center font-sans text-[11px]">
                      {step.isProfitable ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${step.isCurrent ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-emerald-700 bg-emerald-100'}`}>
                          Пайдалуу
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${step.isCurrent ? 'bg-rose-400 text-slate-950 font-bold' : 'text-rose-700 bg-rose-100'}`}>
                          Чыгым
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => onDiscountChange(step.discount)}
                        className={`text-[10px] px-2 py-0.5 rounded font-sans cursor-pointer transition-colors ${
                          step.isCurrent
                            ? 'bg-white text-slate-900 font-bold'
                            : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                        }`}
                      >
                        Тандоо
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
