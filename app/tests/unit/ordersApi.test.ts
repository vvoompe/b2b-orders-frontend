import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiError } from '@/api/client';
import { fetchAllOrders } from '@/api/orders';
import { DEFAULT_ORDER_FILTERS } from '@/lib/queryParams';
import { server } from '@/mocks/server';
import { makeOrder } from '../fixtures';

/**
 * Експорт вибірки обходить сторінки списку, тому перевіряємо саме цю
 * циклічну логіку: повноту вибірки, передачу фільтрів, поведінку при збої
 * однієї зі сторінок і запобіжник від нескінченного циклу.
 */

const ORDERS_URL = '/api/orders';

interface HandlerOptions {
  pageSize?: number;
  total?: number;
  onRequest?: (url: URL) => void;
  failOnPage?: number;
}

function ordersHandler(options: HandlerOptions = {}) {
  const pageSize = options.pageSize ?? 2;
  const total = options.total ?? 5;
  const pageCount = Math.ceil(total / pageSize);

  return http.get(ORDERS_URL, ({ request }) => {
    const url = new URL(request.url);
    options.onRequest?.(url);

    const page = Number(url.searchParams.get('page') ?? '1');
    if (page === options.failOnPage) {
      return HttpResponse.error();
    }

    const start = (page - 1) * pageSize;
    const count = Math.max(0, Math.min(pageSize, total - start));
    const items = [];
    for (let index = 0; index < count; index += 1) {
      items.push(makeOrder({ id: `ord-${String(start + index + 1)}` }));
    }

    return HttpResponse.json({ items, total, page, pageSize, pageCount });
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchAllOrders', () => {
  it('обходить усі сторінки й повертає повний перелік', async () => {
    let calls = 0;
    server.use(ordersHandler({ onRequest: () => (calls += 1) }));

    const orders = await fetchAllOrders(DEFAULT_ORDER_FILTERS);

    expect(orders).toHaveLength(5);
    expect(calls).toBe(3);
    expect(new Set(orders.map((order) => order.id)).size).toBe(5);
  });

  it('передає фільтри в кожен запит', async () => {
    const queries: string[] = [];
    server.use(ordersHandler({ onRequest: (url) => queries.push(url.search) }));

    await fetchAllOrders({ ...DEFAULT_ORDER_FILTERS, status: 'won', customerId: 'cst-01' });

    expect(queries.length).toBeGreaterThan(0);
    for (const query of queries) {
      expect(query).toContain('status=won');
      expect(query).toContain('customerId=cst-01');
    }
  });

  it('не робить більше ніж 50 сторінок, якщо даних забагато', async () => {
    let calls = 0;
    server.use(ordersHandler({ total: 100_000, pageSize: 2, onRequest: () => (calls += 1) }));

    await expect(fetchAllOrders(DEFAULT_ORDER_FILTERS)).rejects.toThrow('Звузьте фільтри');
    expect(calls).toBe(1);
  });

  it('передає помилку сторінки далі, а не віддає часткову вибірку', async () => {
    server.use(ordersHandler({ failOnPage: 2 }));

    const error = await fetchAllOrders(DEFAULT_ORDER_FILTERS).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe('network');
  });
});
