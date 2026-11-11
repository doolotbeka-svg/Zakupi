import { describe, expect, it, vi } from 'vitest';
import { buildReminderEmail, sendSubscriptionReminders } from '../reminders';

const now = new Date('2026-11-12T06:00:00Z');
const sub = { userId: 'u1', email: 'buyer@example.com', paidUntil: '2026-11-14T10:00:00.123456+00:00' };

describe('письмо-напоминание', () => {
  it('содержит дату, остаток дней и ссылку на сайт на двух языках', () => {
    const mail = buildReminderEmail(sub, 'https://zakupi.vercel.app/', now);
    expect(mail.to).toBe('buyer@example.com');
    expect(mail.subject).toBe('Подписка заканчивается 14.11.2026 · Калькулятор тендеров');
    expect(mail.text).toContain('действует до 14.11.2026 (осталось 3 дн.)');
    expect(mail.text).toContain('14.11.2026 чейин жарактуу (3 күн калды)');
    expect(mail.text).toContain('откройте https://zakupi.vercel.app,');
    expect(mail.html).toContain('href="https://zakupi.vercel.app"');
  });

  it('дату показывает по времени Бишкека', () => {
    // 20:00 UTC 14.11 = 02:00 15.11 в Бишкеке
    expect(buildReminderEmail({ ...sub, paidUntil: '2026-11-14T20:00:00Z' }, 'https://x', now).subject).toContain('15.11.2026');
  });
});

describe('рассылка напоминаний', () => {
  it('отправляет каждому и отмечает только после успешной отправки', async () => {
    const due = [sub, { userId: 'u2', email: 'bad@example.com', paidUntil: '2026-11-13T00:00:00Z' }];
    const send = vi.fn(async (mail: { to: string }) => {
      if (mail.to === 'bad@example.com') throw new Error('Mailbox unavailable');
    });
    const markReminded = vi.fn(async () => {});
    const listDue = vi.fn(async () => due);

    const result = await sendSubscriptionReminders({ listDue, markReminded, send, siteUrl: 'https://zakupi.vercel.app', days: 3, now });

    expect(listDue).toHaveBeenCalledWith(3);
    expect(send).toHaveBeenCalledTimes(2);
    expect(markReminded).toHaveBeenCalledTimes(1);
    expect(markReminded).toHaveBeenCalledWith('u1', sub.paidUntil);
    expect(result).toEqual({ due: 2, sent: 1, failed: [{ email: 'bad@example.com', error: 'Mailbox unavailable' }] });
  });

  it('если подписок нет — ничего не отправляет', async () => {
    const send = vi.fn();
    const result = await sendSubscriptionReminders({ listDue: async () => [], markReminded: vi.fn(), send, siteUrl: 'x', days: 3 });
    expect(result).toEqual({ due: 0, sent: 0, failed: [] });
    expect(send).not.toHaveBeenCalled();
  });
});
