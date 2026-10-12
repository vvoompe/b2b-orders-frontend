import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { describeError } from '@/api/client';
import { fetchAllOrders, fetchCustomers, fetchOrders } from '@/api/orders';
import type { OrderSortBy, OrderSortDir } from '@/api/types';
import { OfflineBanner } from '@/components/states/OfflineBanner';
import { Button } from '@/components/ui/Button';
import { useIsMobile, useOnlineStatus } from '@/app/hooks';
import { buildCsvFileName, downloadCsv, ordersToCsv } from '@/lib/csv';
import { hasActiveFilters, parseOrderFilters, toSearchParams } from '@/lib/queryParams';
import { Filters } from './Filters';
import { OrderCards } from './OrderCards';
import { OrderTable } from './OrderTable';
import { type OrdersViewState } from './listState';
import styles from './OrdersPage.module.css';

/**
 * Екран «Список замовлень».
 *
 * Стани панелі (Рисунок 3): скелетон -> дані, порожній результат, помилка з
 * кнопкою «Повторити». Плюс банер деградації, якщо запит не пройшов, а старі
 * дані на екрані залишилися. Фільтри живуть в URL, тому вибірку можна
 * передати посиланням.
 */
export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const isOnline = useOnlineStatus();
  const [exportMessage, setExportMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const filters = useMemo(() => parseOrderFilters(searchParams), [searchParams]);

  const ordersQuery = useQuery({
    queryKey: ['orders', filters],
    queryFn: ({ signal }) => fetchOrders(filters, signal),
    // Під час зміни фільтрів показуємо попередні дані: таблиця не «стрибає».
    placeholderData: keepPreviousData,
  });

  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: ({ signal }) => fetchCustomers(signal),
    staleTime: 5 * 60_000,
  });

  const orders = ordersQuery.data?.items ?? [];
  const total = ordersQuery.data?.total ?? 0;
  const pageCount = ordersQuery.data?.pageCount ?? 1;
  const currentPage = ordersQuery.data?.page ?? filters.page;

  const state: OrdersViewState = ordersQuery.isPending
    ? 'loading'
    : ordersQuery.isError
      ? 'error'
      : orders.length === 0
        ? 'empty'
        : 'success';

  const errorMessage = ordersQuery.isError ? describeError(ordersQuery.error) : undefined;
  const filtersApplied = hasActiveFilters(filters);

  const applyFilters = (next: typeof filters): void => {
    setSearchParams(toSearchParams(next));
  };

  const resetFilters = (): void => {
    setSearchParams(new URLSearchParams());
  };

  const handleSortChange = (sortBy: OrderSortBy, sortDir: OrderSortDir): void => {
    setSearchParams(toSearchParams({ ...filters, sortBy, sortDir, page: 1 }));
  };

  const handlePageChange = (page: number): void => {
    setSearchParams(toSearchParams({ ...filters, page }));
  };

  const handleRetry = (): void => {
    void ordersQuery.refetch();
  };

  /** Експорт усієї вибірки (з фільтрами) у CSV-файл. */
  const handleExport = (): void => {
    setIsExporting(true);
    setExportMessage('Готуємо файл…');

    void (async () => {
      try {
        const allOrders = await fetchAllOrders(filters);
        downloadCsv(buildCsvFileName('zamovlennya'), ordersToCsv(allOrders));
        setExportMessage(`Файл завантажено. Рядків у файлі: ${String(allOrders.length)}.`);
      } catch (error) {
        setExportMessage(`Не вдалося підготувати файл: ${describeError(error)}`);
      } finally {
        setIsExporting(false);
      }
    })();
  };

  const listProps = {
    state,
    orders,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
    errorMessage,
    hasFilters: filtersApplied,
    onSortChange: handleSortChange,
    onRetry: handleRetry,
    onResetFilters: resetFilters,
  };

  return (
    <section className={styles.page} aria-labelledby="orders-title">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title} id="orders-title">
            Замовлення
          </h1>
          <p className={styles.subtitle}>
            Прогноз імовірності успішного закриття для кожного замовлення
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {state === 'success' ? (
            <p className={styles.totalBadge} role="status" aria-live="polite">
              {`Знайдено замовлень: ${String(total)}`}
            </p>
          ) : null}
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={state !== 'success' || isExporting}
          >
            {isExporting ? 'Готуємо файл…' : 'Експорт CSV'}
          </Button>
        </div>
      </div>

      <p role="status" aria-live="polite" className={styles.subtitle}>
        {exportMessage}
      </p>

      <Filters
        value={filters}
        customers={customersQuery.data?.items ?? []}
        isBusy={ordersQuery.isFetching}
        onApply={applyFilters}
        onReset={resetFilters}
      />

      {/* Банер деградації: запит не пройшов, але показані дані - від попереднього успіху */}
      {ordersQuery.isError && ordersQuery.data !== undefined ? (
        <OfflineBanner onRetry={handleRetry} />
      ) : null}

      <div aria-busy={ordersQuery.isFetching && state !== 'loading'}>
        {isMobile ? <OrderCards {...listProps} /> : <OrderTable {...listProps} />}
      </div>

      {state === 'success' && pageCount > 1 ? (
        <nav className={styles.pagination} aria-label="Пагінація списку замовлень">
          <p className={styles.pageInfo}>
            {`Сторінка ${String(currentPage)} з ${String(pageCount)}`}
          </p>
          <div className={styles.paginationButtons}>
            <Button
              variant="ghost"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Попередня
            </Button>
            <Button
              variant="ghost"
              disabled={currentPage >= pageCount}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Наступна
            </Button>
          </div>
        </nav>
      ) : null}

      {!isOnline ? (
        <p className={styles.staleNote}>
          Працюємо без зв’язку: показані дані завантажені раніше й можуть бути застарілими.
        </p>
      ) : null}
    </section>
  );
}
