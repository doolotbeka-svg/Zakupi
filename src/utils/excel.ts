import * as XLSX from 'xlsx';
import { CalculationResult, CurrencySymbol, Language, SpecificationItem, TenderParams } from '../types';
import { TAX_REGIMES } from './taxCalculator';

/**
 * Exports complete tender financial calculation and product specification into an Excel (.xlsx) file.
 */
export function exportTenderToExcel(
  params: TenderParams,
  result: CalculationResult,
  items: SpecificationItem[],
  lang: Language = 'ky',
  currency: CurrencySymbol = 'KGS'
): void {
  const wb = XLSX.utils.book_new();

  const isKy = lang === 'ky';
  const regime = TAX_REGIMES[params.taxRegime];

  // 1. Financial Overview Sheet Data
  const financialData: (string | number)[][] = [
    [isKy ? 'ТЕНДЕРДИК РЕНТАБЕЛДҮҮЛҮК ЭСЕБИ (КЫРГЫЗСТАН)' : 'РАСЧЕТ РЕНТАБЕЛЬНОСТИ ТЕНДЕРА (КЫРГЫЗСТАН)'],
    [isKy ? `Түзүлгөн күнү: ${new Date().toLocaleDateString('ru-RU')}` : `Дата формирования: ${new Date().toLocaleDateString('ru-RU')}`],
    [isKy ? `Валюта: ${currency}` : `Валюта расчетов: ${currency}`],
    [''],
    [isKy ? '1. НЕГИЗГИ ПАРАМЕТРЛЕР ЖАНА БАА' : '1. ОСНОВНЫЕ ПАРАМЕТРЫ И ЦЕНА', ''],
    [isKy ? `Пландалган сатып алуу суммасы (${currency})` : `Планируемая сумма закупки (${currency})`, params.plannedPrice],
    [isKy ? 'Тооруктагы бааны төмөндөтүү (%)' : 'Процент снижения цены на торгах (%)', `${result.discountPercent}%`],
    [isKy ? `Төмөндөтүлгөн сумма (${currency})` : `Сумма снижения цены (${currency})`, result.priceDropSum],
    [isKy ? `Келишимдин акыркы баасы (${currency})` : `Итоговая цена контракта (${currency})`, result.finalContractPrice],
    [isKy ? 'Салык режими' : 'Налоговый режим', regime.name[lang]],
    [''],
    [isKy ? '2. ӨЗДҮК НАРК ЖАНА ЧЫГЫМДАР' : '2. СЕБЕСТОИМОСТЬ И РАСХОДЫ', ''],
    [isKy ? `Товарлардын сатып алуу өздүк наркы (${currency})` : `Закупочная себестоимость товаров (${currency})`, result.totalGoodsCost],
    [isKy ? `Логистика жана жеткирүү (${currency})` : `Логистика и доставка (${currency})`, result.logisticsCost],
    [isKy ? `Кепилдик камсыздоо / Банктык кепилдик (${currency})` : `Гарантийное обеспечение / Банк (${currency})`, result.guaranteeCost],
    [isKy ? `Башка чыгашалар (${currency})` : `Прочие расходы (${currency})`, result.otherCost],
    [isKy ? `ЖАЛПЫ ЧЫГЫМДАР (Өздүк нарк, ${currency})` : `ИТОГО РАСХОДЫ (Себестоимость, ${currency})`, result.totalExpenses],
    [''],
    [isKy ? '3. САЛЫКТАР ЖАНА БЮДЖЕТТИК ТӨЛӨМДӨР' : '3. НАЛОГИ И ОБЯЗАТЕЛЬНЫЕ ПЛАТЕЖИ', ''],
    [isKy ? `Чыгуучу КНС 12% (${currency})` : `Исходящий НДС 12% (${currency})`, result.taxes.vatOutput],
    [isKy ? `Кирүүчү КНС (эсепке алуу / зачет) (${currency})` : `Входящий НДС (к зачету) (${currency})`, result.taxes.vatInput],
    [isKy ? `Бюджетке төлөнүүчү КНС (${currency})` : `НДС к уплате в бюджет (${currency})`, result.taxes.vat],
    [isKy ? `Сатуудан салык / НсП 1% (${currency})` : `Налог с продаж / НсП 1% (${currency})`, result.taxes.salesTax],
    [isKy ? `Пайда салыгы / Налог на прибыль 10% (${currency})` : `Налог на прибыль 10% (${currency})`, result.taxes.profitTax],
    [isKy ? `Бирдиктүү салык (${currency})` : `Единый налог (${currency})`, result.taxes.unifiedTax],
    [isKy ? `Өз алдынча киргизилген салык (${currency})` : `Индивидуальный налог (${currency})`, result.taxes.customTax],
    [isKy ? `ИТОГО САЛЫКТАР (${currency})` : `ИТОГО НАЛОГИ (${currency})`, result.taxes.totalTax],
    [''],
    [isKy ? '4. КАРЖЫЛЫК ЖЫЙЫНТЫК ЖАНА ЧЫГЫМСЫЗДЫК' : '4. ФИНАНСОВЫЙ ИТОГ И БЕЗУБЫТОЧНОСТЬ', ''],
    [isKy ? `ТАЗА КИРЕШЕ / ЧИСТАЯ ПРИБЫЛЬ (${currency})` : `ЧИСТАЯ ПРИБЫЛЬ / ТАЗА КИРЕШЕ (${currency})`, result.netProfit],
    [isKy ? 'Рентабелдүүлүк (кирешеден %)' : 'Рентабельность (% от цены контракта)', `${result.profitabilityPercent.toFixed(2)}%`],
    [isKy ? 'Чыгымдардын рентабелдүүлүгү (ROI %)' : 'Рентабельность расходов (ROI %)', `${result.roiPercent.toFixed(2)}%`],
    [isKy ? 'Чыгымсыздык чекити (макс. арзандатуу %)' : 'Точка безубыточности (макс. % снижения)', `${result.breakEvenDiscount}%`],
    [isKy ? `Чыгымсыздык минималдуу баасы (${currency})` : `Минимальная цена безубыточности (${currency})`, result.breakEvenPrice],
    [isKy ? 'Абалы' : 'Статус', result.isProfitable ? (isKy ? 'Пайдалуу' : 'Прибыльно') : (isKy ? 'Чыгым / Убыток' : 'Убыточно')]
  ];

  const wsFinance = XLSX.utils.aoa_to_sheet(financialData);
  wsFinance['!cols'] = [{ wch: 45 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsFinance, isKy ? 'Финансылык жыйынтык' : 'Финансовый расчет');

  // 2. Specification Sheet Data
  const specHeaders = [
    isKy ? '№' : '№',
    isKy ? 'Товардын аталышы' : 'Наименование товара',
    isKy ? 'Өлчөө бирдиги' : 'Ед. изм.',
    isKy ? 'Саны' : 'Количество',
    isKy ? `Сатып алуу баасы (${currency})` : `Закупочная цена (${currency})`,
    isKy ? `Жалпы сумма (${currency})` : `Итого закуп (${currency})`
  ];

  const specRows = items.map((item, idx) => [
    idx + 1,
    item.name,
    item.unit,
    item.quantity,
    item.unitPrice,
    item.total
  ]);

  // Add summary row
  const totalUnits = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
  const totalCost = items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
  specRows.push([
    '',
    isKy ? 'ЖАЛПЫ / ИТОГО' : 'ИТОГО ПО СПЕЦИФИКАЦИИ',
    '',
    totalUnits,
    '',
    totalCost
  ]);

  const wsSpec = XLSX.utils.aoa_to_sheet([specHeaders, ...specRows]);
  wsSpec['!cols'] = [
    { wch: 6 },
    { wch: 40 },
    { wch: 12 },
    { wch: 14 },
    { wch: 20 },
    { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSpec, isKy ? 'Спецификация' : 'Спецификация товаров');

  // Generate file and trigger download
  const fileName = `Tender_Calculation_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Generates and downloads a clean Excel template for product specifications.
 */
export function downloadSpecificationTemplate(lang: Language = 'ky'): void {
  const wb = XLSX.utils.book_new();
  const isKy = lang === 'ky';

  const headers = [
    isKy ? '№' : '№',
    isKy ? 'Товардын аталышы' : 'Наименование товара',
    isKy ? 'Өлчөө бирдиги' : 'Ед. изм.',
    isKy ? 'Саны' : 'Количество',
    isKy ? 'Сатып алуу баасы' : 'Закупочная цена за ед.',
    isKy ? 'Жалпы сумма' : 'Итого сумма'
  ];

  const sampleRows = isKy
    ? [
        [1, 'Ноутбук Core i5 / 16GB / 512GB SSD', 'даана', 10, 42000, 420000],
        [2, 'Лазердик принтер 3-в-1', 'даана', 5, 21500, 107500],
        [3, 'Тармак кабели UTP Cat5e (305м)', 'бухта', 4, 6500, 26000],
        [4, 'Кеңсе кагазы А4 (80г/м2)', 'куту', 50, 320, 16000]
      ]
    : [
        [1, 'Ноутбук Core i5 / 16GB / 512GB SSD', 'шт', 10, 42000, 420000],
        [2, 'Лазерный МФУ 3-в-1', 'шт', 5, 21500, 107500],
        [3, 'Сетевой кабель UTP Cat5e (305м)', 'бухта', 4, 6500, 26000],
        [4, 'Бумага офисная А4 (80г/м2)', 'коробка', 50, 320, 16000]
      ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 42 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
    { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, isKy ? 'Шаблон' : 'Шаблон спецификации');

  XLSX.writeFile(wb, `Tender_Spec_Template_${lang}.xlsx`);
}

const NAME_KEYS = ['наименов', 'аталыш', 'товар', 'name', 'предмет', 'описан'];
const QTY_KEYS = ['саны', 'колич', 'кол-во', 'qty', 'quantity'];
const PRICE_KEYS = ['баа', 'цена', 'price', 'стоим'];
const UNIT_KEYS = ['бирди', 'изм', 'unit'];
const TOTAL_KEYS = ['итог', 'жалпы', 'всего', 'сумма', 'общ', 'total'];

interface ColumnMap {
  headerRowIndex: number;
  name: number;
  unit: number;
  qty: number;
  price: number;
}

function newItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Parses numbers written as "1 200,50", "1200.5", "1,200.50" or "1.200,50".
 */
function parseLocaleNumber(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (raw === null || raw === undefined) return NaN;
  let str = String(raw).replace(/[\s  ']/g, '').replace(/[^\d.,-]/g, '');
  if (!str) return NaN;
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    // The right-most separator is the decimal one
    str = lastComma > lastDot ? str.replace(/\./g, '').replace(',', '.') : str.replace(/,/g, '');
  } else if (lastComma !== -1) {
    str = str.replace(/,/g, (_m, offset: number) => (offset === lastComma ? '.' : ''));
  }
  return parseFloat(str);
}

/**
 * Looks for the header row (name + quantity/price columns) within the first rows of a sheet.
 */
function detectColumns(rows: unknown[][]): ColumnMap | null {
  for (let r = 0; r < Math.min(20, rows.length); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    let name = -1;
    let qty = -1;
    let price = -1;
    let unit = -1;

    for (let idx = 0; idx < row.length; idx++) {
      const cell = row[idx];
      if (typeof cell !== 'string') continue;
      const val = cell.toLowerCase().trim();
      const has = (keys: string[]) => keys.some(k => val.includes(k));

      // Unit goes first: "Ед. изм." / "Өлчөө бирдиги" must not be mistaken for anything else,
      // and total columns ("Жалпы сумма", "Общая стоимость") must not override the unit price.
      if (unit === -1 && has(UNIT_KEYS) && !has(PRICE_KEYS)) {
        unit = idx;
      } else if (qty === -1 && has(QTY_KEYS)) {
        qty = idx;
      } else if (has(TOTAL_KEYS)) {
        continue;
      } else if (price === -1 && has(PRICE_KEYS)) {
        price = idx;
      } else if (name === -1 && has(NAME_KEYS)) {
        name = idx;
      }
    }

    if (name !== -1 && (qty !== -1 || price !== -1)) {
      return { headerRowIndex: r, name, unit, qty, price };
    }
  }
  return null;
}

/**
 * Reads a workbook. CSV files are decoded manually (UTF-8 with Windows-1251 fallback),
 * because SheetJS treats raw CSV bytes as Latin-1 and garbles Cyrillic text.
 */
function readWorkbook(buffer: ArrayBuffer, fileName: string): XLSX.WorkBook {
  const isText = /\.(csv|txt|tsv)$/i.test(fileName);
  if (!isText) {
    return XLSX.read(buffer, { type: 'array' });
  }

  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    text = new TextDecoder('windows-1251').decode(buffer);
  }
  // raw: true keeps cells as text so "1200,5" is not misread as 12005
  return XLSX.read(text.replace(/^﻿/, ''), { type: 'string', raw: true });
}

/**
 * Parses an uploaded Excel or CSV file into SpecificationItem array.
 */
export async function parseUploadedFile(file: File): Promise<SpecificationItem[]> {
  const buffer = await file.arrayBuffer();
  const wb = readWorkbook(buffer, file.name);
  if (wb.SheetNames.length === 0) throw new Error('Empty workbook');

  // Prefer the first sheet that has a recognisable header (our own export keeps
  // the specification on the second sheet); otherwise fall back to the first sheet.
  let rawRows: unknown[][] = [];
  let columns: ColumnMap | null = null;

  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 }) as unknown[][];
    const detected = detectColumns(rows);
    if (detected) {
      rawRows = rows;
      columns = detected;
      break;
    }
  }

  if (!columns) {
    rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as unknown[][];
    // Default layout of the downloadable template: № | name | unit | qty | price | total
    columns = { headerRowIndex: 0, name: 1, unit: 2, qty: 3, price: 4 };
  }

  if (!rawRows || rawRows.length < 2) {
    throw new Error('Not enough rows in file');
  }

  const items: SpecificationItem[] = [];

  for (let i = columns.headerRowIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rawName = row[columns.name];
    if (rawName === null || rawName === undefined) continue;
    const name = String(rawName).trim();
    if (!name) continue;

    // Skip summary / total rows
    const lowerName = name.toLowerCase();
    if (lowerName.startsWith('итого') || lowerName.startsWith('жалпы /') || lowerName.startsWith('всего')) {
      continue;
    }

    const rawUnit = columns.unit !== -1 ? row[columns.unit] : undefined;
    const unit = rawUnit !== null && rawUnit !== undefined ? String(rawUnit).trim() : '';

    const parsedQty = columns.qty !== -1 ? parseLocaleNumber(row[columns.qty]) : NaN;
    const parsedPrice = columns.price !== -1 ? parseLocaleNumber(row[columns.price]) : NaN;

    // Fractional quantities (0.5 kg) are valid; only missing / non-positive values default to 1
    const quantity = Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 1;
    const unitPrice = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : 0;

    items.push({
      id: newItemId(),
      name,
      unit: unit || 'даана',
      quantity,
      unitPrice,
      total: Math.round(quantity * unitPrice * 100) / 100
    });
  }

  if (items.length === 0) {
    throw new Error('No valid items found in file');
  }

  return items;
}
