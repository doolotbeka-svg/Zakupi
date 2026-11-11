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

export type AccountErrorKind =
  | 'rate_limit'
  | 'invalid_code'
  | 'invalid_email'
  /** Login is switched off or emails cannot be sent to this address yet (no own mail service) */
  | 'unavailable'
  | 'forbidden'
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
  /** Administrator: open payment requests of all users, reported ones first */
  listOpenPayments(): Promise<PaymentRequest[]>;
  /** Administrator: the money arrived — extends the subscription; returns the new end date */
  approvePayment(id: string): Promise<string>;
  rejectPayment(id: string): Promise<void>;
}
