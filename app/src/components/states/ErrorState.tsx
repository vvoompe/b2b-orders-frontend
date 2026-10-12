import { Button } from '@/components/ui/Button';
import styles from './states.module.css';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry: () => void;
  retryLabel?: string;
}

/**
 * Стан помилки запиту. Відрізняється від порожнього результату: тут завжди є
 * кнопка «Повторити», бо це збій, а не відсутність даних.
 */
export function ErrorState({
  title = 'Не вдалося завантажити дані',
  message,
  onRetry,
  retryLabel = 'Повторити',
}: ErrorStateProps) {
  return (
    <div className={`${styles.state} ${styles.errorState}`} role="alert" data-testid="error-state">
      <h3 className={styles.stateTitle}>{title}</h3>
      <p className={styles.stateText}>{message}</p>
      <Button variant="primary" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}
