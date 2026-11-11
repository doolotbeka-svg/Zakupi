import { describe, expect, it } from 'vitest';
import { DEFAULT_SPECIFICATION_ITEMS, INITIAL_TENDER_PARAMS } from '../../data/defaultTemplates';
import { SavedTender } from '../../types';
import {
  DEFAULT_DISCOUNT,
  MAX_SAVED_TENDERS,
  MAX_TITLE_LENGTH,
  findSavedByTitle,
  normalizeTitle,
  removeSavedTender,
  sanitizeDiscount,
  sanitizeItems,
  sanitizeParams,
  sanitizeSavedTenders,
  upsertSavedTender
} from '../storage';

const snapshot = (title: string, discount = 5) => ({
  title,
  params: INITIAL_TENDER_PARAMS,
  items: DEFAULT_SPECIFICATION_ITEMS,
  discount
});

const at = (iso: string) => new Date(iso);

describe('upsertSavedTender', () => {
  it('добавляет новый расчёт в начало списка', () => {
    let list: SavedTender[] = [];
    list = upsertSavedTender(list, snapshot('Тендер №1'), at('2026-01-01T10:00:00Z'), 'a');
    list = upsertSavedTender(list, snapshot('Тендер №2', 7.5), at('2026-01-02T10:00:00Z'), 'b');

    expect(list.map(t => [t.id, t.title, t.discount])).toEqual([
      ['b', 'Тендер №2', 7.5],
      ['a', 'Тендер №1', 5]
    ]);
    expect(list[0].date).toBe('2026-01-02T10:00:00.000Z');
  });

  it('перезаписывает расчёт с тем же названием, сохраняя id и поднимая его наверх', () => {
    let list: SavedTender[] = [];
    list = upsertSavedTender(list, snapshot('Школа'), at('2026-01-01T10:00:00Z'), 'a');
    list = upsertSavedTender(list, snapshot('Больница'), at('2026-01-02T10:00:00Z'), 'b');
    list = upsertSavedTender(list, snapshot('  школа ', 12), at('2026-01-03T10:00:00Z'), 'c');

    expect(list.map(t => [t.id, t.title, t.discount])).toEqual([
      ['a', 'школа', 12],
      ['b', 'Больница', 5]
    ]);
  });

  it('не меняет исходный список и не делит объекты с текущим состоянием', () => {
    const items = DEFAULT_SPECIFICATION_ITEMS.map(i => ({ ...i }));
    const original: SavedTender[] = [];
    const list = upsertSavedTender(original, { ...snapshot('А'), items });

    items[0].name = 'изменено после сохранения';
    expect(original).toEqual([]);
    expect(list[0].items[0].name).toBe(DEFAULT_SPECIFICATION_ITEMS[0].name);
    expect(list[0].params).not.toBe(INITIAL_TENDER_PARAMS);
  });

  it('игнорирует пустое название', () => {
    const list = upsertSavedTender([], snapshot('   '));
    expect(list).toEqual([]);
  });

  it('не добавляет сверх лимита, но позволяет перезаписать существующий', () => {
    let list: SavedTender[] = [];
    for (let i = 0; i < MAX_SAVED_TENDERS; i++) {
      list = upsertSavedTender(list, snapshot(`Тендер ${i}`), at('2026-01-01T00:00:00Z'), `id-${i}`);
    }
    expect(list).toHaveLength(MAX_SAVED_TENDERS);

    expect(upsertSavedTender(list, snapshot('Лишний'))).toBe(list);

    const overwritten = upsertSavedTender(list, snapshot('Тендер 0', 20));
    expect(overwritten).toHaveLength(MAX_SAVED_TENDERS);
    expect(overwritten[0]).toMatchObject({ id: 'id-0', discount: 20 });
  });
});

describe('removeSavedTender / findSavedByTitle / normalizeTitle', () => {
  const list = upsertSavedTender(
    upsertSavedTender([], snapshot('Первый'), at('2026-01-01T00:00:00Z'), 'a'),
    snapshot('Второй'),
    at('2026-01-02T00:00:00Z'),
    'b'
  );

  it('удаляет по id', () => {
    expect(removeSavedTender(list, 'a').map(t => t.id)).toEqual(['b']);
    expect(removeSavedTender(list, 'нет такого')).toHaveLength(2);
  });

  it('ищет по названию без учёта регистра и лишних пробелов', () => {
    expect(findSavedByTitle(list, ' ПЕРВЫЙ ')?.id).toBe('a');
    expect(findSavedByTitle(list, 'Третий')).toBeUndefined();
    expect(findSavedByTitle(list, '')).toBeUndefined();
  });

  it('нормализует название', () => {
    expect(normalizeTitle('  Тендер   №452 \n школа ')).toBe('Тендер №452 школа');
    expect(normalizeTitle('я'.repeat(200))).toHaveLength(MAX_TITLE_LENGTH);
  });
});

describe('sanitizeSavedTenders', () => {
  it('восстанавливает список, сохранённый приложением', () => {
    const list = upsertSavedTender([], snapshot('Тендер', 6.5), at('2026-03-04T05:06:07Z'), 'x');
    expect(sanitizeSavedTenders(JSON.parse(JSON.stringify(list)))).toEqual(list);
  });

  it('возвращает пустой список для мусора', () => {
    expect(sanitizeSavedTenders(null)).toEqual([]);
    expect(sanitizeSavedTenders('строка')).toEqual([]);
    expect(sanitizeSavedTenders({ a: 1 })).toEqual([]);
  });

  it('отбрасывает сломанные записи и чинит поля у остальных', () => {
    const result = sanitizeSavedTenders([
      null,
      42,
      { title: '', params: {}, items: [] },
      { title: 'Без параметров', items: [] },
      { title: 'Без товаров', params: {} },
      {
        id: 'ok',
        title: '  Рабочий  ',
        date: 'не дата',
        discount: 999,
        params: { taxRegime: 'bogus', plannedPrice: '2000000', customTaxRate: 500 },
        items: [{ name: 'Товар', quantity: 2, unitPrice: 10, total: 999 }]
      }
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'ok', title: 'Рабочий', discount: DEFAULT_DISCOUNT });
    expect(result[0].params.taxRegime).toBe(INITIAL_TENDER_PARAMS.taxRegime);
    expect(result[0].params.plannedPrice).toBe(2_000_000);
    expect(result[0].params.customTaxRate).toBe(100);
    expect(result[0].items[0].total).toBe(20);
    expect(Number.isNaN(Date.parse(result[0].date))).toBe(false);
  });

  it('делает идентификаторы уникальными и ограничивает длину списка', () => {
    const entry = { id: 'same', title: 'Т', params: {}, items: [] };
    const ids = sanitizeSavedTenders([entry, entry, entry]).map(t => t.id);
    expect(new Set(ids).size).toBe(3);

    const many = Array.from({ length: MAX_SAVED_TENDERS + 10 }, (_, i) => ({ ...entry, id: `id-${i}` }));
    expect(sanitizeSavedTenders(many)).toHaveLength(MAX_SAVED_TENDERS);
  });
});

describe('sanitizeParams / sanitizeItems / sanitizeDiscount', () => {
  it('sanitizeParams подставляет значения по умолчанию', () => {
    expect(sanitizeParams(null)).toEqual(INITIAL_TENDER_PARAMS);
    expect(sanitizeParams({})).toEqual(INITIAL_TENDER_PARAMS);
    expect(sanitizeParams(INITIAL_TENDER_PARAMS)).toEqual(INITIAL_TENDER_PARAMS);

    const fixed = sanitizeParams({ plannedPrice: -5, guaranteeType: 'fixed', customTaxBase: 'profit', syncWithSpec: 'yes' });
    expect(fixed.plannedPrice).toBe(INITIAL_TENDER_PARAMS.plannedPrice);
    expect(fixed.guaranteeType).toBe('fixed');
    expect(fixed.customTaxBase).toBe('profit');
    expect(fixed.syncWithSpec).toBe(INITIAL_TENDER_PARAMS.syncWithSpec);
  });

  it('sanitizeItems пересчитывает суммы и отбрасывает не-объекты', () => {
    expect(sanitizeItems({})).toBeNull();
    expect(sanitizeItems([])).toEqual([]);
    expect(sanitizeItems([1, null, { name: 'А', unit: 'шт', quantity: '3', unitPrice: -1 }])).toEqual([
      { id: 'item-restored-0', name: 'А', unit: 'шт', quantity: 3, unitPrice: 0, total: 0 }
    ]);
  });

  it('sanitizeDiscount принимает только 0–40', () => {
    expect(sanitizeDiscount('7.5')).toBe(7.5);
    expect(sanitizeDiscount(0)).toBe(0);
    expect(sanitizeDiscount(40)).toBe(40);
    expect(sanitizeDiscount(41)).toBe(DEFAULT_DISCOUNT);
    expect(sanitizeDiscount(-1)).toBe(DEFAULT_DISCOUNT);
    expect(sanitizeDiscount('abc')).toBe(DEFAULT_DISCOUNT);
  });
});
