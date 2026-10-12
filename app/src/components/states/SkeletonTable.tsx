import styles from './states.module.css';

export interface SkeletonTableProps {
  /** Кількість рядків-заглушок. */
  rows?: number;
  /** Кількість колонок у рядку. */
  columns?: number;
  /** Таблична розкладка (десктоп) або картки (мобільний). */
  variant?: 'table' | 'cards';
  /** Текст для скрінрідера - візуально прихований. */
  label?: string;
}

/**
 * Скелетон завантаження. Показується замість порожнього екрана: рядки мають
 * фіксовану висоту, тому після завантаження верстка не «стрибає».
 */
export function SkeletonTable({
  rows = 6,
  columns = 5,
  variant = 'table',
  label = 'Завантажуємо дані…',
}: SkeletonTableProps) {
  const containerClass = variant === 'cards' ? styles.cards : styles.table;
  const itemClass = variant === 'cards' ? styles.card : styles.row;

  return (
    <div className={containerClass} aria-busy="true" data-testid="skeleton">
      <p className="visually-hidden" role="status">
        {label}
      </p>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={`row-${String(rowIndex)}`} className={itemClass} aria-hidden="true">
          {Array.from({ length: columns }, (_, columnIndex) => (
            <span key={`cell-${String(columnIndex)}`} className={styles.cell} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Скелетон довільної панелі: картка фіксованої висоти з кількома рядками. */
export function SkeletonPanel({ rows = 4, label = 'Завантажуємо дані…' }: SkeletonTableProps) {
  return (
    <div className={styles.panel} aria-busy="true" data-testid="skeleton-panel">
      <p className="visually-hidden" role="status">
        {label}
      </p>
      <span className={styles.cell} style={{ width: '40%', height: '22px' }} aria-hidden="true" />
      <div className={styles.stack} aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <span key={`line-${String(index)}`} className={styles.cell} />
        ))}
      </div>
    </div>
  );
}
