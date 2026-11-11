import React from 'react';
import { CalculationResult, CurrencySymbol, Language, SpecificationItem, TenderParams } from '../types';
import { translations } from '../i18n/translations';
import { TAX_REGIMES, formatCurrency, formatPercent } from '../utils/taxCalculator';
import { Printer, X } from 'lucide-react';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: TenderParams;
  result: CalculationResult;
  items: SpecificationItem[];
  discount: number;
  lang: Language;
  currency: CurrencySymbol;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  params,
  result,
  items,
  discount,
  lang,
  currency
}) => {
  if (!isOpen) return null;
  const t = translations[lang];
  const regime = TAX_REGIMES[params.taxRegime];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print-backdrop">
      <div className="bg-white rounded-lg border border-slate-300 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Top Modal Controls */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-sm">Тендердик финансылык отчёт / Печатная форма</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold cursor-pointer shadow-xs"
            >
              Басып чыгаруу (Печать / PDF)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 overflow-y-auto space-y-6 text-slate-900 font-sans print:p-0 print:space-y-4">
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                МАМЛЕКЕТТИК САТЫП АЛУУЛАР ТЕНДЕРИНИН РЕНТАБЕЛДҮҮЛҮК КАРТАСЫ
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Кыргыз Республикасынын соода жана сатып алуулар мыйзамдарына ылайык эсептелген
              </p>
            </div>
            <div className="text-right text-xs font-mono text-slate-600">
              <div>Күнү: {new Date().toLocaleDateString('ru-RU')}</div>
              <div>Валюта: {currency}</div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 border border-slate-300 rounded">
              <div className="text-[11px] text-slate-500 uppercase font-semibold">Баштапкы план суммасы</div>
              <div className="text-base font-bold font-mono mt-1">{formatCurrency(result.plannedPrice, currency)}</div>
            </div>
            <div className="p-3 border border-slate-300 rounded">
              <div className="text-[11px] text-slate-500 uppercase font-semibold">Аукциондогу арзандатуу</div>
              <div className="text-base font-bold font-mono mt-1 text-slate-800">
                {discount.toFixed(1)}% (-{formatCurrency(result.priceDropSum, currency)})
              </div>
            </div>
            <div className="p-3 border border-slate-300 rounded">
              <div className="text-[11px] text-slate-500 uppercase font-semibold">Келишимдин акыркы баасы</div>
              <div className="text-base font-bold font-mono mt-1 text-slate-900">{formatCurrency(result.finalContractPrice, currency)}</div>
            </div>
            <div className="p-3 border border-slate-300 rounded bg-slate-50">
              <div className="text-[11px] text-slate-500 uppercase font-semibold">Чыгымсыздык чекити</div>
              <div className="text-base font-bold font-mono mt-1 text-amber-700">{result.breakEvenDiscount}%</div>
            </div>
          </div>

          {/* Cost and Profit Table */}
          <div className="border border-slate-300 rounded overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-300 font-bold">
                <tr>
                  <th className="p-2.5">Эсептик берене</th>
                  <th className="p-2.5 text-right">Сумма ({currency})</th>
                  <th className="p-2.5 text-right">Үлүшү (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                <tr>
                  <td className="p-2.5 font-sans font-medium">Товарлардын сатып алуу өздүк наркы</td>
                  <td className="p-2.5 text-right font-bold">{formatCurrency(result.totalGoodsCost, currency)}</td>
                  <td className="p-2.5 text-right">{result.finalContractPrice > 0 ? ((result.totalGoodsCost / result.finalContractPrice) * 100).toFixed(1) : 0}%</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans">Логистика, жеткирүү жана бажы</td>
                  <td className="p-2.5 text-right">{formatCurrency(result.logisticsCost, currency)}</td>
                  <td className="p-2.5 text-right">{result.finalContractPrice > 0 ? ((result.logisticsCost / result.finalContractPrice) * 100).toFixed(1) : 0}%</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans">Кепилдик камсыздоо (Банктык кепилдик)</td>
                  <td className="p-2.5 text-right">{formatCurrency(result.guaranteeCost, currency)}</td>
                  <td className="p-2.5 text-right">{result.finalContractPrice > 0 ? ((result.guaranteeCost / result.finalContractPrice) * 100).toFixed(1) : 0}%</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans">Башка операциялык чыгымдар</td>
                  <td className="p-2.5 text-right">{formatCurrency(result.otherCost, currency)}</td>
                  <td className="p-2.5 text-right">{result.finalContractPrice > 0 ? ((result.otherCost / result.finalContractPrice) * 100).toFixed(1) : 0}%</td>
                </tr>
                <tr className="bg-slate-50 font-bold font-sans">
                  <td className="p-2.5">Жалпы өздүк нарк жана чыгашалар</td>
                  <td className="p-2.5 text-right font-mono">{formatCurrency(result.totalExpenses, currency)}</td>
                  <td className="p-2.5 text-right font-mono">{result.finalContractPrice > 0 ? ((result.totalExpenses / result.finalContractPrice) * 100).toFixed(1) : 0}%</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans">
                    Салыктар ({regime.name[lang]}
                    {params.taxRegime === 'custom' ? ` ${params.customTaxRate || 0}%` : ''}
                    {params.taxRegime === 'general' && result.taxes.inputVatOffsetApplied ? ' - КНС эсепке алуу менен' : ''})
                  </td>
                  <td className="p-2.5 text-right font-bold">{formatCurrency(result.taxes.totalTax, currency)}</td>
                  <td className="p-2.5 text-right">{result.finalContractPrice > 0 ? ((result.taxes.totalTax / result.finalContractPrice) * 100).toFixed(1) : 0}%</td>
                </tr>
                <tr className={`font-bold text-sm ${result.isProfitable ? 'bg-emerald-50 text-emerald-950' : 'bg-rose-50 text-rose-950'}`}>
                  <td className="p-3 font-sans">ТАЗА КИРЕШЕ (ЧИСТАЯ ПРИБЫЛЬ)</td>
                  <td className="p-3 text-right font-mono text-base">{formatCurrency(result.netProfit, currency)}</td>
                  <td className="p-3 text-right font-mono">{formatPercent(result.profitabilityPercent)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Specification Sample Rows in Print */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider mb-2">Товардык спецификациянын кыскача тизмеси:</h3>
            <div className="border border-slate-300 rounded overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300 text-[11px] font-semibold">
                  <tr>
                    <th className="p-2 w-8 text-center">№</th>
                    <th className="p-2">Аталышы</th>
                    <th className="p-2 w-16 text-center">Бирдиги</th>
                    <th className="p-2 w-20 text-right">Саны</th>
                    <th className="p-2 w-28 text-right">Баасы</th>
                    <th className="p-2 w-28 text-right">Суммасы</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {items.slice(0, 8).map((it, idx) => (
                    <tr key={it.id}>
                      <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-2 font-sans font-medium">{it.name}</td>
                      <td className="p-2 text-center">{it.unit}</td>
                      <td className="p-2 text-right">{it.quantity}</td>
                      <td className="p-2 text-right">{formatCurrency(it.unitPrice, currency)}</td>
                      <td className="p-2 text-right font-bold">{formatCurrency(it.total, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {items.length > 8 && (
              <p className="text-[11px] text-slate-500 mt-1 italic">
                жана дагы {items.length - 8} позиция (толук тизме Excel файлында)...
              </p>
            )}
          </div>

          {/* Signature Block */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-slate-700">
            <div>
              <div className="border-b border-slate-400 pb-1 mb-1">Жооптуу адис / Тендердик менеджер:</div>
              <div className="text-slate-400 text-[10px]">Колу / Аты-жөнү</div>
            </div>
            <div>
              <div className="border-b border-slate-400 pb-1 mb-1">Компания жетекчиси:</div>
              <div className="text-slate-400 text-[10px]">Колу / Мөөрү</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
