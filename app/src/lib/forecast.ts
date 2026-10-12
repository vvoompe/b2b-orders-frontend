import type { ForecastFactor, ForecastHistoryEntry, Order, OrderStatus } from '@/api/types';

/**
 * «Модель» прогнозування. Це свідома імітація: за ТЗ власного бекенду й реальної
 * ML-моделі в проєкті немає. Проте імітація не випадкова - це детермінована
 * логістична функція від реальних ознак замовлення, тому прогноз
 * відтворюваний: те саме замовлення завжди дає ту саму ймовірність, а
 * перерахунок справді її змінює.
 */

/** Вільний член логістичної функції. */
const INTERCEPT = -0.15;

/** Максимальна сума угоди, після якої внесок суми перестає зростати. */
const AMOUNT_SCALE = 4_000_000;

/** Горизонт планування, днів: далі цього внесок терміну не зростає. */
const CLOSE_HORIZON_DAYS = 120;

const STATUS_WEIGHTS: Record<OrderStatus, number> = {
  new: 0.2,
  in_progress: 0.75,
  negotiation: 1.05,
  at_risk: -1.1,
  won: 2.6,
  lost: -2.6,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Простий 32-бітний хеш рядка - основа для відтворюваного «шуму». */
function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Детермінований генератор псевдовипадкових чисел у діапазоні [0; 1). */
function seededRandom(seed: number): number {
  let state = seed || 1;
  state ^= state << 13;
  state >>>= 0;
  state ^= state >> 17;
  state ^= state << 5;
  state >>>= 0;
  return state / 4294967296;
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

export interface ForecastExplanation {
  /** Логістична оцінка (логарифм шансів) до перетворення. */
  score: number;
  probability: number;
  factors: ForecastFactor[];
}

function describeStatus(status: OrderStatus): string {
  switch (status) {
    case 'new':
      return 'замовлення щойно створене';
    case 'in_progress':
      return 'замовлення в опрацюванні';
    case 'negotiation':
      return 'триває погодження умов';
    case 'at_risk':
      return 'є ознаки проблем у клієнта';
    case 'won':
      return 'замовлення вже виграно';
    case 'lost':
      return 'замовлення вже втрачено';
  }
}

/**
 * Розкладає оцінку замовлення на внески окремих ознак.
 * Порядок і зміст факторів однакові для одного й того самого замовлення.
 */
export function explainOrder(order: Order, iteration = 0): ForecastExplanation {
  const amount = Number.isFinite(order.amount) ? Math.max(0, order.amount) : 0;
  const amountFactor = (-amount / AMOUNT_SCALE) * 1.4;

  const statusFactor = STATUS_WEIGHTS[order.status];
  const statusLabel = describeStatus(order.status);

  const milestone = new Date(order.expectedCloseDate).getTime();
  const createdAt = new Date(order.createdAt).getTime();
  const daysToClose = Number.isFinite(milestone) && Number.isFinite(createdAt)
    ? Math.max(0, Math.round((milestone - createdAt) / DAY_MS))
    : CLOSE_HORIZON_DAYS;
  const termFactor = -(Math.min(daysToClose, CLOSE_HORIZON_DAYS) / CLOSE_HORIZON_DAYS) * 0.9;

  const itemsFactor = (Math.min(Math.max(order.itemsCount, 0), 12) / 12) * 0.45;

  const noiseSeed = hashString(`${order.id}:${iteration}`) >>> 0;
  const noiseFactor = (seededRandom(noiseSeed) - 0.5) * 0.7;

  const rawFactors: { code: string; label: string; value: string; contribution: number }[] = [
    {
      code: 'amount',
      label: 'Сума замовлення',
      value: `${Math.round(amount / 1000)} тис. ₴`,
      contribution: amountFactor,
    },
    {
      code: 'status',
      label: 'Поточний статус',
      value: statusLabel,
      contribution: statusFactor,
    },
    {
      code: 'close_date',
      label: 'Строк закриття',
      value: `${daysToClose} дн. від створення`,
      contribution: termFactor,
    },
    {
      code: 'items',
      label: 'Кількість позицій',
      value: `${order.itemsCount} поз.`,
      contribution: itemsFactor,
    },
    {
      code: 'activity',
      label: 'Активність комунікації',
      value: noiseFactor >= 0 ? 'вища за середню' : 'нижча за середню',
      contribution: noiseFactor,
    },
  ];

  const score = rawFactors.reduce((sum, factor) => sum + factor.contribution, INTERCEPT);
  const probability = Math.min(0.99, Math.max(0.01, sigmoid(score)));
  const totalWeight = rawFactors.reduce((sum, factor) => sum + Math.abs(factor.contribution), 0);

  const factors: ForecastFactor[] = [...rawFactors]
    .sort((left, right) => Math.abs(right.contribution) - Math.abs(left.contribution))
    .map((factor) => ({
      code: factor.code,
      label: factor.label,
      value: factor.value,
      contribution: Number(factor.contribution.toFixed(4)),
      direction: factor.contribution >= 0 ? 'up' : 'down',
      weight:
        totalWeight === 0
          ? 0
          : Number((Math.abs(factor.contribution) / totalWeight).toFixed(4)),
    }));

  return { score, probability, factors };
}

/** Ймовірність успішного закриття замовлення. */
export function computeProbability(order: Order): number {
  return explainOrder(order, 0).probability;
}

/** Фактори впливу для картки замовлення. */
export function buildFactors(order: Order, iteration = 0): ForecastFactor[] {
  return explainOrder(order, iteration).factors;
}

export interface RecalculationResult {
  probability: number;
  factors: ForecastFactor[];
  historyEntry: ForecastHistoryEntry;
}

/**
 * Перерахунок прогнозу. Кожна ітерація дає новий, але детермінований результат:
 * якщо натиснути «Перерахувати» ще раз, значення знову зміниться, бо змінюється
 * `iteration`. Історія не переписується - додається новий запис.
 */
export function recalculateForecast(
  order: Order,
  iteration: number,
  now: Date = new Date(),
  author = 'Система',
): RecalculationResult {
  const previousProbability = order.probability;
  const explanation = explainOrder(order, iteration);
  const probability = Number(explanation.probability.toFixed(4));

  return {
    probability,
    factors: explanation.factors,
    historyEntry: {
      id: `${order.id}-recalc-${iteration}`,
      at: now.toISOString(),
      fromProbability: previousProbability,
      toProbability: probability,
      source: 'manual',
      author,
      note: `Перерахунок №${iteration} на поточних даних замовлення`,
    },
  };
}
