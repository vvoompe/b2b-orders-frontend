import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './RecalculateButton.module.css';

/**
 * Шість станів кнопки «Перерахувати прогноз» (див. Рисунок 2 у Розділі 1):
 * idle -> hover -> active -> loading -> success | error.
 *
 * `hover` і `active` - це стани взаємодії, вони видно в атрибуті `data-state`,
 * тож і їх, і решту станів можна перевірити тестами, а не «на око».
 */
export type RecalculateButtonState = 'idle' | 'hover' | 'active' | 'loading' | 'success' | 'error';

export interface RecalculateButtonProps {
  /** Асинхронна дія. Відхилений проміс переводить кнопку в стан помилки. */
  onRecalculate: () => Promise<unknown>;
  /** Заблокована зовні (наприклад, замовлення недоступне). */
  disabled?: boolean;
  /** Скільки мілісекунд показувати підтвердження успіху. */
  successDurationMs?: number;
}

const LABELS: Record<RecalculateButtonState, string> = {
  idle: 'Перерахувати прогноз',
  hover: 'Перерахувати прогноз',
  active: 'Перерахувати прогноз',
  loading: 'Перераховуємо…',
  success: 'Прогноз оновлено',
  error: 'Повторити перерахунок',
};

const STATUS_TEXT: Record<RecalculateButtonState, string> = {
  idle: '',
  hover: '',
  active: '',
  loading: 'Триває перерахунок прогнозу',
  success: 'Прогноз успішно оновлено',
  error: 'Не вдалося перерахувати прогноз',
};

export function RecalculateButton({
  onRecalculate,
  disabled = false,
  successDurationMs = 2000,
}: RecalculateButtonProps) {
  const [state, setState] = useState<RecalculateButtonState>('idle');

  /**
   * Синхронний замок проти подвійного натискання. Стан React оновлюється
   * асинхронно, тому двоє швидких кліків встигли б обидва побачити `idle`
   * і створити два запити. Реф спрацьовує одразу.
   */
  const busyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  const start = useCallback(
    (): void => {
      if (busyRef.current || disabled) return;
      busyRef.current = true;

      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      setState('loading');

      void onRecalculate().then(
        () => {
          setState('success');
          // Через 2 секунди підтвердження зникає, щоб стан не «зависав».
          timerRef.current = setTimeout(() => {
            busyRef.current = false;
            timerRef.current = null;
            setState('idle');
          }, successDurationMs);
        },
        () => {
          // Помилка дозволяє повторити спробу негайно.
          busyRef.current = false;
          setState('error');
        },
      );
    },
    [disabled, onRecalculate, successDurationMs],
  );

  const isLocked = state === 'loading' || state === 'success';

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        data-state={state}
        aria-busy={state === 'loading'}
        disabled={disabled || isLocked}
        onClick={start}
        onMouseEnter={() => setState((current) => (current === 'idle' ? 'hover' : current))}
        onMouseLeave={() =>
          setState((current) => (current === 'hover' || current === 'active' ? 'idle' : current))
        }
        onMouseDown={() =>
          setState((current) => (current === 'idle' || current === 'hover' ? 'active' : current))
        }
        onMouseUp={() => setState((current) => (current === 'active' ? 'hover' : current))}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            setState((current) =>
              current === 'idle' || current === 'hover' ? 'active' : current,
            );
          }
        }}
        onKeyUp={() => setState((current) => (current === 'active' ? 'idle' : current))}
      >
        {state === 'loading' ? <span className={styles.spinner} aria-hidden="true" /> : null}
        {state === 'success' ? (
          <span className={styles.check} aria-hidden="true">
            ✓
          </span>
        ) : null}
        {LABELS[state]}
      </button>

      {/* aria-live: скрінрідер озвучує кожну зміну стану кнопки */}
      <span className="visually-hidden" role="status" aria-live="polite">
        {STATUS_TEXT[state]}
      </span>

      {state === 'error' ? (
        <p className={styles.errorMessage} role="alert">
          Не вдалося перерахувати прогноз. Перевірте зв’язок і спробуйте ще раз.
        </p>
      ) : null}

      {state === 'success' ? (
        <p className={styles.successMessage}>Прогноз оновлено на поточних даних.</p>
      ) : null}
    </div>
  );
}
