import { describe, expect, it } from 'vitest';
import { applyOrderFilters, applyOrderQuery, sortOrders } from '@/lib/orderQuery';
import { DEFAULT_ORDER_FILTERS, PAGE_SIZE, type OrderFilters } from '@/lib/queryParams';
import { ORDER_SEED, makeOrders } from '../fixtures';

const orders = makeOrders();
const filters = (overrides: Partial<OrderFilters> = {}): OrderFilters => ({
  ...DEFAULT_ORDER_FILTERS,
  ...overrides,
});

describe('applyOrderFilters', () => {
  it('без фільтрів повертає всі замовлення', () => {
    expect(applyOrderFilters(orders, DEFAULT_ORDER_FILTERS)).toHaveLength(orders.length);
  });

  it('фільтрує за статусом', () => {
    const result = applyOrderFilters(orders, filters({ status: 'won' }));
    expect(result.map((order) => order.id)).toEqual(['ord-2']);
  });

  it('фільтрує за клієнтом', () => {
    const result = applyOrderFilters(orders, filters({ customerId: 'cst-01' }));
    expect(result.map((order) => order.id)).toEqual(['ord-1', 'ord-3']);
  });

  it('фільтрує за нижньою межею суми включно', () => {
    const result = applyOrderFilters(orders, filters({ amountMin: '400000' }));
    expect(result.map((order) => order.id)).toEqual(['ord-2', 'ord-3', 'ord-4']);
  });

  it('фільтрує за верхньою межею суми включно', () => {
    const result = applyOrderFilters(orders, filters({ amountMax: '250000' }));
    expect(result.map((order) => order.id)).toEqual(['ord-1', 'ord-5']);
  });

  it('фільтрує за діапазоном суми', () => {
    const result = applyOrderFilters(orders, filters({ amountMin: '200000', amountMax: '500000' }));
    expect(result.map((order) => order.id)).toEqual(['ord-3', 'ord-5']);
  });

  it('фільтрує за періодом включно з обома межами', () => {
    const result = applyOrderFilters(
      orders,
      filters({ dateFrom: '2026-02-15', dateTo: '2026-04-25' }),
    );
    expect(result.map((order) => order.id)).toEqual(['ord-2', 'ord-3', 'ord-4']);
  });

  it('ігнорує нечислові межі суми', () => {
    expect(applyOrderFilters(orders, filters({ amountMin: 'багато' }))).toHaveLength(orders.length);
  });

  it('ігнорує від’ємну межу суми', () => {
    expect(applyOrderFilters(orders, filters({ amountMax: '-100' }))).toHaveLength(orders.length);
  });

  it('поєднує кілька фільтрів', () => {
    const result = applyOrderFilters(
      orders,
      filters({ customerId: 'cst-02', status: 'at_risk' }),
    );
    expect(result.map((order) => order.id)).toEqual(['ord-5']);
  });

  it('повертає порожній список, якщо нічого не підходить', () => {
    expect(applyOrderFilters(orders, filters({ status: 'won', customerId: 'cst-03' }))).toEqual([]);
  });
});

describe('sortOrders', () => {
  it('сортує за сумою за зростанням', () => {
    const result = sortOrders(orders, filters({ sortBy: 'amount', sortDir: 'asc' }));
    expect(result.map((order) => order.amount)).toEqual([
      100_000, 250_000, 400_000, 900_000, 4_000_000,
    ]);
  });

  it('сортує за сумою за спаданням', () => {
    const result = sortOrders(orders, filters({ sortBy: 'amount', sortDir: 'desc' }));
    expect(result.map((order) => order.id)).toEqual(['ord-4', 'ord-2', 'ord-3', 'ord-5', 'ord-1']);
  });

  it('сортує за датою створення за спаданням (типово)', () => {
    const result = sortOrders(orders, DEFAULT_ORDER_FILTERS);
    expect(result.map((order) => order.id)).toEqual(['ord-5', 'ord-4', 'ord-3', 'ord-2', 'ord-1']);
  });

  it('не змінює початковий масив', () => {
    const source = makeOrders();
    const before = source.map((order) => order.id);
    sortOrders(source, filters({ sortBy: 'amount', sortDir: 'asc' }));
    expect(source.map((order) => order.id)).toEqual(before);
  });

  it('зберігає порядок для однакових значень', () => {
    const same = makeOrders(ORDER_SEED.map((seed) => ({ ...seed, amount: 100 })));
    const result = sortOrders(same, filters({ sortBy: 'amount', sortDir: 'asc' }));
    expect(result.map((order) => order.id)).toEqual(['ord-1', 'ord-2', 'ord-3', 'ord-4', 'ord-5']);
  });
});

describe('applyOrderQuery', () => {
  const many = makeOrders(
    Array.from({ length: PAGE_SIZE * 2 + 3 }, (_, index) => ({
      id: `ord-${String(index + 1)}`,
      amount: 1000 * (index + 1),
      createdAt: `2026-01-${String((index % 28) + 1).padStart(2, '0')}T09:00:00.000Z`,
      status: 'new' as const,
      customerId: 'cst-01',
    })),
  );

  it('повертає першу сторінку й загальну кількість', () => {
    const result = applyOrderQuery(many, DEFAULT_ORDER_FILTERS);
    expect(result.items).toHaveLength(PAGE_SIZE);
    expect(result.total).toBe(many.length);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(PAGE_SIZE);
    expect(result.pageCount).toBe(3);
  });

  it('повертає останню сторінку з залишком', () => {
    const result = applyOrderQuery(many, filters({ page: 3 }));
    expect(result.items).toHaveLength(3);
    expect(result.page).toBe(3);
  });

  it('обмежує сторінку останньою доступною', () => {
    const result = applyOrderQuery(many, filters({ page: 99 }));
    expect(result.page).toBe(3);
    expect(result.items).toHaveLength(3);
  });

  it('для порожнього результату дає одну сторінку без записів', () => {
    const result = applyOrderQuery(many, filters({ customerId: 'cst-99' }));
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.pageCount).toBe(1);
  });

  it('застосовує фільтри до пагінації', () => {
    const result = applyOrderQuery(orders, filters({ status: 'won' }));
    expect(result.total).toBe(1);
    expect(result.items[0]?.id).toBe('ord-2');
  });
});
