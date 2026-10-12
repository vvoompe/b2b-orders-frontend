import { ORDER_STATUS_LABELS, type Order } from '@/api/types';
import { formatDate, formatPercent } from './format';

/**
 * Побудова CSV-файлу для експорту вибірки замовлень.
 *
 * Логіка винесена з компонента, щоб її можна було перевірити модульним тестом
 * (це одна з вимог до якості коду в критеріях оцінювання STEM-проєкту).
 */

/** Екранує значення за RFC 4180: лапки, коми та переноси рядків. */
export function escapeCsvValue(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Збирає CSV-текст із двовимірного масиву (розділювач - кома, переноси - CRLF). */
export function buildCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.map(escapeCsvValue).join(',')).join('\r\n');
}

/** Додає BOM, щоб Excel коректно відкривав кирилицю. */
export function withBom(csv: string): string {
  return `\uFEFF${csv}`;
}

export const ORDER_CSV_HEADER: readonly string[] = [
  'Номер',
  'Клієнт',
  'Менеджер',
  'Сума',
  'Валюта',
  'Статус',
  'Прогноз',
  'Створено',
  'Планова дата закриття',
];

/** Перетворює замовлення у CSV-файл, готовий до завантаження. */
export function ordersToCsv(orders: readonly Order[]): string {
  const rows: string[][] = [ORDER_CSV_HEADER.slice()];

  for (const order of orders) {
    rows.push([
      order.number,
      order.customerName,
      order.managerName,
      String(order.amount),
      order.currency,
      ORDER_STATUS_LABELS[order.status],
      formatPercent(order.probability),
      formatDate(order.createdAt),
      formatDate(order.expectedCloseDate),
    ]);
  }

  return withBom(buildCsv(rows));
}

/** Ім'я файлу експорту з датою: `zamovlennya-2026-10-12.csv`. */
export function buildCsvFileName(prefix: string, now: Date = new Date()): string {
  const iso = now.toISOString().slice(0, 10);
  return `${prefix}-${iso}.csv`;
}

/** Завантажує CSV-файл засобами браузера (без сервера). */
export function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
