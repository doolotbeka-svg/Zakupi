import React from 'react';
import { CalculationResult, CurrencySymbol, Language, SpecificationItem, TenderParams } from '../types';
import { translations } from '../i18n/translations';
import { TAX_REGIMES, formatCurrency, formatDiscount, formatPercent } from '../utils/taxCalculator';
import { Printer, X } from 'lucide-react';
import { getKgsPerRub } from '../utils/currency';

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
  const L = (ky: string, ru: string) => (lang === 'ky' ? ky : ru);
  const t = translations[lang];
  const regime = TAX_REGIMES[params.taxRegime] ?? TAX_REGIMES.unified_05;
  const share = (value: number) =>
    `${result.finalContractPrice > 0 ? ((value / result.finalContractPrice) * 100).toFixed(1) : '0.0'}%`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs print-root"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-lg border border-slate-300 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden print-sheet">
        {/* Top Modal Controls */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-sm">{L('Тендердик финансылык отчёт', 'Финансовый отчёт по тендеру')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold cursor-pointer shadow-xs"
            >
              {L('Басып чыгаруу / PDF', 'Печать / PDF')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              aria-label={t.closeModal}
              title={t.closeModal}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 overflow-y-auto space-y-6 text-slate-900 font-sans print:p-0 print:space-y-4 print-sheet-body">
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {L('МАМЛЕКЕТТИК САТЫП АЛУУЛАР ТЕНДЕРИНИН РЕНТАБЕЛДҮҮЛҮК КАРТАСЫ', 'КАРТА РЕНТАБЕЛЬНОСТИ ТЕНДЕРА ГОСУДАРСТВЕННЫХ ЗАКУПОК')}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {L('Кыргыз Республикасынын салык мыйзамдарына ылайык эсептелген', 'Рассчитано в соответствии с налоговым законодательством Кыргызской Республики')}
              </p>
            </div>
            <div className="text-right text-xs font-mono text-slate-600">
              <div>{L('Күнү', 'Дата')}: {new Date().toLocaleDateString('ru-RU')}</div>
              <div>{L('Валюта', 'Валюта')}: {currency}</div>
              {currency === 'RUB' && <div>1 RUB = {getKgsPerRub()} KGS</div>}
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 border border-slate-300 rounded">
              <div className="text-[11px] text-slate-500 uppercase font-semibold">{L('Баштапкы план суммасы', 'Плановая сумма закупки')}</div>
              <div className="text-base font-bold font-mono mt-1">{formatCurrency(result.plannedPrice, currency)}</div>
            </div>
            <div className="p-3 border border-slate-300 rounded">
              <div className="text-[11px] text-slate-500 uppercase font-semibold">{L('Аукциондогу арзандатуу', 'Снижение на аукционе')}</div>
              <div className="text-base font-bold font-mono mt-1 text-slate-800">
                {formatDiscount(discount)}% (−{formatCurrency(result.priceDropSum, currency)})
              </div>
            </div>
            <div className="p-3 border border-slate-300 rounded">
              <div className="text-[11px] text-slate-500 uppercase font-semibold">{L('Келишимдин акыркы баасы', 'Итоговая цена контракта')}</div>
              <div className="text-base font-bold font-mono mt-1 text-slate-900">{formatCurrency(result.finalContractPrice, currency)}</div>
            </div>
            <div className="p-3 border border-slate-300 rounded bg-slate-50">
              <div className="text-[11px] text-slate-500 uppercase font-semibold">{L('Чыгымсыздык чекити', 'Точка безубыточности')}</div>
              <div className="text-base font-bold font-mono mt-1 text-amber-700">{result.breakEvenDiscount}%</div>
            </div>
          </div>

          {/* Cost and Profit Table */}
          <div className="border border-slate-300 rounded overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-300 font-bold">
                <tr>
                  <th className="p-2.5">{L('Эсептик берене', 'Статья расчёта')}</th>
                  <th className="p-2.5 text-right">Сумма ({currency})</th>
                  <th className="p-2.5 text-right">{L('Үлүшү (%)', 'Доля (%)')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                <tr>
                  <td className="p-2.5 font-sans font-medium">{L('Товарлардын сатып алуу өздүк наркы', 'Закупочная себестоимость товаров')}</td>
                  <td className="p-2.5 text-right font-bold">{formatCurrency(result.totalGoodsCost, currency)}</td>
                  <td className="p-2.5 text-right">{share(result.totalGoodsCost)}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans">{L('Логистика, жеткирүү жана бажы', 'Логистика, доставка и таможня')}</td>
                  <td className="p-2.5 text-right">{formatCurrency(result.logisticsCost, currency)}</td>
                  <td className="p-2.5 text-right">{share(result.logisticsCost)}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans">{L('Кепилдик камсыздоо (Банктык кепилдик)', 'Гарантийное обеспечение (банковская гарантия)')}</td>
                  <td className="p-2.5 text-right">{formatCurrency(result.guaranteeCost, currency)}</td>
                  <td className="p-2.5 text-right">{share(result.guaranteeCost)}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans">{L('Башка операциялык чыгымдар', 'Прочие операционные расходы')}</td>
                  <td className="p-2.5 text-right">{formatCurrency(result.otherCost, currency)}</td>
                  <td className="p-2.5 text-right">{share(result.otherCost)}</td>
                </tr>
                <tr className="bg-slate-50 font-bold font-sans">
                  <td className="p-2.5">{L('Жалпы өздүк нарк жана чыгашалар', 'Итого себестоимость и расходы')}</td>
                  <td className="p-2.5 text-right font-mono">{formatCurrency(result.totalExpenses, currency)}</td>
                  <td className="p-2.5 text-right font-mono">{share(result.totalExpenses)}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans">
                    {L('Салыктар', 'Налоги')} ({regime.name[lang]}
                    {params.taxRegime === 'custom' ? ` ${params.customTaxRate || 0}%` : ''}
                    {params.taxRegime === 'general' && result.taxes.inputVatOffsetApplied ? L(' — КНС эсепке алуу менен', ' — с зачётом входящего НДС') : ''})
                  </td>
                  <td className="p-2.5 text-right font-bold">{formatCurrency(result.taxes.totalTax, currency)}</td>
                  <td className="p-2.5 text-right">{share(result.taxes.totalTax)}</td>
                </tr>
                <tr className={`font-bold text-sm ${result.netProfit >= 0 ? 'bg-emerald-50 text-emerald-950' : 'bg-rose-50 text-rose-950'}`}>
                  <td className="p-3 font-sans">{L('ТАЗА КИРЕШЕ', 'ЧИСТАЯ ПРИБЫЛЬ')}</td>
                  <td className="p-3 text-right font-mono text-base">{formatCurrency(result.netProfit, currency)}</td>
                  <td className="p-3 text-right font-mono">{formatPercent(result.profitabilityPercent)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Specification Sample Rows in Print */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider mb-2">{L('Товардык спецификация', 'Товарная спецификация')}:</h3>
            <div className="border border-slate-300 rounded overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300 text-[11px] font-semibold">
                  <tr>
                    <th className="p-2 w-8 text-center">№</th>
                    <th className="p-2">{L('Аталышы', 'Наименование')}</th>
                    <th className="p-2 w-16 text-center">{L('Бирдиги', 'Ед.')}</th>
                    <th className="p-2 w-20 text-right">{L('Саны', 'Кол-во')}</th>
                    <th className="p-2 w-28 text-right">{L('Баасы', 'Цена')}</th>
                    <th className="p-2 w-28 text-right">{L('Суммасы', 'Сумма')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {items.map((it, idx) => (
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
          </div>

          {/* Signature Block */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-slate-700">
            <div>
              <div className="border-b border-slate-400 pb-1 mb-1">{L('Жооптуу адис / Тендердик менеджер', 'Ответственный специалист / тендерный менеджер')}:</div>
              <div className="text-slate-400 text-[10px]">{L('Колу / Аты-жөнү', 'Подпись / Ф.И.О.')}</div>
            </div>
            <div>
              <div className="border-b border-slate-400 pb-1 mb-1">{L('Компания жетекчиси', 'Руководитель компании')}:</div>
              <div className="text-slate-400 text-[10px]">{L('Колу / Мөөрү', 'Подпись / Печать')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
