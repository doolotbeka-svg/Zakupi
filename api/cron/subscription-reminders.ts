/// <reference types="node" />
/**
 * Daily Vercel cron job (see vercel.json): emails users whose subscription ends within
 * REMINDER_DAYS (default 3). Needs these environment variables in Vercel:
 *   VITE_SUPABASE_URL          – already set for the site
 *   SUPABASE_SERVICE_ROLE_KEY  – Supabase secret key (server only, never in the browser)
 *   GMAIL_USER, GMAIL_APP_PASSWORD – the Gmail account and app password used for sending
 *   CRON_SECRET                – Vercel sends it as "Authorization: Bearer …" to cron requests
 */
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { DueSubscription, sendSubscriptionReminders } from '../../src/server/reminders';

const REQUIRED = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GMAIL_USER', 'GMAIL_APP_PASSWORD'] as const;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return json({ error: 'CRON_SECRET is not set' }, 500);
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return json({ error: 'unauthorized' }, 401);

  const missing = REQUIRED.filter(name => !process.env[name]);
  if (missing.length > 0) return json({ error: 'missing environment variables', missing }, 500);

  const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const gmailUser = process.env.GMAIL_USER!;
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: gmailUser, pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s/g, '') }
  });

  try {
    const result = await sendSubscriptionReminders({
      days: Number(process.env.REMINDER_DAYS) || 3,
      siteUrl: process.env.SITE_URL || 'https://zakupi.vercel.app',
      listDue: async days => {
        const { data, error } = await supabase.rpc('subscriptions_due_for_reminder', { p_days: days });
        if (error) throw new Error(error.message);
        return (Array.isArray(data) ? data : []).map(
          (row: { user_id: string; email: string; paid_until: string }): DueSubscription => ({
            userId: row.user_id,
            email: row.email,
            paidUntil: row.paid_until
          })
        );
      },
      markReminded: async (userId, paidUntil) => {
        const { error } = await supabase.rpc('mark_subscription_reminded', { p_user: userId, p_paid_until: paidUntil });
        if (error) throw new Error(error.message);
      },
      send: async mail => {
        await transport.sendMail({ from: { name: 'Калькулятор тендеров', address: gmailUser }, ...mail });
      }
    });
    console.log('subscription reminders', JSON.stringify(result));
    return json(result, result.failed.length > 0 && result.sent === 0 ? 500 : 200);
  } catch (error) {
    console.error('subscription reminders failed', error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
}
