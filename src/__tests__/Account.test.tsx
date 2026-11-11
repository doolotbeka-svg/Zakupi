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
    backend.access = { paywallEnabled: true, paidUntil: null, plan: null };
    const user = await renderApp();

    await user.click(screen.getByRole('button', { name: 'Печать отчета / PDF' }));
    const dialog = screen.getByRole('dialog', { name: 'Аккаунт' });
    expect(dialog.textContent).toMatch(/«Печать отчёта» доступна по подписке/);
    expect(dialog.textContent).not.toContain('КАРТА РЕНТАБЕЛЬНОСТИ');

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Экспорт в Excel (Excelге жүктөө)' }));
    expect(screen.getByRole('dialog', { name: 'Аккаунт' }).textContent).toMatch(/«Импорт и экспорт Excel» доступна по подписке/);
  });

  it('после входа без подписки показывает тарифы и неактивную оплату', async () => {
    backend.access = { paywallEnabled: true, paidUntil: null, plan: null };
    const user = await renderApp();
    const dialog = await signIn(user);

    expect(within(dialog).getByText('Подписки нет.')).toBeTruthy();
    expect(within(dialog).getByText('1 месяц')).toBeTruthy();
    expect(within(dialog).getByText('3 месяца')).toBeTruthy();
    expect(within(dialog).getByText('12 месяцев')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Оплатить' })).toHaveProperty('disabled', true);
  });

  it('с активной подпиской платные функции открываются', async () => {
    backend.access = { paywallEnabled: true, paidUntil: inAMonth(), plan: 'manual' };
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
