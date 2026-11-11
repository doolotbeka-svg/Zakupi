import { SavedTender } from '../types';
import { AccessInfo } from './access';
import { Plan } from '../config/plans';

export interface AccountUser {
  id: string;
  email: string;
}

export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/** A request to pay for a plan by bank QR code, confirmed by an administrator. */
export interface PaymentRequest {
  id: string;
  email: string;
  plan: string;
  months: number;
  amountKgs: number;
  /** Short code the payer writes in the transfer comment, e.g. ZK-04821 */
  reference: string;
  payerNote: string | null;
  status: PaymentStatus;
  /** When the user pressed "I have paid"; null while the request is not paid yet */
  reportedAt: string | null;
  createdAt: string;
}

/** A plan as the administrator sees it, including hidden ones */
export interface AdminPlan {
  id: string;
  months: number;
  priceKgs: number;
  active: boolean;
}

/** A user as the administrator sees it */
export interface AdminUser {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  paidUntil: string | null;
  plan: string | null;
  isAdmin: boolean;
}

export type AccountErrorKind =
  | 'rate_limit'
  | 'invalid_code'
  | 'invalid_email'
  /** Login is switched off or emails cannot be sent to this address yet (no own mail service) */
  | 'unavailable'
  | 'forbidden'
  /** The admin panel session key is missing or expired: ask for the password again */
  | 'admin_session'
  | 'network'
  | 'unknown';

export class AccountError extends Error {
  constructor(public readonly kind: AccountErrorKind, message?: string) {
    super(message ?? kind);
    this.name = 'AccountError';
  }
}

/**
 * Everything the app needs from the accounts service. The production implementation
 * talks to Supabase (supabaseBackend.ts); tests use an in-memory fake.
 */
export interface AccountBackend {
  getUser(): Promise<AccountUser | null>;
  onUserChange(listener: (user: AccountUser | null) => void): () => void;
  /** Sends a one-time login code to the email; creates the account on first login */
  sendCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<AccountUser>;
  signOut(): Promise<void>;
  getAccess(user: AccountUser | null): Promise<AccessInfo>;
  listSaved(user: AccountUser): Promise<SavedTender[]>;
  saveTender(user: AccountUser, tender: SavedTender): Promise<void>;
  deleteTender(user: AccountUser, id: string): Promise<void>;

  /** Active plans with prices, ordered for display */
  listPlans(): Promise<Plan[]>;
  /** The user's open (not yet reviewed) payment request, if any */
  getOpenPayment(user: AccountUser): Promise<PaymentRequest | null>;
  /** Starts paying for a plan; replaces an open request the user has not reported as paid */
  requestPayment(planId: string): Promise<PaymentRequest>;
  /** The user says the transfer is done */
  reportPayment(id: string, note: string): Promise<PaymentRequest>;
  cancelPayment(id: string): Promise<void>;

  isAdmin(): Promise<boolean>;

  // Administrator panel. Every call below needs the session key from the panel password.
  adminPasswordIsSet(): Promise<boolean>;
  /** Checks the panel password: a session key, or none (locked = too many wrong attempts) */
  adminUnlock(password: string): Promise<{ token: string | null; locked: boolean }>;
  /** Sets (first time) or changes the panel password; a new session key, or null if the current one is wrong */
  adminSetPassword(newPassword: string, currentPassword: string | null): Promise<string | null>;
  /** Open requests (reported ones first) or the recent history of every status */
  listAdminPayments(token: string, openOnly: boolean): Promise<PaymentRequest[]>;
  /** The money arrived — extends the subscription; returns the new end date */
  approvePayment(token: string, id: string): Promise<string>;
  rejectPayment(token: string, id: string): Promise<void>;
  /** Site switches; undefined keeps the current value */
  updateSettings(token: string, changes: { paywallEnabled?: boolean; loginRequired?: boolean }): Promise<void>;
  adminListPlans(token: string): Promise<AdminPlan[]>;
  updatePlan(token: string, id: string, priceKgs: number, active: boolean): Promise<void>;
  /** Users with subscriptions, newest first; optional search by email */
  listUsers(token: string, search: string): Promise<AdminUser[]>;
  /** Adds months from the current end (or today); returns the new end date */
  extendSubscription(token: string, userId: string, months: number): Promise<string>;
  /** Exact end date; null removes the subscription */
  setSubscription(token: string, userId: string, paidUntil: string | null): Promise<void>;
}
