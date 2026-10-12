import { buildOrderQuery, type OrderFilters } from '@/lib/queryParams';
import { apiRequest } from './client';
import type { CustomersResponse, Order, OrdersResponse } from './types';

/** Список замовлень із фільтрами, сортуванням і пагінацією. */
export function fetchOrders(filters: OrderFilters, signal?: AbortSignal): Promise<OrdersResponse> {
  const query = buildOrderQuery(filters);
  return apiRequest<OrdersResponse>(`/orders${query === '' ? '' : `?${query}`}`, { signal });
}

/**
 * Уся вибірка замовлень за поточними фільтрами - для експорту.
 *
 * Список віддається сторінками, тому експорт обходить їх послідовно.
 * Кількість сторінок обмежена запобіжником, щоб помилка в даних не
 * призвела до циклу.
 */
export async function fetchAllOrders(
  filters: OrderFilters,
  signal?: AbortSignal,
): Promise<Order[]> {
  const MAX_PAGES = 50;

  const first = await fetchOrders({ ...filters, page: 1 }, signal);
  const collected: Order[] = [...first.items];
  const lastPage = Math.min(first.pageCount, MAX_PAGES);

  for (let page = 2; page <= lastPage; page += 1) {
    const next = await fetchOrders({ ...filters, page }, signal);
    collected.push(...next.items);
  }

  return collected;
}

/** Картка замовлення. */
export function fetchOrder(orderId: string, signal?: AbortSignal): Promise<Order> {
  return apiRequest<Order>(`/orders/${encodeURIComponent(orderId)}`, { signal });
}

/** Перерахунок прогнозу для замовлення. */
export function recalculateOrderForecast(orderId: string): Promise<Order> {
  return apiRequest<Order>(`/orders/${encodeURIComponent(orderId)}/recalculate`, {
    method: 'POST',
  });
}

/** Довідник клієнтів для фільтра. */
export function fetchCustomers(signal?: AbortSignal): Promise<CustomersResponse> {
  return apiRequest<CustomersResponse>('/customers', { signal });
}
