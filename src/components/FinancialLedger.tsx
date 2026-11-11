import React from 'react';
import { CalculationResult, CurrencySymbol, Language, TenderParams } from '../types';
import { translations } from '../i18n/translations';
import { TAX_REGIMES, formatCurrency, formatDiscount, formatPercent } from '../utils/taxCalculator';

interface FinancialLedgerProps {
  params: TenderParams;
  result: CalculationResult;
  lang: Language;
  currency: CurrencySymbol;
}

export const FinancialLedger: React.FC<FinancialLedgerProps> = ({
  params,
  result,
  lang,
  currency
}) => {
  const t = translations[lang];
  const L = (ky: string, ru: string) => (lang === 'ky' ? ky : ru);
  const regime = TAX_REGIMES[params.taxRegime] ?? TAX_REGIMES.unified_05;

  const grossMargin = result.finalContractPrice - result.totalExpenses;

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
          {t.ledgerTitle}
        </h3>
        <span className="text-xs font-mono text-slate-500">
          {regime.name[lang]}
        </span>
      </div>

      <div className="divide-y divide-slate-100 text-xs">
        {/* Row 1: Planned Price */}
        <div className="px-5 py-2.5 flex items-center justify-between hover:bg-slate-50">
          <span className="text-slate-600 font-medium">{t.ledgerStartingPrice}</span>
          <span className="font-mono text-slate-900 font-semibold tabular-nums">
            {formatCurrency(result.plannedPrice, currency)}
          </span>
        </div>

        {/* Row 2: Discount */}
        <div className="px-5 py-2.5 flex items-center justify-between hover:bg-slate-50 bg-slate-50/30">
          <span className="text-slate-600">
            {t.ledgerBiddingDrop} <strong className="font-mono text-slate-800">({formatDiscount(result.discountPercent)}%)</strong>
          </span>
          <span className="font-mono text-rose-600 font-medium tabular-nums">
            {result.priceDropSum > 0 ? '−' : ''}{formatCurrency(result.priceDropSum, currency)}
          </span>
        </div>

        {/* Row 3: Final Contract Revenue */}
        <div className="px-5 py-3 flex items-center justify-between bg-slate-100/60 font-bold text-slate-900">
          <span className="text-xs uppercase tracking-wide">{t.ledgerFinalRevenue}</span>
          <span className="font-mono text-sm tabular-nums">
            {formatCurrency(result.finalContractPrice, currency)}
          </span>
        </div>

        {/* Cost Section */}
        <div className="px-5 py-2 flex items-center justify-between text-slate-500 bg-slate-50/60 text-[11px] font-semibold uppercase tracking-wider">
          <span>{L('Өздүк нарк жана чыгашалар', 'Себестоимость и расходы')}</span>
          <span>Сумма</span>
        </div>

        <div className="px-5 py-2 flex items-center justify-between hover:bg-slate-50 pl-8">
          <span className="text-slate-600">· {t.ledgerGoodsPurchases}</span>
          <span className="font-mono text-slate-800 tabular-nums">
            {formatCurrency(result.totalGoodsCost, currency)}
          </span>
        </div>

        <div className="px-5 py-2 flex items-center justify-between hover:bg-slate-50 pl-8">
          <span className="text-slate-600">· {t.ledgerLogistics}</span>
          <span className="font-mono text-slate-800 tabular-nums">
            {formatCurrency(result.logisticsCost, currency)}
          </span>
        </div>

        <div className="px-5 py-2 flex items-center justify-between hover:bg-slate-50 pl-8">
          <span className="text-slate-600">· {t.ledgerGuarantee}</span>
          <span className="font-mono text-slate-800 tabular-nums">
            {formatCurrency(result.guaranteeCost, currency)}
          </span>
        </div>

        {result.otherCost > 0 && (
          <div className="px-5 py-2 flex items-center justify-between hover:bg-slate-50 pl-8">
            <span className="text-slate-600">· {t.ledgerOtherExp}</span>
            <span className="font-mono text-slate-800 tabular-nums">
              {formatCurrency(result.otherCost, currency)}
            </span>
          </div>
        )}

        {/* Gross Margin Row */}
        <div className="px-5 py-2.5 flex items-center justify-between bg-slate-50 font-semibold text-slate-800">
          <span>{t.ledgerGrossMargin}</span>
          <span className={`font-mono tabular-nums ${grossMargin >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            {formatCurrency(grossMargin, currency)}
          </span>
        </div>

        {/* Taxes Section */}
        <div className="px-5 py-2 flex items-center justify-between text-slate-500 bg-slate-50/60 text-[11px] font-semibold uppercase tracking-wider">
          <span>{L('Салыктык милдеттемелер', 'Налоговые обязательства')} ({regime.name[lang]})</span>
          <span>{formatCurrency(result.taxes.totalTax, currency)}</span>
        </div>

        {/* General Regime breakdown */}
        {params.taxRegime === 'general' && (
          <>
            <div className="px-5 py-2 flex items-center justify-between hover:bg-slate-50 pl-8">
              <span className="text-slate-600">· {t.vatOutputLabel} (12%)</span>
              <span className="font-mono text-slate-700 tabular-nums">
                {formatCurrency(result.taxes.vatOutput, currency)}
              </span>
            </div>

            {result.taxes.inputVatOffsetApplied && (
              <div className="px-5 py-2 flex items-center justify-between hover:bg-slate-50 pl-8 text-indigo-700 bg-indigo-50/20">
                <span className="font-medium">· {t.vatInputLabel}</span>
                <span className="font-mono font-semibold tabular-nums">
                  −{formatCurrency(result.taxes.vatInput, currency)}
                </span>
              </div>
            )}

            <div className="px-5 py-2 flex items-center justify-between hover:bg-slate-50 pl-8 font-medium">
              <span className="text-slate-800">· {t.vatPayableLabel}</span>
              <span className="font-mono text-slate-900 tabular-nums font-bold">
                {formatCurrency(result.taxes.vat, currency)}
              </span>
            </div>

            <div className="px-5 py-2 flex items-center justify-between hover:bg-slate-50 pl-8">
              <span className="text-slate-600">· {t.ledgerSalesTax}</span>
              <span className="font-mono text-slate-700 tabular-nums">
                {formatCurrency(result.taxes.salesTax, currency)}
              </span>
            </div>

            <div className="px-5 py-2 flex items-center justify-between hover:bg-slate-50 pl-8">
              <span className="text-slate-600">· {t.ledgerProfitTax}</span>
              <span className="font-mono text-slate-700 tabular-nums">
                {formatCurrency(result.taxes.profitTax, currency)}
              </span>
            </div>
          </>
        )}

        {/* Unified Tax line */}
        {result.taxes.unifiedTax > 0 && (
          <div className="px-5 py-2 flex items-center justify-between hover:bg-slate-50 pl-8">
            <span className="text-slate-600">· {t.ledgerUnifiedTax} ({regime.rateLabel})</span>
            <span className="font-mono text-slate-700 tabular-nums">
              {formatCurrency(result.taxes.unifiedTax, currency)}
            </span>
          </div>
        )}

        {/* Custom Tax line */}
        {params.taxRegime === 'custom' && (
          <div className="px-5 py-2 flex items-center justify-between hover:bg-slate-50 pl-8 text-emerald-800 bg-emerald-50/20">
            <span className="font-medium">
              · {t.ledgerCustomTax} ({params.customTaxRate || 0}%, {params.customTaxBase === 'profit' ? L('пайдадан', 'от прибыли') : L('түшкөн акчадан', 'от выручки')})
            </span>
            <span className="font-mono font-bold tabular-nums">
              {formatCurrency(result.taxes.customTax, currency)}
            </span>
          </div>
        )}

        {/* Final Net Profit */}
        <div className={`px-5 py-3.5 flex items-center justify-between font-bold text-sm ${
          result.netProfit >= 0 ? 'bg-emerald-50 text-emerald-950' : 'bg-rose-50 text-rose-950'
        }`}>
          <div className="flex flex-col">
            <span className="uppercase tracking-wide">{t.ledgerNetProfitTotal}</span>
            <span className="text-[11px] font-normal text-slate-500 font-sans">
              {L('Рентабелдүүлүк', 'Рентабельность')}: {formatPercent(result.profitabilityPercent)} | ROI: {formatPercent(result.roiPercent)}
            </span>
          </div>
          <span className={`font-mono text-base tabular-nums ${
            result.netProfit >= 0 ? 'text-emerald-700 font-extrabold' : 'text-rose-700 font-extrabold'
          }`}>
            {formatCurrency(result.netProfit, currency)}
          </span>
        </div>
      </div>
    </div>
  );
};
