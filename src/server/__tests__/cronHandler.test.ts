import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const sendMail = vi.fn();
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({ rpc })) }));
vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn(() => ({ sendMail })) } }));

const { GET } = await import('../../../api/cron/subscription-reminders');

const ENV = {
  CRON_SECRET: 'cron-secret',
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  GMAIL_USER: 'sender@gmail.com',
  GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop'
};
const call = (auth?: string) => GET(new Request('https://zakupi.vercel.app/api/cron/subscription-reminders', { headers: auth ? { authorization: auth } : {} }));

beforeEach(() => {
  Object.assign(process.env, ENV);
  rpc.mockReset();
  sendMail.mockReset();
});

afterEach(() => {
  for (const key of Object.keys(ENV)) delete process.env[key];
});

describe('задача напоминаний на Vercel', () => {
  it('без секрета Vercel Cron отвечает 401 и ничего не делает', async () => {
    expect((await call()).status).toBe(401);
    expect((await call('Bearer wrong')).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('сообщает, каких переменных не хватает', async () => {
    delete process.env.GMAIL_APP_PASSWORD;
    const response = await call('Bearer cron-secret');
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'missing environment variables', missing: ['GMAIL_APP_PASSWORD'] });
  });

  it('отправляет письма и отмечает их в базе', async () => {
    rpc.mockImplementation(async (name: string) =>
      name === 'subscriptions_due_for_reminder'
        ? { data: [{ user_id: 'u1', email: 'buyer@example.com', paid_until: '2026-11-14T10:00:00+00:00' }], error: null }
        : { data: null, error: null }
    );
    const response = await call('Bearer cron-secret');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ due: 1, sent: 1, failed: [] });
    expect(rpc).toHaveBeenCalledWith('subscriptions_due_for_reminder', { p_days: 3 });
    expect(rpc).toHaveBeenCalledWith('mark_subscription_reminded', { p_user: 'u1', p_paid_until: '2026-11-14T10:00:00+00:00' });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'buyer@example.com', from: { name: 'Калькулятор тендеров', address: 'sender@gmail.com' } })
    );
  });
});
