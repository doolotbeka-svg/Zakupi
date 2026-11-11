import React, { useEffect, useState } from 'react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { useAccount } from '../account/AccountContext';
import { daysLeft, isValidCode, isValidEmail, normalizeCode, subscriptionStatus } from '../account/access';
import { AccountError } from '../account/backend';
import { FEATURE_NAMES } from '../config/plans';
import { AdminPayments, PaymentSection } from './PaymentSection';
import { AlertCircle, CheckCircle2, Cloud, Lock, LogOut, Mail, X } from 'lucide-react';

const RESEND_SECONDS = 60;

interface AccountModalProps {
  lang: Language;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const AccountModal: React.FC<AccountModalProps> = ({ lang }) => {
  const account = useAccount();
  const t = translations[lang];
  const L = (ky: string, ru: string) => (lang === 'ky' ? ky : ru);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  // Start from a clean form every time the window opens signed out
  useEffect(() => {
    if (account.isAccountOpen && !account.user) {
      setError(null);
      setCode('');
    }
  }, [account.isAccountOpen, account.user]);

  const { isAccountOpen, closeAccount, refreshAccess } = account;
  const signedIn = account.user !== null;
  useEffect(() => {
    if (isAccountOpen && signedIn) void refreshAccess();
    // Only when the window opens or the user signs in
  }, [isAccountOpen, signedIn]);
  useEffect(() => {
    if (!isAccountOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAccount();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAccountOpen, closeAccount]);

  if (!account.configured || !account.isAccountOpen) return null;

  const errorText = (err: unknown) => {
    const kind = err instanceof AccountError ? err.kind : 'unknown';
    switch (kind) {
      case 'rate_limit':
        return L('Өтө көп аракет. Бир аздан кийин кайра байкап көрүңүз.', 'Слишком много попыток. Попробуйте чуть позже.');
      case 'invalid_code':
        return L('Код туура эмес же мөөнөтү бүттү.', 'Код неверный или устарел.');
      case 'invalid_email':
        return L('Email дареги туура эмес.', 'Неверный адрес email.');
      case 'unavailable':
        return L(
          'Аккаунтка кирүү азыр сыноо режиминде жана убактылуу жеткиликсиз. Калькулятор кирбей эле толук иштейт.',
          'Вход в аккаунт сейчас работает в тестовом режиме и временно недоступен. Калькулятор полностью работает и без входа.'
        );
      case 'network':
        return L('Интернет байланышын текшериңиз.', 'Проверьте подключение к интернету.');
      default:
        return L('Ката кетти. Кайра байкап көрүңүз.', 'Что-то пошло не так. Попробуйте ещё раз.');
    }
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      // Wrong codes and rate limits are expected and explained on screen; log only the rest
      if (!(err instanceof AccountError) || err.kind === 'unknown') console.error(err);
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const requestCode = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isValidEmail(email)) {
      setError(L('Email дареги туура эмес.', 'Неверный адрес email.'));
      return;
    }
    void run(async () => {
      await account.sendCode(email.trim());
      setStep('code');
      setCode('');
      setResendIn(RESEND_SECONDS);
    });
  };

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidCode(code)) {
      setError(L('Каттан келген кодду киргизиңиз.', 'Введите код из письма.'));
      return;
    }
    void run(async () => {
      await account.verifyCode(email.trim(), normalizeCode(code));
      setStep('email');
      setCode('');
    });
  };

  const user = account.user;
  const { access } = account;
  const status = subscriptionStatus(access.paidUntil);
  const locked = account.lockedFeature;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print"
      role="dialog"
      aria-modal="true"
      aria-label={L('Аккаунт', 'Аккаунт')}
      onMouseDown={e => {
        if (e.target === e.currentTarget) account.closeAccount();
      }}
    >
      <div className="bg-white rounded-lg border border-slate-300 shadow-xl max-w-md w-full max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden">
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">
            {user ? L('Аккаунт', 'Аккаунт') : L('Кирүү', 'Вход')}
          </h3>
          <button
            type="button"
            onClick={account.closeAccount}
            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200 cursor-pointer"
            aria-label={t.closeModal}
            title={t.closeModal}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 flex-1 min-h-0 overflow-y-auto text-sm">
          {locked && (
            <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-950 text-xs flex gap-2" role="status">
              <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
              <span>
                {L('Функция', 'Функция')} «{FEATURE_NAMES[locked][lang]}» {L('жазылуу менен жеткиликтүү.', 'доступна по подписке.')}{' '}
                {user
                  ? L('Жазылууну тариздеңиз.', 'Оформите подписку.')
                  : L('Аккаунтка кирип, жазылууну тариздеңиз.', 'Войдите и оформите подписку.')}
              </span>
            </div>
          )}

          {!user ? (
            step === 'email' ? (
              <form onSubmit={requestCode} noValidate className="space-y-3">
                <p className="text-slate-600 text-xs">
                  {L(
                    'Email дарегиңизди киргизиңиз — кирүү үчүн бир жолку код жөнөтөбүз. Сырсөз керек эмес.',
                    'Введите email — мы пришлём одноразовый код для входа. Пароль не нужен.'
                  )}
                </p>
                <label htmlFor="accountEmail" className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Email
                </label>
                <input
                  id="accountEmail"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 px-3 py-2 rounded border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                  <Mail className="w-4 h-4" />
                  {busy ? L('Жөнөтүлүүдө...', 'Отправляем...') : L('Код алуу', 'Получить код')}
                </button>
              </form>
            ) : (
              <form onSubmit={submitCode} className="space-y-3">
                <p className="text-slate-600 text-xs">
                  {L('Код жөнөтүлдү:', 'Код отправлен на')} <strong className="text-slate-900">{email.trim()}</strong>.{' '}
                  {L('Каттын «Спам» папкасын да текшериңиз.', 'Если письма нет, проверьте папку «Спам».')}
                </p>
                <label htmlFor="accountCode" className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {L('Каттагы код', 'Код из письма')}
                </label>
                <input
                  id="accountCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={12}
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 font-mono text-lg tracking-[0.3em] text-center px-3 py-2 rounded border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full px-4 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                  {busy ? L('Текшерилүүдө...', 'Проверяем...') : L('Кирүү', 'Войти')}
                </button>
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setError(null);
                    }}
                    className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
                  >
                    {L('Email өзгөртүү', 'Изменить email')}
                  </button>
                  <button
                    type="button"
                    disabled={busy || resendIn > 0}
                    onClick={() => requestCode()}
                    className="text-slate-600 hover:text-slate-900 underline cursor-pointer disabled:no-underline disabled:text-slate-400 disabled:cursor-default"
                  >
                    {resendIn > 0
                      ? L(`Кайра жөнөтүү (${resendIn} сек)`, `Отправить снова (${resendIn} сек)`)
                      : L('Кодду кайра жөнөтүү', 'Отправить код снова')}
                  </button>
                </div>
              </form>
            )
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="min-w-0 truncate">
                  {L('Сиз кирдиңиз:', 'Вы вошли как')} <strong className="text-slate-900">{user.email}</strong>
                </span>
              </div>

              {/* Subscription status */}
              <div className="p-3 rounded-md border border-slate-200 bg-slate-50 text-xs space-y-1">
                <div className="font-bold uppercase tracking-wider text-slate-800">{L('Жазылуу', 'Подписка')}</div>
                {status === 'active' ? (
                  <p className="text-emerald-800">
                    {lang === 'ky' ? (
                      <>
                        <strong>{formatDate(access.paidUntil!)}</strong> чейин активдүү ({daysLeft(access.paidUntil)} күн калды)
                      </>
                    ) : (
                      <>
                        Активна до <strong>{formatDate(access.paidUntil!)}</strong> (осталось {daysLeft(access.paidUntil)} дн.)
                      </>
                    )}
                  </p>
                ) : status === 'expired' ? (
                  <p className="text-rose-700">
                    {L('Жазылуу бүттү:', 'Подписка закончилась')} <strong>{formatDate(access.paidUntil!)}</strong>
                  </p>
                ) : access.paywallEnabled ? (
                  <p className="text-slate-600">{L('Жазылуу жок.', 'Подписки нет.')}</p>
                ) : (
                  <p className="text-slate-600">
                    {L('Азыр бардык функциялар акысыз.', 'Сейчас все функции доступны бесплатно.')}
                  </p>
                )}
              </div>

              {/* Plans and payment: once the paywall is on or the user has had a subscription */}
              {(access.paywallEnabled || status !== 'none') && <PaymentSection lang={lang} />}

              {account.canUse('savedTenders') && (
                <p className="flex gap-2 text-xs text-slate-600">
                  <Cloud className="w-4 h-4 shrink-0 text-slate-500" />
                  {L(
                    'Сакталган эсептөөлөр аккаунтта сакталат жана бардык түзмөктөрдө жеткиликтүү.',
                    'Сохранённые расчёты хранятся в аккаунте и доступны на всех устройствах.'
                  )}
                </p>
              )}

              <AdminPayments lang={lang} />

              <button
                type="button"
                disabled={busy}
                onClick={() => void run(account.signOut)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                {L('Чыгуу', 'Выйти')}
              </button>
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-700 flex items-start gap-1.5" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
