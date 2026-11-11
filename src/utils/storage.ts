import { SavedTender, SpecificationItem, TenderParams } from '../types';
import { INITIAL_TENDER_PARAMS } from '../data/defaultTemplates';
import { TAX_REGIMES } from './taxCalculator';

/** The slider covers the usual range; larger drops can be typed into the exact field. */
export const SLIDER_MAX_DISCOUNT = 40;
export const MAX_DISCOUNT = 99.99;
export const DEFAULT_DISCOUNT = 5;
/** Upper bound for the saved calculations list, to stay well within the localStorage quota. */
export const MAX_SAVED_TENDERS = 50;
export const MAX_TITLE_LENGTH = 80;

const toNonNegative = (value: unknown, fallback: number): number => {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(num) && num >= 0 ? num : fallback;
};

/** Validates specification rows restored from storage. Returns null when the data is not a list. */
export function sanitizeItems(raw: unknown): SpecificationItem[] | null {
  if (!Array.isArray(raw)) return null;
  return raw
    .filter((it): it is Record<string, unknown> => typeof it === 'object' && it !== null)
    .map((it, idx) => {
      const quantity = toNonNegative(it.quantity, 0);
      const unitPrice = toNonNegative(it.unitPrice, 0);
      return {
        id: typeof it.id === 'string' && it.id ? it.id : `item-restored-${idx}`,
        name: typeof it.name === 'string' ? it.name : '',
        unit: typeof it.unit === 'string' ? it.unit : '',
        quantity,
        unitPrice,
        total: Math.round(quantity * unitPrice * 100) / 100
      };
    });
}

/** Validates tender parameters restored from storage, falling back to defaults field by field. */
export function sanitizeParams(raw: unknown): TenderParams {
  if (typeof raw !== 'object' || raw === null) return INITIAL_TENDER_PARAMS;
  const p = raw as Record<string, unknown>;
  const d = INITIAL_TENDER_PARAMS;
  return {
    plannedPrice: toNonNegative(p.plannedPrice, d.plannedPrice),
    taxRegime: typeof p.taxRegime === 'string' && p.taxRegime in TAX_REGIMES
      ? (p.taxRegime as TenderParams['taxRegime'])
      : d.taxRegime,
    customTaxRate: Math.min(100, toNonNegative(p.customTaxRate, d.customTaxRate)),
    customTaxBase: p.customTaxBase === 'profit' ? 'profit' : 'revenue',
    inputVatIncluded: typeof p.inputVatIncluded === 'boolean' ? p.inputVatIncluded : d.inputVatIncluded,
    logisticsCost: toNonNegative(p.logisticsCost, d.logisticsCost),
    guaranteeType: p.guaranteeType === 'fixed' ? 'fixed' : 'percent',
    guaranteeValue: toNonNegative(p.guaranteeValue, d.guaranteeValue),
    otherExpenses: toNonNegative(p.otherExpenses, d.otherExpenses),
    directGoodsCost: toNonNegative(p.directGoodsCost, d.directGoodsCost),
    syncWithSpec: typeof p.syncWithSpec === 'boolean' ? p.syncWithSpec : d.syncWithSpec
  };
}

export function sanitizeDiscount(raw: unknown, fallback = DEFAULT_DISCOUNT): number {
  const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
  return Number.isFinite(num) && num >= 0 && num <= MAX_DISCOUNT ? num : fallback;
}

export function normalizeTitle(title: string): string {
  return title.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_LENGTH);
}

const titleKey = (title: string) => normalizeTitle(title).toLowerCase();

/** Validates the saved calculations list restored from storage; broken entries are dropped. */
export function sanitizeSavedTenders(raw: unknown): SavedTender[] {
  if (!Array.isArray(raw)) return [];
  const seenIds = new Set<string>();
  const result: SavedTender[] = [];

  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const e = entry as Record<string, unknown>;
    const title = typeof e.title === 'string' ? normalizeTitle(e.title) : '';
    const items = sanitizeItems(e.items);
    if (!title || !items || typeof e.params !== 'object' || e.params === null) continue;

    let id = typeof e.id === 'string' && e.id ? e.id : `saved-restored-${result.length}`;
    while (seenIds.has(id)) id = `${id}-dup`;
    seenIds.add(id);

    result.push({
      id,
      title,
      date: typeof e.date === 'string' && !Number.isNaN(Date.parse(e.date)) ? e.date : new Date(0).toISOString(),
      params: sanitizeParams(e.params),
      items,
      discount: sanitizeDiscount(e.discount)
    });
    if (result.length >= MAX_SAVED_TENDERS) break;
  }
  return result;
}

export function findSavedByTitle(list: SavedTender[], title: string): SavedTender | undefined {
  const key = titleKey(title);
  return key ? list.find(t => titleKey(t.title) === key) : undefined;
}

export interface TenderSnapshot {
  title: string;
  params: TenderParams;
  items: SpecificationItem[];
  discount: number;
}

/**
 * Adds a calculation to the list, newest first. A calculation with the same title
 * (ignoring case and extra spaces) is overwritten and keeps its id.
 * Returns the list unchanged when the title is empty or the list is full.
 */
export function upsertSavedTender(
  list: SavedTender[],
  snapshot: TenderSnapshot,
  now: Date = new Date(),
  newId: string = `saved-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`
): SavedTender[] {
  const title = normalizeTitle(snapshot.title);
  if (!title) return list;

  const existing = findSavedByTitle(list, title);
  if (!existing && list.length >= MAX_SAVED_TENDERS) return list;

  const saved: SavedTender = {
    id: existing ? existing.id : newId,
    title,
    date: now.toISOString(),
    params: { ...snapshot.params },
    items: snapshot.items.map(item => ({ ...item })),
    discount: snapshot.discount
  };
  return [saved, ...list.filter(t => t !== existing)];
}

export function removeSavedTender(list: SavedTender[], id: string): SavedTender[] {
  return list.filter(t => t.id !== id);
}
