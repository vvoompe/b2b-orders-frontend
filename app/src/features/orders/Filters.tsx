import { useState, type FormEvent } from 'react';
import type { Customer, OrderStatus } from '@/api/types';
import { Button } from '@/components/ui/Button';
import {
  DEFAULT_ORDER_FILTERS,
  ORDER_STATUS_OPTIONS,
  buildOrderQuery,
  countActiveFilters,
  type OrderFilters,
} from '@/lib/queryParams';
import styles from './Filters.module.css';

export interface FiltersProps {
  /** Поточні фільтри з URL - джерело істини. */
  value: OrderFilters;
  customers: readonly Customer[];
  /** Запит виконується: форма не блокується, але позначається aria-busy. */
  isBusy?: boolean;
  onApply: (next: OrderFilters) => void;
  onReset: () => void;
}

/**
 * Панель фільтрів списку замовлень.
 *
 * Форма працює на «чернетці»: значення застосовуються до URL лише після
 * натискання «Застосувати», тому кожне натискання клавіші не породжує запит,
 * а фільтри можна передати посиланням на інший комп'ютер.
 */
export function Filters({ value, customers, isBusy = false, onApply, onReset }: FiltersProps) {
  const [draft, setDraft] = useState<OrderFilters>(value);
  const [syncedKey, setSyncedKey] = useState<string>(() => buildOrderQuery(value));

  // Якщо адреса змінилася ззовні (кнопка «Назад», перехід за посиланням),
  // підтягуємо нові фільтри в чернетку під час рендера - без ефекту й без
  // зайвого кола перемальовування.
  const valueKey = buildOrderQuery(value);
  if (syncedKey !== valueKey) {
    setSyncedKey(valueKey);
    setDraft(value);
  }

  const patch = (changes: Partial<OrderFilters>): void => {
    setDraft((current) => ({ ...current, ...changes }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    // Будь-яка зміна умов повертає користувача на першу сторінку.
    onApply({ ...draft, page: 1 });
  };

  const handleReset = (): void => {
    setDraft({ ...DEFAULT_ORDER_FILTERS });
    onReset();
  };

  const activeCount = countActiveFilters(value);

  return (
    <form className={styles.filters} aria-label="Фільтри списку замовлень" aria-busy={isBusy} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="filter-date-from">
          Період з
        </label>
        <input
          id="filter-date-from"
          className={styles.input}
          type="date"
          value={draft.dateFrom}
          onChange={(event) => patch({ dateFrom: event.target.value })}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="filter-date-to">
          Період до
        </label>
        <input
          id="filter-date-to"
          className={styles.input}
          type="date"
          value={draft.dateTo}
          onChange={(event) => patch({ dateTo: event.target.value })}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="filter-customer">
          Клієнт
        </label>
        <select
          id="filter-customer"
          className={styles.select}
          value={draft.customerId}
          onChange={(event) => patch({ customerId: event.target.value })}
        >
          <option value="">Усі клієнти</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="filter-status">
          Статус
        </label>
        <select
          id="filter-status"
          className={styles.select}
          value={draft.status}
          onChange={(event) => patch({ status: event.target.value as OrderStatus | '' })}
        >
          <option value="">Усі статуси</option>
          {ORDER_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <span className={styles.label} id="filter-amount-label">
          Сума, ₴
        </span>
        <div className={styles.amountGroup}>
          <input
            className={styles.input}
            type="number"
            min={0}
            step={1000}
            placeholder="від"
            aria-label="Мінімальна сума"
            aria-describedby="filter-amount-label"
            value={draft.amountMin}
            onChange={(event) => patch({ amountMin: event.target.value })}
          />
          <input
            className={styles.input}
            type="number"
            min={0}
            step={1000}
            placeholder="до"
            aria-label="Максимальна сума"
            aria-describedby="filter-amount-label"
            value={draft.amountMax}
            onChange={(event) => patch({ amountMax: event.target.value })}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="filter-sort">
          Сортування
        </label>
        <select
          id="filter-sort"
          className={styles.select}
          value={`${draft.sortBy}:${draft.sortDir}`}
          onChange={(event) => {
            const [sortBy, sortDir] = event.target.value.split(':');
            patch({
              sortBy: sortBy as OrderFilters['sortBy'],
              sortDir: sortDir as OrderFilters['sortDir'],
            });
          }}
        >
          <option value="createdAt:desc">Дата: спочатку нові</option>
          <option value="createdAt:asc">Дата: спочатку старі</option>
          <option value="amount:desc">Сума: від більшої</option>
          <option value="amount:asc">Сума: від меншої</option>
        </select>
      </div>

      <div className={styles.actions}>
        <Button type="submit" variant="primary">
          Застосувати
        </Button>
        <Button type="button" variant="ghost" onClick={handleReset}>
          Скинути
        </Button>
      </div>

      <p className={styles.summary} role="status" aria-live="polite">
        {activeCount === 0
          ? 'Фільтри не застосовано - показано всі замовлення.'
          : `Застосовано фільтрів: ${String(activeCount)}.`}
      </p>
    </form>
  );
}
