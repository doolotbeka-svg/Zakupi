// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Root from '../Root';
import { AccountProvider } from '../account/AccountContext';
import { FakeAccountBackend, VALID_CODE } from '../test/fakeAccountBackend';

let backend: FakeAccountBackend;

const renderRoot = (withBackend = true) =>
  render(
    <AccountProvider backend={withBackend ? backend : null}>
      <Root />
    </AccountProvider>
  );

const calculatorShown = () => screen.queryByRole('heading', { name: /1\. (Тендердин параметрлери|Блок параметров тендера)/ }) !== null;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('kg_tender_calc_lang_v1', 'ru');
  window.history.replaceState(null, '', '/');
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  backend = new FakeAccountBackend();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ознакомительная страница', () => {
  it('без настроенных аккаунтов сразу показывает калькулятор', () => {
    renderRoot(false);
    expect(calculatorShown()).toBe(true);
  });

  it('когда вход не обязателен, показывает калькулятор', async () => {
    renderRoot();
    expect(await screen.findByRole('heading', { name: '1. Блок параметров тендера' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: /Рассчитайте выгоду тендера/ })).toBeNull();
  });

  it('когда вход обязателен, гость видит только ознакомительную страницу с примером расчёта', async () => {
    backend.access = { ...backend.access, loginRequired: true };
    renderRoot();

    expect(await screen.findByRole('heading', { name: 'Рассчитайте выгоду тендера до подачи заявки' })).toBeTruthy();
    expect(calculatorShown()).toBe(false);
    // Пример считается тем же калькулятором: 1 500 000 − 5% → прибыль 278 875
    const example = screen.getByLabelText('Пример расчёта');
    expect(example.textContent?.replace(/\s+/g, ' ')).toContain('278 875 KGS');
    expect(example.textContent).toContain('23.68%');
  });

  it('после входа с ознакомительной страницы открывается калькулятор, окно входа закрывается', async () => {
    backend.access = { ...backend.access, loginRequired: true };
    const user = userEvent.setup();
    renderRoot();

    await user.click(await screen.findByRole('button', { name: 'Войти по email' }));
    const dialog = screen.getByRole('dialog', { name: 'Аккаунт' });
    await user.type(within(dialog).getByLabelText('Email'), 'buyer@example.com');
    await user.click(within(dialog).getByRole('button', { name: 'Получить код' }));
    await user.type(await within(dialog).findByLabelText('Код из письма'), VALID_CODE);
    await user.click(within(dialog).getByRole('button', { name: 'Войти' }));

    expect(await screen.findByRole('heading', { name: '1. Блок параметров тендера' })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Аккаунт' })).toBeNull();

    // Выход возвращает на ознакомительную страницу
    await user.click(screen.getByRole('button', { name: 'Аккаунт' }));
    await user.click(screen.getByRole('button', { name: 'Выйти' }));
    expect(await screen.findByRole('heading', { name: 'Рассчитайте выгоду тендера до подачи заявки' })).toBeTruthy();
  });

  it('вошедший пользователь сразу видит калькулятор', async () => {
    backend.access = { ...backend.access, loginRequired: true };
    backend.user = { id: 'u1', email: 'buyer@example.com' };
    renderRoot();
    expect(await screen.findByRole('heading', { name: '1. Блок параметров тендера' })).toBeTruthy();
  });

  it('переключение языка на ознакомительной странице запоминается для калькулятора', async () => {
    backend.access = { ...backend.access, loginRequired: true };
    const user = userEvent.setup();
    renderRoot();
    await user.click(await screen.findByRole('button', { name: 'Кыргызча' }));
    expect(screen.getByRole('heading', { name: 'Тендерге катышуудан мурун пайдасын эсептеңиз' })).toBeTruthy();
    expect(localStorage.getItem('kg_tender_calc_lang_v1')).toBe('ky');
  });

  it('пока настройки загружаются впервые, показывает индикатор загрузки, а не калькулятор', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>(resolve => (release = resolve));
    const original = backend.getAccess.bind(backend);
    backend.getAccess = async user => {
      await gate;
      return original(user);
    };
    backend.access = { ...backend.access, loginRequired: true };
    renderRoot();

    expect(screen.getByRole('status', { name: /Загрузка/ })).toBeTruthy();
    expect(calculatorShown()).toBe(false);
    release();
    expect(await screen.findByRole('heading', { name: 'Рассчитайте выгоду тендера до подачи заявки' })).toBeTruthy();
  });

  it('если настройки не загрузились, калькулятор остаётся доступным', async () => {
    backend.failAccess = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderRoot();
    expect(await screen.findByRole('heading', { name: '1. Блок параметров тендера' })).toBeTruthy();
  });

  it('повторный визит при выключенном переключателе показывает калькулятор без ожидания', () => {
    localStorage.setItem('kg_tender_calc_login_required_v1', 'false');
    backend.getAccess = () => new Promise(() => {});
    renderRoot();
    expect(calculatorShown()).toBe(true);
  });
});
