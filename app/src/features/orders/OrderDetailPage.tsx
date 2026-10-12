import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, describeError } from '@/api/client';
import { fetchOrder, recalculateOrderForecast } from '@/api/orders';
import { ORDER_STATUS_LABELS } from '@/api/types';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { OfflineBanner } from '@/components/states/OfflineBanner';
import { SkeletonPanel } from '@/components/states/SkeletonTable';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { CopyLinkButton } from '@/components/ui/CopyLinkButton';
import { ForecastMeter } from '@/components/ui/ForecastMeter';
import { RecalculateButton } from '@/components/ui/RecalculateButton';
import { formatDate, formatDateTime, formatMoney, formatPercent, formatPercentDelta } from '@/lib/format';
import { riskDescription, riskLabel, riskLevel } from '@/lib/risk';
import styles from './OrderDetailPage.module.css';

const RISK_TONE: Record<ReturnType<typeof riskLevel>, BadgeTone> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
};

const STATUS_TONE: Record<keyof typeof ORDER_STATUS_LABELS, BadgeTone> = {
  new: 'info',
  in_progress: 'info',
  negotiation: 'neutral',
  at_risk: 'warning',
  won: 'success',
  lost: 'danger',
};

/**
 * Екран «Картка замовлення»: реквізити, прогноз із факторами, кнопка
 * перерахунку та історія змін прогнозу.
 */
export function OrderDetailPage() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const queryClient = useQueryClient();

  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: ({ signal }) => fetchOrder(orderId, signal),
    enabled: orderId !== '',
  });

  const recalculateMutation = useMutation({
    mutationFn: () => recalculateOrderForecast(orderId),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', orderId], updated);
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const handleRetry = (): void => {
    void orderQuery.refetch();
  };

  if (orderQuery.isPending) {
    return (
      <section className={styles.page} aria-busy="true">
        <SkeletonPanel rows={5} label="Завантажуємо картку замовлення…" />
        <SkeletonPanel rows={4} label="Завантажуємо фактори прогнозу…" />
      </section>
    );
  }

  const order = orderQuery.data;

  if (order === undefined) {
    const isNotFound = orderQuery.error instanceof ApiError && orderQuery.error.status === 404;

    if (isNotFound) {
      return (
        <section className={styles.page}>
          <EmptyState
            title="Замовлення не знайдено"
            description="Можливо, номер замовлення змінився або його видалено."
            hint="Поверніться до списку замовлень і виберіть потрібний запис."
            action={
              <Link className={styles.backLink} to="/orders">
                До списку замовлень
              </Link>
            }
          />
        </section>
      );
    }

    return (
      <section className={styles.page}>
        <ErrorState
          title="Картка замовлення недоступна"
          message={describeError(orderQuery.error)}
          onRetry={handleRetry}
        />
      </section>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="order-title">
      <div className={styles.header}>
        <div>
          <Link className={styles.backLink} to="/orders">
            ← До списку замовлень
          </Link>
          <h1 className={styles.title} id="order-title">
            {`Замовлення ${order.number}`}
          </h1>
          <p className={styles.subtitle}>{order.customerName}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <Badge tone={STATUS_TONE[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
          <CopyLinkButton />
        </div>
      </div>

      {/* Дані лишилися від попереднього успішного завантаження, а оновлення не пройшло */}
      {orderQuery.isError ? <OfflineBanner onRetry={handleRetry} /> : null}

      <div className={styles.grid}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Реквізити замовлення</h2>
          <dl className={styles.requisites}>
            <div>
              <dt className={styles.term}>Номер</dt>
              <dd className={styles.value}>{order.number}</dd>
            </div>
            <div>
              <dt className={styles.term}>Клієнт</dt>
              <dd className={styles.value}>{order.customerName}</dd>
            </div>
            <div>
              <dt className={styles.term}>Менеджер</dt>
              <dd className={styles.value}>{order.managerName}</dd>
            </div>
            <div>
              <dt className={styles.term}>Сума</dt>
              <dd className={styles.value}>{formatMoney(order.amount, order.currency)}</dd>
            </div>
            <div>
              <dt className={styles.term}>Створено</dt>
              <dd className={styles.value}>{formatDate(order.createdAt)}</dd>
            </div>
            <div>
              <dt className={styles.term}>Планова дата закриття</dt>
              <dd className={styles.value}>{formatDate(order.expectedCloseDate)}</dd>
            </div>
            <div>
              <dt className={styles.term}>Кількість позицій</dt>
              <dd className={styles.value}>{order.itemsCount}</dd>
            </div>
            <div>
              <dt className={styles.term}>Оновлено</dt>
              <dd className={styles.value}>{formatDateTime(order.updatedAt)}</dd>
            </div>
          </dl>
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Прогноз</h2>
          <div className={styles.forecastValue}>
            <span className={styles.bigValue} aria-live="polite">
              {formatPercent(order.probability)}
            </span>
            <Badge tone={RISK_TONE[riskLevel(order.probability)]}>
              {riskLabel(order.probability)}
            </Badge>
          </div>
          <ForecastMeter probability={order.probability} />
          <p className={styles.riskText}>{riskDescription(order.probability)}</p>
          <p className={styles.forecastMeta}>
            {`Останній перерахунок: ${formatDateTime(order.forecastUpdatedAt)}`}
          </p>

          <RecalculateButton onRecalculate={() => recalculateMutation.mutateAsync()} />
        </div>
      </div>

      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Фактори, що вплинули на прогноз</h2>
        <ul className={styles.factorList}>
          {order.factors.map((factor) => (
            <li key={factor.code} className={styles.factor}>
              <div className={styles.factorTop}>
                <span className={styles.factorLabel}>{factor.label}</span>
                <span className={styles.factorValue}>
                  {`${factor.value} · вплив ${factor.direction === 'up' ? 'підвищує' : 'знижує'} · вага ${formatPercent(factor.weight)}`}
                </span>
              </div>
              <div
                className={styles.factorBar}
                role="img"
                aria-label={`Вага фактора ${formatPercent(factor.weight)}`}
              >
                <div
                  className={
                    factor.direction === 'up' ? styles.factorFillUp : styles.factorFillDown
                  }
                  style={{ width: `${String(Math.max(4, Math.round(factor.weight * 100)))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Історія змін прогнозу</h2>
        <ol className={styles.historyList}>
          {order.history.map((entry) => (
            <li key={entry.id} className={styles.historyItem}>
              <span className={styles.historyTime}>
                {`${formatDateTime(entry.at)} · ${entry.source === 'manual' ? 'ручний перерахунок' : 'автоматичний перерахунок'} · ${entry.author}`}
              </span>
              <p className={styles.historyDelta}>
                {`${formatPercent(entry.fromProbability)} → ${formatPercent(entry.toProbability)} (${formatPercentDelta(entry.toProbability - entry.fromProbability)})`}
              </p>
              <p className={styles.historyNote}>{entry.note}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
