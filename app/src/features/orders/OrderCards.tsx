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

export interface OrderCardsProps {
  state: OrdersViewState;
  orders: readonly Order[];
  sortBy: OrderSortBy;
  sortDir: OrderSortDir;
  errorMessage?: string;
  hasFilters?: boolean;
  onSortChange: (sortBy: OrderSortBy, sortDir: OrderSortDir) => void;
  onRetry: () => void;
  onResetFilters?: () => void;
}

/**
 * Подання списку замовлень картками для вузьких екранів (360-767 px).
 * Це той самий набір даних, що й у таблиці, але без горизонтального скролу.
 */
export function OrderCards({
  state,
  orders,
  sortBy,
  sortDir,
  errorMessage = 'Не вдалося завантажити список замовлень.',
  hasFilters = false,
  onSortChange,
  onRetry,
  onResetFilters,
}: OrderCardsProps) {
  if (state === 'loading') {
    return (
      <div className={styles.view} data-state="loading">
        <SkeletonTable rows={4} columns={3} variant="cards" />
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

  return (
    <div className={styles.view} data-state="success">
      <div className={styles.mobileSort}>
        <label className={styles.mobileSortLabel} htmlFor="orders-mobile-sort">
          Сортування
        </label>
        <select
          id="orders-mobile-sort"
          className={styles.mobileSortSelect}
          value={`${sortBy}:${sortDir}`}
          onChange={(event) => {
            const [nextBy, nextDir] = event.target.value.split(':');
            onSortChange(nextBy as OrderSortBy, nextDir as OrderSortDir);
          }}
        >
          <option value="createdAt:desc">Дата: спочатку нові</option>
          <option value="createdAt:asc">Дата: спочатку старі</option>
          <option value="amount:desc">Сума: від більшої</option>
          <option value="amount:asc">Сума: від меншої</option>
        </select>
      </div>

      <ul className={styles.cards}>
        {orders.map((order) => (
          <li key={order.id} className={styles.card}>
            <div className={styles.cardTop}>
              <h3 className={styles.cardTitle}>
                <Link className={styles.rowLink} to={`/orders/${order.id}`}>
                  {order.number}
                </Link>
              </h3>
              <Badge tone={STATUS_TONE[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
            </div>

            <p className={styles.cardCustomer}>{order.customerName}</p>

            <ForecastMeter probability={order.probability} showLabel />

            <dl className={styles.cardGrid}>
              <div>
                <dt className={styles.cardTerm}>Сума</dt>
                <dd className={styles.cardValue}>{formatMoney(order.amount)}</dd>
              </div>
              <div>
                <dt className={styles.cardTerm}>Створено</dt>
                <dd className={styles.cardValue}>{formatDate(order.createdAt)}</dd>
              </div>
              <div>
                <dt className={styles.cardTerm}>Менеджер</dt>
                <dd className={styles.cardValue}>{order.managerName}</dd>
              </div>
              <div>
                <dt className={styles.cardTerm}>Ризик</dt>
                <dd className={styles.cardValue}>
                  <Badge tone={RISK_TONE[riskLevel(order.probability)]}>
                    {riskLabel(order.probability)}
                  </Badge>
                </dd>
              </div>
            </dl>

            <div className={styles.cardActions}>
              <Link className={styles.cardActionLink} to={`/orders/${order.id}`}>
                Відкрити картку
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
