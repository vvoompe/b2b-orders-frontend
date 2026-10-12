/**
 * Розрахунок рівня ризику за ймовірністю успішного закриття замовлення.
 * Логіка винесена з компонентів, щоб її можна було перевірити юніт-тестами.
 */

export type RiskLevel = 'low' | 'medium' | 'high';

/** З цієї ймовірності й вище ризик вважається низьким. */
export const RISK_LOW_THRESHOLD = 0.7;

/** З цієї ймовірності й вище ризик вважається середнім (нижче - високим). */
export const RISK_MEDIUM_THRESHOLD = 0.4;

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'Низький ризик',
  medium: 'Середній ризик',
  high: 'Високий ризик',
};

export const RISK_DESCRIPTIONS: Record<RiskLevel, string> = {
  low: 'Прогноз сприятливий: можна планувати відвантаження за графіком.',
  medium: 'Ситуація невизначена: варто уточнити умови з клієнтом найближчим часом.',
  high: 'Потрібне втручання менеджера: є ризик, що замовлення не буде закрито.',
};

/**
 * Зводить довільне число до діапазону [0; 1].
 * Некоректні значення (NaN, ±Infinity) трактуємо обережно: як найгірший
 * варіант, щоб замовлення не «зникло» з радара менеджера.
 */
export function clampProbability(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value === Number.POSITIVE_INFINITY) return 1;
  if (value === Number.NEGATIVE_INFINITY) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** Рівень ризику за ймовірністю. Межі включні: 0.4 -> medium, 0.7 -> low. */
export function riskLevel(probability: number): RiskLevel {
  const value = clampProbability(probability);
  if (value >= RISK_LOW_THRESHOLD) return 'low';
  if (value >= RISK_MEDIUM_THRESHOLD) return 'medium';
  return 'high';
}

export function riskLabel(probability: number): string {
  return RISK_LABELS[riskLevel(probability)];
}

export function riskDescription(probability: number): string {
  return RISK_DESCRIPTIONS[riskLevel(probability)];
}

/** Рівень ризику для KPI-стрічки: скільки замовлень у кожній групі. */
export function countByRisk(probabilities: readonly number[]): Record<RiskLevel, number> {
  const result: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0 };
  for (const probability of probabilities) {
    result[riskLevel(probability)] += 1;
  }
  return result;
}
