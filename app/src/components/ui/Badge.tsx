import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

/** Кольорова мітка. Колір дублюється текстом - стан не передається лише кольором. */
export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`${styles.badge} ${styles[tone]}`} data-tone={tone}>
      {children}
    </span>
  );
}
