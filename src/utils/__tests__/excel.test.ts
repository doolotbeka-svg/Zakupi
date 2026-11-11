import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseUploadedFile } from '../excel';

const csv = (text: string, name = 'spec.csv') => new File([text], name);

const xlsx = (sheets: Record<string, unknown[][]>, name = 'spec.xlsx') => {
  const wb = XLSX.utils.book_new();
  for (const [sheetName, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheetName);
  }
  return new File([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], name);
};

/** Keeps only the fields that matter (ids are random). */
const plain = (items: Awaited<ReturnType<typeof parseUploadedFile>>) =>
  items.map(({ name, unit, quantity, unitPrice, total }) => ({ name, unit, quantity, unitPrice, total }));

describe('parseUploadedFile — CSV', () => {
  it('читает кириллицу в UTF-8', async () => {
    const items = await parseUploadedFile(
      csv('№,Наименование товара,Ед. изм.,Количество,Цена\n1,Бумага офисная А4,коробка,50,320\n')
    );
    expect(plain(items)).toEqual([
      { name: 'Бумага офисная А4', unit: 'коробка', quantity: 50, unitPrice: 320, total: 16_000 }
    ]);
  });

  it('читает UTF-8 с BOM', async () => {
    const items = await parseUploadedFile(csv('﻿Наименование,Количество,Цена\nКабель,4,6500\n'));
    expect(plain(items)).toEqual([{ name: 'Кабель', unit: 'даана', quantity: 4, unitPrice: 6500, total: 26_000 }]);
  });

  it('читает кириллицу в Windows-1251', async () => {
    // "Наименование,Цена\nБумага,50\n" в кодировке Windows-1251
    const bytes = new Uint8Array([
      0xcd, 0xe0, 0xe8, 0xec, 0xe5, 0xed, 0xee, 0xe2, 0xe0, 0xed, 0xe8, 0xe5, 0x2c, 0xd6, 0xe5, 0xed, 0xe0, 0x0a,
      0xc1, 0xf3, 0xec, 0xe0, 0xe3, 0xe0, 0x2c, 0x35, 0x30, 0x0a
    ]);
    const items = await parseUploadedFile(new File([bytes], 'legacy.csv'));
    expect(plain(items)).toEqual([{ name: 'Бумага', unit: 'даана', quantity: 1, unitPrice: 50, total: 50 }]);
  });

  it('понимает разделитель «;», десятичную запятую и пробелы в числах', async () => {
    const items = await parseUploadedFile(
      csv('№;Наименование товара;Ед. изм.;Количество;Цена\n1;Мука;кг;0,5;1 200,50\n')
    );
    expect(plain(items)).toEqual([{ name: 'Мука', unit: 'кг', quantity: 0.5, unitPrice: 1200.5, total: 600.25 }]);
  });

  it('понимает форматы 1,200.50 и 1.200,50', async () => {
    const items = await parseUploadedFile(
      csv('Наименование;Количество;Цена\nА;1;"1,200.50"\nБ;1;"1.200,50"\nВ;1;"12 345"\n')
    );
    expect(items.map(i => i.unitPrice)).toEqual([1200.5, 1200.5, 12345]);
  });
});

describe('parseUploadedFile — определение колонок', () => {
  it('не путает цену за единицу с колонкой итога', async () => {
    const items = await parseUploadedFile(
      xlsx({
        Лист1: [
          ['№', 'Наименование', 'Кол-во', 'Цена', 'Общая стоимость'],
          [1, 'Цемент', 10, 420, 4200]
        ]
      })
    );
    expect(plain(items)).toEqual([{ name: 'Цемент', unit: 'даана', quantity: 10, unitPrice: 420, total: 4200 }]);
  });

  it('работает с колонками в произвольном порядке и заголовком не в первой строке', async () => {
    const items = await parseUploadedFile(
      xlsx({
        Лист1: [
          ['Спецификация к тендеру №452'],
          [],
          ['Цена за ед.', 'Количество', 'Ед. изм.', 'Наименование товара'],
          [3800, 85, 'рулон', 'Линолеум']
        ]
      })
    );
    expect(plain(items)).toEqual([
      { name: 'Линолеум', unit: 'рулон', quantity: 85, unitPrice: 3800, total: 323_000 }
    ]);
  });

  it('понимает кыргызские заголовки', async () => {
    const items = await parseUploadedFile(
      xlsx({
        Шаблон: [
          ['№', 'Товардын аталышы', 'Өлчөө бирдиги', 'Саны', 'Сатып алуу баасы', 'Жалпы сумма'],
          [1, 'Кеңсе кагазы А4', 'куту', 50, 320, 16000]
        ]
      })
    );
    expect(plain(items)).toEqual([
      { name: 'Кеңсе кагазы А4', unit: 'куту', quantity: 50, unitPrice: 320, total: 16_000 }
    ]);
  });

  it('без заголовка использует раскладку шаблона: № | название | ед. | кол-во | цена', async () => {
    const items = await parseUploadedFile(
      xlsx({
        Лист1: [
          ['a', 'b', 'c', 'd', 'e'],
          [1, 'Краска', 'банка', 3, 950]
        ]
      })
    );
    expect(plain(items)).toEqual([{ name: 'Краска', unit: 'банка', quantity: 3, unitPrice: 950, total: 2850 }]);
  });

  it('импортирует собственный экспорт: спецификация на втором листе, итоговая строка пропускается', async () => {
    const items = await parseUploadedFile(
      xlsx({
        'Финансовый расчет': [
          ['РАСЧЕТ РЕНТАБЕЛЬНОСТИ ТЕНДЕРА (КЫРГЫЗСТАН)'],
          ['Налоговый режим', 'Общий режим'],
          ['Закупочная себестоимость товаров (KGS)', 1069000]
        ],
        'Спецификация товаров': [
          ['№', 'Наименование товара', 'Ед. изм.', 'Количество', 'Закупочная цена (KGS)', 'Итого закуп (KGS)'],
          [1, 'Ноутбук', 'шт', 15, 48000, 720000],
          [2, 'МФУ', 'шт', 6, 24500, 147000],
          ['', 'ИТОГО ПО СПЕЦИФИКАЦИИ', '', 21, '', 867000]
        ]
      })
    );
    expect(plain(items)).toEqual([
      { name: 'Ноутбук', unit: 'шт', quantity: 15, unitPrice: 48000, total: 720_000 },
      { name: 'МФУ', unit: 'шт', quantity: 6, unitPrice: 24500, total: 147_000 }
    ]);
  });
});

describe('parseUploadedFile — значения строк', () => {
  const sheet = (rows: unknown[][]) =>
    xlsx({ Лист1: [['Наименование', 'Ед. изм.', 'Количество', 'Цена'], ...rows] });

  it('сохраняет дробное количество', async () => {
    const [item] = await parseUploadedFile(sheet([['Масло', 'л', 0.25, 400]]));
    expect(item.quantity).toBe(0.25);
    expect(item.total).toBe(100);
  });

  it('пустое или некорректное количество заменяет на 1, цену — на 0', async () => {
    const items = await parseUploadedFile(
      sheet([
        ['Без количества', 'шт', '', 100],
        ['Нулевое количество', 'шт', 0, 100],
        ['Отрицательная цена', 'шт', 2, -5],
        ['Текст вместо цены', 'шт', 2, 'по запросу']
      ])
    );
    expect(items.map(i => [i.quantity, i.unitPrice])).toEqual([
      [1, 100],
      [1, 100],
      [2, 0],
      [2, 0]
    ]);
  });

  it('пропускает пустые строки и строки итогов, принимает числовые названия', async () => {
    const items = await parseUploadedFile(
      sheet([
        ['Гвозди', 'кг', 5, 190],
        [],
        ['', 'шт', 1, 1],
        [12345, 'шт', 1, 10],
        ['Итого', '', 6, ''],
        ['Всего по смете', '', '', 960]
      ])
    );
    expect(items.map(i => i.name)).toEqual(['Гвозди', '12345']);
  });

  it('пустая единица измерения заменяется значением по умолчанию', async () => {
    const [item] = await parseUploadedFile(sheet([['Песок', '', 2, 600]]));
    expect(item.unit).toBe('даана');
  });

  it('округляет сумму строки до копеек', async () => {
    const [item] = await parseUploadedFile(sheet([['Ткань', 'м', 0.1, 0.2]]));
    expect(item.total).toBe(0.02);
  });

  it('выдаёт уникальные идентификаторы', async () => {
    const items = await parseUploadedFile(sheet(Array.from({ length: 50 }, (_, i) => [`Товар ${i}`, 'шт', 1, 1])));
    expect(new Set(items.map(i => i.id)).size).toBe(50);
  });
});

describe('parseUploadedFile — ошибки', () => {
  it('отклоняет файл без строк данных', async () => {
    await expect(parseUploadedFile(csv('Наименование,Цена\n'))).rejects.toThrow();
  });

  it('отклоняет файл, в котором нет ни одной позиции', async () => {
    await expect(
      parseUploadedFile(xlsx({ Лист1: [['Наименование', 'Количество', 'Цена'], ['', 1, 2], ['Итого', '', 2]] }))
    ).rejects.toThrow('No valid items');
  });
});
