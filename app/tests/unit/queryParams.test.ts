import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ORDER_FILTERS,
  buildOrderQuery,
  countActiveFilters,
  hasActiveFilters,
  parseOrderFilters,
  toSearchParams,
  type OrderFilters,
} from '@/lib/queryParams';

const filters = (overrides: Partial<OrderFilters> = {}): OrderFilters => ({
  ...DEFAULT_ORDER_FILTERS,
  ...overrides,
});

describe('buildOrderQuery', () => {
  it('для типових фільтрів дає порожній рядок', () => {
    expect(buildOrderQuery(DEFAULT_ORDER_FILTERS)).toBe('');
  });

  it('додає лише задані фільтри', () => {
    const query = buildOrderQuery(
      filters({
        dateFrom: '2026-01-01',
        status: 'won',
        amountMin: '100000',
        amountMax: '900000',
      }),
    );

    expect(query).toBe('dateFrom=2026-01-01&status=won&amountMin=100000&amountMax=900000');
  });

  it('не пише сторінку 1 у URL', () => {
    expect(buildOrderQuery(filters({ page: 1 }))).toBe('');
    expect(buildOrderQuery(filters({ page: 4 }))).toBe('page=4');
  });

  it('не дублює типове сортування', () => {
    expect(buildOrderQuery(filters({ sortBy: 'createdAt', sortDir: 'desc' }))).toBe('');
    expect(buildOrderQuery(filters({ sortBy: 'amount', sortDir: 'asc' }))).toBe(
      'sortBy=amount&sortDir=asc',
    );
  });

  it('кодує значення, як це робить браузер', () => {
    expect(buildOrderQuery(filters({ customerId: 'cst 01' }))).toBe('customerId=cst+01');
  });
});

describe('parseOrderFilters', () => {
  it('без параметрів повертає типові значення', () => {
    expect(parseOrderFilters('')).toEqual(DEFAULT_ORDER_FILTERS);
    expect(parseOrderFilters(new URLSearchParams())).toEqual(DEFAULT_ORDER_FILTERS);
  });

  it('читає параметри з провідним «?»', () => {
    expect(parseOrderFilters('?status=won&page=3')).toEqual(
      filters({ status: 'won', page: 3 }),
    );
  });

  it('зберігає й відновлює фільтри без втрат', () => {
    const source = filters({
      dateFrom: '2026-01-01',
      dateTo: '2026-06-30',
      customerId: 'cst-03',
      status: 'negotiation',
      amountMin: '50000',
      amountMax: '2000000',
      sortBy: 'amount',
      sortDir: 'asc',
      page: 7,
    });

    expect(parseOrderFilters(buildOrderQuery(source))).toEqual(source);
  });

  it('ігнорує невідомий статус', () => {
    expect(parseOrderFilters('status=загублено').status).toBe('');
  });

  it('ігнорує невідоме поле сортування', () => {
    expect(parseOrderFilters('sortBy=price').sortBy).toBe('createdAt');
  });

  it('ігнорує некоректний напрям сортування', () => {
    expect(parseOrderFilters('sortDir=вниз').sortDir).toBe('desc');
  });

  it('виправляє некоректну сторінку', () => {
    expect(parseOrderFilters('page=0').page).toBe(1);
    expect(parseOrderFilters('page=-5').page).toBe(1);
    expect(parseOrderFilters('page=абв').page).toBe(1);
    expect(parseOrderFilters('page=2.9').page).toBe(2);
  });

  it('прибирає зайві пробіли навколо тексту', () => {
    expect(parseOrderFilters('customerId=  cst-01  ').customerId).toBe('cst-01');
  });
});

describe('countActiveFilters і hasActiveFilters', () => {
  it('на типових фільтрах рахує нуль', () => {
    expect(countActiveFilters(DEFAULT_ORDER_FILTERS)).toBe(0);
    expect(hasActiveFilters(DEFAULT_ORDER_FILTERS)).toBe(false);
  });

  it('рахує кожен заданий фільтр', () => {
    expect(countActiveFilters(filters({ status: 'won', customerId: 'cst-01' }))).toBe(2);
    expect(hasActiveFilters(filters({ amountMin: '1' }))).toBe(true);
  });

  it('не враховує сортування й сторінку', () => {
    expect(countActiveFilters(filters({ sortBy: 'amount', page: 5 }))).toBe(0);
  });
});

describe('toSearchParams', () => {
  it('повертає параметри, придатні для маршрутизатора', () => {
    const params = toSearchParams(filters({ status: 'lost', page: 2 }));
    expect(params.toString()).toBe('status=lost&page=2');
    expect(params.get('status')).toBe('lost');
  });
});
