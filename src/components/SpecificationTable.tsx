import React, { useRef, useState } from 'react';
import { CurrencySymbol, Language, SpecificationItem } from '../types';
import { translations } from '../i18n/translations';
import { downloadSpecificationTemplate, exportTenderToExcel, parseUploadedFile } from '../utils/excel';
import { CalculationResult, TenderParams } from '../types';
import { formatCurrency } from '../utils/taxCalculator';
import { 
  Plus, 
  Trash2, 
  FileSpreadsheet, 
  Upload, 
  Download, 
  RefreshCw, 
  Copy, 
  AlertCircle, 
  Check, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface SpecificationTableProps {
  items: SpecificationItem[];
  onItemsChange: (items: SpecificationItem[]) => void;
  lang: Language;
  currency: CurrencySymbol;
  params: TenderParams;
  result: CalculationResult;
  onApplyToCost: () => void;
}

export const SpecificationTable: React.FC<SpecificationTableProps> = ({
  items,
  onItemsChange,
  lang,
  currency,
  params,
  result,
  onApplyToCost
}) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const totalQuantity = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
  const totalCost = items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);

  const handleAddItem = () => {
    const newItem: SpecificationItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: '',
      unit: lang === 'ky' ? 'даана' : 'шт',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    onItemsChange([...items, newItem]);
  };

  const handleUpdateItem = (id: string, updates: Partial<SpecificationItem>) => {
    const next = items.map(it => {
      if (it.id !== id) return it;
      const updated = { ...it, ...updates };
      const qty = Math.max(0, Number(updated.quantity) || 0);
      const price = Math.max(0, Number(updated.unitPrice) || 0);
      updated.total = qty * price;
      return updated;
    });
    onItemsChange(next);
  };

  const handleDeleteItem = (id: string) => {
    onItemsChange(items.filter(it => it.id !== id));
  };

  const handleDuplicateItem = (item: SpecificationItem) => {
    const duplicate: SpecificationItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: `${item.name} (${lang === 'ky' ? 'көчүрмө' : 'копия'})`
    };
    onItemsChange([...items, duplicate]);
  };

  const handleClearTable = () => {
    if (window.confirm(lang === 'ky' ? 'Бардык саптарды өчүрүүнү каалайсызбы?' : 'Вы уверены, что хотите очистить всю таблицу?')) {
      onItemsChange([]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFile = async (file: File) => {
    try {
      setStatusMessage({ text: lang === 'ky' ? 'Файл жүктөлүп жатат...' : 'Обработка файла...' });
      const parsedItems = await parseUploadedFile(file);
      onItemsChange(parsedItems);
      setStatusMessage({ text: `${t.importSuccessMsg} (${parsedItems.length} позиция)` });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: unknown) {
      console.error(err);
      setStatusMessage({ 
        text: err instanceof Error ? err.message : t.importErrorMsg, 
        isError: true 
      });
      setTimeout(() => setStatusMessage(null), 6000);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  return (
    <section className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      {/* Section Header */}
      <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
            3
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              {t.section3Title}
            </h2>
            <p className="text-xs text-slate-500">
              {t.section3Subtitle}
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export to Excel (.xlsx) */}
          <button
            type="button"
            onClick={() => exportTenderToExcel(params, result, items, lang, currency)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs cursor-pointer transition-colors whitespace-nowrap"
            title={t.exportExcelBtn}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{t.exportExcelBtn}</span>
          </button>

          {/* Import Excel / CSV */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs border border-slate-300 cursor-pointer transition-colors whitespace-nowrap"
            title={t.importFileBtn}
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>{t.importFileBtn}</span>
          </button>

          {/* Download Template */}
          <button
            type="button"
            onClick={() => downloadSpecificationTemplate(lang)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs border border-transparent hover:border-slate-200 cursor-pointer transition-colors"
            title={t.downloadTemplateBtn}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.downloadTemplateBtn}</span>
          </button>

          {/* Add Row Button */}
          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.addRowBtn}</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Alert Area if active or status message */}
      {statusMessage && (
        <div className={`px-5 py-2.5 text-xs flex items-center gap-2 border-b ${
          statusMessage.isError 
            ? 'bg-rose-50 text-rose-800 border-rose-200' 
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {statusMessage.isError ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <Check className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Drop Target Wrapper */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative ${isDragging ? 'ring-2 ring-emerald-500 bg-emerald-50/20' : ''}`}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-emerald-50/90 z-20 flex flex-col items-center justify-center text-emerald-900 pointer-events-none p-6 text-center">
            <Upload className="w-10 h-10 mb-2 animate-bounce text-emerald-600" />
            <span className="font-bold text-sm">{t.dragDropText}</span>
          </div>
        )}

        {/* Table Content */}
        {items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium">{t.tableEmptyMessage}</p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={handleAddItem}
                className="px-4 py-2 rounded-md bg-slate-900 text-white text-xs font-semibold cursor-pointer hover:bg-slate-800"
              >
                + {t.addRowBtn}
              </button>
              <button
                type="button"
                onClick={() => downloadSpecificationTemplate(lang)}
                className="px-4 py-2 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold cursor-pointer hover:bg-slate-200 border border-slate-300"
              >
                {t.downloadTemplateBtn}
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-800 border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-3 text-center w-12">{t.colNumber}</th>
                  <th className="px-3.5 py-3 min-w-[260px]">{t.colItemName}</th>
                  <th className="px-3.5 py-3 w-28 text-center">{t.colItemUnit}</th>
                  <th className="px-3.5 py-3 w-28 text-right">{t.colItemQty}</th>
                  <th className="px-3.5 py-3 w-36 text-right">{t.colItemUnitPrice}</th>
                  <th className="px-3.5 py-3 w-40 text-right">{t.colItemTotal}</th>
                  <th className="px-3.5 py-3 w-20 text-center">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                    {/* № */}
                    <td className="px-3.5 py-2 text-center font-mono text-slate-400 font-medium">
                      {index + 1}
                    </td>

                    {/* Name */}
                    <td className="px-3.5 py-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                        placeholder={lang === 'ky' ? 'Товардын аталышын жазыңыз...' : 'Введите наименование товара...'}
                        className="w-full bg-transparent hover:bg-white focus:bg-white px-2 py-1.5 rounded border border-transparent hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none transition-all font-medium text-slate-900"
                      />
                    </td>

                    {/* Unit */}
                    <td className="px-3.5 py-2 text-center">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleUpdateItem(item.id, { unit: e.target.value })}
                        className="w-full text-center bg-transparent hover:bg-white focus:bg-white px-2 py-1.5 rounded border border-transparent hover:border-slate-300 focus:border-slate-800 focus:outline-none text-slate-600"
                        placeholder="даана"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="px-3.5 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity || ''}
                        onChange={(e) => handleUpdateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                        className="w-full text-right font-mono bg-transparent hover:bg-white focus:bg-white px-2 py-1.5 rounded border border-transparent hover:border-slate-300 focus:border-slate-800 focus:outline-none tabular-nums font-semibold text-slate-900"
                      />
                    </td>

                    {/* Unit Price */}
                    <td className="px-3.5 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={item.unitPrice || ''}
                        onChange={(e) => handleUpdateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full text-right font-mono bg-transparent hover:bg-white focus:bg-white px-2 py-1.5 rounded border border-transparent hover:border-slate-300 focus:border-slate-800 focus:outline-none tabular-nums font-semibold text-slate-900"
                      />
                    </td>

                    {/* Total (Quantity * Unit Price) */}
                    <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(item.total, currency)}
                    </td>

                    {/* Actions */}
                    <td className="px-3.5 py-2 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleDuplicateItem(item)}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200 cursor-pointer transition-colors"
                          title="Көчүрүү"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                          title="Өчүрүү"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Table Footer / Summary Row */}
              <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-slate-600">
                    {t.itemsTotalCost}:
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-sm tabular-nums text-slate-700">
                    {totalQuantity.toLocaleString('ru-RU')}
                  </td>
                  <td className="px-3.5 py-3 text-right text-xs text-slate-500 font-mono">
                    {items.length} поз.
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-base tabular-nums text-slate-950">
                    {formatCurrency(totalCost, currency)}
                  </td>
                  <td className="px-3.5 py-3 text-center">
                    <button
                      type="button"
                      onClick={handleClearTable}
                      className="text-slate-400 hover:text-rose-600 text-[11px] cursor-pointer"
                      title={t.clearTableBtn}
                    >
                      <Trash2 className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Bottom Action Strip: Apply to calculation */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <span className="font-medium">{t.itemsTotalCount}: <strong className="text-slate-900">{items.length}</strong></span>
          <span aria-hidden="true">·</span>
          <span>{t.itemsTotalUnits}: <strong className="text-slate-900 font-mono">{totalQuantity}</strong></span>
          <span aria-hidden="true">·</span>
          <span>Жалпы закуп: <strong className="text-slate-900 font-mono">{formatCurrency(totalCost, currency)}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onApplyToCost}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer shadow-xs transition-colors"
          >
            <span>{t.applySpecToCostBtn}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
};
