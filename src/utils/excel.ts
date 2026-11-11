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
    [isKy ? `Итоговая цена контракта (${currency})` : `Итоговая цена контракта (${currency})`, result.finalContractPrice],
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
    [isKy ? '4. КАРЖЫЛЫК ЖЫЙЫНТЫК ЖАНА БЕЗУБЫТОЧНОСТЬ' : '4. ФИНАНСОВЫЙ ИТОГ И БЕЗУБЫТОЧНОСТЬ', ''],
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

/**
 * Parses an uploaded Excel or CSV file into SpecificationItem array.
 */
export async function parseUploadedFile(file: File): Promise<SpecificationItem[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('Empty workbook');

  const sheet = wb.Sheets[sheetName];
  const rawRows = (XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown) as unknown[][];

  if (!rawRows || rawRows.length < 2) {
    throw new Error('Not enough rows in file');
  }

  // Find header row by looking for keywords
  let headerRowIndex = 0;
  let nameColIdx = 1;
  let unitColIdx = 2;
  let qtyColIdx = 3;
  let priceColIdx = 4;

  for (let r = 0; r < Math.min(5, rawRows.length); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;

    let foundName = -1;
    let foundQty = -1;
    let foundPrice = -1;
    let foundUnit = -1;

    row.forEach((cell, idx) => {
      if (typeof cell !== 'string') return;
      const val = cell.toLowerCase().trim();
      if (val.includes('наименов') || val.includes('аталыш') || val.includes('товар') || val.includes('name') || val.includes('предмет')) {
        foundName = idx;
      } else if (val.includes('саны') || val.includes('колич') || val.includes('qty') || val.includes('кол-во')) {
        foundQty = idx;
      } else if (val.includes('баа') || val.includes('цена') || val.includes('price') || val.includes('стоим')) {
        foundPrice = idx;
      } else if (val.includes('бирдик') || val.includes('изм') || val.includes('unit')) {
        foundUnit = idx;
      }
    });

    if (foundName !== -1 && (foundQty !== -1 || foundPrice !== -1)) {
      headerRowIndex = r;
      nameColIdx = foundName;
      if (foundQty !== -1) qtyColIdx = foundQty;
      if (foundPrice !== -1) priceColIdx = foundPrice;
      if (foundUnit !== -1) unitColIdx = foundUnit;
      break;
    }
  }

  const items: SpecificationItem[] = [];

  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rawName = row[nameColIdx];
    if (!rawName || typeof rawName !== 'string' || !rawName.trim()) continue;

    const name = rawName.trim();
    // Skip summary / total rows
    if (name.toLowerCase().includes('итого') || name.toLowerCase().includes('жалпы') || name.toLowerCase().includes('всего')) {
      continue;
    }

    const rawUnit = unitColIdx !== -1 && row[unitColIdx] ? String(row[unitColIdx]).trim() : 'даана';
    const rawQty = row[qtyColIdx];
    const rawPrice = row[priceColIdx];

    const quantity = Math.max(1, typeof rawQty === 'number' ? rawQty : parseFloat(String(rawQty).replace(/\s/g, '').replace(',', '.')) || 1);
    const unitPrice = Math.max(0, typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice).replace(/\s/g, '').replace(',', '.')) || 0);
    const total = quantity * unitPrice;

    items.push({
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name,
      unit: rawUnit || 'даана',
      quantity,
      unitPrice,
      total
    });
  }

  if (items.length === 0) {
    throw new Error('No valid items found in file');
  }

  return items;
}
