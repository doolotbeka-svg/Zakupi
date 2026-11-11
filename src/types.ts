export type Language = 'ky' | 'ru';

export type TaxRegimeId =
  | 'unified_00'
  | 'unified_05'
  | 'unified_10'
  | 'unified_20'
  | 'unified_40'
  | 'unified_60'
  | 'general'
  | 'custom';

export type CustomTaxBase = 'revenue' | 'profit';

export type GuaranteeType = 'percent' | 'fixed';

export type CurrencySymbol = 'KGS' | 'RUB';

export interface TaxRegime {
  id: TaxRegimeId;
  rateLabel: string;
  name: Record<Language, string>;
  category: Record<Language, string>;
  description: Record<Language, string>;
  formulaHint: Record<Language, string>;
}

export interface SpecificationItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface TenderParams {
  plannedPrice: number;
  taxRegime: TaxRegimeId;
  customTaxRate: number; // percentage entered by user (e.g. 3 for 3%)
  customTaxBase: CustomTaxBase; // 'revenue' (выручкадан) or 'profit' (пайдадан)
  inputVatIncluded: boolean; // Сатып алуу КНС менен (Закуп товара с входящим НДС)
  logisticsCost: number;
  guaranteeType: GuaranteeType;
  guaranteeValue: number; // percentage (e.g. 2 for 2%) or fixed sum in KGS
  otherExpenses: number;
  directGoodsCost: number;
  syncWithSpec: boolean;
}

export interface TaxBreakdown {
  regimeId: TaxRegimeId;
  vatOutput: number; // Чыгуучу КНС 12%
  vatInput: number; // Кирүүчү КНС (эсепке алынуучу зачеттук КНС)
  vat: number; // Бюджетке төлөнүүчү КНС = max(0, vatOutput - vatInput)
  salesTax: number; // Сатуудан салык / НсП (1%)
  profitTax: number; // Пайда салыгы (10%)
  unifiedTax: number; // Бирдиктүү салык
  customTax: number; // Өз алдынча киргизилген салык
  totalTax: number;
  inputVatOffsetApplied: boolean;
}

export interface CalculationResult {
  discountPercent: number;
  plannedPrice: number;
  finalContractPrice: number;
  priceDropSum: number;
  totalGoodsCost: number;
  logisticsCost: number;
  guaranteeCost: number;
  otherCost: number;
  totalExpenses: number;
  taxes: TaxBreakdown;
  netProfit: number;
  profitabilityPercent: number; // Margin on revenue (Net profit / Final contract price * 100)
  roiPercent: number; // Return on total expenses (Net profit / Total expenses * 100)
  isProfitable: boolean;
  breakEvenDiscount: number; // Exact drop % where net profit = 0
  breakEvenPrice: number; // Exact minimum tender price where net profit = 0
}

export interface ScenarioStep {
  discount: number;
  finalPrice: number;
  taxes: number;
  netProfit: number;
  profitability: number;
  isProfitable: boolean;
  isCurrent: boolean;
}

export interface SavedTender {
  id: string;
  title: string;
  date: string;
  params: TenderParams;
  items: SpecificationItem[];
  discount: number;
}
