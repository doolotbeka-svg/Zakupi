/**
 * Days left on a subscription, counted in calendar days in Bishkek (UTC+6, no daylight saving):
 * a subscription valid until 14.11 shows "2 days" on 12.11 whatever the time of day.
 * No imports, so the server code (Vercel functions, plain Node ESM) can use it too.
 */
const BISHKEK_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

const bishkekDay = (time: number) => Math.floor((time + BISHKEK_OFFSET_MS) / DAY_MS);

/** 0 once the subscription has ended; at least 1 while it is still active (even on its last day). */
export function calendarDaysLeft(paidUntil: string, now: Date = new Date()): number {
  const end = Date.parse(paidUntil);
  if (Number.isNaN(end) || end <= now.getTime()) return 0;
  return Math.max(1, bishkekDay(end) - bishkekDay(now.getTime()));
}
