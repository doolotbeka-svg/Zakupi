/**
 * Email reminders before a subscription ends. Runs on the server (a daily Vercel cron job);
 * the dependencies are passed in so the logic can be tested without a database or mail server.
 */

import { calendarDaysLeft } from '../account/days.js';

export interface DueSubscription {
  userId: string;
  email: string;
  /** As stored in the database: used again to mark the reminder as sent */
  paidUntil: string;
}

export interface ReminderMail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface ReminderDeps {
  listDue: (days: number) => Promise<DueSubscription[]>;
  markReminded: (userId: string, paidUntil: string) => Promise<void>;
  send: (mail: ReminderMail) => Promise<void>;
  siteUrl: string;
  /** Remind this many days before the end */
  days: number;
  now?: Date;
}

export interface ReminderResult {
  due: number;
  sent: number;
  failed: { email: string; error: string }[];
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Bishkek' });

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildReminderEmail(sub: DueSubscription, siteUrl: string, now: Date = new Date()): ReminderMail {
  const date = formatDate(sub.paidUntil);
  const left = Math.max(1, calendarDaysLeft(sub.paidUntil, now));
  const url = siteUrl.replace(/\/+$/, '');

  const ru = [
    'Здравствуйте!',
    '',
    `Ваша подписка на «Калькулятор тендеров» действует до ${date} (осталось ${left} дн.).`,
    `Чтобы продлить её, откройте ${url}, нажмите «Аккаунт», выберите срок и оплатите по QR-коду.`
  ];
  const ky = [
    'Саламатсызбы!',
    '',
    `«Тендер калькулятору» жазылууңуз ${date} чейин жарактуу (${left} күн калды).`,
    `Узартуу үчүн ${url} ачып, «Аккаунт» баскычын басыңыз, мөөнөттү тандап, QR-код аркылуу төлөңүз.`
  ];
  const text = [...ru, '', '—', '', ...ky].join('\n');

  const paragraph = (line: string) => (line ? `<p style="margin:0 0 12px">${escapeHtml(line)}</p>` : '');
  const button = `<p style="margin:16px 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 18px;background:#059669;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Продлить подписку / Жазылууну узартуу</a></p>`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#0f172a;max-width:560px">
${ru.map(paragraph).join('\n')}
${button}
<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
${ky.map(paragraph).join('\n')}
</div>`;

  return { to: sub.email, subject: `Подписка заканчивается ${date} · Калькулятор тендеров`, text, html };
}

/**
 * Sends one reminder per subscription end date. A subscription is marked only after its
 * email was accepted, so a failed one is tried again on the next run.
 */
export async function sendSubscriptionReminders(deps: ReminderDeps): Promise<ReminderResult> {
  const due = await deps.listDue(deps.days);
  const result: ReminderResult = { due: due.length, sent: 0, failed: [] };
  for (const sub of due) {
    try {
      await deps.send(buildReminderEmail(sub, deps.siteUrl, deps.now));
      await deps.markReminded(sub.userId, sub.paidUntil);
      result.sent++;
    } catch (error) {
      result.failed.push({ email: sub.email, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return result;
}
