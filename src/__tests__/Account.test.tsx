// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { AccountProvider } from '../account/AccountContext';
import { FakeAccountBackend, VALID_CODE } from '../test/fakeAccountBackend';

let backend: FakeAccountBackend;

const renderApp = async () => {
  const user = userEvent.setup();
  render(
    <AccountProvider backend={backend}>
      <App />
    </AccountProvider>
  );
  await user.click(screen.getByRole('button', { name: 'Русский' }));
  return user;
};

const signIn = async (user: ReturnType<typeof userEvent.setup>, email = 'buyer@example.com') => {
  await user.click(screen.getByRole('button', { name: 'Войти' }));
  const dialog = screen.getByRole('dialog', { name: 'Аккаунт' });
  // The form keeps the last email after signing out, so start from an empty field
  await user.clear(within(dialog).getByLabelText('Email'));
  await user.type(within(dialog).getByLabelText('Email'), email);
  await user.click(within(dialog).getByRole('button', { name: 'Получить код' }));
  await user.type(await within(dialog).findByLabelText('Код из письма'), VALID_CODE);
  await user.click(within(dialog).getByRole('button', { name: 'Войти' }));
  await within(dialog).findByText(email);
  return dialog;
};

const inAMonth = () => new Date(Date.now() + 30 * 86_400_000).toISOString();

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  backend = new FakeAccountBackend();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('без настроенных аккаунтов', () => {
  it('кнопки входа нет', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Русский' }));
    expect(screen.queryByRole('button', { name: 'Войти' })).toBeNull();
  });
});

describe('вход по коду на email', () => {
  it('отправляет код, отклоняет неверный и входит с верным', async () => {
    const user = await renderApp();
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    const dialog = screen.getByRole('dialog', { name: 'Аккаунт' });

    await user.type(within(dialog).getByLabelText('Email'), 'не-email');
    await user.click(within(dialog).getByRole('button', { name: 'Получить код' }));
    expect(within(dialog).getByRole('alert').textContent).toMatch(/Неверный адрес email/);

    await user.clear(within(dialog).getByLabelText('Email'));
    await user.type(within(dialog).getByLabelText('Email'), 'buyer@example.com');
    await user.click(within(dialog).getByRole('button', { name: 'Получить код' }));
    expect(backend.sentCodes).toEqual(['buyer@example.com']);
    expect(await within(dialog).findByText(/Код отправлен на/)).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: /Отправить снова \(60 сек\)/ })).toHaveProperty('disabled', true);

    await user.type(within(dialog).getByLabelText('Код из письма'), '000000');
    await user.click(within(dialog).getByRole('button', { name: 'Войти' }));
    expect((await within(dialog).findByRole('alert')).textContent).toMatch(/Код неверный или устарел/);

    await user.clear(within(dialog).getByLabelText('Код из письма'));
    await user.type(within(dialog).getByLabelText('Код из письма'), VALID_CODE);
    await user.click(within(dialog).getByRole('button', { name: 'Войти' }));

    expect(await within(dialog).findByText('buyer@example.com')).toBeTruthy();
    expect(within(dialog).getByText('Сейчас все функции доступны бесплатно.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Аккаунт' })).toBeTruthy();
  });

  it('сообщает о лимите отправки писем', async () => {
    const user = await renderApp();
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    const dialog = screen.getByRole('dialog', { name: 'Аккаунт' });
    await user.type(within(dialog).getByLabelText('Email'), 'limited@example.com');
    await user.click(within(dialog).getByRole('button', { name: 'Получить код' }));
    expect((await within(dialog).findByRole('alert')).textContent).toMatch(/Слишком много попыток/);
  });

  it('без своего почтового сервиса объясняет, что вход временно недоступен', async () => {
    const user = await renderApp();
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    const dialog = screen.getByRole('dialog', { name: 'Аккаунт' });
    await user.type(within(dialog).getByLabelText('Email'), 'outsider@example.com');
    await user.click(within(dialog).getByRole('button', { name: 'Получить код' }));
    expect((await within(dialog).findByRole('alert')).textContent).toMatch(
      /Вход в аккаунт сейчас работает в тестовом режиме и временно недоступен/
    );
  });

  it('выход возвращает кнопку «Войти»', async () => {
    const user = await renderApp();
    const dialog = await signIn(user);
    await user.click(within(dialog).getByRole('button', { name: 'Выйти' }));
    expect(await screen.findByRole('button', { name: 'Войти' })).toBeTruthy();
  });
});

describe('платный доступ', () => {
  it('при выключенном переключателе печать работает без входа', async () => {
    const user = await renderApp();
    await user.click(screen.getByRole('button', { name: 'Печать отчета / PDF' }));
    expect(screen.getByRole('dialog').textContent).toContain('КАРТА РЕНТАБЕЛЬНОСТИ ТЕНДЕРА');
  });

  it('при включённом переключателе без подписки предлагает войти и оформить подписку', async () => {
    backend.access = { paywallEnabled: true, loginRequired: false, paidUntil: null, plan: null };
    const user = await renderApp();

    await user.click(screen.getByRole('button', { name: 'Печать отчета / PDF' }));
    const dialog = screen.getByRole('dialog', { name: 'Аккаунт' });
    expect(dialog.textContent).toMatch(/«Печать отчёта» доступна по подписке/);
    expect(dialog.textContent).not.toContain('КАРТА РЕНТАБЕЛЬНОСТИ');

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Экспорт в Excel (Excelге жүктөө)' }));
    expect(screen.getByRole('dialog', { name: 'Аккаунт' }).textContent).toMatch(/«Импорт и экспорт Excel» доступна по подписке/);
  });

  it('после входа без подписки показывает тарифы с ценами', async () => {
    backend.access = { paywallEnabled: true, loginRequired: false, paidUntil: null, plan: null };
    const user = await renderApp();
    const dialog = await signIn(user);

    expect(within(dialog).getByText('Подписки нет.')).toBeTruthy();
    const plans = within(dialog).getAllByRole('radio').map(r => r.textContent?.replace(/\s+/g, ' '));
    expect(plans).toEqual([
      '1 месяц400 сом',
      '3 месяца1 000 сом333 сом / мес',
      '6 месяцев2 100 сом350 сом / мес',
      '12 месяцев3 700 сом308 сом / мес'
    ]);
    expect(within(dialog).getByRole('button', { name: 'Перейти к оплате по QR' })).toBeTruthy();
  });

  it('с активной подпиской платные функции открываются', async () => {
    backend.access = { paywallEnabled: true, loginRequired: false, paidUntil: inAMonth(), plan: 'manual' };
    const user = await renderApp();
    const dialog = await signIn(user);
    expect(within(dialog).getByText(/Активна до/)).toBeTruthy();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Печать отчета / PDF' }));
    expect(screen.getByRole('dialog').textContent).toContain('КАРТА РЕНТАБЕЛЬНОСТИ ТЕНДЕРА');
  });
});

describe('сохранённые расчёты в аккаунте', () => {
  const saveAs = async (user: ReturnType<typeof userEvent.setup>, title: string) => {
    await user.click(screen.getByRole('button', { name: /Сохраненные расчеты/ }));
    const dialog = screen.getByRole('dialog', { name: 'Сохраненные расчеты' });
    await user.clear(within(dialog).getByPlaceholderText(/Название тендера/));
    await user.type(within(dialog).getByPlaceholderText(/Название тендера/), title);
    await user.click(within(dialog).getByRole('button', { name: /Сохранить|Перезаписать/ }));
    await user.keyboard('{Escape}');
  };

  it('при входе переносит расчёты из браузера в аккаунт, а дальше сохраняет туда', async () => {
    const user = await renderApp();
    await saveAs(user, 'До входа');

    const dialog = await signIn(user);
    await user.click(within(dialog).getByRole('button', { name: 'Закрыть' }));

    await waitFor(() => expect(backend.saved.get('user-buyer@example.com')?.map(t => t.title)).toEqual(['До входа']));
    expect(await screen.findByText(/перенесены в аккаунт/)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('kg_tender_calc_saved_v1')!)).toEqual([]);

    await saveAs(user, 'После входа');
    await waitFor(() =>
      expect(backend.saved.get('user-buyer@example.com')?.map(t => t.title)).toEqual(['После входа', 'До входа'])
    );

    await user.click(screen.getByRole('button', { name: /Сохраненные расчеты/ }));
    const list = screen.getByRole('dialog', { name: 'Сохраненные расчеты' });
    expect(list.textContent).toMatch(/Расчёты хранятся в аккаунте buyer@example.com/);
    await user.click(within(list).getByRole('button', { name: 'Удалить: До входа' }));
    await waitFor(() => expect(backend.saved.get('user-buyer@example.com')?.map(t => t.title)).toEqual(['После входа']));
  });

  it('после выхода показывает пустой список браузера, а не расчёты аккаунта', async () => {
    const user = await renderApp();
    const dialog = await signIn(user);
    await user.click(within(dialog).getByRole('button', { name: 'Закрыть' }));
    await saveAs(user, 'В аккаунте');

    await user.click(screen.getByRole('button', { name: 'Аккаунт' }));
    await user.click(screen.getByRole('button', { name: 'Выйти' }));
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: /Сохраненные расчеты/ }));
    expect(within(screen.getByRole('dialog', { name: 'Сохраненные расчеты' })).getByText('Нет сохраненных расчетов')).toBeTruthy();
  });

  it('если сервер не сохранил расчёт, откатывает список и сообщает об ошибке', async () => {
    const user = await renderApp();
    const dialog = await signIn(user);
    await user.click(within(dialog).getByRole('button', { name: 'Закрыть' }));
    backend.failSaves = true;

    await saveAs(user, 'Не сохранится');
    expect(await screen.findByText('Не удалось сохранить расчёт в аккаунт')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Сохраненные расчеты/ }));
    expect(within(screen.getByRole('dialog', { name: 'Сохраненные расчеты' })).getByText('Нет сохраненных расчетов')).toBeTruthy();
  });
});

describe('оплата по QR', () => {
  const PAYWALL = { paywallEnabled: true, loginRequired: false, paidUntil: null, plan: null };

  const startPayment = async (user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement, plan = '3 месяца') => {
    await user.click(within(dialog).getByRole('radio', { name: new RegExp(plan) }));
    await user.click(within(dialog).getByRole('button', { name: 'Перейти к оплате по QR' }));
    await within(dialog).findByText('Оплата по QR');
  };

  it('показывает QR, сумму и код платежа выбранного тарифа', async () => {
    backend.access = { ...PAYWALL };
    const user = await renderApp();
    const dialog = await signIn(user);
    await startPayment(user, dialog);

    const text = dialog.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(text).toContain('Сумма к оплате1 000 сом');
    expect(text).toContain('Получатель: Доолотбек А (MBank)');
    expect(within(dialog).getByRole('img', { name: 'QR-код для оплаты через MBank' }).getAttribute('src')).toBe('/payment/mbank-qr.jpg');
    expect(within(dialog).getByRole('link', { name: 'Открыть в приложении банка' }).getAttribute('href')).toMatch(/^https:\/\/pay\.payqr\.kg\/qr\/#/);
    expect(within(dialog).getByRole('link', { name: 'Скачать QR' }).hasAttribute('download')).toBe(true);
    expect(within(dialog).getByRole('button', { name: /ZK-10001/ })).toBeTruthy();
    expect(backend.payments).toMatchObject([{ plan: '3m', months: 3, amountKgs: 1000, status: 'pending', reportedAt: null }]);
  });

  it('«Я оплатил» отправляет заявку на проверку, и она сохраняется при повторном открытии', async () => {
    backend.access = { ...PAYWALL };
    const user = await renderApp();
    const dialog = await signIn(user);
    await startPayment(user, dialog, '1 месяц');

    await user.type(within(dialog).getByLabelText(/Имя плательщика/), 'Азамат, 0395');
    await user.click(within(dialog).getByRole('button', { name: 'Я оплатил' }));

    expect(await within(dialog).findByText('Оплата проверяется')).toBeTruthy();
    expect(backend.payments[0]).toMatchObject({ amountKgs: 400, payerNote: 'Азамат, 0395', status: 'pending' });
    expect(backend.payments[0].reportedAt).not.toBeNull();

    await user.click(within(dialog).getByRole('button', { name: 'Закрыть' }));
    await user.click(screen.getByRole('button', { name: 'Аккаунт' }));
    expect(await within(screen.getByRole('dialog', { name: 'Аккаунт' })).findByText('Оплата проверяется')).toBeTruthy();
  });

  it('неоплаченную заявку можно отменить и выбрать другой тариф', async () => {
    backend.access = { ...PAYWALL };
    const user = await renderApp();
    const dialog = await signIn(user);
    await startPayment(user, dialog, '12 месяцев');

    await user.click(within(dialog).getByRole('button', { name: 'Отменить' }));
    expect(await within(dialog).findByRole('button', { name: 'Перейти к оплате по QR' })).toBeTruthy();
    expect(backend.payments[0].status).toBe('cancelled');
  });

  it('администратор видит в окне аккаунта ссылку на админ-панель', async () => {
    backend.access = { ...PAYWALL };
    backend.admins.add('admin@example.com');
    const user = await renderApp();

    let dialog = await signIn(user, 'buyer@example.com');
    expect(within(dialog).queryByRole('link', { name: /Админ-панель/ })).toBeNull();
    await startPayment(user, dialog);
    await user.click(within(dialog).getByRole('button', { name: 'Я оплатил' }));
    await within(dialog).findByText('Оплата проверяется');
    await user.click(within(dialog).getByRole('button', { name: 'Выйти' }));
    await user.keyboard('{Escape}');

    dialog = await signIn(user, 'admin@example.com');
    const link = await within(dialog).findByRole('link', { name: /Админ-панель/ });
    expect(link.getAttribute('href')).toBe('/#admin');
  });
});

describe('напоминание об окончании подписки на сайте', () => {
  const inDays = (days: number) => new Date(Date.now() + days * 86_400_000 - 60_000).toISOString();

  afterEach(() => sessionStorage.clear());

  it('за 3 дня до конца показывает плашку с кнопкой «Продлить»', async () => {
    backend.access = { paywallEnabled: true, loginRequired: false, paidUntil: inDays(2), plan: '1m' };
    const user = await renderApp();
    expect(screen.queryByText(/Подписка заканчивается/)).toBeNull();

    const dialog = await signIn(user);
    await user.click(within(dialog).getByRole('button', { name: 'Закрыть' }));
    const banner = await screen.findByText(/Подписка заканчивается через 2 дн\./);
    await user.click(within(banner.parentElement!).getByRole('button', { name: 'Продлить' }));
    expect(screen.getByRole('dialog', { name: 'Аккаунт' })).toBeTruthy();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Скрыть напоминание' }));
    expect(screen.queryByText(/Подписка заканчивается/)).toBeNull();
  });

  it('за неделю до конца плашки нет', async () => {
    backend.access = { paywallEnabled: true, loginRequired: false, paidUntil: inDays(7), plan: '1m' };
    const user = await renderApp();
    const dialog = await signIn(user);
    await user.click(within(dialog).getByRole('button', { name: 'Закрыть' }));
    expect(screen.queryByText(/Подписка заканчивается/)).toBeNull();
  });

  it('после окончания подписки при платном доступе сообщает, что она закончилась', async () => {
    backend.access = { paywallEnabled: true, loginRequired: false, paidUntil: inDays(-5), plan: '1m' };
    const user = await renderApp();
    const dialog = await signIn(user);
    await user.click(within(dialog).getByRole('button', { name: 'Закрыть' }));
    expect(await screen.findByText(/Подписка закончилась/)).toBeTruthy();
  });
});
