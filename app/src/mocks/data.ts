import type {
  AnalyticsResponse,
  AuthUser,
  Customer,
  FeatureImportance,
  MetricTrendPoint,
  Order,
  OrderStatus,
  Role,
  UserAccount,
} from '@/api/types';
import { buildFactors, computeProbability, recalculateForecast } from '@/lib/forecast';

/**
 * Демонстраційний набір даних для mock-API.
 *
 * Бекенду в проєкті немає (це межа проєкту за ТЗ), тому дані генеруються
 * детерміновано: seed фіксований, «базова дата» теж. Один і той самий прогін
 * завжди дає той самий набір - завдяки цьому тести стабільні, а демонстрація
 * відтворювана на іншій машині.
 */

/** Точка відліку для всіх демонстраційних дат. */
export const DEMO_BASE_DATE = new Date('2026-10-05T09:00:00.000Z');

const SEED = 20261012;
const ORDER_COUNT = 72;
const HISTORY_SPAN_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Менеджер, під яким заходить демонстраційний користувач. */
export const DEMO_MANAGER_ID = 'usr-1001';

export interface DemoUser extends AuthUser {
  /** Пароль є лише в демонстраційних облікових записів. */
  password: string | null;
}

export const DEMO_USERS: readonly DemoUser[] = [
  {
    id: DEMO_MANAGER_ID,
    email: 'manager@demo.ua',
    name: 'Олена Гриценко',
    role: 'manager',
    password: 'manager123',
  },
  {
    id: 'usr-1002',
    email: 'analyst@demo.ua',
    name: 'Богдан Ковальчук',
    role: 'analyst',
    password: 'analyst123',
  },
  {
    id: 'usr-1003',
    email: 'admin@demo.ua',
    name: 'Андрій Гончар',
    role: 'admin',
    password: 'admin123',
  },
  { id: 'usr-1004', email: 'iryna.t@demo.ua', name: 'Ірина Ткачук', role: 'manager', password: null },
  {
    id: 'usr-1005',
    email: 'serhii.b@demo.ua',
    name: 'Сергій Бондар',
    role: 'manager',
    password: null,
  },
  {
    id: 'usr-1006',
    email: 'marta.l@demo.ua',
    name: 'Марта Лещенко',
    role: 'analyst',
    password: null,
  },
  { id: 'usr-1007', email: 'oleh.d@demo.ua', name: 'Олег Дзюба', role: 'manager', password: null },
  { id: 'usr-1008', email: 'nadiia.s@demo.ua', name: 'Надія Сидоренко', role: 'admin', password: null },
];

/** Облікові дані для входу - показуються на екрані авторизації та в README. */
export const DEMO_CREDENTIALS = DEMO_USERS.filter((user) => user.password !== null).map(
  (user) => ({
    email: user.email,
    password: user.password as string,
    role: user.role,
    name: user.name,
  }),
);

export const DEMO_CUSTOMERS: readonly Customer[] = [
  { id: 'cst-01', name: 'ТОВ «Агротерра»', industry: 'Агро', tier: 1 },
  { id: 'cst-02', name: 'ПрАТ «Метал Інвест»', industry: 'Металургія', tier: 1 },
  { id: 'cst-03', name: 'ТОВ «Логістика Плюс»', industry: 'Логістика', tier: 2 },
  { id: 'cst-04', name: 'ТОВ «Фарм-Дистрибуція»', industry: 'Фармацевтика', tier: 1 },
  { id: 'cst-05', name: 'ТОВ «Будівельні системи»', industry: 'Будівництво', tier: 2 },
  { id: 'cst-06', name: 'ТОВ «Харчпром»', industry: 'Харчова промисловість', tier: 3 },
  { id: 'cst-07', name: 'ТОВ «Енерго-Сервіс»', industry: 'Енергетика', tier: 2 },
  { id: 'cst-08', name: 'ТОВ «Ритейл Груп»', industry: 'Ритейл', tier: 1 },
  { id: 'cst-09', name: 'ТОВ «ТехноПостач»', industry: 'Машинобудування', tier: 3 },
  { id: 'cst-10', name: 'ТОВ «Хімресурс»', industry: 'Хімія', tier: 2 },
  { id: 'cst-11', name: 'ТОВ «Медтехніка»', industry: 'Медичне обладнання', tier: 3 },
  { id: 'cst-12', name: 'ТОВ «Поліграф-Центр»', industry: 'Поліграфія', tier: 3 },
];

const MANAGER_IDS = ['usr-1001', 'usr-1004', 'usr-1005', 'usr-1007'] as const;

const STATUS_POOL: readonly OrderStatus[] = [
  'in_progress',
  'in_progress',
  'negotiation',
  'negotiation',
  'new',
  'at_risk',
  'won',
  'lost',
];

/** Детермінований генератор (mulberry32) - без залежності від Math.random. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function isoAt(base: Date, offsetDays: number, hour: number): string {
  const date = new Date(base.getTime() - offsetDays * DAY_MS);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

function buildOrder(index: number, random: () => number): Order {
  const customer = DEMO_CUSTOMERS[index % DEMO_CUSTOMERS.length];
  const managerId =
    index % 3 === 0 ? DEMO_MANAGER_ID : MANAGER_IDS[1 + ((index >> 1) % (MANAGER_IDS.length - 1))];
  const manager = DEMO_USERS.find((user) => user.id === managerId) ?? DEMO_USERS[0];

  const ageDays = Math.floor(random() * HISTORY_SPAN_DAYS);
  const createdAt = isoAt(DEMO_BASE_DATE, ageDays, 7 + Math.floor(random() * 10));
  const createdDate = new Date(createdAt);
  const closeOffsetDays = Math.floor(random() * 42) - 8;
  const expectedCloseDate = new Date(createdDate.getTime() + closeOffsetDays * DAY_MS).toISOString();

  const status = STATUS_POOL[Math.floor(random() * STATUS_POOL.length)];
  const amount = roundTo(60_000 + random() * 2_400_000, 1_000);
  const itemsCount = 1 + Math.floor(random() * 14);

  const draft: Order = {
    id: `ord-${String(index + 1).padStart(4, '0')}`,
    number: `ЗМ-${createdDate.getUTCFullYear()}-${String(index + 1).padStart(4, '0')}`,
    customerId: customer.id,
    customerName: customer.name,
    managerId: manager.id,
    managerName: manager.name,
    amount,
    currency: 'UAH',
    status,
    itemsCount,
    createdAt,
    expectedCloseDate,
    updatedAt: createdAt,
    probability: 0,
    forecastUpdatedAt: createdAt,
    factors: [],
    history: [],
  };

  const probability = computeProbability(draft);
  const forecastUpdatedAt = new Date(
    createdDate.getTime() + Math.max(1, Math.floor(ageDays / 3)) * DAY_MS,
  ).toISOString();

  return {
    ...draft,
    probability,
    forecastUpdatedAt,
    updatedAt: forecastUpdatedAt,
    factors: buildFactors(draft),
    history: [
      {
        id: `ord-${index + 1}-forecast-1`,
        at: createdAt,
        fromProbability: 0.5,
        toProbability: probability,
        source: 'auto',
        author: 'Модель',
        note: 'Первинний розрахунок під час створення замовлення',
      },
      {
        id: `ord-${index + 1}-forecast-2`,
        at: forecastUpdatedAt,
        fromProbability: Number((probability - 0.04).toFixed(4)),
        toProbability: probability,
        source: 'auto',
        author: 'Модель',
        note: 'Планове перенавчання на нічних даних',
      },
    ],
  };
}

function generateOrders(): Order[] {
  const random = mulberry32(SEED);
  const orders: Order[] = [];
  for (let index = 0; index < ORDER_COUNT; index += 1) {
    orders.push(buildOrder(index, random));
  }
  return orders;
}

let ordersState: Order[] = generateOrders();

/** Поточний (змінюваний) стан замовлень. */
export function getOrders(): Order[] {
  return ordersState;
}

export function getOrderById(orderId: string): Order | undefined {
  return ordersState.find((order) => order.id === orderId);
}

/** Цілковите скидання демонстраційних даних (використовується тестами). */
export function resetMockData(): void {
  ordersState = generateOrders();
  usersState = buildUsers();
}

export function getCustomers(): Customer[] {
  return [...DEMO_CUSTOMERS];
}

/**
 * Перераховує прогноз замовлення й додає запис в історію.
 * Повертає `undefined`, якщо замовлення немає.
 */
export function recalculateOrderForecast(orderId: string, now: Date = new Date()): Order | undefined {
  const index = ordersState.findIndex((order) => order.id === orderId);
  if (index === -1) return undefined;

  const current = ordersState[index];
  const iteration = current.history.filter((entry) => entry.source === 'manual').length + 1;
  const result = recalculateForecast(current, iteration, now, 'Олена Гриценко');
  const timestamp = now.toISOString();

  const updated: Order = {
    ...current,
    probability: result.probability,
    factors: result.factors,
    forecastUpdatedAt: timestamp,
    updatedAt: timestamp,
    history: [result.historyEntry, ...current.history],
  };

  ordersState[index] = updated;
  return updated;
}

/** Облікові записи: пароль + похідні дані для таблиці адміністратора. */
function buildUsers(): UserAccount[] {
  return DEMO_USERS.map((user) => {
    const owned = ordersState.filter((order) => order.managerId === user.id);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: 'active',
      lastLoginAt: isoAt(DEMO_BASE_DATE, Math.floor(owned.length % 7), 9),
      ordersCount: owned.length,
    };
  });
}

let usersState: UserAccount[] = buildUsers();

export function getUsers(): UserAccount[] {
  return usersState;
}

export function updateUserRole(userId: string, role: Role): UserAccount | undefined {
  const index = usersState.findIndex((user) => user.id === userId);
  if (index === -1) return undefined;
  const updated: UserAccount = { ...usersState[index], role };
  usersState[index] = updated;
  return updated;
}

/** Метрики якості «моделі». Значення фіксовані - це демонстраційні дані. */
export function getAnalytics(): AnalyticsResponse {
  const featureImportance: FeatureImportance[] = [
    { feature: 'status', label: 'Статус замовлення', importance: 0.243 },
    { feature: 'amount', label: 'Сума замовлення', importance: 0.187 },
    { feature: 'close_date', label: 'Строк закриття', importance: 0.156 },
    { feature: 'activity', label: 'Активність комунікації', importance: 0.131 },
    { feature: 'items', label: 'Кількість позицій', importance: 0.098 },
    { feature: 'customer_tier', label: 'Клас клієнта', importance: 0.081 },
    { feature: 'payment_delay', label: 'Історія оплат', importance: 0.062 },
    { feature: 'industry', label: 'Галузь клієнта', importance: 0.042 },
  ];

  const random = mulberry32(SEED + 7);
  const trend: MetricTrendPoint[] = [];
  for (let week = 11; week >= 0; week -= 1) {
    const point = new Date(DEMO_BASE_DATE.getTime() - week * 7 * DAY_MS);
    const drift = (11 - week) * 0.0025;
    trend.push({
      period: point.toISOString().slice(0, 10),
      rocAuc: Number((0.812 + drift + random() * 0.02).toFixed(3)),
      f1: Number((0.752 + drift + random() * 0.025).toFixed(3)),
      precision: Number((0.774 + drift + random() * 0.02).toFixed(3)),
    });
  }

  return {
    modelVersion: 'forecast-lite 1.4.2',
    trainedAt: new Date(DEMO_BASE_DATE.getTime() - 2 * DAY_MS).toISOString(),
    sampleSize: 4820,
    kpis: [
      {
        key: 'roc_auc',
        label: 'ROC-AUC',
        value: 0.842,
        format: 'number',
        hint: 'Здатність ранжувати замовлення за ймовірністю закриття',
      },
      {
        key: 'f1',
        label: 'F1-міра',
        value: 0.781,
        format: 'number',
        hint: 'Баланс точності та повноти на валідаційній вибірці',
      },
      {
        key: 'precision',
        label: 'Точність (precision)',
        value: 0.803,
        format: 'percent',
        hint: 'Частка справжніх успіхів серед замовлень із високим прогнозом',
      },
      {
        key: 'recall',
        label: 'Повнота (recall)',
        value: 0.761,
        format: 'percent',
        hint: 'Частка фактично виграних замовлень, які модель знайшла',
      },
      {
        key: 'brier',
        label: 'Brier score',
        value: 0.152,
        format: 'number',
        hint: 'Середньоквадратична похибка ймовірностей: менше - краще',
      },
      {
        key: 'sample',
        label: 'Розмір вибірки',
        value: 4820,
        format: 'number',
        hint: 'Історичні замовлення, на яких навчалася модель',
      },
    ],
    featureImportance,
    trend,
  };
}

/** Перевірка облікових даних. Однакова відмова для всіх випадків описана в обробнику. */
export function findUserByCredentials(email: string, password: string): DemoUser | undefined {
  const normalized = email.trim().toLowerCase();
  return DEMO_USERS.find((user) => user.email === normalized && user.password === password);
}

export function findUserById(userId: string): DemoUser | undefined {
  return DEMO_USERS.find((user) => user.id === userId);
}
