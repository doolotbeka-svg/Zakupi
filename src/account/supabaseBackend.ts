import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { SavedTender } from '../types';
import { MAX_SAVED_TENDERS, sanitizeSavedTenders } from '../utils/storage';
import { AccessInfo, normalizeCode } from './access';
import { AccountBackend, AccountError, AccountUser } from './backend';

interface ErrorLike {
  status?: number;
  code?: string;
  message?: string;
  name?: string;
}

export function toAccountUser(user: User | null | undefined): AccountUser | null {
  return user ? { id: user.id, email: user.email ?? '' } : null;
}

/** Maps Supabase auth errors to the few cases the interface explains to the user. */
export function describeAuthError(error: ErrorLike): AccountError {
  const code = error.code ?? '';
  const message = error.message ?? '';
  // Exact error codes first, message text only as a fallback for older responses without a code
  if (error.status === 429 || code.includes('rate_limit')) return new AccountError('rate_limit', message);
  if (code === 'email_address_invalid' || code === 'validation_failed') return new AccountError('invalid_email', message);
  if (
    code === 'email_address_not_authorized' ||
    code === 'signup_disabled' ||
    code === 'email_provider_disabled' ||
    code === 'otp_disabled'
  ) {
    return new AccountError('unavailable', message);
  }
  if (code === 'otp_expired' || code === 'invalid_credentials') return new AccountError('invalid_code', message);
  if (/not authorized/i.test(message)) return new AccountError('unavailable', message);
  if (/token has expired|invalid/i.test(message)) return new AccountError('invalid_code', message);
  if (error.name === 'AuthRetryableFetchError' || /fetch|network/i.test(message)) return new AccountError('network', message);
  return new AccountError('unknown', message);
}

/** Maps database (PostgREST) errors. 42501 is a row level security refusal: no subscription. */
export function describeDbError(error: ErrorLike): AccountError {
  if (error.code === '42501' || error.code === 'P0001') return new AccountError('forbidden', error.message);
  if (/fetch|network/i.test(error.message ?? '')) return new AccountError('network', error.message);
  return new AccountError('unknown', error.message);
}

export interface SavedTenderRow {
  user_id: string;
  id: string;
  title: string;
  data: { params: unknown; items: unknown; discount: unknown };
  updated_at: string;
}

export function savedTenderToRow(userId: string, tender: SavedTender): SavedTenderRow {
  return {
    user_id: userId,
    id: tender.id,
    title: tender.title,
    data: { params: tender.params, items: tender.items, discount: tender.discount },
    updated_at: tender.date
  };
}

/** Rows come from the database, so they are validated like anything read from storage. */
export function rowsToSavedTenders(rows: unknown): SavedTender[] {
  if (!Array.isArray(rows)) return [];
  return sanitizeSavedTenders(
    rows.map(row => {
      const r = (typeof row === 'object' && row !== null ? row : {}) as Record<string, unknown>;
      const data = (typeof r.data === 'object' && r.data !== null ? r.data : {}) as Record<string, unknown>;
      return { id: r.id, title: r.title, date: r.updated_at, params: data.params, items: data.items, discount: data.discount };
    })
  );
}

export function createSupabaseBackend(url: string, key: string, client?: SupabaseClient): AccountBackend {
  const supabase =
    client ??
    createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Login uses typed codes, not links; the #s=... share links must not be parsed as auth data
        detectSessionInUrl: false
      }
    });

  return {
    async getUser() {
      const { data } = await supabase.auth.getSession();
      return toAccountUser(data.session?.user);
    },

    onUserChange(listener) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => listener(toAccountUser(session?.user)));
      return () => data.subscription.unsubscribe();
    },

    async sendCode(email) {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
      if (error) throw describeAuthError(error);
    },

    async verifyCode(email, code) {
      const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: normalizeCode(code), type: 'email' });
      if (error) throw describeAuthError(error);
      const user = toAccountUser(data.user);
      if (!user) throw new AccountError('invalid_code');
      return user;
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw describeAuthError(error);
    },

    async getAccess(user): Promise<AccessInfo> {
      const settings = await supabase.from('app_settings').select('paywall_enabled').maybeSingle();
      if (settings.error) throw describeDbError(settings.error);
      const paywallEnabled = settings.data?.paywall_enabled === true;
      if (!user) return { paywallEnabled, paidUntil: null, plan: null };

      const subscription = await supabase
        .from('subscriptions')
        .select('paid_until, plan')
        .eq('user_id', user.id)
        .maybeSingle();
      if (subscription.error) throw describeDbError(subscription.error);
      return {
        paywallEnabled,
        paidUntil: typeof subscription.data?.paid_until === 'string' ? subscription.data.paid_until : null,
        plan: typeof subscription.data?.plan === 'string' ? subscription.data.plan : null
      };
    },

    async listSaved(user) {
      const { data, error } = await supabase
        .from('saved_tenders')
        .select('id, title, data, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(MAX_SAVED_TENDERS);
      if (error) throw describeDbError(error);
      return rowsToSavedTenders(data);
    },

    async saveTender(user, tender) {
      const { error } = await supabase
        .from('saved_tenders')
        .upsert(savedTenderToRow(user.id, tender), { onConflict: 'user_id,id' });
      if (error) throw describeDbError(error);
    },

    async deleteTender(user, id) {
      const { error } = await supabase.from('saved_tenders').delete().eq('user_id', user.id).eq('id', id);
      if (error) throw describeDbError(error);
    }
  };
}
