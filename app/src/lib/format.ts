/**
 * Форматери для відображення даних. Усі функції чисті: той самий вхід дає
 * той самий вихід, побічних ефектів немає, тому їх легко тестувати юніт-тестами.
 */

/** Мова інтерфейсу застосунку. */
export const DEFAULT_LOCALE = 'uk-UA';

/**
 * Час показуємо в київському поясі незалежно від поясу браузера: це робочий
 * час компанії, і менеджер не має бачити «плаваючі» дати при зміні пристрою.
 */
export const DEFAULT_TIME_ZONE = 'Europe/Kyiv';

/** Значення-замінник для відсутніх або некоректних даних. */
export const EMPTY_VALUE = '—';

const moneyFormatters = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: string, locale: string): Intl.NumberFormat {
  const key = `${locale}:${currency}`;
  const cached = moneyFormatters.get(key);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  moneyFormatters.set(key, formatter);
  return formatter;
}

/** Сума грошей: `1234567.5` -> `1 234 567,50 ₴`. */
export function formatMoney(value: number, currency = 'UAH', locale = DEFAULT_LOCALE): string {
  if (!Number.isFinite(value)) return EMPTY_VALUE;
  return moneyFormatter(currency, locale).format(value);
}

/** Число з фіксованою кількістю знаків після коми. */
export function formatNumber(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return EMPTY_VALUE;
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Дата без часу: `2026-10-12T09:00:00Z` -> `12.10.2026`. */
export function formatDate(iso: string, timeZone: string = DEFAULT_TIME_ZONE): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return EMPTY_VALUE;
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone,
  }).format(date);
}

/** Дата з часом: `2026-10-12T09:05:00Z` -> `12.10.2026, 12:05`. */
export function formatDateTime(iso: string, timeZone: string = DEFAULT_TIME_ZONE): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return EMPTY_VALUE;
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date);
}

/**
 * Частка у відсотках: `0.73` -> `73 %`. Рахуємо вручну, а не через
 * Intl `style: 'percent'`, бо там кома є десятковим роздільником і не
 * ставиться пробіл перед знаком відсотка.
 */
export function formatPercent(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return EMPTY_VALUE;
  const percent = value * 100;
  const fixed = percent.toFixed(fractionDigits).replace('.', ',');
  return `${fixed} %`;
}

/** Різниця у відсоткових пунктах зі знаком: `0.73 - 0.6` -> `+13 в.п.`. */
export function formatPercentDelta(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return EMPTY_VALUE;
  const points = value * 100;
  const sign = points > 0 ? '+' : '';
  const fixed = points.toFixed(fractionDigits).replace('.', ',');
  return `${sign}${fixed} в.п.`;
}
