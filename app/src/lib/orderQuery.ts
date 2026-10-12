import type { Order } from '@/api/types';
import { PAGE_SIZE, type OrderFilters } from './queryParams';

/**
 * Фільтрація, сортування й пагінація списку замовлень.
 * Чиста функція: використовується і mock-API, і тестами без мережі.
 */

export interface OrderQueryResult {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/** Дата створення у вигляді `РРРР-ММ-ДД` (порівнюємо рядки - це дешевше й без поясів). */
function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

function toAmount(raw: string): number | null {
  if (raw === '') return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** Застосовує до списку всі змістовні фільтри з URL. */
export function applyOrderFilters(orders: readonly Order[], filters: OrderFilters): Order[] {
  const amountMin = toAmount(filters.amountMin);
  const amountMax = toAmount(filters.amountMax);

  return orders.filter((order) => {
    const day = dayOf(order.createdAt);

    if (filters.dateFrom && day < filters.dateFrom) return false;
    if (filters.dateTo && day > filters.dateTo) return false;
    if (filters.customerId && order.customerId !== filters.customerId) return false;
    if (filters.status && order.status !== filters.status) return false;
    if (amountMin !== null && order.amount < amountMin) return false;
    if (amountMax !== null && order.amount > amountMax) return false;

    return true;
  });
}

/** Сортування. За однакових значень порядок стабільний (спираємось на порядок у масиві). */
export function sortOrders(orders: readonly Order[], filters: OrderFilters): Order[] {
  const direction = filters.sortDir === 'asc' ? 1 : -1;
  const sorted = [...orders];

  sorted.sort((left, right) => {
    if (filters.sortBy === 'amount') {
      return (left.amount - right.amount) * direction;
    }
    return left.createdAt.localeCompare(right.createdAt) * direction;
  });

  return sorted;
}

/** Повний конвеєр: фільтри -> сортування -> сторінка. */
export function applyOrderQuery(
  orders: readonly Order[],
  filters: OrderFilters,
): OrderQueryResult {
  const filtered = sortOrders(applyOrderFilters(orders, filters), filters);
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page), pageCount);
  const start = (page - 1) * PAGE_SIZE;

  return {
    items: filtered.slice(start, start + PAGE_SIZE),
    total,
    page,
    pageSize: PAGE_SIZE,
    pageCount,
  };
}
