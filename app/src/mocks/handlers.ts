import { delay, http, HttpResponse } from 'msw';
import type {
  AnalyticsResponse,
  AuthResponse,
  CustomersResponse,
  Order,
  OrdersResponse,
  Role,
  UpdateUserRoleResponse,
  UsersResponse,
} from '@/api/types';
import { readCheckMode } from '@/lib/checkMode';
import { applyOrderQuery } from '@/lib/orderQuery';
import { PAGE_SIZE, parseOrderFilters } from '@/lib/queryParams';
import {
  findUserByCredentials,
  findUserById,
  getAnalytics,
  getCustomers,
  getOrderById,
  getOrders,
  getUsers,
  recalculateOrderForecast,
  updateUserRole,
  type DemoUser,
} from './data';

/**
 * Обробники mock-API.
 *
 * Мережа поводиться «як справжня»: є затримка, є коди помилок, є обрив зв'язку.
 * Усі режими керуються прапорцями «Режиму перевірки» (localStorage), тому
 * викладач або тестувальник може відтворити кожен стан інтерфейсу без правок коду.
 */

const TOKEN_PREFIX = 'demo-token.';

/**
 * Однакове повідомлення і для неіснуючого користувача, і для неправильного
 * пароля: інакше за текстом помилки можна підбирати облікові дані (ТЗ, п. 6).
 */
const LOGIN_FAILURE_MESSAGE = 'Невірний email або пароль. Перевірте дані та спробуйте ще раз.';

const UNAUTHORIZED_MESSAGE = 'Потрібна авторизація. Увійдіть у систему заново.';
const FORBIDDEN_MESSAGE = 'Ваша роль не має доступу до цього розділу.';

function makeToken(userId: string): string {
  return `${TOKEN_PREFIX}${userId}`;
}

function authenticate(request: Request): DemoUser | undefined {
  const header = request.headers.get('Authorization');
  if (header === null || !header.startsWith(`Bearer ${TOKEN_PREFIX}`)) return undefined;
  const userId = header.slice(`Bearer ${TOKEN_PREFIX}`.length);
  return findUserById(userId);
}

type GateResult = { ok: true; user: DemoUser } | { ok: false; response: Response };

/** Спільний «шлюз»: затримка, обрив зв'язку, перевірка токена й ролі. */
async function gate(request: Request, roles?: readonly Role[]): Promise<GateResult> {
  const flags = readCheckMode();
  await delay(Math.max(1, flags.latencyMs));

  if (flags.networkDown) {
    return { ok: false, response: HttpResponse.error() };
  }

  const user = authenticate(request);
  if (user === undefined) {
    return {
      ok: false,
      response: HttpResponse.json({ message: UNAUTHORIZED_MESSAGE }, { status: 401 }),
    };
  }

  if (roles !== undefined && !roles.includes(user.role)) {
    return {
      ok: false,
      response: HttpResponse.json({ message: FORBIDDEN_MESSAGE }, { status: 403 }),
    };
  }

  return { ok: true, user };
}

function serverError(message: string): Response {
  return HttpResponse.json({ message }, { status: 500 });
}

function emptyPage(): OrdersResponse {
  return { items: [], total: 0, page: 1, pageSize: PAGE_SIZE, pageCount: 1 };
}

/** Читає JSON-тіло запиту, не падаючи на порожньому або некоректному тілі. */
async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

function canSeeOrder(order: Order, user: DemoUser): boolean {
  return user.role !== 'manager' || order.managerId === user.id;
}

export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const flags = readCheckMode();
    await delay(Math.max(1, Math.round(flags.latencyMs * 1.4)));

    if (flags.networkDown) return HttpResponse.error();

    const payload = await readJsonBody(request);
    const source = payload !== null && typeof payload === 'object' ? payload : {};
    const rawEmail = (source as { email?: unknown }).email;
    const rawPassword = (source as { password?: unknown }).password;
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
    const password = typeof rawPassword === 'string' ? rawPassword : '';

    if (email === '' || password === '') {
      return HttpResponse.json({ message: 'Заповніть email і пароль.' }, { status: 400 });
    }

    const account = findUserByCredentials(email, password);
    if (account === undefined) {
      return HttpResponse.json({ message: LOGIN_FAILURE_MESSAGE }, { status: 401 });
    }

    const body: AuthResponse = {
      token: makeToken(account.id),
      user: { id: account.id, email: account.email, name: account.name, role: account.role },
    };
    return HttpResponse.json(body);
  }),

  http.get('/api/customers', async ({ request }) => {
    const result = await gate(request);
    if (!result.ok) return result.response;

    const body: CustomersResponse = { items: getCustomers() };
    return HttpResponse.json(body);
  }),

  http.get('/api/orders', async ({ request }) => {
    const result = await gate(request);
    if (!result.ok) return result.response;

    const flags = readCheckMode();
    if (flags.orders === 'error') {
      return serverError('Сервіс списку замовлень тимчасово недоступний.');
    }

    if (flags.orders === 'empty') {
      return HttpResponse.json(emptyPage());
    }

    const filters = parseOrderFilters(new URL(request.url).searchParams);
    const visible =
      result.user.role === 'manager'
        ? getOrders().filter((order) => order.managerId === result.user.id)
        : getOrders();

    return HttpResponse.json(applyOrderQuery(visible, filters));
  }),

  http.get('/api/orders/:orderId', async ({ request, params }) => {
    const result = await gate(request);
    if (!result.ok) return result.response;

    const flags = readCheckMode();
    if (flags.order === 'error') {
      return serverError('Не вдалося завантажити картку замовлення.');
    }

    const orderId = String(params.orderId);
    const order = getOrderById(orderId);

    if (order === undefined || flags.order === 'empty') {
      return HttpResponse.json({ message: 'Замовлення не знайдено.' }, { status: 404 });
    }

    if (!canSeeOrder(order, result.user)) {
      return HttpResponse.json(
        { message: 'Немає доступу до цього замовлення.' },
        { status: 403 },
      );
    }

    return HttpResponse.json(order);
  }),

  http.post('/api/orders/:orderId/recalculate', async ({ request, params }) => {
    const result = await gate(request);
    if (!result.ok) return result.response;

    const flags = readCheckMode();
    if (flags.forecast === 'error') {
      return serverError('Не вдалося перерахувати прогноз. Модель тимчасово недоступна.');
    }

    const orderId = String(params.orderId);
    const order = getOrderById(orderId);
    if (order === undefined) {
      return HttpResponse.json({ message: 'Замовлення не знайдено.' }, { status: 404 });
    }
    if (!canSeeOrder(order, result.user)) {
      return HttpResponse.json({ message: 'Немає доступу до цього замовлення.' }, { status: 403 });
    }

    const updated = recalculateOrderForecast(orderId);
    if (updated === undefined) {
      return serverError('Не вдалося перерахувати прогноз. Повторіть спробу.');
    }

    return HttpResponse.json(updated);
  }),

  http.get('/api/analytics/model', async ({ request }) => {
    const result = await gate(request, ['analyst', 'admin']);
    if (!result.ok) return result.response;

    const flags = readCheckMode();
    if (flags.analytics === 'error') {
      return serverError('Сервіс аналітики тимчасово недоступний.');
    }

    if (flags.analytics === 'empty') {
      const body: AnalyticsResponse = {
        modelVersion: 'forecast-lite 1.4.2',
        trainedAt: new Date(0).toISOString(),
        sampleSize: 0,
        kpis: [],
        featureImportance: [],
        trend: [],
      };
      return HttpResponse.json(body);
    }

    return HttpResponse.json(getAnalytics());
  }),

  http.get('/api/users', async ({ request }) => {
    const result = await gate(request, ['admin']);
    if (!result.ok) return result.response;

    const flags = readCheckMode();
    if (flags.users === 'error') {
      return serverError('Не вдалося завантажити список користувачів.');
    }

    const body: UsersResponse =
      flags.users === 'empty' ? { items: [] } : { items: getUsers() };
    return HttpResponse.json(body);
  }),

  http.patch('/api/users/:userId', async ({ request, params }) => {
    const result = await gate(request, ['admin']);
    if (!result.ok) return result.response;

    const payload = await readJsonBody(request);
    const rawRole =
      payload !== null && typeof payload === 'object'
        ? (payload as { role?: unknown }).role
        : undefined;
    const allowed: readonly string[] = ['manager', 'analyst', 'admin'];

    if (typeof rawRole !== 'string' || !allowed.includes(rawRole)) {
      return HttpResponse.json({ message: 'Некоректна роль користувача.' }, { status: 400 });
    }

    const updated = updateUserRole(String(params.userId), rawRole as Role);
    if (updated === undefined) {
      return HttpResponse.json({ message: 'Користувача не знайдено.' }, { status: 404 });
    }

    const body: UpdateUserRoleResponse = {
      user: updated,
      message: `Роль користувача ${updated.name} змінено.`,
    };
    return HttpResponse.json(body);
  }),
];
