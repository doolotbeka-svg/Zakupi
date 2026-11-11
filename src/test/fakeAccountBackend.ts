import { AccessInfo, OPEN_ACCESS } from '../account/access';
import { AccountBackend, AccountError, AccountUser } from '../account/backend';
import { SavedTender } from '../types';

export const VALID_CODE = '123456';

/** In-memory stand-in for Supabase used by interface tests. */
export class FakeAccountBackend implements AccountBackend {
  user: AccountUser | null = null;
  access: AccessInfo = { ...OPEN_ACCESS };
  saved = new Map<string, SavedTender[]>();
  sentCodes: string[] = [];
  failSaves = false;
  failAccess = false;
  private listeners = new Set<(user: AccountUser | null) => void>();

  async getUser() {
    return this.user;
  }

  onUserChange(listener: (user: AccountUser | null) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async sendCode(email: string) {
    if (email === 'limited@example.com') throw new AccountError('rate_limit');
    if (email === 'outsider@example.com') throw new AccountError('unavailable');
    this.sentCodes.push(email);
  }

  async verifyCode(email: string, code: string) {
    if (code !== VALID_CODE) throw new AccountError('invalid_code');
    this.user = { id: `user-${email}`, email };
    return this.user;
  }

  async signOut() {
    this.user = null;
    this.listeners.forEach(listener => listener(null));
  }

  async getAccess(user: AccountUser | null): Promise<AccessInfo> {
    if (this.failAccess) throw new AccountError('network');
    return user ? { ...this.access } : { ...this.access, paidUntil: null, plan: null };
  }

  private hasAccess() {
    return !this.access.paywallEnabled || (this.access.paidUntil !== null && Date.parse(this.access.paidUntil) > Date.now());
  }

  async listSaved(user: AccountUser) {
    if (!this.hasAccess()) return [];
    return [...(this.saved.get(user.id) ?? [])];
  }

  async saveTender(user: AccountUser, tender: SavedTender) {
    if (this.failSaves || !this.hasAccess()) throw new AccountError('forbidden');
    const list = (this.saved.get(user.id) ?? []).filter(t => t.id !== tender.id);
    this.saved.set(user.id, [tender, ...list]);
  }

  async deleteTender(user: AccountUser, id: string) {
    this.saved.set(user.id, (this.saved.get(user.id) ?? []).filter(t => t.id !== id));
  }
}
