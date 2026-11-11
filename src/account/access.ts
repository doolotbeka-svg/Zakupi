import { Feature, PREMIUM_FEATURES } from '../config/plans';

export interface AccessInfo {
  /** Paid features are locked for users without an active subscription */
  paywallEnabled: boolean;
  /** Signed-out visitors see only the introduction page until they log in */
  loginRequired: boolean;
  /** ISO date the subscription is paid until, or null */
  paidUntil: string | null;
  plan: string | null;
}

export const OPEN_ACCESS: AccessInfo = { paywallEnabled: false, loginRequired: false, paidUntil: null, plan: null };

export type SubscriptionStatus = 'active' | 'expired' | 'none';

export function subscriptionStatus(paidUntil: string | null, now: Date = new Date()): SubscriptionStatus {
  if (!paidUntil) return 'none';
  const time = Date.parse(paidUntil);
  if (Number.isNaN(time)) return 'none';
  return time > now.getTime() ? 'active' : 'expired';
}

/** Whole days left, rounded up (a subscription ending later today counts as 1 day). */
export function daysLeft(paidUntil: string | null, now: Date = new Date()): number {
  if (subscriptionStatus(paidUntil, now) !== 'active') return 0;
  return Math.ceil((Date.parse(paidUntil!) - now.getTime()) / 86_400_000);
}

export function isPremiumFeature(feature: Feature): boolean {
  return PREMIUM_FEATURES.includes(feature);
}

export interface AccessContext {
  /** Accounts are set up for this site (Supabase keys are present) */
  configured: boolean;
  signedIn: boolean;
  access: AccessInfo;
}

export function canUseFeature(feature: Feature, ctx: AccessContext, now: Date = new Date()): boolean {
  if (!ctx.configured || !isPremiumFeature(feature) || !ctx.access.paywallEnabled) return true;
  return ctx.signedIn && subscriptionStatus(ctx.access.paidUntil, now) === 'active';
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** One-time codes are 6–10 digits depending on the project settings. */
export function normalizeCode(code: string): string {
  return code.replace(/\D/g, '');
}

export function isValidCode(code: string): boolean {
  return /^\d{6,10}$/.test(normalizeCode(code));
}
