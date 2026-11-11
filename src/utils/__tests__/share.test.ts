import { describe, expect, it } from 'vitest';
import { DEFAULT_SPECIFICATION_ITEMS, INITIAL_TENDER_PARAMS, TENDER_TEMPLATES } from '../../data/defaultTemplates';
import { DEFAULT_DISCOUNT } from '../storage';
import { buildShareUrl, decodeSharedTender, encodeSharedTender, readSharedTenderFromHash } from '../share';

const tender = {
  title: 'Тендер №452 — мектеп',
  params: { ...INITIAL_TENDER_PARAMS, taxRegime: 'general' as const, customTaxRate: 7.5 },
  items: DEFAULT_SPECIFICATION_ITEMS,
  discount: 12.35
};

const withoutIds = <T extends { items: { id: string }[] }>(value: T) => ({
  ...value,
  items: value.items.map(({ id: _id, ...rest }) => rest)
});

describe('ссылка на расчёт', () => {
  it('кодирует и восстанавливает расчёт без потерь (кроме id строк)', () => {
    const decoded = decodeSharedTender(encodeSharedTender(tender));
    expect(decoded).not.toBeNull();
    expect(withoutIds(decoded!)).toEqual(withoutIds(tender));
  });

  it('строка безопасна для адреса: только буквы, цифры, «-» и «_»', () => {
    expect(encodeSharedTender(tender)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('работает для всех шаблонов и для пустой спецификации', () => {
    for (const template of TENDER_TEMPLATES) {
      const source = { title: '', params: template.params, items: template.items, discount: template.defaultDiscount };
      expect(withoutIds(decodeSharedTender(encodeSharedTender(source))!)).toEqual(withoutIds(source));
    }
    expect(decodeSharedTender(encodeSharedTender({ ...tender, items: [] }))!.items).toEqual([]);
  });

  it('выдаёт строкам уникальные идентификаторы', () => {
    const ids = decodeSharedTender(encodeSharedTender(tender))!.items.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('buildShareUrl и readSharedTenderFromHash согласованы', () => {
    const url = new URL(buildShareUrl(tender, 'https://example.com/app/'));
    expect(url.origin + url.pathname).toBe('https://example.com/app/');
    expect(url.hash.startsWith('#s=')).toBe(true);
    expect(readSharedTenderFromHash(url.hash)!.title).toBe(tender.title);
  });

  it('отклоняет мусор', () => {
    expect(readSharedTenderFromHash('')).toBeNull();
    expect(readSharedTenderFromHash('#section')).toBeNull();
    expect(readSharedTenderFromHash('#s=')).toBeNull();
    expect(readSharedTenderFromHash('#s=!!!')).toBeNull();
    expect(decodeSharedTender('не base64')).toBeNull();
    expect(decodeSharedTender(btoa('просто текст'.replace(/[^\x00-\x7F]/g, 'x')))).toBeNull();
    expect(decodeSharedTender(btoa('{"v":2,"p":{},"i":[]}'))).toBeNull();
    expect(decodeSharedTender(btoa('{"v":1,"p":null,"i":[]}'))).toBeNull();
    expect(decodeSharedTender(btoa('[1,2,3]'))).toBeNull();
  });

  it('чинит некорректные значения из чужой ссылки', () => {
    const decoded = decodeSharedTender(
      btoa(JSON.stringify({ v: 1, t: 123, d: 500, p: { taxRegime: 'x', plannedPrice: -1 }, i: [['A', 'kg', '2', 'bad'], 'junk'] }))
    )!;

    expect(decoded.title).toBe('');
    expect(decoded.discount).toBe(DEFAULT_DISCOUNT);
    expect(decoded.params.taxRegime).toBe(INITIAL_TENDER_PARAMS.taxRegime);
    expect(decoded.params.plannedPrice).toBe(INITIAL_TENDER_PARAMS.plannedPrice);
    expect(decoded.items).toEqual([{ id: 'item-shared-0', name: 'A', unit: 'kg', quantity: 2, unitPrice: 0, total: 0 }]);
  });
});
