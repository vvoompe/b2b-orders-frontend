import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { useCheckMode } from '@/app/hooks';
import {
  CHECK_MODE_MAX_LATENCY,
  CHECK_MODE_MIN_LATENCY,
  type CheckModeFlags,
  type DataStateMode,
  type ForecastMode,
} from '@/lib/checkMode';
import styles from './CheckModePanel.module.css';

const STATE_OPTIONS: readonly { value: DataStateMode; label: string }[] = [
  { value: 'auto', label: 'Реальні дані' },
  { value: 'empty', label: 'Порожній результат' },
  { value: 'error', label: 'Помилка запиту' },
];

const FORECAST_OPTIONS: readonly { value: ForecastMode; label: string }[] = [
  { value: 'auto', label: 'Успішний перерахунок' },
  { value: 'error', label: 'Помилка перерахунку' },
];

/**
 * Панель «Режим перевірки».
 *
 * Дозволяє перемкнути кожен обов'язковий стан інтерфейсу без правок коду.
 * Прапорці зберігаються в localStorage, тому переживають перезавантаження
 * сторінки; mock-API читає їх на кожному запиті.
 */
export function CheckModePanel() {
  const { flags, update, reset } = useCheckMode();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const apply = (patch: Partial<CheckModeFlags>): void => {
    update(patch);
    void queryClient.invalidateQueries();
  };

  const handleReset = (): void => {
    reset();
    void queryClient.invalidateQueries();
  };

  return (
    <>
      {isOpen ? (
        <aside className={styles.panel} aria-label="Режим перевірки">
          <h2 className={styles.panelTitle}>Режим перевірки</h2>
          <p className={styles.panelHint}>
            Керовані стани даних. Налаштування зберігаються в localStorage і діють на всі екрани
            одразу.
          </p>

          <div className={styles.field}>
            <label htmlFor="check-mode-orders">Список замовлень</label>
            <select
              id="check-mode-orders"
              className={styles.select}
              value={flags.orders}
              onChange={(event) => apply({ orders: event.target.value as DataStateMode })}
            >
              {STATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="check-mode-order">Картка замовлення</label>
            <select
              id="check-mode-order"
              className={styles.select}
              value={flags.order}
              onChange={(event) => apply({ order: event.target.value as DataStateMode })}
            >
              {STATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="check-mode-analytics">Аналітика</label>
            <select
              id="check-mode-analytics"
              className={styles.select}
              value={flags.analytics}
              onChange={(event) => apply({ analytics: event.target.value as DataStateMode })}
            >
              {STATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="check-mode-users">Користувачі</label>
            <select
              id="check-mode-users"
              className={styles.select}
              value={flags.users}
              onChange={(event) => apply({ users: event.target.value as DataStateMode })}
            >
              {STATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="check-mode-forecast">Перерахунок прогнозу</label>
            <select
              id="check-mode-forecast"
              className={styles.select}
              value={flags.forecast}
              onChange={(event) => apply({ forecast: event.target.value as ForecastMode })}
            >
              {FORECAST_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="check-mode-latency">Затримка відповіді, мс</label>
            <input
              id="check-mode-latency"
              className={styles.input}
              type="number"
              min={CHECK_MODE_MIN_LATENCY}
              max={CHECK_MODE_MAX_LATENCY}
              step={100}
              value={flags.latencyMs}
              onChange={(event) => apply({ latencyMs: Number(event.target.value) })}
            />
          </div>

          <div className={styles.checkboxRow}>
            <input
              id="check-mode-network"
              type="checkbox"
              checked={flags.networkDown}
              onChange={(event) => apply({ networkDown: event.target.checked })}
            />
            <label htmlFor="check-mode-network">
              Імітувати відсутність мережі (стан «офлайн/деградація»)
            </label>
          </div>

          <div className={styles.actions}>
            <Button variant="ghost" size="small" onClick={handleReset}>
              Скинути
            </Button>
          </div>
        </aside>
      ) : null}

      <Button
        variant="secondary"
        className={styles.toggle}
        aria-expanded={isOpen}
        aria-controls="check-mode-panel"
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? 'Закрити режим перевірки' : 'Режим перевірки'}
      </Button>
    </>
  );
}
