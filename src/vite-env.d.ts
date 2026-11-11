/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL, e.g. https://abcd.supabase.co. Accounts are off when empty. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable (or legacy anon) key — public by design, protected by row level security */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
