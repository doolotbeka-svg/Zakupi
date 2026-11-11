import { SpecificationItem, TenderParams } from '../types';
import { normalizeTitle, sanitizeDiscount, sanitizeItems, sanitizeParams } from './storage';

export interface SharedTender {
  title: string;
  params: TenderParams;
  items: SpecificationItem[];
  discount: number;
}

const HASH_KEY = 's';
/** Longer links are still valid, but some messengers cut them. */
export const LONG_LINK_LENGTH = 6000;

const toBase64Url = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (encoded: string): string => {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
};

/** Packs a calculation into a compact URL-safe string. */
export function encodeSharedTender(tender: SharedTender): string {
  const payload = {
    v: 1,
    t: normalizeTitle(tender.title),
    d: tender.discount,
    p: tender.params,
    // Rows as tuples keep the link short; totals are recalculated on import
    i: tender.items.map(item => [item.name, item.unit, item.quantity, item.unitPrice])
  };
  return toBase64Url(JSON.stringify(payload));
}

/** Unpacks and validates a shared calculation. Returns null for anything that is not one. */
export function decodeSharedTender(encoded: string): SharedTender | null {
  try {
    const payload: unknown = JSON.parse(fromBase64Url(encoded));
    if (typeof payload !== 'object' || payload === null) return null;
    const data = payload as Record<string, unknown>;
    if (data.v !== 1 || typeof data.p !== 'object' || data.p === null || !Array.isArray(data.i)) return null;

    const rows = data.i
      .filter((row): row is unknown[] => Array.isArray(row))
      .map((row, idx) => ({
        id: `item-shared-${idx}`,
        name: typeof row[0] === 'string' ? row[0] : '',
        unit: typeof row[1] === 'string' ? row[1] : '',
        quantity: row[2],
        unitPrice: row[3]
      }));

    return {
      title: typeof data.t === 'string' ? normalizeTitle(data.t) : '',
      params: sanitizeParams(data.p),
      items: sanitizeItems(rows) ?? [],
      discount: sanitizeDiscount(data.d)
    };
  } catch {
    return null;
  }
}

/** Builds a link to the app that opens the given calculation. */
export function buildShareUrl(tender: SharedTender, baseUrl: string): string {
  const url = new URL(baseUrl);
  url.hash = `${HASH_KEY}=${encodeSharedTender(tender)}`;
  return url.toString();
}

/** Reads a shared calculation from a location hash such as "#s=...". */
export function readSharedTenderFromHash(hash: string): SharedTender | null {
  const match = /^#?s=([A-Za-z0-9_-]+)$/.exec(hash);
  return match ? decodeSharedTender(match[1]) : null;
}
