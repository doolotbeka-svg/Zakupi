/** Features that can be put behind the subscription. */
export type Feature = 'savedTenders' | 'excel' | 'print' | 'share';

/**
 * Features that need an active subscription once the paywall is switched on
 * (app_settings.paywall_enabled in the database). Everything else stays free.
 */
export const PREMIUM_FEATURES: readonly Feature[] = ['savedTenders', 'excel', 'print', 'share'];

export const FEATURE_NAMES: Record<Feature, { ky: string; ru: string }> = {
  savedTenders: { ky: 'Сакталган эсептөөлөр', ru: 'Сохранённые расчёты' },
  excel: { ky: 'Excel импорт жана экспорт', ru: 'Импорт и экспорт Excel' },
  print: { ky: 'Отчётту басып чыгаруу', ru: 'Печать отчёта' },
  share: { ky: 'Эсептөөгө шилтеме', ru: 'Ссылка на расчёт' }
};

export interface Plan {
  id: string;
  months: number;
  /** Price in soms. The database (subscription_plans) is the source of truth; these are the fallback. */
  priceKgs: number | null;
}

export const PLANS: readonly Plan[] = [
  { id: '1m', months: 1, priceKgs: 400 },
  { id: '3m', months: 3, priceKgs: 1000 },
  { id: '6m', months: 6, priceKgs: 2100 },
  { id: '12m', months: 12, priceKgs: 3700 }
];
