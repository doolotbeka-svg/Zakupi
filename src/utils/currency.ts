import { CurrencySymbol } from '../types';

/**
 * All amounts in the app are entered and calculated in soms (KGS).
 * RUB is a display currency: amounts are converted with a manually entered rate.
 */
export const DEFAULT_KGS_PER_RUB = 1;

let kgsPerRub = DEFAULT_KGS_PER_RUB;

export function sanitizeRate(raw: unknown): number {
  const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.'));
  return Number.isFinite(num) && num > 0 && num <= 1000 ? num : DEFAULT_KGS_PER_RUB;
}

/** Sets how many soms one ruble costs. Used by every amount shown in RUB. */
export function setKgsPerRub(rate: number): void {
  kgsPerRub = sanitizeRate(rate);
}

export function getKgsPerRub(): number {
  return kgsPerRub;
}

/** Converts an amount in soms into the display currency. */
export function convertFromKgs(amountKgs: number, currency: CurrencySymbol): number {
  return currency === 'RUB' ? amountKgs / kgsPerRub : amountKgs;
}
