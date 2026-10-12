import { describe, expect, it } from 'vitest';
import { loginRequest } from '@/api/auth';
import { ApiError } from '@/api/client';
import { fetchAnalytics } from '@/api/analytics';
import { fetchCustomers, fetchOrder, fetchOrders, recalculateOrderForecast } from '@/api/orders';
import { setAuthToken } from '@/api/token';
import { fetchUsers, updateUserRole } from '@/api/users';
import type { AuthUser, OrdersResponse } from '@/api/types';
import { DEFAULT_CHECK_MODE, updateCheckMode } from '@/lib/checkMode';
import { DEFAULT_ORDER_FILTERS } from '@/lib/queryParams';
import { DEMO_CREDENTIALS, DEMO_MANAGER_ID } from '@/mocks/data';

const MANAGER = DEMO_CREDENTIALS.find((account) => account.role === 'manager');
const ANALYST = DEMO_CREDENTIALS.find((account) => account.role === 'analyst');
const ADMIN = DEMO_CREDENTIALS.find((account) => account.role === 'admin');

async function signIn(account: { email: string; password: string } | undefined): Promise<AuthUser> {
  if (account === undefined) throw new Error('Немає демонстраційного облікового запису');
  const response = await loginRequest({ email: account.email, password: account.password });
  setAuthToken(response.token);
  return response.user;
}

async function signInAs(role: 'manager' | 'analyst' | 'admin'): Promise<AuthUser> {
  if (role === 'manager') return signIn(MANAGER);
  if (role === 'analyst') return signIn(ANALYST);
  return signIn(ADMIN);
}

describe('POST /auth/login', () => {
  it('видає токен і профіль для коректних даних', async () => {
    const response = await loginRequest({
      email: MANAGER?.email ?? '',
      password: MANAGER?.password ?? '',
    });

    expect(response.token).toContain('demo-token');
    expect(response.user.role).toBe('manager');
    expect(response.user.name).not.toBe('');
  });

  it('не чутливий до регістру email і зайвих пробілів', async () => {
    const response = await loginRequest({
      email: `  ${(MANAGER?.email ?? '').toUpperCase()}  `,
      password: MANAGER?.password ?? '',
    });

    expect(response.user.email).toBe(MANAGER?.email);
  });

  it('на неіснуючого користувача і на неправильний пароль дає однакову відповідь', async () => {
    const unknownUser = (await loginRequest({
      email: 'незнайомий@demo.ua',
      password: 'будь-що',
    }).catch((error: unknown) => error)) as ApiError;

    const wrongPassword = (await loginRequest({
      email: MANAGER?.email ?? '',
      password: 'неправильний',
    }).catch((error: unknown) => error)) as ApiError;

    expect(unknownUser).toBeInstanceOf(ApiError);
    expect(unknownUser.status).toBe(401);
    expect(unknownUser.message).toBe(wrongPassword.message);
  });

  it('вимагає заповнити обидва поля', async () => {
    const error = (await loginRequest({ email: '', password: '' }).catch(
      (caught: unknown) => caught,
    )) as ApiError;

    expect(error.status).toBe(400);
  });
});

describe('GET /orders', () => {
  it('без токена відповідає 401', async () => {
    const error = (await fetchOrders(DEFAULT_ORDER_FILTERS).catch(
      (caught: unknown) => caught,
    )) as ApiError;

    expect(error.status).toBe(401);
    expect(error.kind).toBe('unauthorized');
  });

  it('менеджер бачить лише власні замовлення', async () => {
    const user = await signInAs('manager');
    const page = await fetchOrders(DEFAULT_ORDER_FILTERS);

    expect(page.total).toBeGreaterThan(0);
    for (const order of page.items) {
      expect(order.managerId).toBe(user.id);
      expect(order.managerId).toBe(DEMO_MANAGER_ID);
    }
  });

  it('аналітик бачить замовлення всіх менеджерів', async () => {
    await signInAs('analyst');
    const page = await fetchOrders(DEFAULT_ORDER_FILTERS);

    const managers = new Set(page.items.map((order) => order.managerId));
    expect(managers.size).toBeGreaterThan(1);
    expect(page.total).toBe(72);
  });

  it('застосовує фільтри з URL-параметрів', async () => {
    await signInAs('analyst');
    const page = await fetchOrders({
      ...DEFAULT_ORDER_FILTERS,
      status: 'won',
      amountMin: '500000',
    });

    expect(page.total).toBeGreaterThan(0);
    for (const order of page.items) {
      expect(order.status).toBe('won');
      expect(order.amount).toBeGreaterThanOrEqual(500_000);
    }
  });

  it('гортає сторінки без повторів', async () => {
    await signInAs('analyst');
    const first = await fetchOrders(DEFAULT_ORDER_FILTERS);
    const second = await fetchOrders({ ...DEFAULT_ORDER_FILTERS, page: 2 });

    expect(first.items).toHaveLength(10);
    const firstIds = new Set(first.items.map((order) => order.id));
    for (const order of second.items) {
      expect(firstIds.has(order.id)).toBe(false);
    }
  });

  it('у режимі «помилка» віддає 500', async () => {
    await signInAs('analyst');
    updateCheckMode({ orders: 'error' });

    const error = (await fetchOrders(DEFAULT_ORDER_FILTERS).catch(
      (caught: unknown) => caught,
    )) as ApiError;

    expect(error.status).toBe(500);
    expect(error.message).toContain('тимчасово недоступний');
  });

  it('у режимі «порожній результат» віддає успішну відповідь без записів', async () => {
    await signInAs('analyst');
    updateCheckMode({ orders: 'empty' });

    const page: OrdersResponse = await fetchOrders(DEFAULT_ORDER_FILTERS);
    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
  });

  it('у режимі обриву мережі завершується помилкою мережі', async () => {
    await signInAs('analyst');
    updateCheckMode({ networkDown: true });

    const error = (await fetchOrders(DEFAULT_ORDER_FILTERS).catch(
      (caught: unknown) => caught,
    )) as ApiError;

    expect(error.kind).toBe('network');
    expect(error.status).toBeNull();
  });
});

describe('GET /orders/:id', () => {
  it('повертає картку з факторами й історією', async () => {
    await signInAs('manager');
    const page = await fetchOrders(DEFAULT_ORDER_FILTERS);
    const orderId = page.items[0]?.id ?? '';

    const order = await fetchOrder(orderId);

    expect(order.id).toBe(orderId);
    expect(order.factors.length).toBeGreaterThan(0);
    expect(order.history.length).toBeGreaterThan(0);
    expect(order.probability).toBeGreaterThanOrEqual(0);
  });

  it('на невідомий номер віддає 404', async () => {
    await signInAs('manager');
    const error = (await fetchOrder('ord-9999').catch((caught: unknown) => caught)) as ApiError;

    expect(error.status).toBe(404);
    expect(error.message).toBe('Замовлення не знайдено.');
  });

  it('у режимі «порожній результат» поводиться як «не знайдено»', async () => {
    await signInAs('manager');
    const page = await fetchOrders(DEFAULT_ORDER_FILTERS);
    updateCheckMode({ order: 'empty' });

    const error = (await fetchOrder(page.items[0]?.id ?? '').catch(
      (caught: unknown) => caught,
    )) as ApiError;
    expect(error.status).toBe(404);
  });

  it('у режимі «помилка» віддає 500', async () => {
    await signInAs('manager');
    updateCheckMode({ order: 'error' });

    const error = (await fetchOrder('ord-0001').catch((caught: unknown) => caught)) as ApiError;
    expect(error.status).toBe(500);
  });

  it('менеджер не бачить чуже замовлення', async () => {
    await signInAs('analyst');
    const all = await fetchOrders({ ...DEFAULT_ORDER_FILTERS });
    const foreign = all.items.find((order) => order.managerId !== DEMO_MANAGER_ID);
    setAuthToken(null);
    await signInAs('manager');

    const error = (await fetchOrder(foreign?.id ?? 'ord-0001').catch(
      (caught: unknown) => caught,
    )) as ApiError;

    expect(error.status).toBe(403);
  });
});

describe('POST /orders/:id/recalculate', () => {
  it('оновлює прогноз і додає запис в історію', async () => {
    await signInAs('manager');
    const page = await fetchOrders(DEFAULT_ORDER_FILTERS);
    const before = await fetchOrder(page.items[0]?.id ?? '');

    const updated = await recalculateOrderForecast(before.id);

    expect(updated.history).toHaveLength(before.history.length + 1);
    expect(updated.history[0]?.source).toBe('manual');
    expect(updated.forecastUpdatedAt).not.toBe(before.forecastUpdatedAt);
  });

  it('у режимі «помилка» віддає 500 із поясненням', async () => {
    await signInAs('manager');
    const page = await fetchOrders(DEFAULT_ORDER_FILTERS);
    updateCheckMode({ forecast: 'error' });

    const error = (await recalculateOrderForecast(page.items[0]?.id ?? '').catch(
      (caught: unknown) => caught,
    )) as ApiError;

    expect(error.status).toBe(500);
    expect(error.message).toContain('перерахувати прогноз');
  });

  it('на невідомий номер віддає 404', async () => {
    await signInAs('manager');
    const error = (await recalculateOrderForecast('ord-9999').catch(
      (caught: unknown) => caught,
    )) as ApiError;

    expect(error.status).toBe(404);
  });
});

describe('GET /customers', () => {
  it('повертає довідник клієнтів', async () => {
    await signInAs('manager');
    const response = await fetchCustomers();

    expect(response.items.length).toBeGreaterThan(0);
    expect(response.items[0]?.name).not.toBe('');
  });
});

describe('GET /analytics/model', () => {
  it('доступна аналітику', async () => {
    await signInAs('analyst');
    const analytics = await fetchAnalytics();

    expect(analytics.kpis.length).toBeGreaterThan(0);
    expect(analytics.featureImportance.length).toBeGreaterThan(0);
    expect(analytics.trend).toHaveLength(12);
  });

  it('недоступна менеджеру', async () => {
    await signInAs('manager');
    const error = (await fetchAnalytics().catch((caught: unknown) => caught)) as ApiError;

    expect(error.status).toBe(403);
  });

  it('у режимі «порожній результат» повертає порожні набори', async () => {
    await signInAs('analyst');
    updateCheckMode({ analytics: 'empty' });
    const analytics = await fetchAnalytics();

    expect(analytics.kpis).toEqual([]);
    expect(analytics.featureImportance).toEqual([]);
    expect(analytics.trend).toEqual([]);
  });

  it('у режимі «помилка» віддає 500', async () => {
    await signInAs('analyst');
    updateCheckMode({ analytics: 'error' });
    const error = (await fetchAnalytics().catch((caught: unknown) => caught)) as ApiError;

    expect(error.status).toBe(500);
  });
});

describe('GET і PATCH /users', () => {
  it('адміністратор бачить список користувачів', async () => {
    await signInAs('admin');
    const response = await fetchUsers();

    expect(response.items.length).toBe(8);
    expect(response.items.some((user) => user.role === 'admin')).toBe(true);
  });

  it('менеджеру список недоступний', async () => {
    await signInAs('manager');
    const error = (await fetchUsers().catch((caught: unknown) => caught)) as ApiError;

    expect(error.status).toBe(403);
  });

  it('у режимі «порожній результат» список порожній', async () => {
    await signInAs('admin');
    updateCheckMode({ users: 'empty' });
    await expect(fetchUsers()).resolves.toEqual({ items: [] });
  });

  it('у режимі «помилка» віддає 500', async () => {
    await signInAs('admin');
    updateCheckMode({ users: 'error' });
    const error = (await fetchUsers().catch((caught: unknown) => caught)) as ApiError;

    expect(error.status).toBe(500);
  });

  it('зміна ролі повертає оновленого користувача', async () => {
    await signInAs('admin');
    const before = await fetchUsers();
    const target = before.items.find((user) => user.role === 'manager');
    const response = await updateUserRole(target?.id ?? '', 'analyst');

    expect(response.user.role).toBe('analyst');
    expect(response.message).toContain(target?.name ?? '');
  });

  it('відхиляє невідому роль', async () => {
    await signInAs('admin');
    const error = (await updateUserRole('usr-1001', 'root' as 'admin').catch(
      (caught: unknown) => caught,
    )) as ApiError;

    expect(error.status).toBe(400);
  });

  it('на невідомого користувача віддає 404', async () => {
    await signInAs('admin');
    const error = (await updateUserRole('usr-9999', 'analyst').catch(
      (caught: unknown) => caught,
    )) as ApiError;

    expect(error.status).toBe(404);
  });

  it('змінювати роль може лише адміністратор', async () => {
    await signInAs('analyst');
    const error = (await updateUserRole('usr-1001', 'admin').catch(
      (caught: unknown) => caught,
    )) as ApiError;

    expect(error.status).toBe(403);
  });
});

describe('типові прапорці режиму перевірки', () => {
  it('не змінюють поведінку за замовчуванням', () => {
    expect(DEFAULT_CHECK_MODE.orders).toBe('auto');
    expect(DEFAULT_CHECK_MODE.networkDown).toBe(false);
  });
});
