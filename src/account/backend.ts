import { SavedTender } from '../types';
import { AccessInfo } from './access';

export interface AccountUser {
  id: string;
  email: string;
}

export type AccountErrorKind =
  | 'rate_limit'
  | 'invalid_code'
  | 'invalid_email'
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
}
