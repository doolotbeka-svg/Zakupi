import React, { useEffect, useState } from 'react';
import { CurrencySymbol, Language, SavedTender } from '../types';
import { translations } from '../i18n/translations';
import { calculateTender, formatCurrency, formatDiscount } from '../utils/taxCalculator';
import { MAX_SAVED_TENDERS, MAX_TITLE_LENGTH, findSavedByTitle, normalizeTitle } from '../utils/storage';
import { AlertCircle, FolderOpen, Save, Trash2, X } from 'lucide-react';

interface SavedTendersModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedTenders: SavedTender[];
  currentTitle: string;
  storageFailed: boolean;
  onSave: (title: string) => void;
  onLoad: (tender: SavedTender) => void;
  onDelete: (id: string) => void;
  lang: Language;
  currency: CurrencySymbol;
}

export const SavedTendersModal: React.FC<SavedTendersModalProps> = ({
  isOpen,
  onClose,
  savedTenders,
  currentTitle,
  storageFailed,
  onSave,
  onLoad,
  onDelete,
  lang,
  currency
}) => {
  const [title, setTitle] = useState(currentTitle);
  const [justSaved, setJustSaved] = useState(false);

  // Prefill the name with the calculation that is currently open
  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle);
      setJustSaved(false);
    }
  }, [isOpen, currentTitle]);

  if (!isOpen) return null;

  const t = translations[lang];
  const L = (ky: string, ru: string) => (lang === 'ky' ? ky : ru);

  const cleanTitle = normalizeTitle(title);
  const existing = findSavedByTitle(savedTenders, cleanTitle);
  const isFull = !existing && savedTenders.length >= MAX_SAVED_TENDERS;
  const canSave = cleanTitle.length > 0 && !isFull;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    if (
      existing &&
      existing.title !== currentTitle &&
      !window.confirm(
        L(
          `«${existing.title}» деген эсептөө бар. Үстүнөн жазылсынбы?`,
          `Расчёт «${existing.title}» уже существует. Перезаписать его?`
        )
      )
    ) {
      return;
    }
    onSave(cleanTitle);
    setJustSaved(true);
  };

  const handleLoad = (tender: SavedTender) => {
    if (
      window.confirm(
        L(
          `«${tender.title}» жүктөлсүнбү? Учурдагы сакталбаган өзгөртүүлөр жоголот.`,
          `Загрузить «${tender.title}»? Несохранённые изменения текущего расчёта будут потеряны.`
        )
      )
    ) {
      onLoad(tender);
    }
  };

  const handleDelete = (tender: SavedTender) => {
    if (window.confirm(L(`«${tender.title}» өчүрүлсүнбү?`, `Удалить расчёт «${tender.title}»?`))) {
      onDelete(tender.id);
    }
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime()) || date.getTime() === 0) return '—';
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print"
      role="dialog"
      aria-modal="true"
      aria-label={t.savedScenariosTitle}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-lg border border-slate-300 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">{t.savedScenariosTitle}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {L(
                'Эсептөөлөр ушул браузерде гана сакталат',
                'Расчёты хранятся только в этом браузере'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200 cursor-pointer"
            aria-label={t.closeModal}
            title={t.closeModal}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Save current calculation */}
        <form onSubmit={handleSubmit} className="px-5 py-4 border-b border-slate-200 space-y-2">
          <label htmlFor="savedTenderTitle" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {t.saveCurrentScenarioTitle}
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="savedTenderTitle"
              type="text"
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(e) => {
                setTitle(e.target.value);
                setJustSaved(false);
              }}
              placeholder={t.scenarioNameInput}
              autoFocus
              className="flex-1 min-w-0 bg-slate-50 hover:bg-white focus:bg-white text-slate-900 text-sm px-3 py-2 rounded border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!canSave}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer transition-colors whitespace-nowrap disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{existing ? L('Үстүнөн жазуу', 'Перезаписать') : t.saveBtn}</span>
            </button>
          </div>

          {justSaved && !storageFailed && (
            <p className="text-xs text-emerald-700" role="status">
              {L('Эсептөө сакталды', 'Расчёт сохранён')}
            </p>
          )}
          {isFull && (
            <p className="text-xs text-rose-700 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {L(
                `Эң көп ${MAX_SAVED_TENDERS} эсептөө сактоого болот. Керексиздерин өчүрүңүз.`,
                `Можно хранить не более ${MAX_SAVED_TENDERS} расчётов. Удалите ненужные.`
              )}
            </p>
          )}
          {storageFailed && (
            <p className="text-xs text-rose-700 flex items-center gap-1.5" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {L(
                'Браузердин сактагычына жазуу мүмкүн болгон жок. Барак жабылганда тизме жоголот.',
                'Не удалось записать данные в хранилище браузера. Список пропадёт после закрытия страницы.'
              )}
            </p>
          )}
        </form>

        {/* Saved list */}
        <div className="p-5 space-y-2.5 overflow-y-auto">
          {savedTenders.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <FolderOpen className="w-9 h-9 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium">{t.noSavedScenarios}</p>
            </div>
          ) : (
            savedTenders.map((tender) => {
              const result = calculateTender(tender.params, tender.discount);
              const isCurrent = tender.title === currentTitle;
              return (
                <div
                  key={tender.id}
                  className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrent ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 truncate" title={tender.title}>
                        {tender.title}
                      </h4>
                      {isCurrent && (
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                          {L('ачык', 'открыт')}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600 mt-1 font-mono">
                      <span>{formatDate(tender.date)}</span>
                      <span>
                        {L('План', 'План')}: <strong>{formatCurrency(tender.params.plannedPrice, currency)}</strong>
                      </span>
                      <span>−{formatDiscount(tender.discount)}%</span>
                      <span className={result.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                        {L('Пайда', 'Прибыль')}: <strong>{formatCurrency(result.netProfit, currency)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleLoad(tender)}
                      className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer transition-colors"
                    >
                      {t.loadBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tender)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                      title={t.deleteBtn}
                      aria-label={`${t.deleteBtn}: ${tender.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            {savedTenders.length} / {MAX_SAVED_TENDERS}
          </span>
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
