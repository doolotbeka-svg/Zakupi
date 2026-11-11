import { describe, expect, it } from 'vitest';
import { TenderParams } from '../../types';
import { INITIAL_TENDER_PARAMS, TENDER_TEMPLATES, DEFAULT_SPECIFICATION_ITEMS } from '../../data/defaultTemplates';
import {
  breakEvenTolerance,
  calculateGuaranteeCost,
  calculateTaxes,
  calculateTender,
  formatCurrency,
  formatDiscount,
  formatPercent,
  generateSensitivityMatrix
} from '../taxCalculator';

/** Parameters with no extra costs, so every number in a test is easy to verify by hand. */
const bare = (overrides: Partial<TenderParams>): TenderParams => ({
  plannedPrice: 1_000_000,
  taxRegime: 'unified_10',
  customTaxRate: 0,
  customTaxBase: 'revenue',
  inputVatIncluded: false,
  logisticsCost: 0,
  guaranteeType: 'fixed',
  guaranteeValue: 0,
  otherExpenses: 0,
  directGoodsCost: 0,
  syncWithSpec: false,
  ...overrides
});

describe('calculateTender — единый налог', () => {
  it('считает стандартный пример (0.5%, снижение 5%)', () => {
    const r = calculateTender(INITIAL_TENDER_PARAMS, 5);

    expect(r.priceDropSum).toBe(75_000);
    expect(r.finalContractPrice).toBe(1_425_000);
    expect(r.guaranteeCost).toBe(30_000); // 2% от плановой суммы
    expect(r.totalExpenses).toBe(1_139_000); // 1 069 000 + 25 000 + 30 000 + 15 000
    expect(r.taxes.unifiedTax).toBeCloseTo(7_125, 6); // 0.5% от цены контракта
    expect(r.taxes.totalTax).toBeCloseTo(7_125, 6);
    expect(r.netProfit).toBeCloseTo(278_875, 6);
    expect(r.profitabilityPercent).toBeCloseTo((278_875 / 1_425_000) * 100, 6);
    expect(r.roiPercent).toBeCloseTo((278_875 / 1_139_000) * 100, 6);
    expect(r.isProfitable).toBe(true);
  });

  it.each([
    ['unified_00', 0],
    ['unified_05', 5_000],
    ['unified_10', 10_000],
    ['unified_20', 20_000],
    ['unified_40', 40_000],
    ['unified_60', 60_000]
  ] as const)('режим %s даёт налог %d с 1 000 000', (taxRegime, expected) => {
    const r = calculateTender(bare({ taxRegime }), 0);
    expect(r.taxes.totalTax).toBeCloseTo(expected, 6);
    expect(r.taxes.vat).toBe(0);
    expect(r.taxes.profitTax).toBe(0);
  });

  it('ограничивает снижение диапазоном 0–100%', () => {
    expect(calculateTender(bare({}), -10).discountPercent).toBe(0);
    expect(calculateTender(bare({}), 150).finalContractPrice).toBe(0);
  });
});

describe('calculateTender — общий режим', () => {
  const general = bare({ plannedPrice: 1_120_000, taxRegime: 'general', directGoodsCost: 560_000 });

  it('с зачётом входящего НДС', () => {
    const r = calculateTender({ ...general, inputVatIncluded: true }, 0);

    expect(r.taxes.vatOutput).toBeCloseTo(120_000, 6); // 1 120 000 × 12/112
    expect(r.taxes.vatInput).toBeCloseTo(60_000, 6); // 560 000 × 12/112
    expect(r.taxes.vat).toBeCloseTo(60_000, 6);
    expect(r.taxes.inputVatOffsetApplied).toBe(true);
    expect(r.taxes.salesTax).toBeCloseTo(10_000, 6); // 1% от выручки без НДС
    // (1 000 000 − 500 000 − 10 000) × 10%
    expect(r.taxes.profitTax).toBeCloseTo(49_000, 6);
    expect(r.taxes.totalTax).toBeCloseTo(119_000, 6);
    expect(r.netProfit).toBeCloseTo(441_000, 6);
  });

  it('без зачёта входящего НДС', () => {
    const r = calculateTender({ ...general, inputVatIncluded: false }, 0);

    expect(r.taxes.vatInput).toBe(0);
    expect(r.taxes.vat).toBeCloseTo(120_000, 6);
    expect(r.taxes.inputVatOffsetApplied).toBe(false);
    // (1 000 000 − 560 000 − 10 000) × 10%
    expect(r.taxes.profitTax).toBeCloseTo(43_000, 6);
    expect(r.taxes.totalTax).toBeCloseTo(173_000, 6);
  });

  it('НДС к уплате не уходит в минус, налог на прибыль не начисляется при убытке', () => {
    const r = calculateTender({ ...general, directGoodsCost: 2_000_000, inputVatIncluded: true }, 0);

    expect(r.taxes.vat).toBe(0);
    expect(r.taxes.profitTax).toBe(0);
    expect(r.netProfit).toBeLessThan(0);
  });
});

describe('calculateTender — произвольная ставка', () => {
  it('от выручки', () => {
    const r = calculateTender(bare({ taxRegime: 'custom', customTaxRate: 3, directGoodsCost: 800_000 }), 0);
    expect(r.taxes.customTax).toBeCloseTo(30_000, 6);
  });

  it('от прибыли', () => {
    const r = calculateTender(
      bare({ taxRegime: 'custom', customTaxRate: 3, customTaxBase: 'profit', directGoodsCost: 800_000 }),
      0
    );
    expect(r.taxes.customTax).toBeCloseTo(6_000, 6); // (1 000 000 − 800 000) × 3%
  });

  it('от прибыли при убытке налог равен нулю', () => {
    const r = calculateTender(
      bare({ taxRegime: 'custom', customTaxRate: 3, customTaxBase: 'profit', directGoodsCost: 1_200_000 }),
      0
    );
    expect(r.taxes.customTax).toBe(0);
  });

  it('ставка выше 100% ограничивается', () => {
    const taxes = calculateTaxes(1_000_000, 0, 0, bare({ taxRegime: 'custom', customTaxRate: 250 }));
    expect(taxes.customTax).toBeCloseTo(1_000_000, 6);
  });
});

describe('calculateGuaranteeCost', () => {
  it('процент считается от плановой суммы', () => {
    expect(calculateGuaranteeCost(1_500_000, 'percent', 2)).toBe(30_000);
  });

  it('фиксированная сумма не зависит от плановой цены', () => {
    expect(calculateGuaranteeCost(1_500_000, 'fixed', 12_345)).toBe(12_345);
    expect(calculateGuaranteeCost(0, 'fixed', 500)).toBe(500);
  });

  it('некорректные значения дают ноль', () => {
    expect(calculateGuaranteeCost(1_000_000, 'percent', 0)).toBe(0);
    expect(calculateGuaranteeCost(1_000_000, 'fixed', -5)).toBe(0);
    expect(calculateGuaranteeCost(1_000_000, 'percent', NaN)).toBe(0);
    expect(calculateGuaranteeCost(0, 'percent', 2)).toBe(0);
  });
});

describe('точка безубыточности', () => {
  it('находит точное значение для единого налога 1%', () => {
    // 0.99 × цена = 990 000 → цена 1 000 000 → снижение 9.0909…% от 1 100 000
    const r = calculateTender(bare({ plannedPrice: 1_100_000, directGoodsCost: 990_000 }), 0);

    expect(r.breakEvenDiscount).toBe(9.09);
    expect(r.breakEvenPrice).toBeGreaterThanOrEqual(1_000_000);
    expect(r.breakEvenPrice).toBeLessThanOrEqual(1_000_001);
  });

  const regimes: Partial<TenderParams>[] = [
    { taxRegime: 'unified_00' },
    { taxRegime: 'unified_60' },
    { taxRegime: 'general', inputVatIncluded: true },
    { taxRegime: 'general', inputVatIncluded: false },
    { taxRegime: 'custom', customTaxRate: 8, customTaxBase: 'revenue' },
    { taxRegime: 'custom', customTaxRate: 15, customTaxBase: 'profit' }
  ];

  it.each(regimes)('при снижении до точки безубыточности прибыль около нуля и не отрицательна: %o', (regime) => {
    for (const template of TENDER_TEMPLATES) {
      const params = { ...template.params, ...regime };
      const breakEven = calculateTender(params, 0).breakEvenDiscount;
      const atBreakEven = calculateTender(params, breakEven);

      expect(atBreakEven.netProfit).toBeGreaterThanOrEqual(0);
      expect(atBreakEven.netProfit).toBeLessThanOrEqual(breakEvenTolerance(params.plannedPrice));
      // На шаг 0.01% дальше — уже убыток
      expect(calculateTender(params, breakEven + 0.01).netProfit).toBeLessThan(0);
    }
  });

  it('если тендер убыточен без снижения, показывает цену выше плановой', () => {
    const params = bare({ plannedPrice: 1_000_000, directGoodsCost: 1_089_000 });
    const r = calculateTender(params, 0);

    expect(r.netProfit).toBeLessThan(0);
    expect(r.breakEvenDiscount).toBe(0);
    expect(r.breakEvenPrice).toBeGreaterThanOrEqual(1_100_000); // 1 089 000 / 0.99
    expect(r.breakEvenPrice).toBeLessThanOrEqual(1_100_001);
  });

  it('без расходов безубыточно любое снижение', () => {
    const r = calculateTender(bare({}), 0);
    expect(r.breakEvenDiscount).toBe(100);
    expect(r.breakEvenPrice).toBe(0);
  });

  it('нулевая плановая цена не ломает расчёт', () => {
    const r = calculateTender(bare({ plannedPrice: 0, directGoodsCost: 100 }), 10);
    expect(r.breakEvenDiscount).toBe(0);
    expect(r.breakEvenPrice).toBe(0);
    expect(r.profitabilityPercent).toBe(0);
    expect(r.netProfit).toBe(-100);
  });

  it('если налог съедает всю выручку, цены безубыточности нет', () => {
    const r = calculateTender(bare({ taxRegime: 'custom', customTaxRate: 100, directGoodsCost: 1 }), 0);
    expect(r.breakEvenDiscount).toBe(0);
    expect(r.breakEvenPrice).toBe(0);
  });
});

describe('generateSensitivityMatrix', () => {
  it('содержит текущее снижение и точку безубыточности, отсортирована и без дублей', () => {
    const current = 6.5;
    const breakEven = calculateTender(INITIAL_TENDER_PARAMS, current).breakEvenDiscount;
    const matrix = generateSensitivityMatrix(INITIAL_TENDER_PARAMS, current);
    const discounts = matrix.map(s => s.discount);

    expect(discounts).toContain(current);
    expect(discounts).toContain(breakEven);
    expect(discounts).toEqual([...discounts].sort((a, b) => a - b));
    expect(new Set(discounts).size).toBe(discounts.length);
    expect(matrix.filter(s => s.isCurrent).map(s => s.discount)).toEqual([current]);
  });

  it('прибыль убывает с ростом снижения', () => {
    const matrix = generateSensitivityMatrix(INITIAL_TENDER_PARAMS, 5);
    for (let i = 1; i < matrix.length; i++) {
      expect(matrix[i].netProfit).toBeLessThan(matrix[i - 1].netProfit);
    }
  });
});

describe('форматирование', () => {
  it('formatCurrency', () => {
    expect(formatCurrency(1_234_567)).toBe('1 234 567 KGS');
    expect(formatCurrency(999)).toBe('999 KGS');
    expect(formatCurrency(-1_234_567.5)).toBe('−1 234 568 KGS');
    expect(formatCurrency(1234.5, 'RUB', 2)).toBe('1 234.50 RUB');
    expect(formatCurrency(-0.3)).toBe('0 KGS'); // без «минус ноль»
    expect(formatCurrency(NaN)).toBe('0 KGS');
    expect(formatCurrency(Infinity)).toBe('0 KGS');
  });

  it('formatPercent', () => {
    expect(formatPercent(19.57)).toBe('+19.6%');
    expect(formatPercent(-3.21)).toBe('-3.2%');
    expect(formatPercent(0.04)).toBe('0.0%');
    expect(formatPercent(-0.04)).toBe('0.0%');
    expect(formatPercent(NaN)).toBe('0.0%');
    expect(formatPercent(12.345, 2)).toBe('+12.35%');
  });

  it('formatDiscount', () => {
    expect(formatDiscount(5)).toBe('5.0');
    expect(formatDiscount(7.5)).toBe('7.5');
    expect(formatDiscount(23.47)).toBe('23.47');
    expect(formatDiscount(NaN)).toBe('0.0');
  });
});

describe('встроенные данные', () => {
  const sets = [
    { id: 'default', items: DEFAULT_SPECIFICATION_ITEMS, params: INITIAL_TENDER_PARAMS },
    ...TENDER_TEMPLATES.map(t => ({ id: t.id, items: t.items, params: t.params }))
  ];

  it.each(sets)('шаблон $id: суммы строк и себестоимость сходятся', ({ items, params }) => {
    for (const item of items) {
      expect(item.total).toBe(item.quantity * item.unitPrice);
    }
    expect(params.directGoodsCost).toBe(items.reduce((sum, item) => sum + item.total, 0));
  });

  it('у шаблонов уникальные идентификаторы строк и снижение в пределах ползунка', () => {
    for (const template of TENDER_TEMPLATES) {
      const ids = template.items.map(i => i.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(template.defaultDiscount).toBeGreaterThanOrEqual(0);
      expect(template.defaultDiscount).toBeLessThanOrEqual(40);
    }
  });
});
