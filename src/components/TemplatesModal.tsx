import React from 'react';
import { CurrencySymbol, Language, TenderParams } from '../types';
import { translations } from '../i18n/translations';
import { TENDER_TEMPLATES, TenderTemplate } from '../data/defaultTemplates';
import { formatCurrency } from '../utils/taxCalculator';
import { X, Check, Laptop, Utensils, Hammer } from 'lucide-react';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: TenderTemplate) => void;
  lang: Language;
  currency: CurrencySymbol;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  lang,
  currency
}) => {
  if (!isOpen) return null;
  const t = translations[lang];

  const getTemplateIcon = (id: string) => {
    switch (id) {
      case 'it_hardware':
        return <Laptop className="w-5 h-5 text-indigo-600" />;
      case 'food_supplies':
        return <Utensils className="w-5 h-5 text-amber-600" />;
      case 'construction_supplies':
        return <Hammer className="w-5 h-5 text-emerald-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-lg border border-slate-300 shadow-xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              {t.templatesModalTitle}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Кыргызстандын мамлекеттик сатып алуулар порталынын практикалык мисалдары
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
          {TENDER_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              className="p-4 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                  {getTemplateIcon(tmpl.id)}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {lang === 'ky' ? tmpl.categoryKy : tmpl.categoryRu}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                    {lang === 'ky' ? tmpl.titleKy : tmpl.titleRu}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-2 font-mono">
                    <span>План: <strong>{formatCurrency(tmpl.params.plannedPrice, currency)}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>Товар: <strong>{tmpl.items.length} поз.</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>Аукцион: <strong>{tmpl.defaultDiscount}%</strong></span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onSelectTemplate(tmpl);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer transition-colors shadow-2xs whitespace-nowrap self-end sm:self-center"
              >
                {t.templateApplyBtn}
              </button>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            {t.closeModal}
          </button>
        </div>
      </div>
    </div>
  );
};
