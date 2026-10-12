import { formatPercent } from '@/lib/format';
import { clampProbability, riskLabel, riskLevel } from '@/lib/risk';
import styles from './ForecastMeter.module.css';

export interface ForecastMeterProps {
  probability: number;
  /** Показувати підпис рівня ризику під шкалою. */
  showLabel?: boolean;
}

/**
 * Шкала ймовірності успішного закриття. Значення доступне скрінрідеру через
 * `role="progressbar"`, а не лише візуально через ширину смуги.
 */
export function ForecastMeter({ probability, showLabel = false }: ForecastMeterProps) {
  const value = clampProbability(probability);
  const level = riskLevel(value);
  const percent = formatPercent(value);

  return (
    <div className={styles.meter}>
      <span className={`${styles.value} ${styles[`value${level[0].toUpperCase()}${level.slice(1)}`]}`}>
        {percent}
      </span>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-valuetext={`Ймовірність успішного закриття ${percent}`}
      >
        <div className={`${styles.fill} ${styles[level]}`} style={{ width: `${value * 100}%` }} />
      </div>
      {showLabel ? <span className={styles.value}>{riskLabel(value)}</span> : null}
    </div>
  );
}
