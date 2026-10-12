import { Button } from '@/components/ui/Button';
import styles from './states.module.css';

export interface OfflineBannerProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * Банер деградації: показується, коли запит не пройшов, а дані на екрані
 * лишилися від попереднього успішного завантаження. Користувач має знати,
 * що бачить застарілий стан, а не актуальний.
 */
export function OfflineBanner({
  message = 'Немає зв’язку із сервером. Дані, які ви бачите, можуть бути застарілими.',
  onRetry,
}: OfflineBannerProps) {
  return (
    <div className={styles.banner} role="status" aria-live="polite" data-testid="offline-banner">
      <p className={styles.bannerText}>{message}</p>
      {onRetry !== undefined ? (
        <Button variant="secondary" onClick={onRetry}>
          Оновити дані
        </Button>
      ) : null}
    </div>
  );
}
