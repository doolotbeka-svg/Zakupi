import { useEffect, useRef, useState } from 'react';
import App from './App';
import { Landing } from './components/Landing';
import { AdminPanel } from './components/AdminPanel';
import { useAccount } from './account/AccountContext';

const STORAGE_KEY_LOGIN_REQUIRED = 'kg_tender_calc_login_required_v1';

const readCachedLoginRequired = (): boolean | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LOGIN_REQUIRED);
    if (saved === 'true') return true;
    if (saved === 'false') return false;
  } catch {
    // ignore
  }
  return null;
};

const Splash = () => (
  <div className="min-h-screen bg-slate-100/70 flex items-center justify-center" role="status" aria-label="Загрузка / Жүктөлүүдө">
    <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-emerald-600 animate-spin" />
  </div>
);

/**
 * Chooses between the calculator and the introduction page. When the site requires login
 * (app_settings.login_required), signed-out visitors see only the introduction page.
 */
export default function Root() {
  const account = useAccount();
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const cachedRequired = useRef(readCachedLoginRequired()).current;

  // Remember the setting so returning visitors do not wait for it on every visit
  useEffect(() => {
    if (!account.configured || !account.accessReady) return;
    try {
      localStorage.setItem(STORAGE_KEY_LOGIN_REQUIRED, String(account.access.loginRequired));
    } catch {
      // ignore
    }
  }, [account.configured, account.accessReady, account.access.loginRequired]);

  const required = !account.configured ? false : account.accessReady ? account.access.loginRequired : cachedRequired;
  const showLanding = required === true && account.ready && account.user === null;

  // After signing in from the introduction page go straight to the calculator
  const wasLanding = useRef(false);
  const { closeAccount, user } = account;
  useEffect(() => {
    if (wasLanding.current && user) closeAccount();
    wasLanding.current = showLanding;
  }, [showLanding, user, closeAccount]);

  // The administrator panel has its own sign-in screen and ignores the guest introduction page
  if (hash === '#admin') return <AdminPanel />;
  if (required === null || (required && !account.ready)) return <Splash />;
  if (showLanding) return <Landing />;
  return <App />;
}
