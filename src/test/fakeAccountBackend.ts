import { AccessInfo, OPEN_ACCESS } from '../account/access';
import { AccountBackend, AccountError, AccountUser, AdminPlan, AdminUser, PaymentRequest } from '../account/backend';
import { PLANS, Plan } from '../config/plans';
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
  plans: Plan[] = PLANS.map(p => ({ ...p }));
  payments: (PaymentRequest & { userId: string })[] = [];
  admins = new Set<string>();
  private nextPayment = 1;
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
    const known = this.registry.get(this.user.id);
    this.registry.set(this.user.id, {
      email,
      createdAt: known?.createdAt ?? new Date(Date.now() - this.registry.size * 1000).toISOString(),
      lastSignInAt: new Date().toISOString()
    });
    return this.user;
  }

  /** Users who have signed in at least once */
  registry = new Map<string, { email: string; createdAt: string; lastSignInAt: string | null }>();
  hiddenPlans = new Set<string>();

  async signOut() {
    this.user = null;
    this.listeners.forEach(listener => listener(null));
  }

  async getAccess(user: AccountUser | null): Promise<AccessInfo> {
    if (this.failAccess) throw new AccountError('network');
    if (!user) return { ...this.access, paidUntil: null, plan: null };
    const granted = this.paidUntilByUser.get(user.id);
    return granted ? { ...this.access, paidUntil: granted, plan: 'paid' } : { ...this.access };
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

  private strip({ userId: _userId, ...payment }: PaymentRequest & { userId: string }): PaymentRequest {
    return { ...payment };
  }

  async listPlans() {
    return this.plans.filter(p => !this.hiddenPlans.has(p.id)).map(p => ({ ...p }));
  }

  async getOpenPayment(user: AccountUser) {
    const open = this.payments.find(p => p.userId === user.id && p.status === 'pending');
    return open ? this.strip(open) : null;
  }

  async requestPayment(planId: string) {
    const user = this.user;
    if (!user) throw new AccountError('forbidden');
    const plan = this.plans.find(p => p.id === planId && !this.hiddenPlans.has(p.id));
    if (!plan || plan.priceKgs === null) throw new AccountError('unknown');
    for (const p of this.payments) {
      if (p.userId === user.id && p.status === 'pending' && !p.reportedAt) p.status = 'cancelled';
    }
    if (this.payments.some(p => p.userId === user.id && p.status === 'pending')) throw new AccountError('forbidden');
    const payment = {
      id: `pay-${this.nextPayment}`,
      userId: user.id,
      email: user.email,
      plan: plan.id,
      months: plan.months,
      amountKgs: plan.priceKgs,
      reference: `ZK-${String(10000 + this.nextPayment++)}`,
      payerNote: null,
      status: 'pending' as const,
      reportedAt: null,
      createdAt: new Date().toISOString()
    };
    this.payments.push(payment);
    return this.strip(payment);
  }

  async reportPayment(id: string, note: string) {
    const payment = this.payments.find(p => p.id === id && p.userId === this.user?.id && p.status === 'pending');
    if (!payment) throw new AccountError('unknown');
    payment.reportedAt = new Date().toISOString();
    payment.payerNote = note.trim() || null;
    return this.strip(payment);
  }

  async cancelPayment(id: string) {
    const payment = this.payments.find(p => p.id === id && p.userId === this.user?.id && p.status === 'pending' && !p.reportedAt);
    if (!payment) throw new AccountError('unknown');
    payment.status = 'cancelled';
  }

  async isAdmin() {
    return this.user !== null && this.admins.has(this.user.email.toLowerCase());
  }

  async listOpenPayments() {
    if (!(await this.isAdmin())) return [];
    return this.payments
      .filter(p => p.status === 'pending')
      .sort((a, b) => Number(b.reportedAt !== null) - Number(a.reportedAt !== null))
      .map(p => this.strip(p));
  }

  async approvePayment(id: string) {
    if (!(await this.isAdmin())) throw new AccountError('forbidden');
    const payment = this.payments.find(p => p.id === id && p.status === 'pending');
    if (!payment) throw new AccountError('unknown');
    payment.status = 'approved';
    // Single-user fake: the subscription belongs to whoever paid
    const from = this.access.paidUntil && Date.parse(this.access.paidUntil) > Date.now() ? new Date(this.access.paidUntil) : new Date();
    from.setMonth(from.getMonth() + payment.months);
    this.paidUntilByUser.set(payment.userId, from.toISOString());
    return from.toISOString();
  }

  async rejectPayment(id: string) {
    if (!(await this.isAdmin())) throw new AccountError('forbidden');
    const payment = this.payments.find(p => p.id === id && p.status === 'pending');
    if (!payment) throw new AccountError('unknown');
    payment.status = 'rejected';
  }

  /** Subscriptions granted by approvals, per user */
  paidUntilByUser = new Map<string, string>();

  private async requireAdmin() {
    if (!(await this.isAdmin())) throw new AccountError('forbidden');
  }

  async listRecentPayments() {
    await this.requireAdmin();
    return [...this.payments].reverse().map(p => this.strip(p));
  }

  async updateSettings(changes: { paywallEnabled?: boolean; loginRequired?: boolean }) {
    await this.requireAdmin();
    this.access = {
      ...this.access,
      paywallEnabled: changes.paywallEnabled ?? this.access.paywallEnabled,
      loginRequired: changes.loginRequired ?? this.access.loginRequired
    };
  }

  async adminListPlans(): Promise<AdminPlan[]> {
    await this.requireAdmin();
    return this.plans.map(p => ({ id: p.id, months: p.months, priceKgs: p.priceKgs ?? 0, active: !this.hiddenPlans.has(p.id) }));
  }

  async updatePlan(id: string, priceKgs: number, active: boolean) {
    await this.requireAdmin();
    const plan = this.plans.find(p => p.id === id);
    if (!plan || !(priceKgs > 0)) throw new AccountError('unknown');
    plan.priceKgs = priceKgs;
    if (active) this.hiddenPlans.delete(id);
    else this.hiddenPlans.add(id);
  }

  async listUsers(search: string): Promise<AdminUser[]> {
    await this.requireAdmin();
    const q = search.trim().toLowerCase();
    return [...this.registry.entries()]
      .filter(([, u]) => !q || u.email.toLowerCase().includes(q))
      .sort((a, b) => Date.parse(b[1].createdAt) - Date.parse(a[1].createdAt))
      .map(([id, u]) => ({
        id,
        email: u.email,
        createdAt: u.createdAt,
        lastSignInAt: u.lastSignInAt,
        paidUntil: this.paidUntilByUser.get(id) ?? null,
        plan: this.paidUntilByUser.has(id) ? 'manual' : null,
        isAdmin: this.admins.has(u.email.toLowerCase())
      }));
  }

  async extendSubscription(userId: string, months: number) {
    await this.requireAdmin();
    const current = this.paidUntilByUser.get(userId);
    const from = current && Date.parse(current) > Date.now() ? new Date(current) : new Date();
    from.setMonth(from.getMonth() + months);
    this.paidUntilByUser.set(userId, from.toISOString());
    return from.toISOString();
  }

  async setSubscription(userId: string, paidUntil: string | null) {
    await this.requireAdmin();
    if (paidUntil) this.paidUntilByUser.set(userId, paidUntil);
    else this.paidUntilByUser.delete(userId);
  }
}
