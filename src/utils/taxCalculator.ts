import {
  CalculationResult,
  ScenarioStep,
  TaxBreakdown,
  TaxRegime,
  TaxRegimeId,
  TenderParams,
  CurrencySymbol
} from '../types';

export const TAX_REGIMES: Record<TaxRegimeId, TaxRegime> = {
  unified_00: {
    id: 'unified_00',
    rateLabel: '0%',
    name: {
      ky: 'Бирдиктүү салык 0% (тигүү тармагы / швейное производство)',
      ru: 'Бирдиктүү салык / Единый налог 0% (тигүү тармагы / швейное производство)'
    },
    category: {
      ky: 'Тигүү жана текстиль өндүрүшү',
      ru: 'Швейное и текстильное производство'
    },
    description: {
      ky: 'Тигүү жана текстиль тармагындагы субъекттер үчүн жеңилдетилген 0% ченем.',
      ru: 'Льготная ставка 0% единого налога для предприятий швейной и текстильной отрасли КР.'
    },
    formulaHint: {
      ky: 'Салык = 0 сом',
      ru: 'Налог = 0 сом'
    }
  },
  unified_05: {
    id: 'unified_05',
    rateLabel: '0.5%',
    name: {
      ky: 'Бирдиктүү салык 0.5% (соода / торговля)',
      ru: 'Бирдиктүү салык / Единый налог 0.5% (соода / торговля)'
    },
    category: {
      ky: 'Соода иши (ЭСФ жана ККМ менен)',
      ru: 'Торговля (применение ЭСФ и ККМ)'
    },
    description: {
      ky: 'Электрондук эсеп-фактура жана ККМ колдонгон соода ишмердүүлүгү үчүн жеңилдетилген ченем.',
      ru: 'Льготный режим для торговли при безналичных расчетах с оформлением ЭСФ.'
    },
    formulaHint: {
      ky: 'Салык = Контракт баасы × 0.5%',
      ru: 'Налог = Цена контракта × 0.5%'
    }
  },
  unified_10: {
    id: 'unified_10',
    rateLabel: '1.0%',
    name: {
      ky: 'Бирдиктүү салык 1% (соода / торговля)',
      ru: 'Бирдиктүү салык / Единый налог 1% (соода / торговля)'
    },
    category: {
      ky: 'Соода иши (стандарттуу накталай эмес)',
      ru: 'Торговля (стандартный безналичный)'
    },
    description: {
      ky: 'Соода ишмердүүлүгүндөгү накталай эмес эсептешүүлөр үчүн стандарттуу ченем.',
      ru: 'Базовая ставка единого налога в секторе торговли для безналичных операций.'
    },
    formulaHint: {
      ky: 'Салык = Контракт баасы × 1%',
      ru: 'Налог = Цена контракта × 1%'
    }
  },
  unified_20: {
    id: 'unified_20',
    rateLabel: '2.0%',
    name: {
      ky: 'Бирдиктүү салык 2% (накталай эмес / безналичный расчет)',
      ru: 'Бирдиктүү салык / Единый налог 2% (накталай эмес / безналичный расчет)'
    },
    category: {
      ky: 'Өндүрүш жана накталай эмес эсептешүүлөр',
      ru: 'Производство и безналичные расчеты'
    },
    description: {
      ky: 'Өндүрүштүк ишмердүүлүк жана накталай эмес эсептешүүлөр үчүн 2% ченем.',
      ru: 'Ставка единого налога 2% при безналичных расчетах в сфере производства и поставок.'
    },
    formulaHint: {
      ky: 'Салык = Контракт баасы × 2%',
      ru: 'Налог = Цена контракта × 2%'
    }
  },
  unified_40: {
    id: 'unified_40',
    rateLabel: '4.0%',
    name: {
      ky: 'Бирдиктүү салык 4% (кызматтар / услуги и работы)',
      ru: 'Бирдиктүү салык / Единый налог 4% (кызматтар / услуги и работы)'
    },
    category: {
      ky: 'Кызмат көрсөтүүлөр жана жумуштар',
      ru: 'Услуги и подрядные работы'
    },
    description: {
      ky: 'Тендер аркылуу кызмат көрсөтүү, оңдоо, монтаждоо жана подряддык иштерди аткаруу үчүн ченем.',
      ru: 'Ставка единого налога при оказании услуг, строительно-монтажных и подрядных работах.'
    },
    formulaHint: {
      ky: 'Салык = Контракт баасы × 4%',
      ru: 'Налог = Цена контракта × 4%'
    }
  },
  unified_60: {
    id: 'unified_60',
    rateLabel: '6.0%',
    name: {
      ky: 'Бирдиктүү салык 6% (накталай / наличный расчет)',
      ru: 'Бирдиктүү салык / Единый налог 6% (накталай / наличный расчет)'
    },
    category: {
      ky: 'Накталай эсептешүүлөр',
      ru: 'Наличные расчеты'
    },
    description: {
      ky: 'Соода жана кызмат көрсөтүүлөрдө накталай акчалай эсептешүүлөр жүргүзүлгөндө колдонулуучу ченем.',
      ru: 'Повышенная ставка единого налога при расчетах наличными средствами.'
    },
    formulaHint: {
      ky: 'Салык = Контракт баасы × 6%',
      ru: 'Налог = Цена контракта × 6%'
    }
  },
  general: {
    id: 'general',
    rateLabel: 'Жалпы / Общий',
    name: {
      ky: 'Жалпы режим (КНС 12% + Сатуудан салык 1% + Пайда салыгы 10%)',
      ru: 'Жалпы режим / Общий режим (КНС / НДС 12% + Сатуудан салык / НсП 1% + Пайда салыгы / Налог на прибыль 10%)'
    },
    category: {
      ky: 'Жалпы салык режими (КНС төлөөчүлөр)',
      ru: 'Общий режим (плательщики НДС)'
    },
    description: {
      ky: 'КНС төлөөчүлөр үчүн: КНС 12% (кирүүчү зачетту эсепке алуу менен), Сатуудан салык 1% жана Пайда салыгы 10%.',
      ru: 'Для плательщиков НДС: НДС 12% с возможностью зачета входящего НДС с закупок, налог с продаж (НсП) 1% и налог на прибыль 10%.'
    },
    formulaHint: {
      ky: 'КНС (Сатуу КНС - Зачет) + НсП (1%) + Пайда салыгы (10%)',
      ru: 'НДС (Исходящий - Входящий зачет) + НсП (1%) + Налог на прибыль (10%)'
    }
  },
  custom: {
    id: 'custom',
    rateLabel: 'Өзүнчө / Ручной',
    name: {
      ky: 'Өзүңүз киргизиңиз / Ввести ставку вручную',
      ru: 'Өзүңүз киргизиңиз / Ввести ставку вручную'
    },
    category: {
      ky: 'Кол менен жөндөө',
      ru: 'Ручная настройка'
    },
    description: {
      ky: 'Өз компанияңыздын шартына жараша каалаган салык пайызын (выручкадан же пайдадан) өз алдынча киргизүү.',
      ru: 'Индивидуальная процентная ставка налога от выручки или от прибыли (например: 0.1%, 3%, 8%).'
    },
    formulaHint: {
      ky: 'Колдонуучу белгилеген ченем боюнча',
      ru: 'По введенной ставке пользователя'
    }
  }
};

/**
 * Calculates tax breakdown given final contract revenue, direct goods cost, total expenses, and selected tax regime.
 */
export function calculateTaxes(
  finalContractPrice: number,
  directGoodsCost: number,
  totalExpenses: number,
  params: TenderParams
): TaxBreakdown {
  const { taxRegime, customTaxRate, customTaxBase, inputVatIncluded } = params;

  if (finalContractPrice <= 0) {
    return {
      regimeId: taxRegime,
      vatOutput: 0,
      vatInput: 0,
      vat: 0,
      salesTax: 0,
      profitTax: 0,
      unifiedTax: 0,
      customTax: 0,
      totalTax: 0,
      inputVatOffsetApplied: false
    };
  }

  // 1. Preset Unified taxes
  const unifiedRates: Record<string, number> = {
    unified_00: 0,
    unified_05: 0.005,
    unified_10: 0.01,
    unified_20: 0.02,
    unified_40: 0.04,
    unified_60: 0.06
  };

  if (taxRegime in unifiedRates) {
    const rate = unifiedRates[taxRegime];
    const unifiedTax = finalContractPrice * rate;
    return {
      regimeId: taxRegime,
      vatOutput: 0,
      vatInput: 0,
      vat: 0,
      salesTax: 0,
      profitTax: 0,
      unifiedTax,
      customTax: 0,
      totalTax: unifiedTax,
      inputVatOffsetApplied: false
    };
  }

  // 2. Custom Rate (Өзүңүз киргизиңиз / Ввести ставку вручную)
  if (taxRegime === 'custom') {
    const rateFraction = Math.min(100, Math.max(0, customTaxRate || 0)) / 100;
    let customTax = 0;

    if (customTaxBase === 'profit') {
      const grossProfit = Math.max(0, finalContractPrice - totalExpenses);
      customTax = grossProfit * rateFraction;
    } else {
      // Default: revenue (выручкадан)
      customTax = finalContractPrice * rateFraction;
    }

    return {
      regimeId: taxRegime,
      vatOutput: 0,
      vatInput: 0,
      vat: 0,
      salesTax: 0,
      profitTax: 0,
      unifiedTax: 0,
      customTax,
      totalTax: customTax,
      inputVatOffsetApplied: false
    };
  }

  // 3. General Regime (Жалпы режим: КНС 12% + Сатуудан салык 1% + Пайда салыгы 10%)
  // Output VAT on contract price = S * 12 / 112
  const vatOutput = finalContractPrice * (12 / 112);

  // Input VAT credit: if inputVatIncluded is checked, input goods purchase includes 12% VAT
  let vatInput = 0;
  let deductibleGoodsCost = directGoodsCost;

  if (inputVatIncluded && directGoodsCost > 0) {
    vatInput = directGoodsCost * (12 / 112);
    // When input VAT is credited against output VAT, the deductible goods expense is net of VAT
    deductibleGoodsCost = directGoodsCost - vatInput;
  }

  // Net VAT payable to state budget = max(0, vatOutput - vatInput)
  const vatPayable = Math.max(0, vatOutput - vatInput);

  // Sales tax (Сатуудан салык / НсП) = 1% of revenue net of VAT
  // (the sales tax base in the KR Tax Code excludes VAT and the sales tax itself)
  const revenueWithoutVat = finalContractPrice - vatOutput;
  const salesTax = revenueWithoutVat * 0.01;

  // Other non-goods deductible expenses (logistics, guarantee, other)
  const otherExpensesTotal = Math.max(0, totalExpenses - directGoodsCost);

  // Taxable profit for 10% income tax:
  // Revenue net of output VAT - Deductible goods cost (net of input VAT if credited) - Other expenses - Sales tax
  const taxableProfit = Math.max(
    0,
    revenueWithoutVat - deductibleGoodsCost - otherExpensesTotal - salesTax
  );
  const profitTax = taxableProfit * 0.10;

  const totalTax = vatPayable + salesTax + profitTax;

  return {
    regimeId: taxRegime,
    vatOutput,
    vatInput,
    vat: vatPayable,
    salesTax,
    profitTax,
    unifiedTax: 0,
    customTax: 0,
    totalTax,
    inputVatOffsetApplied: inputVatIncluded && vatInput > 0
  };
}

/**
 * Calculates guarantee cost based on guarantee type (% of planned price or fixed sum)
 */
export function calculateGuaranteeCost(
  plannedPrice: number,
  guaranteeType: 'percent' | 'fixed',
  guaranteeValue: number
): number {
  if (!(guaranteeValue > 0)) return 0;
  if (guaranteeType === 'percent') {
    return plannedPrice > 0 ? (plannedPrice * guaranteeValue) / 100 : 0;
  }
  // A fixed guarantee fee does not depend on the planned price
  return guaranteeValue;
}

/**
 * Main tender profitability calculator.
 */
export function calculateTender(
  params: TenderParams,
  discountPercent: number
): CalculationResult {
  const {
    plannedPrice,
    logisticsCost,
    guaranteeType,
    guaranteeValue,
    otherExpenses,
    directGoodsCost
  } = params;

  const normalizedDiscount = Math.max(0, Math.min(100, discountPercent));
  const priceDropSum = (plannedPrice * normalizedDiscount) / 100;
  const finalContractPrice = Math.max(0, plannedPrice - priceDropSum);

  const guaranteeCost = calculateGuaranteeCost(plannedPrice, guaranteeType, guaranteeValue);
  const totalExpenses = directGoodsCost + logisticsCost + guaranteeCost + otherExpenses;

  const taxes = calculateTaxes(finalContractPrice, directGoodsCost, totalExpenses, params);
  const netProfit = finalContractPrice - totalExpenses - taxes.totalTax;

  const profitabilityPercent = finalContractPrice > 0 
    ? (netProfit / finalContractPrice) * 100 
    : 0;

  const roiPercent = totalExpenses > 0 
    ? (netProfit / totalExpenses) * 100 
    : 0;

  const isProfitable = netProfit > 0;

  // Find exact break-even point where net profit = 0
  const breakEven = findBreakEven(params);

  return {
    discountPercent: normalizedDiscount,
    plannedPrice,
    finalContractPrice,
    priceDropSum,
    totalGoodsCost: directGoodsCost,
    logisticsCost,
    guaranteeCost,
    otherCost: otherExpenses,
    totalExpenses,
    taxes,
    netProfit,
    profitabilityPercent,
    roiPercent,
    isProfitable,
    breakEvenDiscount: breakEven.discount,
    breakEvenPrice: breakEven.price
  };
}

/**
 * Binary search solver for the exact break-even contract price (net profit = 0)
 * and the matching discount % from the planned price.
 *
 * If the tender is unprofitable even without any discount, the discount is 0 and
 * the returned price is the (higher than planned) price needed to break even.
 */
function findBreakEven(params: TenderParams): { discount: number; price: number } {
  const { plannedPrice, logisticsCost, guaranteeType, guaranteeValue, otherExpenses, directGoodsCost } = params;
  if (plannedPrice <= 0) return { discount: 0, price: 0 };

  const guaranteeCost = calculateGuaranteeCost(plannedPrice, guaranteeType, guaranteeValue);
  const totalExpenses = directGoodsCost + logisticsCost + guaranteeCost + otherExpenses;

  if (totalExpenses <= 0) {
    return { discount: 100, price: 0 };
  }

  const profitAt = (price: number) =>
    price - totalExpenses - calculateTaxes(price, directGoodsCost, totalExpenses, params).totalTax;

  // Net profit grows monotonically with the contract price, so bracket the root first.
  let high = plannedPrice;
  let guard = 0;
  while (profitAt(high) <= 0 && guard < 40) {
    high *= 2;
    guard++;
  }
  if (profitAt(high) <= 0) {
    // No price can cover the costs (e.g. a 100% tax on revenue)
    return { discount: 0, price: 0 };
  }

  let low = 0;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (profitAt(mid) > 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  const price = high;
  const discount = Math.max(0, Math.min(100, (1 - price / plannedPrice) * 100));

  return {
    // Round the discount down and the price up so the displayed limits never fall into a loss
    discount: Math.floor(discount * 100 + 1e-6) / 100,
    price: Math.ceil(price - 1e-6)
  };
}

/**
 * Generates simulation steps for sensitivity analysis table across common bidding discounts.
 */
export function generateSensitivityMatrix(
  params: TenderParams,
  currentDiscount: number
): ScenarioStep[] {
  const steps = [0, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 25, 30, 35, 40];
  const breakEven = findBreakEven(params);

  // Combine and sort uniquely
  const allDiscounts = Array.from(new Set([...steps, currentDiscount, breakEven.discount]))
    .filter(d => Number.isFinite(d) && d >= 0 && d <= 50)
    .sort((a, b) => a - b);

  return allDiscounts.map(discount => {
    const res = calculateTender(params, discount);
    return {
      discount,
      finalPrice: res.finalContractPrice,
      taxes: res.taxes.totalTax,
      netProfit: res.netProfit,
      profitability: res.profitabilityPercent,
      isProfitable: res.isProfitable,
      isCurrent: Math.abs(discount - currentDiscount) < 0.01
    };
  });
}

/**
 * Currency formatter with spaces and decimal options.
 */
export function formatCurrency(
  amount: number,
  currency: CurrencySymbol = 'KGS',
  decimals = 0
): string {
  if (!Number.isFinite(amount)) return `0 ${currency}`;
  const fixed = Math.abs(amount).toFixed(decimals);
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  // Never show a minus sign in front of a value that rounds to zero
  const sign = amount < 0 && Number(fixed) !== 0 ? '−' : '';
  return `${sign}${parts.join('.')} ${currency}`;
}

export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return (0).toFixed(decimals) + '%';
  const fixed = value.toFixed(decimals);
  if (Number(fixed) === 0) return (0).toFixed(decimals) + '%';
  return `${value > 0 ? '+' : ''}${fixed}%`;
}

/**
 * Formats a discount percentage: one decimal for slider steps, two when needed (e.g. break-even 23.47%).
 */
export function formatDiscount(value: number): string {
  if (!Number.isFinite(value)) return '0.0';
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(Math.round(rounded * 100) / 10) ? rounded.toFixed(1) : rounded.toFixed(2);
}

/**
 * Tolerance (in currency units) within which the net profit is treated as break-even.
 * Covers the rounding of the break-even discount to 0.01%.
 */
export function breakEvenTolerance(plannedPrice: number): number {
  return Math.max(0, plannedPrice) * 0.0001 + 1;
}
