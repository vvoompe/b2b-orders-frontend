import { Link } from 'react-router-dom';
import { ORDER_STATUS_LABELS, type Order, type OrderSortBy, type OrderSortDir } from '@/api/types';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { SkeletonTable } from '@/components/states/SkeletonTable';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ForecastMeter } from '@/components/ui/ForecastMeter';
import { formatDate, formatMoney } from '@/lib/format';
import { riskLabel, riskLevel } from '@/lib/risk';
import { emptyContentFor, type OrdersViewState } from './listState';
import styles from './OrdersList.module.css';

const RISK_TONE: Record<ReturnType<typeof riskLevel>, BadgeTone> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
};

const STATUS_TONE: Record<Order['status'], BadgeTone> = {
  new: 'info',
  in_progress: 'info',
  negotiation: 'neutral',
  at_risk: 'warning',
  won: 'success',
  lost: 'danger',
};

export interface OrderTableProps {
  /** Один із чотирьох результативних станів панелі. */
  state: OrdersViewState;
  orders: readonly Order[];
  sortBy: OrderSortBy;
  sortDir: OrderSortDir;
  /** Текст помилки із запиту (стан error). */
  errorMessage?: string;
  /** Пояснення порожнього результату залежить від активних фільтрів. */
  hasFilters?: boolean;
  onSortChange: (sortBy: OrderSortBy, sortDir: OrderSortDir) => void;
  onRetry: () => void;
  onResetFilters?: () => void;
}

function sortIndicator(active: boolean, dir: OrderSortDir): string {
  if (!active) return '↕';
  return dir === 'asc' ? '▲' : '▼';
}

function ariaSortFor(
  column: OrderSortBy,
  sortBy: OrderSortBy,
  sortDir: OrderSortDir,
): 'ascending' | 'descending' | 'none' {
  if (column !== sortBy) return 'none';
  return sortDir === 'asc' ? 'ascending' : 'descending';
}

/**
 * Таблиця замовлень (десктоп). Компонент нічого не завантажує: він отримує
 * стан і дані ззовні, тому всі чотири стани легко перевіряються тестами.
 */
export function OrderTable({
  state,
  orders,
  sortBy,
  sortDir,
  errorMessage = 'Не вдалося завантажити список замовлень.',
  hasFilters = false,
  onSortChange,
  onRetry,
  onResetFilters,
}: OrderTableProps) {
  if (state === 'loading') {
    return (
      <div className={styles.view} data-state="loading">
        <SkeletonTable rows={6} columns={6} />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={styles.view} data-state="error">
        <ErrorState title="Список замовлень недоступний" message={errorMessage} onRetry={onRetry} />
      </div>
    );
  }

  if (state === 'empty') {
    const content = emptyContentFor(hasFilters);
    return (
      <div className={styles.view} data-state="empty">
        <EmptyState
          title={content.title}
          description={content.description}
          hint={content.hint}
          action={
            hasFilters && onResetFilters !== undefined ? (
              <Button variant="secondary" onClick={onResetFilters}>
                Скинути фільтри
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  const toggleSort = (column: OrderSortBy): void => {
    if (sortBy === column) {
      onSortChange(column, sortDir === 'asc' ? 'desc' : 'asc');
      return;
    }
    // За замовчуванням для обох колонок - спадання: найбільше й найновіше
    // цікавить менеджера першим.
    onSortChange(column, 'desc');
  };

  return (
    <div className={styles.view} data-state="success">
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption>
            {`На цій сторінці: ${String(orders.length)}. Сортування: ${
              sortBy === 'amount' ? 'сума' : 'дата створення'
            }, ${sortDir === 'asc' ? 'за зростанням' : 'за спаданням'}.`}
          </caption>
          <thead>
            <tr>
              <th scope="col" className={styles.th}>
                Номер
              </th>
              <th scope="col" className={styles.th}>
                Клієнт
              </th>
              <th scope="col" className={styles.th} aria-sort={ariaSortFor('amount', sortBy, sortDir)}>
                <button
                  type="button"
                  className={styles.sortButton}
                  onClick={() => toggleSort('amount')}
                >
                  Сума
                  <span className={styles.sortIndicator} aria-hidden="true">
                    {sortIndicator(sortBy === 'amount', sortDir)}
                  </span>
                </button>
              </th>
              <th scope="col" className={styles.th}>
                Прогноз
              </th>
              <th
                scope="col"
                className={styles.th}
                aria-sort={ariaSortFor('createdAt', sortBy, sortDir)}
              >
                <button
                  type="button"
                  className={styles.sortButton}
                  onClick={() => toggleSort('createdAt')}
                >
                  Створено
                  <span className={styles.sortIndicator} aria-hidden="true">
                    {sortIndicator(sortBy === 'createdAt', sortDir)}
                  </span>
                </button>
              </th>
              <th scope="col" className={styles.th}>
                Статус
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className={styles.row}>
                <td className={styles.td}>
                  <Link className={styles.rowLink} to={`/orders/${order.id}`}>
                    {order.number}
                  </Link>
                </td>
                <td className={styles.td}>
                  <span className={styles.customer}>
                    <span>{order.customerName}</span>
                    <span className={styles.customerMeta}>Менеджер: {order.managerName}</span>
                  </span>
                </td>
                <td className={`${styles.td} ${styles.amount}`}>{formatMoney(order.amount)}</td>
                <td className={styles.td}>
                  <ForecastMeter probability={order.probability} />
                </td>
                <td className={styles.td}>{formatDate(order.createdAt)}</td>
                <td className={styles.td}>
                  <Badge tone={STATUS_TONE[order.status]}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>{' '}
                  <Badge tone={RISK_TONE[riskLevel(order.probability)]}>
                    {riskLabel(order.probability)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
