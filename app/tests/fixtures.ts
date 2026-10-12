import type { Order, OrderStatus } from '@/api/types';

/** Фабрика замовлення для тестів: будь-яке поле можна перекрити. */
export function makeOrder(overrides: Partial<Order> = {}): Order {
  const base: Order = {
    id: 'ord-0001',
    number: 'ЗМ-2026-0001',
    customerId: 'cst-01',
    customerName: 'ТОВ «Агротерра»',
    managerId: 'usr-1001',
    managerName: 'Олена Гриценко',
    amount: 500_000,
    currency: 'UAH',
    status: 'in_progress',
    itemsCount: 5,
    createdAt: '2026-05-10T09:00:00.000Z',
    expectedCloseDate: '2026-06-10T09:00:00.000Z',
    updatedAt: '2026-05-10T09:00:00.000Z',
    probability: 0.6,
    forecastUpdatedAt: '2026-05-10T09:00:00.000Z',
    factors: [],
    history: [],
  };

  return { ...base, ...overrides };
}

export interface OrderSeed {
  id: string;
  amount: number;
  createdAt: string;
  status: OrderStatus;
  customerId: string;
}

/** Набір замовлень із передбачуваними датами для перевірки сортування й фільтрів. */
export const ORDER_SEED: readonly OrderSeed[] = [
  { id: 'ord-1', amount: 100_000, createdAt: '2026-01-10T09:00:00.000Z', status: 'new', customerId: 'cst-01' },
  { id: 'ord-2', amount: 900_000, createdAt: '2026-02-15T09:00:00.000Z', status: 'won', customerId: 'cst-02' },
  { id: 'ord-3', amount: 400_000, createdAt: '2026-03-20T09:00:00.000Z', status: 'lost', customerId: 'cst-01' },
  { id: 'ord-4', amount: 4_000_000, createdAt: '2026-04-25T09:00:00.000Z', status: 'negotiation', customerId: 'cst-03' },
  { id: 'ord-5', amount: 250_000, createdAt: '2026-05-30T09:00:00.000Z', status: 'at_risk', customerId: 'cst-02' },
];

export function makeOrders(seed: readonly OrderSeed[] = ORDER_SEED): Order[] {
  return seed.map((item, index) =>
    makeOrder({
      ...item,
      // Номер унікальний: у таблиці він є посиланням на картку замовлення.
      number: `ЗМ-2026-${String(index + 1).padStart(4, '0')}`,
    }),
  );
}
