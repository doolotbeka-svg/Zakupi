import React, { useEffect, useState } from 'react';
import { Language } from '../types';
import { useAccount } from '../account/AccountContext';
import { PaymentRequest } from '../account/backend';
import { PLANS, Plan } from '../config/plans';
import { QR_PAYMENT } from '../config/payment';
import { AlertCircle, Check, Copy, Download, ExternalLink, QrCode, ShieldCheck } from 'lucide-react';

const formatSom = (amount: number) => `${amount.toLocaleString('ru-RU').replace(/ /g, ' ')} сом`;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const monthsLabel = (months: number, lang: Language) => {
  if (lang === 'ky') return `${months} ай`;
  const mod10 = months % 10;
  const mod100 = months % 100;
  const word =
    mod10 === 1 && mod100 !== 11 ? 'месяц' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'месяца' : 'месяцев';
  return `${months} ${word}`;
};

const useL = (lang: Language) => (ky: string, ru: string) => (lang === 'ky' ? ky : ru);

const ErrorLine: React.FC<{ text: string | null }> = ({ text }) =>
  text ? (
    <p className="text-xs text-rose-700 flex items-start gap-1.5" role="alert">
      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      {text}
    </p>
  ) : null;

/** Plans, payment by QR code and the state of the user's payment request. */
export const PaymentSection: React.FC<{ lang: Language }> = ({ lang }) => {
  const account = useAccount();
  const L = useL(lang);
  const { backend, user } = account;

  const [plans, setPlans] = useState<Plan[]>([...PLANS]);
  const [selected, setSelected] = useState<string>(PLANS[0].id);
  const [payment, setPayment] = useState<PaymentRequest | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!backend || !user) return;
    let active = true;
    backend.listPlans().then(list => active && list.length > 0 && setPlans(list)).catch(() => {});
    backend.getOpenPayment(user).then(open => active && setPayment(open)).catch(() => {});
    return () => {
      active = false;
    };
  }, [backend, user]);

  if (!backend || !user) return null;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      console.error(err);
      setError(L('Ката кетти. Кайра байкап көрүңүз.', 'Что-то пошло не так. Попробуйте ещё раз.'));
    } finally {
      setBusy(false);
    }
  };

  const copyReference = async (reference: string) => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable: the code is visible on screen anyway
    }
  };

  // 1. Request reported as paid: waiting for the administrator
  if (payment && payment.reportedAt) {
    return (
      <div className="p-3 rounded-md border border-amber-200 bg-amber-50 text-amber-950 text-xs space-y-1" role="status">
        <div className="font-bold uppercase tracking-wider">{L('Төлөм текшерилүүдө', 'Оплата проверяется')}</div>
        <p>
          {L('Өтүнмө', 'Заявка')} <strong className="font-mono">{payment.reference}</strong> —{' '}
          {monthsLabel(payment.months, lang)}, {formatSom(payment.amountKgs)}.{' '}
          {L('Жөнөтүлгөн', 'Отправлена')} {formatDateTime(payment.reportedAt)}.
        </p>
        <p>
          {L(
            'Төлөм текшерилгенден кийин жазылуу автоматтык түрдө иштей баштайт — адатта бир күндүн ичинде.',
            'Подписка включится после проверки оплаты — обычно в течение дня.'
          )}
        </p>
      </div>
    );
  }

  // 2. Paying: QR code and instructions
  if (payment) {
    return (
      <div className="p-3 rounded-md border border-emerald-200 bg-emerald-50/40 space-y-3 text-xs text-slate-700">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <QrCode className="w-4 h-4 text-emerald-700" />
            {L('QR боюнча төлөө', 'Оплата по QR')}
          </span>
          <span className="font-mono text-slate-500">{monthsLabel(payment.months, lang)}</span>
        </div>

        <div className="text-center">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">{L('Төлөнүүчү сумма', 'Сумма к оплате')}</div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">{formatSom(payment.amountKgs)}</div>
        </div>

        <img
          src={QR_PAYMENT.imageUrl}
          alt={L(`${QR_PAYMENT.bank} аркылуу төлөө үчүн QR-код`, `QR-код для оплаты через ${QR_PAYMENT.bank}`)}
          className="mx-auto w-full max-w-[220px] rounded-md border border-slate-200 bg-white"
        />
        <p className="text-center text-slate-600">
          {L('Алуучу:', 'Получатель:')} <strong className="text-slate-900">{QR_PAYMENT.recipient}</strong> ({QR_PAYMENT.bank})
        </p>

        <div className="grid grid-cols-2 gap-2">
          <a
            href={QR_PAYMENT.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold text-center"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            {L('Банк тиркемесинде ачуу', 'Открыть в приложении банка')}
          </a>
          <a
            href={QR_PAYMENT.imageUrl}
            download="zakupi-oplata-qr.jpg"
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-center"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            {L('QR жүктөп алуу', 'Скачать QR')}
          </a>
        </div>

        <ol className="list-decimal pl-4 space-y-1">
          <li>
            {L(
              'QR-кодду каалаган банктын тиркемесинде сканерлеңиз (телефондо — «Банк тиркемесинде ачуу» же галереядан QR).',
              'Отсканируйте QR в приложении любого банка (на телефоне — «Открыть в приложении банка» или QR из галереи).'
            )}
          </li>
          <li>
            {L('Сумманы киргизиңиз:', 'Введите сумму:')} <strong className="font-mono">{formatSom(payment.amountKgs)}</strong>.
          </li>
          <li>
            {L('Которуунун комментарийине кодду жазыңыз:', 'В комментарии к переводу укажите код:')}{' '}
            <button
              type="button"
              onClick={() => void copyReference(payment.reference)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono font-bold text-slate-900 cursor-pointer hover:bg-slate-100"
              title={L('Көчүрүү', 'Скопировать')}
            >
              {payment.reference}
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
            </button>
          </li>
          <li>{L('Төлөгөндөн кийин «Мен төлөдүм» баскычын басыңыз.', 'После оплаты нажмите «Я оплатил».')}</li>
        </ol>

        <div className="space-y-1">
          <label htmlFor="payerNote" className="block text-[11px] font-semibold text-slate-700">
            {L('Төлөөчүнүн аты же номердин акыркы сандары (милдеттүү эмес)', 'Имя плательщика или последние цифры номера (необязательно)')}
          </label>
          <input
            id="payerNote"
            type="text"
            maxLength={200}
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full bg-white px-3 py-2 rounded border border-slate-300 focus:border-slate-800 focus:outline-none text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(async () => setPayment(await backend.reportPayment(payment.id, note)))}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm cursor-pointer disabled:opacity-60"
          >
            <Check className="w-4 h-4" />
            {L('Мен төлөдүм', 'Я оплатил')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await backend.cancelPayment(payment.id);
                setPayment(null);
              })
            }
            className="px-3 py-2.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-sm cursor-pointer"
          >
            {L('Жокко чыгаруу', 'Отменить')}
          </button>
        </div>
        <ErrorLine text={error} />
      </div>
    );
  }

  // 3. Choosing a plan
  return (
    <div className="space-y-2">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-800">{L('Тарифтер', 'Тарифы')}</div>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={L('Тарифтер', 'Тарифы')}>
        {plans.map(plan => {
          const isSelected = plan.id === selected;
          return (
            <button
              key={plan.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelected(plan.id)}
              className={`p-3 rounded-md border text-left text-xs cursor-pointer transition-colors ${
                isSelected ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-slate-400 bg-white'
              }`}
            >
              <div className="font-bold text-slate-900 text-sm">{monthsLabel(plan.months, lang)}</div>
              {plan.priceKgs !== null ? (
                <>
                  <div className="text-slate-900 mt-0.5 font-mono font-semibold">{formatSom(plan.priceKgs)}</div>
                  {plan.months > 1 && (
                    <div className="text-slate-500 font-mono text-[11px]">
                      {formatSom(Math.round(plan.priceKgs / plan.months))} / {L('ай', 'мес')}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-slate-600 mt-0.5 font-mono">{L('баасы такталат', 'цена уточняется')}</div>
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void run(async () => setPayment(await backend.requestPayment(selected)))}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm cursor-pointer disabled:opacity-60"
      >
        <QrCode className="w-4 h-4" />
        {L('QR боюнча төлөөгө өтүү', 'Перейти к оплате по QR')}
      </button>
      <ErrorLine text={error} />
    </div>
  );
};

/** Administrator: link to the admin panel. */
export const AdminLink: React.FC<{ lang: Language }> = ({ lang }) => {
  const { backend, user } = useAccount();
  const L = useL(lang);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!backend || !user) return;
    let active = true;
    backend
      .isAdmin()
      .then(admin => active && setIsAdmin(admin))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [backend, user]);

  if (!isAdmin) return null;

  return (
    <a
      href="/#admin"
      className="flex items-center gap-2 p-3 rounded-md border border-slate-300 bg-slate-50 hover:bg-slate-100 text-sm font-semibold text-slate-900"
    >
      <ShieldCheck className="w-4 h-4 text-slate-600" />
      {L('Админ-панель', 'Админ-панель')}
    </a>
  );
};
