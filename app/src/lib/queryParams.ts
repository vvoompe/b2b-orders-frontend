import type { OrderSortBy, OrderSortDir, OrderStatus } from '@/api/types';

/**
 * Робота з query-параметрами списку замовлень. Фільтри зберігаються в URL,
 * тому посилання на вибірку можна передати колезі, а перезавантаження
 * сторінки не втрачає налаштування.
 */

export interface OrderFilters {
  dateFrom: string;
  dateTo: string;
  customerId: string;
  status: OrderStatus | '';
  amountMin: string;
  amountMax: string;
  sortBy: OrderSortBy;
  sortDir: OrderSortDir;
  page: number;
}

/** Розмір сторінки пагінації. */
export const PAGE_SIZE = 10;

export const DEFAULT_ORDER_FILTERS: OrderFilters = {
  dateFrom: '',
  dateTo: '',
  customerId: '',
  status: '',
  amountMin: '',
  amountMax: '',
  sortBy: 'createdAt',
  sortDir: 'desc',
  page: 1,
};

export const ORDER_STATUS_OPTIONS: readonly { value: OrderStatus; label: string }[] = [
  { value: 'new', label: 'Нове' },
  { value: 'in_progress', label: 'В роботі' },
  { value: 'negotiation', label: 'Погодження умов' },
  { value: 'at_risk', label: 'Під загрозою' },
  { value: 'won', label: 'Виграно' },
  { value: 'lost', label: 'Втрачено' },
];

export const ORDER_SORT_OPTIONS: readonly { value: OrderSortBy; label: string }[] = [
  { value: 'createdAt', label: 'За датою створення' },
  { value: 'amount', label: 'За сумою' },
];

const STATUS_VALUES: readonly string[] = ORDER_STATUS_OPTIONS.map((option) => option.value);
const SORT_BY_VALUES: readonly string[] = ORDER_SORT_OPTIONS.map((option) => option.value);

function normalizeStatus(raw: string | null): OrderStatus | '' {
  return raw !== null && STATUS_VALUES.includes(raw) ? (raw as OrderStatus) : '';
}

function normalizeSortBy(raw: string | null): OrderSortBy {
  return raw !== null && SORT_BY_VALUES.includes(raw) ? (raw as OrderSortBy) : 'createdAt';
}

function normalizeSortDir(raw: string | null): OrderSortDir {
  return raw === 'asc' || raw === 'desc' ? raw : 'desc';
}

function normalizePage(raw: string | null): number {
  if (raw === null) return 1;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

function normalizeText(raw: string | null): string {
  return raw === null ? '' : raw.trim();
}

/**
 * Серіалізує фільтри в query-рядок без знака «?».
 * Значення за замовчуванням не потрапляють у URL, щоб посилання лишалося чистим.
 */
export function buildOrderQuery(filters: OrderFilters): string {
  const params = new URLSearchParams();

  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.customerId) params.set('customerId', filters.customerId);
  if (filters.status) params.set('status', filters.status);
  if (filters.amountMin) params.set('amountMin', filters.amountMin);
  if (filters.amountMax) params.set('amountMax', filters.amountMax);
  if (filters.sortBy !== DEFAULT_ORDER_FILTERS.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortDir !== DEFAULT_ORDER_FILTERS.sortDir) params.set('sortDir', filters.sortDir);
  if (filters.page > 1) params.set('page', String(filters.page));

  return params.toString();
}

/** Розбирає query-рядок у фільтри. Некоректні значення замінюються на типові. */
export function parseOrderFilters(input: string | URLSearchParams): OrderFilters {
  const params =
    typeof input === 'string'
      ? new URLSearchParams(input.startsWith('?') ? input.slice(1) : input)
      : input;

  return {
    dateFrom: normalizeText(params.get('dateFrom')),
    dateTo: normalizeText(params.get('dateTo')),
    customerId: normalizeText(params.get('customerId')),
    status: normalizeStatus(params.get('status')),
    amountMin: normalizeText(params.get('amountMin')),
    amountMax: normalizeText(params.get('amountMax')),
    sortBy: normalizeSortBy(params.get('sortBy')),
    sortDir: normalizeSortDir(params.get('sortDir')),
    page: normalizePage(params.get('page')),
  };
}

/** Скільки змістовних фільтрів задано (для бейджа «активні фільтри»). */
export function countActiveFilters(filters: OrderFilters): number {
  const fields: readonly string[] = [
    filters.dateFrom,
    filters.dateTo,
    filters.customerId,
    filters.status,
    filters.amountMin,
    filters.amountMax,
  ];
  return fields.filter((value) => value !== '').length;
}

/** Фільтри, відмінні від типових (для підказки «фільтри застосовано»). */
export function hasActiveFilters(filters: OrderFilters): boolean {
  return countActiveFilters(filters) > 0;
}

export function toSearchParams(filters: OrderFilters): URLSearchParams {
  return new URLSearchParams(buildOrderQuery(filters));
}
