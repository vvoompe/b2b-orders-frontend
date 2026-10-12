import { useQuery } from '@tanstack/react-query';
import { fetchAnalytics } from '@/api/analytics';
import { describeError } from '@/api/client';
import type { ModelKpi } from '@/api/types';
import { FeatureImportanceChart } from '@/components/charts/FeatureImportanceChart';
import { MetricTrendChart } from '@/components/charts/MetricTrendChart';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { OfflineBanner } from '@/components/states/OfflineBanner';
import { SkeletonPanel } from '@/components/states/SkeletonTable';
import { formatDateTime, formatNumber, formatPercent } from '@/lib/format';
import styles from './AnalyticsPage.module.css';

function formatKpi(kpi: ModelKpi): string {
  if (kpi.format === 'percent') return formatPercent(kpi.value, 1);
  if (kpi.key === 'roc_auc' || kpi.key === 'f1' || kpi.key === 'brier') {
    return kpi.value.toFixed(3);
  }
  return formatNumber(kpi.value);
}

/** Екран «Аналітика»: KPI якості моделі, важливість ознак, тренд метрик. */
export function AnalyticsPage() {
  const analyticsQuery = useQuery({
    queryKey: ['analytics'],
    queryFn: ({ signal }) => fetchAnalytics(signal),
  });

  const handleRetry = (): void => {
    void analyticsQuery.refetch();
  };

  if (analyticsQuery.isPending) {
    return (
      <section className={styles.page} aria-busy="true">
        <SkeletonPanel rows={3} label="Завантажуємо метрики моделі…" />
        <SkeletonPanel rows={6} label="Завантажуємо графіки…" />
      </section>
    );
  }

  const data = analyticsQuery.data;

  if (data === undefined) {
    return (
      <section className={styles.page}>
        <ErrorState
          title="Аналітика недоступна"
          message={describeError(analyticsQuery.error)}
          onRetry={handleRetry}
        />
      </section>
    );
  }

  const isEmpty = data.kpis.length === 0 && data.featureImportance.length === 0;

  return (
    <section className={styles.page} aria-labelledby="analytics-title">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title} id="analytics-title">
            Аналітика
          </h1>
          <p className={styles.subtitle}>
            Метрики якості моделі прогнозування та важливість ознак
          </p>
        </div>
      </div>

      {analyticsQuery.isError ? <OfflineBanner onRetry={handleRetry} /> : null}

      {isEmpty ? (
        <EmptyState
          title="Даних для аналітики ще немає"
          description="Модель не має достатньо історичних замовлень, щоб порахувати метрики."
          hint="Метрики з’являться після першого навчання моделі на накопичених даних."
        />
      ) : (
        <>
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Параметри моделі</h2>
            <p className={styles.meta}>
              {`Версія: ${data.modelVersion} · останнє навчання: ${formatDateTime(data.trainedAt)} · вибірка: ${formatNumber(data.sampleSize)} замовлень`}
            </p>
          </div>

          <div className={styles.kpiGrid}>
            {data.kpis.map((kpi) => (
              <article key={kpi.key} className={styles.kpi}>
                <span className={styles.kpiLabel}>{kpi.label}</span>
                <span className={styles.kpiValue}>{formatKpi(kpi)}</span>
                <p className={styles.kpiHint}>{kpi.hint}</p>
              </article>
            ))}
          </div>

          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Важливість ознак</h2>
            <p className={styles.meta}>Внесок ознаки в прогноз; сума часток дорівнює 100 %.</p>
            {data.featureImportance.length === 0 ? (
              <EmptyState
                title="Ознак не визначено"
                description="Модель ще не обрахувала важливість ознак."
                hint="Спробуйте повторити навчання моделі."
              />
            ) : (
              <FeatureImportanceChart data={data.featureImportance} />
            )}
          </div>

          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Тренд метрик за 12 тижнів</h2>
            {data.trend.length === 0 ? (
              <EmptyState
                title="Тренд недоступний"
                description="Немає історії вимірювань якості моделі."
                hint="Точки тренду з’являються після щотижневої оцінки моделі."
              />
            ) : (
              <MetricTrendChart data={data.trend} />
            )}
          </div>
        </>
      )}
    </section>
  );
}
