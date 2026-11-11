import { describe, expect, it } from 'vitest';
import {
  OPEN_ACCESS,
  canUseFeature,
  daysLeft,
  isPremiumFeature,
  isValidCode,
  isValidEmail,
  normalizeCode,
  subscriptionStatus
} from '../access';
import { PREMIUM_FEATURES } from '../../config/plans';

const now = new Date('2026-11-11T12:00:00Z');
const paywall = (paidUntil: string | null) => ({ paywallEnabled: true, paidUntil, plan: null });

describe('subscriptionStatus / daysLeft', () => {
  it('различает активную, закончившуюся и отсутствующую подписку', () => {
    expect(subscriptionStatus('2026-12-11T12:00:00Z', now)).toBe('active');
    expect(subscriptionStatus('2026-11-11T11:59:59Z', now)).toBe('expired');
    expect(subscriptionStatus(null, now)).toBe('none');
    expect(subscriptionStatus('не дата', now)).toBe('none');
  });

  it('считает оставшиеся дни с округлением вверх', () => {
    expect(daysLeft('2026-12-11T12:00:00Z', now)).toBe(30);
    expect(daysLeft('2026-11-11T13:00:00Z', now)).toBe(1);
    expect(daysLeft('2026-11-10T12:00:00Z', now)).toBe(0);
    expect(daysLeft(null, now)).toBe(0);
  });
});

describe('canUseFeature', () => {
  it('без настроенных аккаунтов всё бесплатно', () => {
    for (const feature of PREMIUM_FEATURES) {
      expect(canUseFeature(feature, { configured: false, signedIn: false, access: paywall(null) }, now)).toBe(true);
    }
  });

  it('при выключенном переключателе всё бесплатно, даже без входа', () => {
    expect(canUseFeature('print', { configured: true, signedIn: false, access: OPEN_ACCESS }, now)).toBe(true);
  });

  it('при включённом переключателе платные функции требуют активной подписки', () => {
    const ctx = (signedIn: boolean, paidUntil: string | null) => ({ configured: true, signedIn, access: paywall(paidUntil) });

    expect(canUseFeature('print', ctx(false, null), now)).toBe(false);
    expect(canUseFeature('print', ctx(true, null), now)).toBe(false);
    expect(canUseFeature('print', ctx(true, '2026-11-01T00:00:00Z'), now)).toBe(false);
    expect(canUseFeature('print', ctx(true, '2026-12-01T00:00:00Z'), now)).toBe(true);
    // Подписка без входа не считается
    expect(canUseFeature('print', ctx(false, '2026-12-01T00:00:00Z'), now)).toBe(false);
  });

  it('список платных функций', () => {
    expect(PREMIUM_FEATURES).toEqual(['savedTenders', 'excel', 'print', 'share']);
    expect(PREMIUM_FEATURES.every(isPremiumFeature)).toBe(true);
  });
});

describe('проверка email и кода', () => {
  it('isValidEmail', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('  user@mail.kg ')).toBe(true);
    expect(isValidEmail('user@example')).toBe(false);
    expect(isValidEmail('user example.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('isValidCode принимает 6–10 цифр, пробелы и дефисы игнорируются', () => {
    expect(isValidCode('123456')).toBe(true);
    expect(isValidCode('123 456')).toBe(true);
    expect(isValidCode('12345678')).toBe(true);
    expect(isValidCode('12345')).toBe(false);
    expect(isValidCode('abcdef')).toBe(false);
    expect(normalizeCode(' 12-34 56 ')).toBe('123456');
  });
});
