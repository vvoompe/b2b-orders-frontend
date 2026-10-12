import type { ReactNode } from 'react';
import styles from './states.module.css';

export interface EmptyStateProps {
  title: string;
  description: string;
  /** Порада, що зробити далі: порожній стан без неї марний користувачу. */
  hint?: string;
  action?: ReactNode;
}

/**
 * Порожній результат. Це не «порожня таблиця»: користувач бачить пояснення
 * причини та конкретну пораду, що змінити.
 */
export function EmptyState({ title, description, hint, action }: EmptyStateProps) {
  return (
    <div className={styles.state} data-testid="empty-state">
      <h3 className={styles.stateTitle}>{title}</h3>
      <p className={styles.stateText}>{description}</p>
      {hint !== undefined ? <p className={styles.stateHint}>{hint}</p> : null}
      {action}
    </div>
  );
}
