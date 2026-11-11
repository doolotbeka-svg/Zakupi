import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_SPECIFICATION_ITEMS, INITIAL_TENDER_PARAMS } from '../../data/defaultTemplates';
import { AccountError } from '../backend';
import {
  createSupabaseBackend,
  describeAuthError,
  describeDbError,
  rowToPayment,
  rowsToPlans,
  rowsToSavedTenders,
  savedTenderToRow
} from '../supabaseBackend';

const tender = {
  id: 'saved-1',
  title: 'Школа',
  date: '2026-11-11T10:00:00.000Z',
  params: INITIAL_TENDER_PARAMS,
  items: DEFAULT_SPECIFICATION_ITEMS,
  discount: 7.5
};

/** Chainable stand-in for a Supabase query: records every call and resolves to `result`. */
function fakeQuery(result: unknown, calls: unknown[][]) {
  const query: Record<string, unknown> = new Proxy(
    {},
    {
      get: (_target, prop) =>
        prop === 'then'
          ? (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => Promise.resolve(result).then(resolve, reject)
          : (...args: unknown[]) => {
              calls.push([prop, ...args]);
              return query;
            }
    }
  );
  return query;
}

function fakeClient(tables: Record<string, unknown> = {}) {
  const calls: unknown[][] = [];
  const auth = {
    signInWithOtp: vi.fn(async () => ({ data: {}, error: null })),
    verifyOtp: vi.fn(async () => ({ data: { user: { id: 'u1', email: 'a@b.kg' } }, error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    getSession: vi.fn(async () => ({ data: { session: { user: { id: 'u1', email: 'a@b.kg' } } } })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
  };
  const client = {
    auth,
    from: (table: string) => {
      calls.push(['from', table]);
      return fakeQuery(tables[table] ?? { data: null, error: null }, calls);
    }
  };
  return { client: client as unknown as SupabaseClient, auth, calls };
}

describe('преобразование ошибок', () => {
  it('ошибки входа', () => {
    expect(describeAuthError({ status: 429, code: 'over_email_send_rate_limit' }).kind).toBe('rate_limit');
    expect(describeAuthError({ status: 403, code: 'otp_expired', message: 'Token has expired or is invalid' }).kind).toBe('invalid_code');
    expect(describeAuthError({ status: 400, code: 'email_address_invalid', message: 'Email address "x" is invalid' }).kind).toBe('invalid_email');
    expect(
      describeAuthError({ status: 400, code: 'email_address_not_authorized', message: 'Email address "a@b.kg" cannot be used as it is not authorized' }).kind
    ).toBe('unavailable');
    expect(describeAuthError({ status: 422, code: 'signup_disabled' }).kind).toBe('unavailable');
    expect(describeAuthError({ status: 400, message: 'Email address "a@b.kg" cannot be used as it is not authorized' }).kind).toBe('unavailable');
    expect(describeAuthError({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' }).kind).toBe('network');
    expect(describeAuthError({ status: 500, message: 'boom' }).kind).toBe('unknown');
  });

  it('ошибки базы: отказ правил доступа и лимит', () => {
    expect(describeDbError({ code: '42501', message: 'new row violates row-level security policy' }).kind).toBe('forbidden');
    expect(describeDbError({ code: 'P0001', message: 'saved tenders limit reached' }).kind).toBe('forbidden');
    expect(describeDbError({ code: '23505' }).kind).toBe('unknown');
  });
});

describe('строки таблицы saved_tenders', () => {
  it('расчёт превращается в строку и обратно без потерь', () => {
    const row = savedTenderToRow('u1', tender);
    expect(row).toMatchObject({ user_id: 'u1', id: 'saved-1', title: 'Школа', updated_at: tender.date });
    expect(rowsToSavedTenders([JSON.parse(JSON.stringify(row))])).toEqual([tender]);
  });

  it('отбрасывает повреждённые строки', () => {
    expect(rowsToSavedTenders(null)).toEqual([]);
    expect(rowsToSavedTenders([{ id: 'x', title: 'Без данных', data: null, updated_at: tender.date }, 5])).toEqual([]);
  });
});

describe('createSupabaseBackend', () => {
  it('отправляет код и создаёт аккаунт при первом входе', async () => {
    const { client, auth } = fakeClient();
    await createSupabaseBackend('u', 'k', client).sendCode('  a@b.kg ');
    expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: 'a@b.kg', options: { shouldCreateUser: true } });
  });

  it('проверяет код как email-код, очищая лишние символы', async () => {
    const { client, auth } = fakeClient();
    const user = await createSupabaseBackend('u', 'k', client).verifyCode('a@b.kg', '123 456');
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'a@b.kg', token: '123456', type: 'email' });
    expect(user).toEqual({ id: 'u1', email: 'a@b.kg' });
  });

  it('неверный код превращается в понятную ошибку', async () => {
    const { client, auth } = fakeClient();
    auth.verifyOtp.mockResolvedValueOnce({ data: { user: null }, error: { status: 403, code: 'otp_expired', message: 'Token has expired or is invalid' } } as never);
    await expect(createSupabaseBackend('u', 'k', client).verifyCode('a@b.kg', '000000')).rejects.toMatchObject({ kind: 'invalid_code' });
  });

  it('читает переключатель и подписку', async () => {
    const { client } = fakeClient({
      app_settings: { data: { paywall_enabled: true, login_required: true }, error: null },
      subscriptions: { data: { paid_until: '2026-12-11T00:00:00Z', plan: '1m' }, error: null }
    });
    const backend = createSupabaseBackend('u', 'k', client);
    expect(await backend.getAccess({ id: 'u1', email: 'a@b.kg' })).toEqual({
      paywallEnabled: true,
      loginRequired: true,
      paidUntil: '2026-12-11T00:00:00Z',
      plan: '1m'
    });
    expect(await backend.getAccess(null)).toEqual({ paywallEnabled: true, loginRequired: true, paidUntil: null, plan: null });
  });

  it('без колонки login_required (старая схема базы) считает вход необязательным', async () => {
    const calls: unknown[][] = [];
    const responses = [
      { data: null, error: { code: '42703', message: 'column app_settings.login_required does not exist' } },
      { data: { paywall_enabled: false }, error: null }
    ];
    const client = {
      auth: {},
      from: (table: string) => {
        calls.push(['from', table]);
        return fakeQuery(responses.shift(), calls);
      }
    } as unknown as SupabaseClient;

    expect(await createSupabaseBackend('u', 'k', client).getAccess(null)).toEqual({
      paywallEnabled: false,
      loginRequired: false,
      paidUntil: null,
      plan: null
    });
    expect(calls.filter(c => c[0] === 'select').map(c => c[1])).toEqual(['paywall_enabled, login_required', 'paywall_enabled']);
  });

  it('сохраняет, читает и удаляет расчёты только своего пользователя', async () => {
    const row = savedTenderToRow('u1', tender);
    const { client, calls } = fakeClient({ saved_tenders: { data: [row], error: null } });
    const backend = createSupabaseBackend('u', 'k', client);
    const user = { id: 'u1', email: 'a@b.kg' };

    expect(await backend.listSaved(user)).toEqual([tender]);
    expect(calls).toContainEqual(['eq', 'user_id', 'u1']);

    await backend.saveTender(user, tender);
    expect(calls).toContainEqual(['upsert', row, { onConflict: 'user_id,id' }]);

    await backend.deleteTender(user, 'saved-1');
    expect(calls).toContainEqual(['delete']);
    expect(calls).toContainEqual(['eq', 'id', 'saved-1']);
  });

  it('отказ базы при сохранении — ошибка forbidden', async () => {
    const { client } = fakeClient({ saved_tenders: { data: null, error: { code: '42501', message: 'rls' } } });
    await expect(createSupabaseBackend('u', 'k', client).saveTender({ id: 'u1', email: 'a@b.kg' }, tender)).rejects.toBeInstanceOf(AccountError);
  });
});

describe('оплата по QR: преобразование и вызовы', () => {
  const row = {
    id: 'p1',
    email: 'a@b.kg',
    plan: '3m',
    months: 3,
    amount_kgs: 1000,
    reference: 'ZK-04821',
    payer_note: null,
    status: 'pending',
    reported_at: null,
    created_at: '2026-11-11T10:00:00Z'
  };

  it('rowToPayment', () => {
    expect(rowToPayment(row)).toEqual({
      id: 'p1',
      email: 'a@b.kg',
      plan: '3m',
      months: 3,
      amountKgs: 1000,
      reference: 'ZK-04821',
      payerNote: null,
      status: 'pending',
      reportedAt: null,
      createdAt: '2026-11-11T10:00:00Z'
    });
    expect(rowToPayment(null)).toBeNull();
    expect(rowToPayment({ ...row, status: 'weird' })).toBeNull();
  });

  it('rowsToPlans отбрасывает некорректные тарифы', () => {
    expect(
      rowsToPlans([
        { id: '1m', months: 1, price_kgs: 400 },
        { id: 'bad', months: 0, price_kgs: 10 },
        { id: 'free', months: 1, price_kgs: 0 }
      ])
    ).toEqual([{ id: '1m', months: 1, priceKgs: 400 }]);
  });

  it('вызывает функции базы с правильными параметрами', async () => {
    const rpc = vi.fn(async (name: string) => ({ data: name === 'is_admin' ? true : name === 'approve_payment_request' ? '2027-02-11T00:00:00Z' : row, error: null }));
    const client = { auth: {}, from: () => fakeQuery({ data: [], error: null }, []), rpc } as unknown as SupabaseClient;
    const backend = createSupabaseBackend('u', 'k', client);

    await backend.requestPayment('3m');
    await backend.reportPayment('p1', 'Азамат');
    await backend.cancelPayment('p1');
    expect(await backend.isAdmin()).toBe(true);
    expect(await backend.approvePayment('p1')).toBe('2027-02-11T00:00:00Z');
    await backend.rejectPayment('p1');

    expect(rpc.mock.calls).toEqual([
      ['request_payment', { p_plan: '3m' }],
      ['report_payment_sent', { p_id: 'p1', p_note: 'Азамат' }],
      ['cancel_payment_request', { p_id: 'p1' }],
      ['is_admin'],
      ['approve_payment_request', { p_id: 'p1' }],
      ['reject_payment_request', { p_id: 'p1' }]
    ]);
  });

  it('если таблица тарифов пуста, использует цены из кода', async () => {
    const client = { auth: {}, from: () => fakeQuery({ data: [], error: null }, []) } as unknown as SupabaseClient;
    expect((await createSupabaseBackend('u', 'k', client).listPlans()).map(p => p.priceKgs)).toEqual([400, 1000, 2100, 3700]);
  });
});
