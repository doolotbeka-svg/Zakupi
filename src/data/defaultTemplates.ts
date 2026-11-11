import { SpecificationItem, TenderParams } from '../types';

export interface TenderTemplate {
  id: string;
  titleKy: string;
  titleRu: string;
  categoryKy: string;
  categoryRu: string;
  params: TenderParams;
  items: SpecificationItem[];
  defaultDiscount: number;
}

export const DEFAULT_SPECIFICATION_ITEMS: SpecificationItem[] = [
  {
    id: 'spec-1',
    name: 'Ноутбук 15.6" IPS / Core i5 / 16GB RAM / 512GB SSD',
    unit: 'даана',
    quantity: 15,
    unitPrice: 48000,
    total: 720000
  },
  {
    id: 'spec-2',
    name: 'Лазердик көп функциялуу принтер (МФУ 3-в-1)',
    unit: 'даана',
    quantity: 6,
    unitPrice: 24500,
    total: 147000
  },
  {
    id: 'spec-3',
    name: 'Үзгүлтүксүз электр булагы (ИБП / UPS 850VA)',
    unit: 'даана',
    quantity: 15,
    unitPrice: 4800,
    total: 72000
  },
  {
    id: 'spec-4',
    name: 'Офис креслолору (эргономикалык, тор аркасы менен)',
    unit: 'даана',
    quantity: 20,
    unitPrice: 6500,
    total: 130000
  }
];

export const INITIAL_TENDER_PARAMS: TenderParams = {
  plannedPrice: 1500000,
  taxRegime: 'unified_05',
  customTaxRate: 3,
  customTaxBase: 'revenue',
  inputVatIncluded: true,
  logisticsCost: 25000,
  guaranteeType: 'percent',
  guaranteeValue: 2, // 2% of planned budget
  otherExpenses: 15000,
  directGoodsCost: 1069000,
  syncWithSpec: true
};

export const TENDER_TEMPLATES: TenderTemplate[] = [
  {
    id: 'it_hardware',
    titleKy: 'Компьютердик жана кеңсе техникасын жеткирүү (Мектептерге)',
    titleRu: 'Поставка компьютерной и офисной техники для образовательных учреждений',
    categoryKy: 'Маалыматтык технологиялар',
    categoryRu: 'Информационные технологии',
    params: {
      plannedPrice: 1500000,
      taxRegime: 'unified_05',
      customTaxRate: 3,
      customTaxBase: 'revenue',
      inputVatIncluded: true,
      logisticsCost: 25000,
      guaranteeType: 'percent',
      guaranteeValue: 2,
      otherExpenses: 15000,
      directGoodsCost: 1069000,
      syncWithSpec: true
    },
    items: DEFAULT_SPECIFICATION_ITEMS,
    defaultDiscount: 6.5
  },
  {
    id: 'food_supplies',
    titleKy: 'Балдар бакчаларына жана мектептерге тамак-аш азыктары',
    titleRu: 'Поставка продуктов питания для детских садов и школ',
    categoryKy: 'Тамак-аш',
    categoryRu: 'Продукты питания',
    params: {
      plannedPrice: 850000,
      taxRegime: 'unified_10',
      customTaxRate: 3,
      customTaxBase: 'revenue',
      inputVatIncluded: true,
      logisticsCost: 35000,
      guaranteeType: 'percent',
      guaranteeValue: 2,
      otherExpenses: 12000,
      directGoodsCost: 615000,
      syncWithSpec: true
    },
    items: [
      {
        id: 'food-1',
        name: 'Ун 1-сорт (50 кг мүшөк)',
        unit: 'мүшөк',
        quantity: 120,
        unitPrice: 1750,
        total: 210000
      },
      {
        id: 'food-2',
        name: 'Кумшекер (50 кг мүшөк)',
        unit: 'мүшөк',
        quantity: 40,
        unitPrice: 3200,
        total: 128000
      },
      {
        id: 'food-3',
        name: 'Күрүч «Ак-турпак» / Баткен',
        unit: 'кг',
        quantity: 800,
        unitPrice: 145,
        total: 116000
      },
      {
        id: 'food-4',
        name: 'Өсүмдүк майы тазаланган (5л бөтөлкө)',
        unit: 'даана',
        quantity: 220,
        unitPrice: 590,
        total: 129800
      },
      {
        id: 'food-5',
        name: 'Макарон азыктары жогорку сорт',
        unit: 'кг',
        quantity: 450,
        unitPrice: 70,
        total: 31200
      }
    ],
    defaultDiscount: 4.0
  },
  {
    id: 'construction_supplies',
    titleKy: 'Аймактык оорукананы оңдоо үчүн курулуш материалдары',
    titleRu: 'Строительные материалы для текущего ремонта районной больницы',
    categoryKy: 'Курулуш жана оңдоо',
    categoryRu: 'Строительство и ремонт',
    params: {
      plannedPrice: 2200000,
      taxRegime: 'general',
      customTaxRate: 3,
      customTaxBase: 'revenue',
      inputVatIncluded: true,
      logisticsCost: 65000,
      guaranteeType: 'percent',
      guaranteeValue: 5,
      otherExpenses: 30000,
      directGoodsCost: 1540000,
      syncWithSpec: true
    },
    items: [
      {
        id: 'const-1',
        name: 'Цемент М-400 (Кант, 50 кг)',
        unit: 'мүшөк',
        quantity: 350,
        unitPrice: 420,
        total: 147000
      },
      {
        id: 'const-2',
        name: 'Гипсокартон 12.5мм нымга чыдамдуу',
        unit: 'барак',
        quantity: 400,
        unitPrice: 530,
        total: 212000
      },
      {
        id: 'const-3',
        name: 'Суу дисперсиялык боёк (фасаддык, 25кг)',
        unit: 'чака',
        quantity: 85,
        unitPrice: 3800,
        total: 323000
      },
      {
        id: 'const-4',
        name: 'Керамогранит пол плиткасы 60x60см',
        unit: 'м2',
        quantity: 650,
        unitPrice: 920,
        total: 598000
      },
      {
        id: 'const-5',
        name: 'Профиль металл CD-60 (3 метр)',
        unit: 'даана',
        quantity: 800,
        unitPrice: 190,
        total: 152000
      },
      {
        id: 'const-6',
        name: 'Шпаклевка фиништик (25 кг)',
        unit: 'мүшөк',
        quantity: 180,
        unitPrice: 600,
        total: 108000
      }
    ],
    defaultDiscount: 7.5
  }
];
