import React, { useCallback, useEffect, useState } from 'react';
import { useAccount } from '../account/AccountContext';
import { AdminPlan, AdminUser, PaymentRequest } from '../account/backend';
import { subscriptionStatus } from '../account/access';
import { AccountModal } from './AccountModal';
import { monthsLabel } from './PaymentSection';
import { AlertCircle, ArrowLeft, Check, CreditCard, LogIn, LogOut, RefreshCw, Search, Settings, ShieldCheck, Tags, Users, X } from 'lucide-react';

type Tab = 'payments' | 'users' | 'plans' | 'settings';

const som = (amount: number) => `${amount.toLocaleString('ru-RU')} сом`;
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
const dateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const STATUS_LABEL: Record<PaymentRequest['status'], { text: string; cls: string }> = {
  pending: { text: 'ожидает', cls: 'bg-amber-100 text-amber-900' },
  approved: { text: 'подтверждена', cls: 'bg-emerald-100 text-emerald-800' },
  rejected: { text: 'отклонена', cls: 'bg-rose-100 text-rose-800' },
  cancelled: { text: 'отменена', cls: 'bg-slate-100 text-slate-600' }
};

const Notice: React.FC<{ text: string | null; ok?: boolean }> = ({ text, ok }) =>
  text ? (
    <p className={`text-sm flex items-start gap-1.5 ${ok ? 'text-emerald-700' : 'text-rose-700'}`} role={ok ? 'status' : 'alert'}>
      {ok ? <Check className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
      {text}
    </p>
  ) : null;

const FAILED = 'Не удалось выполнить действие. Попробуйте ещё раз.';

/** Payment requests: new ones with approve / reject, and recent history. */
const PaymentsTab: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const { backend, refreshAccess } = useAccount();
  const [view, setView] = useState<'open' | 'all'>('open');
  const [items, setItems] = useState<PaymentRequest[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok?: boolean } | null>(null);

  const load = useCallback(async () => {
    if (!backend) return;
    try {
      setItems(view === 'open' ? await backend.listOpenPayments() : await backend.listRecentPayments());
    } catch (error) {
      console.error(error);
      setItems([]);
      setMessage({ text: 'Не удалось загрузить заявки.' });
    }
  }, [backend, view]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!backend) return null;

  const decide = async (request: PaymentRequest, approve: boolean) => {
    const question = approve
      ? `Подтвердить оплату ${request.amountKgs} сом от ${request.email}? Подписка продлится на ${monthsLabel(request.months, 'ru')}.`
      : `Отклонить заявку ${request.email} на ${request.amountKgs} сом?`;
    if (!window.confirm(question)) return;
    setBusy(request.id);
    setMessage(null);
    try {
      if (approve) {
        const until = await backend.approvePayment(request.id);
        setMessage({ text: `Оплата подтверждена. Подписка ${request.email} — до ${date(until)}.`, ok: true });
      } else {
        await backend.rejectPayment(request.id);
        setMessage({ text: `Заявка ${request.reference} отклонена.`, ok: true });
      }
      await load();
      onChanged();
      await refreshAccess();
    } catch (error) {
      console.error(error);
      setMessage({ text: FAILED });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-sm">
          {(['open', 'all'] as const).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`px-3 py-1.5 rounded cursor-pointer ${view === v ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {v === 'open' ? 'Новые' : 'Все'}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => void load()} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 cursor-pointer">
          <RefreshCw className="w-4 h-4" /> Обновить
        </button>
      </div>
      <Notice text={message?.text ?? null} ok={message?.ok} />
      {items === null ? (
        <p className="text-sm text-slate-500">Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">{view === 'open' ? 'Новых заявок нет.' : 'Заявок пока не было.'}</p>
      ) : (
        <ul className="space-y-3">
          {items.map(request => (
            <li key={request.id} className="p-4 rounded-lg border border-slate-200 bg-white space-y-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-slate-900 break-all">{request.email}</strong>
                <span className="flex items-center gap-2">
                  <span className="font-mono font-bold">{request.reference}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_LABEL[request.status].cls}`}>
                    {STATUS_LABEL[request.status].text}
                  </span>
                </span>
              </div>
              <div className="text-slate-600">
                {monthsLabel(request.months, 'ru')} · <strong className="font-mono text-slate-900">{som(request.amountKgs)}</strong> · создана{' '}
                {dateTime(request.createdAt)}
              </div>
              {request.reportedAt ? (
                <div className="text-emerald-700">
                  Сообщил об оплате: {dateTime(request.reportedAt)}
                  {request.payerNote && <> · «{request.payerNote}»</>}
                </div>
              ) : (
                request.status === 'pending' && <div className="text-slate-400">Об оплате ещё не сообщил</div>
              )}
              {request.status === 'pending' && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void decide(request, true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer disabled:opacity-60"
                  >
                    <Check className="w-4 h-4" /> Подтвердить
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void decide(request, false)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100 text-slate-700 cursor-pointer disabled:opacity-60"
                  >
                    <X className="w-4 h-4" /> Отклонить
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** Users: search, subscription status and manual changes. */
const UsersTab: React.FC = () => {
  const { backend, refreshAccess } = useAccount();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [dates, setDates] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok?: boolean } | null>(null);

  const load = useCallback(
    async (search: string) => {
      if (!backend) return;
      try {
        setUsers(await backend.listUsers(search));
      } catch (error) {
        console.error(error);
        setUsers([]);
        setMessage({ text: 'Не удалось загрузить пользователей.' });
      }
    },
    [backend]
  );

  useEffect(() => {
    void load('');
  }, [load]);

  if (!backend) return null;

  const act = async (user: AdminUser, action: () => Promise<string>) => {
    setBusy(user.id);
    setMessage(null);
    try {
      const text = await action();
      setMessage({ text, ok: true });
      await load(query);
      await refreshAccess();
    } catch (error) {
      console.error(error);
      setMessage({ text: FAILED });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={e => {
          e.preventDefault();
          void load(query);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск по email"
            aria-label="Поиск по email"
            className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-300 bg-white focus:border-slate-800 focus:outline-none"
          />
        </div>
        <button type="submit" className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm cursor-pointer">
          Найти
        </button>
      </form>
      <Notice text={message?.text ?? null} ok={message?.ok} />
      {users === null ? (
        <p className="text-sm text-slate-500">Загрузка…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-slate-500">Пользователи не найдены.</p>
      ) : (
        <ul className="space-y-3">
          {users.map(user => {
            const status = subscriptionStatus(user.paidUntil);
            const disabled = busy !== null;
            return (
              <li key={user.id} className="p-4 rounded-lg border border-slate-200 bg-white space-y-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-slate-900 break-all">{user.email}</strong>
                  {user.isAdmin && <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[11px] font-semibold">админ</span>}
                </div>
                <div className="text-slate-600">
                  Зарегистрирован {date(user.createdAt)} · последний вход {dateTime(user.lastSignInAt)}
                </div>
                <div
                  className={
                    status === 'active' ? 'text-emerald-700 font-semibold' : status === 'expired' ? 'text-rose-700' : 'text-slate-500'
                  }
                >
                  {status === 'active'
                    ? `Подписка до ${date(user.paidUntil)}`
                    : status === 'expired'
                      ? `Подписка закончилась ${date(user.paidUntil)}`
                      : 'Подписки нет'}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {[1, 3, 12].map(months => (
                    <button
                      key={months}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        void act(user, async () => {
                          const until = await backend.extendSubscription(user.id, months);
                          return `${user.email}: подписка продлена до ${date(until)}.`;
                        })
                      }
                      className="px-3 py-1.5 rounded-md border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-semibold cursor-pointer disabled:opacity-60"
                    >
                      +{months} мес
                    </button>
                  ))}
                  <input
                    type="date"
                    aria-label={`Дата окончания подписки ${user.email}`}
                    value={dates[user.id] ?? (user.paidUntil ? user.paidUntil.slice(0, 10) : '')}
                    onChange={e => setDates(d => ({ ...d, [user.id]: e.target.value }))}
                    className="px-2 py-1.5 rounded-md border border-slate-300 bg-white"
                  />
                  <button
                    type="button"
                    disabled={disabled || !dates[user.id]}
                    onClick={() =>
                      void act(user, async () => {
                        // End of the chosen day, local time
                        const until = new Date(`${dates[user.id]}T23:59:59`).toISOString();
                        await backend.setSubscription(user.id, until);
                        setDates(d => ({ ...d, [user.id]: '' }));
                        return `${user.email}: подписка до ${date(until)}.`;
                      })
                    }
                    className="px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100 text-slate-700 cursor-pointer disabled:opacity-60"
                  >
                    Сохранить дату
                  </button>
                  {user.paidUntil && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (!window.confirm(`Отключить подписку ${user.email}?`)) return;
                        void act(user, async () => {
                          await backend.setSubscription(user.id, null);
                          return `${user.email}: подписка отключена.`;
                        });
                      }}
                      className="px-3 py-1.5 rounded-md border border-rose-300 text-rose-700 hover:bg-rose-50 cursor-pointer disabled:opacity-60"
                    >
                      Отключить
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

/** Plans: prices and visibility. */
const PlansTab: React.FC = () => {
  const { backend } = useAccount();
  const [plans, setPlans] = useState<AdminPlan[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { price: string; active: boolean }>>({});
  const [message, setMessage] = useState<{ text: string; ok?: boolean } | null>(null);

  const load = useCallback(async () => {
    if (!backend) return;
    try {
      const list = await backend.adminListPlans();
      setPlans(list);
      setDrafts(Object.fromEntries(list.map(p => [p.id, { price: String(p.priceKgs), active: p.active }])));
    } catch (error) {
      console.error(error);
      setPlans([]);
      setMessage({ text: 'Не удалось загрузить тарифы.' });
    }
  }, [backend]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!backend) return null;

  const save = async (plan: AdminPlan) => {
    const draft = drafts[plan.id];
    const price = Number(draft.price.replace(/\s/g, ''));
    if (!Number.isInteger(price) || price <= 0) {
      setMessage({ text: 'Цена должна быть целым числом больше нуля.' });
      return;
    }
    setMessage(null);
    try {
      await backend.updatePlan(plan.id, price, draft.active);
      setMessage({ text: `Тариф «${monthsLabel(plan.months, 'ru')}» сохранён.`, ok: true });
      await load();
    } catch (error) {
      console.error(error);
      setMessage({ text: FAILED });
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Изменения сразу видны пользователям. Скрытый тариф нельзя выбрать и оплатить.</p>
      <Notice text={message?.text ?? null} ok={message?.ok} />
      {plans === null ? (
        <p className="text-sm text-slate-500">Загрузка…</p>
      ) : (
        <ul className="space-y-3">
          {plans.map(plan => {
            const draft = drafts[plan.id] ?? { price: String(plan.priceKgs), active: plan.active };
            const price = Number(draft.price);
            const changed = draft.price !== String(plan.priceKgs) || draft.active !== plan.active;
            return (
              <li key={plan.id} className="p-4 rounded-lg border border-slate-200 bg-white flex flex-wrap items-center gap-3 text-sm">
                <strong className="w-28 text-slate-900">{monthsLabel(plan.months, 'ru')}</strong>
                <label className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    aria-label={`Цена: ${monthsLabel(plan.months, 'ru')}`}
                    value={draft.price}
                    onChange={e => setDrafts(d => ({ ...d, [plan.id]: { ...draft, price: e.target.value } }))}
                    className="w-28 px-2 py-1.5 rounded-md border border-slate-300 font-mono"
                  />
                  сом
                </label>
                {plan.months > 1 && price > 0 && (
                  <span className="text-slate-500 font-mono">{som(Math.round(price / plan.months))} / мес</span>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={e => setDrafts(d => ({ ...d, [plan.id]: { ...draft, active: e.target.checked } }))}
                    className="w-4 h-4"
                  />
                  Показывать
                </label>
                <button
                  type="button"
                  disabled={!changed}
                  onClick={() => void save(plan)}
                  className="ml-auto px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-default"
                >
                  Сохранить
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

/** Site switches: paid access and required login. */
const SettingsTab: React.FC = () => {
  const { backend, access, refreshAccess } = useAccount();
  const [message, setMessage] = useState<{ text: string; ok?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!backend) return null;

  const toggle = async (key: 'paywallEnabled' | 'loginRequired', next: boolean, question: string) => {
    if (!window.confirm(question)) return;
    setBusy(true);
    setMessage(null);
    try {
      await backend.updateSettings({ [key]: next });
      await refreshAccess();
      setMessage({ text: 'Сохранено. Посетители увидят изменение при следующей загрузке страницы.', ok: true });
    } catch (error) {
      console.error(error);
      setMessage({ text: FAILED });
    } finally {
      setBusy(false);
    }
  };

  const items = [
    {
      key: 'paywallEnabled' as const,
      title: 'Платный доступ',
      on: access.paywallEnabled,
      text: 'Сохранённые расчёты, Excel, печать и ссылка на расчёт доступны только с подпиской. Выключено — всё бесплатно.',
      ask: (next: boolean) => (next ? 'Включить платный доступ? Без подписки платные функции закроются.' : 'Выключить платный доступ? Все функции станут бесплатными.')
    },
    {
      key: 'loginRequired' as const,
      title: 'Вход обязателен',
      on: access.loginRequired,
      text: 'Гости видят только ознакомительную страницу, калькулятор открывается после входа по email.',
      ask: (next: boolean) => (next ? 'Показывать гостям только ознакомительную страницу?' : 'Открыть калькулятор для гостей без входа?')
    }
  ];

  return (
    <div className="space-y-4">
      <Notice text={message?.text ?? null} ok={message?.ok} />
      {items.map(item => (
        <div key={item.key} className="p-4 rounded-lg border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-xl">
            <div className="font-semibold text-slate-900 flex items-center gap-2">
              {item.title}
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${item.on ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                {item.on ? 'включено' : 'выключено'}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">{item.text}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggle(item.key, !item.on, item.ask(!item.on))}
            className={`px-4 py-2 rounded-md font-semibold text-sm cursor-pointer disabled:opacity-60 ${
              item.on ? 'border border-slate-300 text-slate-700 hover:bg-slate-100' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {item.on ? 'Выключить' : 'Включить'}
          </button>
        </div>
      ))}
    </div>
  );
};

/** Administrator panel at /#admin. Access is enforced by the database; this page only shows the tools. */
export const AdminPanel: React.FC = () => {
  const account = useAccount();
  const { backend, user, ready } = account;
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('payments');
  const [openCount, setOpenCount] = useState(0);

  useEffect(() => {
    document.title = 'Админ-панель · Калькулятор тендеров';
  }, []);

  useEffect(() => {
    if (!backend || !user) {
      setIsAdmin(null);
      return;
    }
    let active = true;
    backend
      .isAdmin()
      .then(admin => active && setIsAdmin(admin))
      .catch(() => active && setIsAdmin(false));
    return () => {
      active = false;
    };
  }, [backend, user]);

  const refreshCount = useCallback(() => {
    if (!backend || !isAdmin) return;
    backend
      .listOpenPayments()
      .then(list => setOpenCount(list.length))
      .catch(() => {});
  }, [backend, isAdmin]);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  const tabs: { id: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'payments', label: 'Заявки', icon: CreditCard },
    { id: 'users', label: 'Пользователи', icon: Users },
    { id: 'plans', label: 'Тарифы', icon: Tags },
    { id: 'settings', label: 'Настройки', icon: Settings }
  ];

  let content: React.ReactNode;
  if (!account.configured) {
    content = <p className="text-slate-600">Аккаунты не подключены: на сайте не заданы ключи Supabase.</p>;
  } else if (!ready || (user && isAdmin === null)) {
    content = (
      <div className="flex justify-center py-16" role="status" aria-label="Загрузка">
        <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-emerald-600 animate-spin" />
      </div>
    );
  } else if (!user) {
    content = (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <ShieldCheck className="w-10 h-10 mx-auto text-slate-400" />
        <h1 className="text-xl font-bold text-slate-900">Вход для администратора</h1>
        <p className="text-sm text-slate-600">Войдите по email администратора — придёт код.</p>
        <button
          type="button"
          onClick={() => account.openAccount()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
        >
          <LogIn className="w-4 h-4" /> Войти
        </button>
      </div>
    );
  } else if (!isAdmin) {
    content = (
      <div className="max-w-md mx-auto text-center py-12 space-y-3" role="alert">
        <ShieldCheck className="w-10 h-10 mx-auto text-rose-400" />
        <h1 className="text-xl font-bold text-slate-900">Нет доступа</h1>
        <p className="text-sm text-slate-600">
          Вы вошли как <strong>{user.email}</strong>. Этот адрес не является администратором.
        </p>
      </div>
    );
  } else {
    content = (
      <div className="space-y-5">
        <nav className="flex flex-wrap gap-1 border-b border-slate-200" aria-label="Разделы админ-панели">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 -mb-px border-b-2 text-sm font-semibold cursor-pointer ${
                tab === id ? 'border-emerald-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {id === 'payments' && openCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[11px] leading-none">{openCount}</span>
              )}
            </button>
          ))}
        </nav>
        {tab === 'payments' && <PaymentsTab onChanged={refreshCount} />}
        {tab === 'users' && <UsersTab />}
        {tab === 'plans' && <PlansTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col">
      <header className="bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <a href="/" className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white shrink-0">
              <ArrowLeft className="w-4 h-4" />
              <span className="max-sm:hidden">К калькулятору</span>
            </a>
            <span className="font-bold truncate">Админ-панель</span>
          </div>
          {user && (
            <div className="flex items-center gap-3 min-w-0 text-sm">
              <span className="text-slate-300 truncate max-sm:hidden">{user.email}</span>
              <button
                type="button"
                onClick={() => void account.signOut()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-700 hover:bg-slate-800 cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" /> Выйти
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6">{content}</main>
      <AccountModal lang="ru" />
    </div>
  );
};
