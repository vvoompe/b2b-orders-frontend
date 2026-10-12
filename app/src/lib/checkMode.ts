import type { ApiError } from '@/api/client';

/**
 * «Режим перевірки» - керовані стани інтерфейсу для демонстрації п'яти
 * обов'язкових станів з ТЗ. Прапорці зберігаються в localStorage, тому
 * переживають перезавантаження сторінки, а mock-API читає їх під час обробки
 * кожного запиту.
 */

export type DataStateMode = 'auto' | 'success' | 'empty' | 'error';
export type ForecastMode = 'auto' | 'error';

export interface CheckModeFlags {
  /** Стан списку замовлень. */
  orders: DataStateMode;
  /** Стан картки замовлення. */
  order: DataStateMode;
  /** Стан розділу аналітики. */
  analytics: DataStateMode;
  /** Стан списку користувачів. */
  users: DataStateMode;
  /** Поведінка кнопки «Перерахувати прогноз». */
  forecast: ForecastMode;
  /** Базова затримка відповіді mock-API, мс. */
  latencyMs: number;
  /** Імітація обриву мережі: запити завершуються помилкою мережі. */
  networkDown: boolean;
}

export const CHECK_MODE_STORAGE_KEY = 'stem-forecast:check-mode';

export const CHECK_MODE_EVENT = 'stem-forecast:check-mode-change';

/** Довжина затримки за замовчуванням: достатня, щоб побачити скелетони. */
export const DEFAULT_LATENCY_MS = 700;

export const DEFAULT_CHECK_MODE: CheckModeFlags = {
  orders: 'auto',
  order: 'auto',
  analytics: 'auto',
  users: 'auto',
  forecast: 'auto',
  latencyMs: DEFAULT_LATENCY_MS,
  networkDown: false,
};

export const CHECK_MODE_MIN_LATENCY = 0;
export const CHECK_MODE_MAX_LATENCY = 5000;

const STATE_MODES: readonly DataStateMode[] = ['auto', 'success', 'empty', 'error'];
const FORECAST_MODES: readonly ForecastMode[] = ['auto', 'error'];

let cache: CheckModeFlags | null = null;

function getStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    // У приватному режимі деяких браузерів доступ до сховища кидає виняток.
    return null;
  }
}

function normalizeStateMode(raw: unknown, fallback: DataStateMode): DataStateMode {
  return typeof raw === 'string' && (STATE_MODES as readonly string[]).includes(raw)
    ? (raw as DataStateMode)
    : fallback;
}

function normalizeForecastMode(raw: unknown, fallback: ForecastMode): ForecastMode {
  return typeof raw === 'string' && (FORECAST_MODES as readonly string[]).includes(raw)
    ? (raw as ForecastMode)
    : fallback;
}

function normalizeLatency(raw: unknown, fallback: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback;
  const rounded = Math.round(raw);
  if (rounded < CHECK_MODE_MIN_LATENCY) return CHECK_MODE_MIN_LATENCY;
  if (rounded > CHECK_MODE_MAX_LATENCY) return CHECK_MODE_MAX_LATENCY;
  return rounded;
}

function normalizeNetworkDown(raw: unknown, fallback: boolean): boolean {
  return typeof raw === 'boolean' ? raw : fallback;
}

/** Приводить довільний об'єкт до валідного набору прапорців. */
export function normalizeCheckMode(raw: unknown): CheckModeFlags {
  const source = raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  return {
    orders: normalizeStateMode(source.orders, DEFAULT_CHECK_MODE.orders),
    order: normalizeStateMode(source.order, DEFAULT_CHECK_MODE.order),
    analytics: normalizeStateMode(source.analytics, DEFAULT_CHECK_MODE.analytics),
    users: normalizeStateMode(source.users, DEFAULT_CHECK_MODE.users),
    forecast: normalizeForecastMode(source.forecast, DEFAULT_CHECK_MODE.forecast),
    latencyMs: normalizeLatency(source.latencyMs, DEFAULT_CHECK_MODE.latencyMs),
    networkDown: normalizeNetworkDown(source.networkDown, DEFAULT_CHECK_MODE.networkDown),
  };
}

/** Поточні прапорці. Значення кешується, щоб не читати сховище на кожен запит. */
export function readCheckMode(): CheckModeFlags {
  if (cache !== null) return cache;

  const storage = getStorage();
  const raw = storage?.getItem(CHECK_MODE_STORAGE_KEY) ?? null;

  if (raw === null) {
    cache = { ...DEFAULT_CHECK_MODE };
    return cache;
  }

  try {
    cache = normalizeCheckMode(JSON.parse(raw) as unknown);
  } catch {
    // Пошкоджений JSON - працюємо на типових значеннях, але не переписуємо сховище.
    cache = { ...DEFAULT_CHECK_MODE };
  }
  return cache;
}

function publish(flags: CheckModeFlags): CheckModeFlags {
  const storage = getStorage();
  storage?.setItem(CHECK_MODE_STORAGE_KEY, JSON.stringify(flags));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHECK_MODE_EVENT));
  }
  return flags;
}

export function writeCheckMode(flags: CheckModeFlags): CheckModeFlags {
  cache = normalizeCheckMode(flags);
  return publish(cache);
}

export function updateCheckMode(patch: Partial<CheckModeFlags>): CheckModeFlags {
  return writeCheckMode({ ...readCheckMode(), ...patch });
}

export function resetCheckMode(): CheckModeFlags {
  cache = { ...DEFAULT_CHECK_MODE };
  const storage = getStorage();
  storage?.removeItem(CHECK_MODE_STORAGE_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHECK_MODE_EVENT));
  }
  return cache;
}

/** Слухає зміни прапорців - у поточній вкладці й у сусідніх. */
export function subscribeCheckMode(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onStorage = (event: StorageEvent): void => {
    if (event.key !== null && event.key !== CHECK_MODE_STORAGE_KEY) return;
    cache = null;
    listener();
  };

  window.addEventListener(CHECK_MODE_EVENT, listener);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(CHECK_MODE_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Імітація обриву мережі ввімкнена? */
export function isSimulatedNetworkDown(): boolean {
  return readCheckMode().networkDown;
}

/** Чи помилка означає втрату зв'язку (справжню або змодельовану). */
export function isOfflineError(error: unknown): boolean {
  if (isSimulatedNetworkDown()) return true;
  if (error !== null && typeof error === 'object' && 'kind' in error) {
    return (error as Pick<ApiError, 'kind'>).kind === 'network';
  }
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}
