// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Root from '../Root';
import { AccountProvider } from '../account/AccountContext';
import { FakeAccountBackend, VALID_CODE } from '../test/fakeAccountBackend';

let backend: FakeAccountBackend;

const BUYER = { id: 'user-buyer@example.com', email: 'buyer@example.com' };

/** A buyer who chose a plan and pressed "I have paid" (done directly in the fake). */
const buyerPays = async (planId = '3m', reported = true) => {
  backend.user = BUYER;
  await backend.verifyCode(BUYER.email, VALID_CODE);
  const payment = await backend.requestPayment(planId);
  if (reported) await backend.reportPayment(payment.id, 'Азамат');
  backend.user = null;
  return payment;
};

const ADMIN_PASSWORD = 'test-pass-1';

/** Signs in on the panel page; for the administrator also enters the panel password (set up beforehand). */
const openPanel = async (email = 'admin@example.com', { unlock = true } = {}) => {
  window.history.replaceState(null, '', '/#admin');
  const user = userEvent.setup();
  render(
    <AccountProvider backend={backend}>
      <Root />
    </AccountProvider>
  );
  await user.click(await screen.findByRole('button', { name: 'Войти' }));
  const dialog = screen.getByRole('dialog', { name: 'Аккаунт' });
  await user.type(within(dialog).getByLabelText('Email'), email);
  await user.click(within(dialog).getByRole('button', { name: 'Получить код' }));
  await user.type(await within(dialog).findByLabelText('Код из письма'), VALID_CODE);
  await user.click(within(dialog).getByRole('button', { name: 'Войти' }));
  await user.keyboard('{Escape}');
  if (unlock && backend.admins.has(email)) {
    await user.type(await screen.findByLabelText('Пароль'), ADMIN_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Открыть панель' }));
    await screen.findByRole('navigation', { name: 'Разделы админ-панели' });
  }
  return user;
};

const tab = (name: RegExp) => screen.getByRole('button', { name });

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('kg_tender_calc_lang_v1', 'ru');
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  backend = new FakeAccountBackend();
  backend.admins.add('admin@example.com');
  backend.access = { paywallEnabled: true, loginRequired: true, paidUntil: null, plan: null };
  backend.adminPassword = ADMIN_PASSWORD;
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('админ-панель: доступ', () => {
  it('без входа просит войти, а не показывает ознакомительную страницу', async () => {
    window.history.replaceState(null, '', '/#admin');
    render(
      <AccountProvider backend={backend}>
        <Root />
      </AccountProvider>
    );
    expect(await screen.findByRole('heading', { name: 'Вход для администратора' })).toBeTruthy();
    expect(screen.queryByText(/Рассчитайте выгоду тендера/)).toBeNull();
  });

  it('обычному пользователю показывает «Нет доступа»', async () => {
    await openPanel('buyer@example.com');
    expect(await screen.findByRole('heading', { name: 'Нет доступа' })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Разделы админ-панели' })).toBeNull();
  });

  it('администратору показывает разделы и число новых заявок', async () => {
    await buyerPays();
    await openPanel();
    const nav = await screen.findByRole('navigation', { name: 'Разделы админ-панели' });
    expect(within(nav).getAllByRole('button').map(b => b.textContent)).toEqual(['Заявки1', 'Пользователи', 'Тарифы', 'Настройки']);
  });
});

describe('админ-панель: заявки', () => {
  it('подтверждение продлевает подписку покупателя', async () => {
    await buyerPays('3m');
    const user = await openPanel();

    const item = (await screen.findByText('buyer@example.com')).closest('li')!;
    expect(item.textContent?.replace(/\s+/g, ' ')).toMatch(/3 месяца · 1 000 сом/);
    expect(item.textContent).toContain('Сообщил об оплате');
    expect(item.textContent).toContain('«Азамат»');

    await user.click(within(item).getByRole('button', { name: 'Подтвердить' }));
    expect(await screen.findByText(/Оплата подтверждена\. Подписка buyer@example\.com — до/)).toBeTruthy();
    expect(screen.getByText('Новых заявок нет.')).toBeTruthy();
    expect(backend.paidUntilByUser.get(BUYER.id)).toBeTruthy();
    expect(tab(/^Заявки/).textContent).toBe('Заявки');
  });

  it('отклонение не даёт подписку, история показывает статусы', async () => {
    await buyerPays('1m');
    const user = await openPanel();
    const item = (await screen.findByText('buyer@example.com')).closest('li')!;
    await user.click(within(item).getByRole('button', { name: 'Отклонить' }));
    expect(await screen.findByText(/отклонена\./)).toBeTruthy();
    expect(backend.paidUntilByUser.has(BUYER.id)).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Все' }));
    const history = (await screen.findByText('buyer@example.com')).closest('li')!;
    expect(within(history).getByText('отклонена')).toBeTruthy();
    expect(within(history).queryByRole('button', { name: 'Подтвердить' })).toBeNull();
  });

  it('если подтверждение не отменено в диалоге — ничего не происходит', async () => {
    await buyerPays();
    const user = await openPanel();
    vi.mocked(window.confirm).mockReturnValue(false);
    const item = (await screen.findByText('buyer@example.com')).closest('li')!;
    await user.click(within(item).getByRole('button', { name: 'Подтвердить' }));
    expect(backend.payments[0].status).toBe('pending');
  });
});

describe('админ-панель: пользователи', () => {
  it('ищет, продлевает, задаёт дату и отключает подписку', async () => {
    await buyerPays('1m', false);
    const user = await openPanel();
    await user.click(tab(/Пользователи/));

    // Both users are listed (the header also shows the admin's email, so look inside the page body)
    const main = screen.getByRole('main');
    expect(await within(main).findByText('buyer@example.com')).toBeTruthy();
    expect(within(main).getByText('admin@example.com')).toBeTruthy();
    expect(within(main).getByText('админ')).toBeTruthy();
    await user.type(screen.getByLabelText('Поиск по email'), 'BUYER');
    await user.click(screen.getByRole('button', { name: 'Найти' }));
    await waitFor(() => expect(within(main).queryByText('admin@example.com')).toBeNull());

    let item = screen.getByText('buyer@example.com').closest('li')!;
    expect(item.textContent).toContain('Подписки нет');

    await user.click(within(item).getByRole('button', { name: '+3 мес' }));
    expect(await screen.findByText(/buyer@example\.com: подписка продлена до/)).toBeTruthy();
    item = screen.getByText('buyer@example.com').closest('li')!;
    expect(item.textContent).toMatch(/Подписка до \d{2}\.\d{2}\.\d{4}/);

    // A date picker in the browser; set the value directly (the field already shows the current end date)
    fireEvent.change(within(item).getByLabelText('Дата окончания подписки buyer@example.com'), { target: { value: '2030-01-15' } });
    await user.click(within(item).getByRole('button', { name: 'Сохранить дату' }));
    expect(await screen.findByText('buyer@example.com: подписка до 15.01.2030.')).toBeTruthy();
    expect(backend.paidUntilByUser.get(BUYER.id)?.slice(0, 4)).toBe('2030');

    item = screen.getByText('buyer@example.com').closest('li')!;
    await user.click(within(item).getByRole('button', { name: 'Отключить' }));
    expect(await screen.findByText('buyer@example.com: подписка отключена.')).toBeTruthy();
    expect(backend.paidUntilByUser.has(BUYER.id)).toBe(false);
  });
});

describe('админ-панель: тарифы и настройки', () => {
  it('меняет цену и скрывает тариф', async () => {
    const user = await openPanel();
    await user.click(tab(/Тарифы/));

    const price = await screen.findByLabelText('Цена: 6 месяцев');
    await user.clear(price);
    await user.type(price, '1900');
    const row = price.closest('li')!;
    expect(row.textContent?.replace(/\s+/g, ' ')).toContain('317 сом / мес');
    await user.click(within(row).getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByText('Тариф «6 месяцев» сохранён.')).toBeTruthy();
    expect(backend.plans.find(p => p.id === '6m')?.priceKgs).toBe(1900);

    const yearRow = screen.getByLabelText('Цена: 12 месяцев').closest('li')!;
    await user.click(within(yearRow).getByRole('checkbox', { name: 'Показывать' }));
    await user.click(within(yearRow).getByRole('button', { name: 'Сохранить' }));
    await screen.findByText('Тариф «12 месяцев» сохранён.');
    expect((await backend.listPlans()).map(p => p.id)).toEqual(['1m', '3m', '6m']);
  });

  it('не сохраняет нулевую цену', async () => {
    const user = await openPanel();
    await user.click(tab(/Тарифы/));
    const price = await screen.findByLabelText('Цена: 1 месяц');
    await user.clear(price);
    await user.type(price, '0');
    await user.click(within(price.closest('li')!).getByRole('button', { name: 'Сохранить' }));
    expect(screen.getByRole('alert').textContent).toMatch(/больше нуля/);
    expect(backend.plans[0].priceKgs).toBe(400);
  });

  it('переключает платный доступ и обязательный вход', async () => {
    const user = await openPanel();
    await user.click(tab(/Настройки/));

    const paywall = (await screen.findByText('Платный доступ')).closest('div.rounded-lg')!;
    expect(paywall.textContent).toContain('включено');
    await user.click(within(paywall as HTMLElement).getByRole('button', { name: 'Выключить' }));
    expect(await screen.findByText(/Сохранено/)).toBeTruthy();
    expect(backend.access.paywallEnabled).toBe(false);
    expect(window.confirm).toHaveBeenCalledWith('Выключить платный доступ? Все функции станут бесплатными.');
    await waitFor(() => expect(paywall.textContent).toContain('выключено'));

    const login = screen.getByText('Вход обязателен').closest('div.rounded-lg')!;
    await user.click(within(login as HTMLElement).getByRole('button', { name: 'Выключить' }));
    await waitFor(() => expect(backend.access.loginRequired).toBe(false));
  });
});

describe('админ-панель: пароль', () => {
  it('при первом входе просит придумать пароль и открывает панель', async () => {
    backend.adminPassword = null;
    const user = await openPanel('admin@example.com', { unlock: false });

    expect(await screen.findByRole('heading', { name: 'Придумайте пароль админ-панели' })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Разделы админ-панели' })).toBeNull();
    await user.type(screen.getByLabelText('Пароль'), 'first-pass-7');
    await user.type(screen.getByLabelText('Повтор пароля'), 'first-pass-8');
    await user.click(screen.getByRole('button', { name: 'Сохранить пароль' }));
    expect(screen.getByRole('alert').textContent).toMatch(/не совпадают/);

    await user.clear(screen.getByLabelText('Повтор пароля'));
    await user.type(screen.getByLabelText('Повтор пароля'), 'first-pass-7');
    await user.click(screen.getByRole('button', { name: 'Сохранить пароль' }));
    expect(await screen.findByRole('navigation', { name: 'Разделы админ-панели' })).toBeTruthy();
    expect(backend.adminPassword).toBe('first-pass-7');
  });

  it('неверный пароль не открывает панель, после 5 попыток — блокировка', async () => {
    const user = await openPanel('admin@example.com', { unlock: false });
    for (let i = 0; i < 4; i++) {
      await user.type(await screen.findByLabelText('Пароль'), 'wrong');
      await user.click(screen.getByRole('button', { name: 'Открыть панель' }));
      expect((await screen.findByRole('alert')).textContent).toBe('Неверный пароль.');
    }
    await user.type(screen.getByLabelText('Пароль'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Открыть панель' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Подождите 15 минут/);

    await user.type(screen.getByLabelText('Пароль'), ADMIN_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Открыть панель' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Подождите 15 минут/);
    expect(screen.queryByRole('navigation', { name: 'Разделы админ-панели' })).toBeNull();
  });

  it('когда сессия истекает, снова просит пароль', async () => {
    await buyerPays();
    const user = await openPanel();
    backend.adminSessions.clear(); // the session key expired on the server

    await user.click(tab(/Пользователи/));
    expect(await screen.findByText('Сессия истекла — введите пароль снова.')).toBeTruthy();
    await user.type(screen.getByLabelText('Пароль'), ADMIN_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Открыть панель' }));
    expect(await screen.findByRole('navigation', { name: 'Разделы админ-панели' })).toBeTruthy();
  });

  it('кнопка с замком закрывает панель до ввода пароля', async () => {
    const user = await openPanel();
    await user.click(screen.getByRole('button', { name: 'Заблокировать панель' }));
    expect(await screen.findByRole('heading', { name: 'Пароль админ-панели' })).toBeTruthy();
  });

  it('пароль можно сменить в настройках', async () => {
    const user = await openPanel();
    await user.click(tab(/Настройки/));
    await user.type(screen.getByLabelText('Текущий пароль'), 'nope');
    await user.type(screen.getByLabelText('Новый пароль'), 'new-pass-22');
    await user.type(screen.getByLabelText('Повтор нового пароля'), 'new-pass-22');
    await user.click(screen.getByRole('button', { name: 'Сменить пароль' }));
    expect(await screen.findByText(/Текущий пароль неверный/)).toBeTruthy();

    await user.clear(screen.getByLabelText('Текущий пароль'));
    await user.type(screen.getByLabelText('Текущий пароль'), ADMIN_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Сменить пароль' }));
    expect(await screen.findByText(/Пароль изменён/)).toBeTruthy();
    expect(backend.adminPassword).toBe('new-pass-22');

    // The panel keeps working with the new session key
    await user.click(tab(/Тарифы/));
    expect(await screen.findByLabelText('Цена: 1 месяц')).toBeTruthy();
  });
});
