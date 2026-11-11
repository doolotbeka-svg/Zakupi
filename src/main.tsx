import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AccountProvider } from './account/AccountContext';
import type { AccountBackend } from './account/backend';
import './index.css';

/** Accounts are enabled only when the Supabase keys are set at build time. */
async function loadAccountBackend(): Promise<AccountBackend | null> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    // Loaded on demand so the calculator stays small when accounts are off
    const { createSupabaseBackend } = await import('./account/supabaseBackend');
    return createSupabaseBackend(url, key);
  } catch (error) {
    console.error('Accounts are unavailable', error);
    return null;
  }
}

loadAccountBackend().then(backend => {
  createRoot(document.getElementById('root')!).render(
    <AccountProvider backend={backend}>
      <App />
    </AccountProvider>
  );
});
