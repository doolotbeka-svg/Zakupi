// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { DEFAULT_KGS_PER_RUB, setKgsPerRub } from '../utils/currency';
import { buildShareUrl, readSharedTenderFromHash } from '../utils/share';
import { INITIAL_TENDER_PARAMS, DEFAULT_SPECIFICATION_ITEMS } from '../data/defaultTemplates';

/** Text of the element with collapsed whitespace (amounts use non-breaking-free plain spaces). */
const textOf = (element: HTMLElement) => (element.textContent ?? '').replace(/\s+/g, ' ').trim();

/** KPI card (or any block) that contains the given label. */
const cardWith = (label: string | RegExp) => {
  const node = screen.getAllByText(label)[0];
  return node.closest('div.rounded-lg') as HTMLElement;
};

const setup = async ({ lang = 'ru' }: { lang?: 'ru' | 'ky' } = {}) => {
  const user = userEvent.setup();
  render(<App />);
  if (lang === 'ru') await user.click(screen.getByRole('button', { name: 'Русский' }));
  return user;
};

const replaceValue = async (user: ReturnType<typeof userEvent.setup>, input: HTMLElement, value: string) => {
  await user.clear(input);
  await user.type(input, value);
};

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setKgsPerRub(DEFAULT_KGS_PER_RUB);
});

describe('запуск и язык', () => {
  it('по умолчанию открывается на кыргызском и показывает расчёт стандартного примера', async () => {
    await setup({ lang: 'ky' });

    expect(screen.getByRole('heading', { name: '1. Тендердин параметрлери' })).toBeTruthy();
    expect(document.documentElement.lang).toBe('ky');
    // 1 500 000 − 5% = 1 425 000; прибыль 278 875
    expect(textOf(cardWith(/Акыркы баа/))).toContain('1 425 000 KGS');
    expect(textOf(cardWith(/Таза киреше/))).toContain('278 875 KGS');
  });

  it('переключается на русский и запоминает выбор', async () => {
    await setup();

    expect(screen.getByRole('heading', { name: '1. Блок параметров тендера' })).toBeTruthy();
    expect(document.documentElement.lang).toBe('ru');
    expect(localStorage.getItem('kg_tender_calc_lang_v1')).toBe('ru');

    cleanup();
    render(<App />);
    expect(screen.getByRole('heading', { name: '1. Блок параметров тендера' })).toBeTruthy();
  });

  it('не падает на повреждённых данных в хранилище', () => {
    localStorage.setItem('kg_tender_calc_items_v1', '{"не":"массив"}');
    localStorage.setItem('kg_tender_calc_params_v1', '{"taxRegime":"bogus","plannedPrice":"x"}');
    localStorage.setItem('kg_tender_calc_saved_v1', 'не json');
    localStorage.setItem('kg_tender_calc_discount_v1', 'abc');

    render(<App />);
    expect(textOf(cardWith(/Акыркы баа/))).toContain('1 425 000 KGS');
  });
});

describe('параметры и расчёт', () => {
  it('пересчитывает показатели при изменении плановой суммы', async () => {
    const user = await setup();
    await replaceValue(user, screen.getByLabelText('Планируемая сумма закупки'), '2000000');

    // 2 000 000 − 5% = 1 900 000; гарантия 2% = 40 000; расходы 1 149 000; налог 0.5% = 9 500
    expect(textOf(cardWith('Итоговая цена контракта'))).toContain('1 900 000 KGS');
    expect(textOf(cardWith('Себестоимость с расходами'))).toContain('1 149 000 KGS');
    expect(textOf(cardWith('Чистая прибыль'))).toContain('741 500 KGS');
  });

  it('смена налогового режима меняет налог', async () => {
    const user = await setup();
    await user.selectOptions(screen.getByLabelText('Налоговый режим Кыргызстана'), 'unified_60');

    // 6% от 1 425 000
    expect(textOf(cardWith('Налоги'))).toContain('85 500 KGS');
  });

  it('показывает предупреждение об убытке', async () => {
    const user = await setup();
    expect(screen.queryByText(/контракт убыточен/)).toBeNull();

    await replaceValue(user, screen.getByLabelText('Планируемая сумма закупки'), '1000000');
    expect(screen.getByText(/контракт убыточен/)).toBeTruthy();
  });

  it('строки спецификации управляют себестоимостью', async () => {
    const user = await setup();
    const cost = screen.getByLabelText('Себестоимость товаров') as HTMLInputElement;
    expect(cost.value).toBe('1069000');
    expect(cost.disabled).toBe(true);

    // Удаляем первую строку (ноутбуки, 720 000)
    await user.click(screen.getAllByRole('button', { name: 'Удалить' })[0]);
    expect(cost.value).toBe('349000');

    await user.click(screen.getByRole('button', { name: 'Добавить строку' }));
    const rows = screen.getAllByRole('row');
    const newRow = rows[rows.length - 2]; // последняя строка перед итогом
    const [quantity, price] = within(newRow).getAllByRole('spinbutton');
    await replaceValue(user, quantity, '3');
    await replaceValue(user, price, '1000');
    expect(cost.value).toBe('352000');
  });

  it('сброс возвращает стандартные значения', async () => {
    const user = await setup();
    await replaceValue(user, screen.getByLabelText('Планируемая сумма закупки'), '999');
    await user.click(screen.getByRole('button', { name: 'Сбросить параметры' }));

    expect((screen.getByLabelText('Планируемая сумма закупки') as HTMLInputElement).value).toBe('1500000');
  });
});

describe('снижение цены', () => {
  it('точное поле принимает дробный процент и значения выше диапазона ползунка', async () => {
    const user = await setup();
    const exact = screen.getByLabelText('Точный процент снижения');

    await replaceValue(user, exact, '12,35');
    // 1 500 000 × (1 − 0.1235)
    expect(textOf(cardWith('Итоговая цена контракта'))).toContain('1 314 750 KGS');

    await replaceValue(user, exact, '55');
    expect(textOf(cardWith('Итоговая цена контракта'))).toContain('675 000 KGS');
    expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('40');
    expect(localStorage.getItem('kg_tender_calc_discount_v1')).toBe('55');
  });

  it('точное поле ограничивает значение 99.99% и приводит текст в порядок при выходе', async () => {
    const user = await setup();
    const exact = screen.getByLabelText('Точный процент снижения') as HTMLInputElement;

    await replaceValue(user, exact, '500');
    await user.tab();
    expect(exact.value).toBe('99.99');
  });

  it('кнопки быстрого выбора и шага меняют процент', async () => {
    const user = await setup();
    const exact = screen.getByLabelText('Точный процент снижения') as HTMLInputElement;

    await user.click(screen.getByRole('button', { name: '10%' }));
    expect(exact.value).toBe('10.0');
    await user.click(screen.getByRole('button', { name: '+0.5' }));
    expect(exact.value).toBe('10.5');
    await user.click(screen.getByRole('button', { name: '-1%' }));
    expect(exact.value).toBe('9.5');
  });

  it('обратный расчёт находит снижение под желаемую рентабельность и применяет его', async () => {
    const user = await setup();
    await replaceValue(user, screen.getByLabelText(/желаемая рентабельность/), '15');

    const applyButton = screen.getByRole('button', { name: 'Применить' });
    await user.click(applyButton);

    const exact = screen.getByLabelText('Точный процент снижения') as HTMLInputElement;
    const applied = parseFloat(exact.value);
    expect(applied).toBeGreaterThan(0);
    expect(applied).toBeLessThan(23.68); // меньше точки безубыточности

    const margin = parseFloat(/([+-]?\d+\.\d)%/.exec(textOf(cardWith('Рентабельность (%)')))![1]);
    expect(margin).toBe(15);
  });

  it('обратный расчёт сообщает о недостижимой цели', async () => {
    const user = await setup();
    await replaceValue(user, screen.getByLabelText(/желаемая рентабельность/), '60');

    expect(screen.getByText(/При плановой цене такая рентабельность недостижима/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Применить' })).toBeNull();
  });
});

describe('валюта', () => {
  it('в рублях суммы пересчитываются по введённому курсу, поля ввода остаются в сомах', async () => {
    const user = await setup();
    await user.click(screen.getByRole('button', { name: 'RUB' }));
    await replaceValue(user, screen.getByLabelText(/Курс рубля/), '1.25');

    // 1 425 000 KGS / 1.25
    expect(textOf(cardWith('Итоговая цена контракта'))).toContain('1 140 000 RUB');
    expect((screen.getByLabelText('Планируемая сумма закупки') as HTMLInputElement).value).toBe('1500000');

    await user.click(screen.getByRole('button', { name: 'KGS' }));
    expect(textOf(cardWith('Итоговая цена контракта'))).toContain('1 425 000 KGS');
    expect(screen.queryByLabelText(/Курс рубля/)).toBeNull();
  });
});

describe('шаблоны и сохранённые расчёты', () => {
  it('применяет готовый шаблон', async () => {
    const user = await setup();
    await user.click(screen.getByRole('button', { name: 'Готовые шаблоны' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getAllByRole('button', { name: 'Применить этот шаблон' })[1]);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect((screen.getByLabelText('Планируемая сумма закупки') as HTMLInputElement).value).toBe('850000');
    expect((screen.getByLabelText('Точный процент снижения') as HTMLInputElement).value).toBe('4.0');
  });

  it('сохраняет, загружает и удаляет расчёты', async () => {
    const user = await setup();
    const openSaved = () => user.click(screen.getByRole('button', { name: /Сохраненные расчеты/ }));

    await openSaved();
    await user.type(screen.getByPlaceholderText(/Название тендера/), 'Школа');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();

    await replaceValue(user, screen.getByLabelText('Планируемая сумма закупки'), '2000000');
    await openSaved();
    await replaceValue(user, screen.getByPlaceholderText(/Название тендера/), 'Больница');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    let dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByRole('heading', { level: 4 }).map(textOf)).toEqual(['Больница', 'Школа']);

    // Загружаем первый расчёт
    await user.click(within(dialog).getAllByRole('button', { name: 'Загрузить' })[1]);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect((screen.getByLabelText('Планируемая сумма закупки') as HTMLInputElement).value).toBe('1500000');

    // Список переживает перезапуск приложения
    cleanup();
    render(<App />);
    await openSaved();
    dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByRole('heading', { level: 4 })).toHaveLength(2);

    await user.click(within(dialog).getByRole('button', { name: 'Удалить: Больница' }));
    expect(within(dialog).getAllByRole('heading', { level: 4 }).map(textOf)).toEqual(['Школа']);
  });

  it('не загружает расчёт, если пользователь отказался', async () => {
    const user = await setup();
    await user.click(screen.getByRole('button', { name: /Сохраненные расчеты/ }));
    await user.type(screen.getByPlaceholderText(/Название тендера/), 'Школа');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    await user.keyboard('{Escape}');
    await replaceValue(user, screen.getByLabelText('Планируемая сумма закупки'), '777');

    vi.mocked(window.confirm).mockReturnValue(false);
    await user.click(screen.getByRole('button', { name: /Сохраненные расчеты/ }));
    await user.click(screen.getByRole('button', { name: 'Загрузить' }));

    expect((screen.getByLabelText('Планируемая сумма закупки') as HTMLInputElement).value).toBe('777');
  });
});

describe('ссылка на расчёт', () => {
  const shared = {
    title: 'Тендер из ссылки',
    params: { ...INITIAL_TENDER_PARAMS, plannedPrice: 3_000_000, syncWithSpec: false },
    items: DEFAULT_SPECIFICATION_ITEMS,
    discount: 12.5
  };
  const openWithLink = () => {
    const url = new URL(buildShareUrl(shared, 'http://localhost/'));
    window.history.replaceState(null, '', url.pathname + url.hash);
  };

  it('открывает расчёт из ссылки после подтверждения и убирает его из адреса', () => {
    openWithLink();
    render(<App />);

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText(/Пландалган сатып алуу суммасы/) as HTMLInputElement).value).toBe('3000000');
    expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('12.5');
    expect(window.location.hash).toBe('');
  });

  it('оставляет текущий расчёт, если пользователь отказался', () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    openWithLink();
    render(<App />);

    expect((screen.getByLabelText(/Пландалган сатып алуу суммасы/) as HTMLInputElement).value).toBe('1500000');
    expect(window.location.hash).toBe('');
  });

  it('сообщает о повреждённой ссылке и ничего не меняет', () => {
    window.history.replaceState(null, '', '/#s=broken');
    render(<App />);

    expect(window.confirm).not.toHaveBeenCalled();
    expect(screen.getByText(/окуу мүмкүн болгон жок/)).toBeTruthy();
    expect((screen.getByLabelText(/Пландалган сатып алуу суммасы/) as HTMLInputElement).value).toBe('1500000');
  });

  it('кнопка «Поделиться» копирует ссылку, по которой открывается тот же расчёт', async () => {
    const user = await setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    await replaceValue(user, screen.getByLabelText('Планируемая сумма закупки'), '2500000');
    await user.click(screen.getByRole('button', { name: '7.5%' }));

    await user.click(screen.getByRole('button', { name: 'Скопировать ссылку на расчёт' }));

    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = readSharedTenderFromHash(new URL(writeText.mock.calls[0][0]).hash)!;
    expect(copied.params.plannedPrice).toBe(2_500_000);
    expect(copied.discount).toBe(7.5);
    expect(copied.items).toHaveLength(DEFAULT_SPECIFICATION_ITEMS.length);
    expect(await screen.findByText(/Ссылка на расчёт скопирована/)).toBeTruthy();
  });
});

describe('печатный отчёт', () => {
  it('открывается с цифрами текущего расчёта и закрывается по Escape', async () => {
    const user = await setup();
    await user.click(screen.getByRole('button', { name: 'Печать отчета / PDF' }));

    const dialog = screen.getByRole('dialog');
    expect(textOf(dialog)).toContain('КАРТА РЕНТАБЕЛЬНОСТИ ТЕНДЕРА');
    expect(textOf(dialog)).toContain('1 425 000 KGS');
    expect(within(dialog).getAllByRole('row').length).toBeGreaterThan(DEFAULT_SPECIFICATION_ITEMS.length);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
