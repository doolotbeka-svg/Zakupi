import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Feature } from '../config/plans';
import { AccessInfo, OPEN_ACCESS, canUseFeature } from './access';
import { AccountBackend, AccountUser } from './backend';

export interface AccountContextValue {
  /** Accounts are set up for this site */
  configured: boolean;
  backend: AccountBackend | null;
  user: AccountUser | null;
  /** The stored session has been checked */
  ready: boolean;
  /** The site settings (paywall, login requirement) have been loaded or failed to load */
  accessReady: boolean;
  access: AccessInfo;
  /** The visitor has to log in before the calculator is shown */
  mustSignIn: boolean;
  canUse: (feature: Feature) => boolean;
  /** True when the feature may be used; otherwise opens the account window explaining why. */
  requireFeature: (feature: Feature) => boolean;
  isAccountOpen: boolean;
  /** The paid feature the user tried to use, shown in the account window */
  lockedFeature: Feature | null;
  openAccount: (lockedFeature?: Feature) => void;
  closeAccount: () => void;
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccess: () => Promise<void>;
}

const noop = () => {};
const resolved = async () => {};

/** Used when accounts are not set up: everything is free, nothing to sign in to. */
const NO_ACCOUNTS: AccountContextValue = {
  configured: false,
  backend: null,
  user: null,
  ready: true,
  accessReady: true,
  access: OPEN_ACCESS,
  mustSignIn: false,
  canUse: () => true,
  requireFeature: () => true,
  isAccountOpen: false,
  lockedFeature: null,
  openAccount: noop,
  closeAccount: noop,
  sendCode: resolved,
  verifyCode: resolved,
  signOut: resolved,
  refreshAccess: resolved
};

const AccountContext = createContext<AccountContextValue>(NO_ACCOUNTS);

export function useAccount(): AccountContextValue {
  return useContext(AccountContext);
}

export const AccountProvider: React.FC<{ backend: AccountBackend | null; children: React.ReactNode }> = ({
  backend,
  children
}) => {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [ready, setReady] = useState(!backend);
  const [access, setAccess] = useState<AccessInfo>(OPEN_ACCESS);
  const [accessReady, setAccessReady] = useState(!backend);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [lockedFeature, setLockedFeature] = useState<Feature | null>(null);
  const accessRequest = useRef(0);

  useEffect(() => {
    if (!backend) return;
    let active = true;
    backend
      .getUser()
      .then(found => active && setUser(found))
      .catch(error => console.error('Could not restore the session', error))
      .finally(() => active && setReady(true));
    const unsubscribe = backend.onUserChange(changed => active && setUser(changed));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [backend]);

  const refreshAccess = useCallback(async () => {
    if (!backend) return;
    const request = ++accessRequest.current;
    try {
      const info = await backend.getAccess(user);
      if (request === accessRequest.current) setAccess(info);
    } catch (error) {
      // Keep the last known state; the database still enforces access to cloud data.
      // If the settings never load, the calculator stays open rather than locking everyone out.
      console.error('Could not load the subscription', error);
    } finally {
      if (request === accessRequest.current) setAccessReady(true);
    }
  }, [backend, user]);

  useEffect(() => {
    void refreshAccess();
  }, [refreshAccess]);

  const value = useMemo<AccountContextValue>(() => {
    if (!backend) return NO_ACCOUNTS;

    const canUse = (feature: Feature) =>
      canUseFeature(feature, { configured: true, signedIn: user !== null, access });

    const openAccount = (feature?: Feature) => {
      setLockedFeature(feature ?? null);
      setIsAccountOpen(true);
    };

    return {
      configured: true,
      backend,
      user,
      ready,
      accessReady,
      access,
      mustSignIn: access.loginRequired && user === null,
      canUse,
      requireFeature: feature => {
        if (canUse(feature)) return true;
        openAccount(feature);
        return false;
      },
      isAccountOpen,
      lockedFeature,
      openAccount,
      closeAccount: () => {
        setIsAccountOpen(false);
        setLockedFeature(null);
      },
      sendCode: email => backend.sendCode(email),
      verifyCode: async (email, code) => {
        setUser(await backend.verifyCode(email, code));
      },
      signOut: async () => {
        await backend.signOut();
        setUser(null);
      },
      refreshAccess
    };
  }, [backend, user, ready, accessReady, access, isAccountOpen, lockedFeature, refreshAccess]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
};
