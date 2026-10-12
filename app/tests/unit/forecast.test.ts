import { describe, expect, it } from 'vitest';
import { buildFactors, computeProbability, explainOrder, recalculateForecast } from '@/lib/forecast';
import { makeOrder } from '../fixtures';

const NOW = new Date('2026-06-01T10:00:00.000Z');

describe('computeProbability', () => {
  it('детермінована: те саме замовлення - те саме значення', () => {
    const order = makeOrder();
    expect(computeProbability(order)).toBe(computeProbability(order));
  });

  it('тримає ймовірність у відкритому діапазоні (0; 1)', () => {
    for (const status of ['new', 'in_progress', 'negotiation', 'at_risk'] as const) {
      const probability = computeProbability(makeOrder({ status, amount: 5_000_000 }));
      expect(probability).toBeGreaterThan(0);
      expect(probability).toBeLessThan(1);
    }
  });

  it('вигране замовлення має вищу ймовірність, ніж втрачене', () => {
    const won = computeProbability(makeOrder({ status: 'won' }));
    const lost = computeProbability(makeOrder({ status: 'lost' }));
    expect(won).toBeGreaterThan(lost);
  });

  it('велика сума знижує ймовірність за однакових інших умов', () => {
    const small = computeProbability(makeOrder({ amount: 100_000 }));
    const large = computeProbability(makeOrder({ amount: 3_500_000 }));
    expect(small).toBeGreaterThan(large);
  });
});

describe('buildFactors', () => {
  it('повертає набір факторів із заповненими полями', () => {
    const factors = buildFactors(makeOrder());

    expect(factors).toHaveLength(5);
    for (const factor of factors) {
      expect(factor.label).not.toBe('');
      expect(factor.value).not.toBe('');
      expect(factor.weight).toBeGreaterThanOrEqual(0);
      expect(factor.weight).toBeLessThanOrEqual(1);
    }
  });

  it('сортує фактори за силою внеску', () => {
    const factors = buildFactors(makeOrder({ status: 'won', amount: 2_000_000 }));
    const absolute = factors.map((factor) => Math.abs(factor.contribution));
    const sorted = [...absolute].sort((left, right) => right - left);
    expect(absolute).toEqual(sorted);
  });

  it('сума ваг дорівнює одиниці (з точністю до округлення)', () => {
    const factors = buildFactors(makeOrder());
    const sum = factors.reduce((total, factor) => total + factor.weight, 0);
    expect(sum).toBeCloseTo(1, 2);
  });

  it('напрямок внеску відповідає його знаку', () => {
    const factors = buildFactors(makeOrder({ status: 'lost' }));
    for (const factor of factors) {
      expect(factor.direction).toBe(factor.contribution >= 0 ? 'up' : 'down');
    }
  });

  it('перерахунок з іншою ітерацією дає інший внесок «активності»', () => {
    const order = makeOrder();
    const first = buildFactors(order, 0).find((factor) => factor.code === 'activity');
    const second = buildFactors(order, 3).find((factor) => factor.code === 'activity');
    expect(first?.contribution).not.toBe(second?.contribution);
  });
});

describe('explainOrder', () => {
  it('повертає числову оцінку й фактори', () => {
    const explanation = explainOrder(makeOrder());
    expect(Number.isFinite(explanation.score)).toBe(true);
    expect(explanation.factors.length).toBeGreaterThan(0);
  });
});

describe('recalculateForecast', () => {
  it('повертає нову ймовірність і запис в історію', () => {
    const order = makeOrder({ probability: 0.42 });
    const result = recalculateForecast(order, 1, NOW, 'Олена Гриценко');

    expect(result.probability).toBeGreaterThan(0);
    expect(result.probability).toBeLessThan(1);
    expect(result.historyEntry.fromProbability).toBe(0.42);
    expect(result.historyEntry.toProbability).toBe(result.probability);
    expect(result.historyEntry.at).toBe(NOW.toISOString());
    expect(result.historyEntry.source).toBe('manual');
    expect(result.historyEntry.author).toBe('Олена Гриценко');
    expect(result.historyEntry.id).toContain(order.id);
  });

  it('кожна наступна ітерація змінює результат', () => {
    const order = makeOrder();
    const first = recalculateForecast(order, 1, NOW).probability;
    const second = recalculateForecast(order, 2, NOW).probability;
    expect(first).not.toBe(second);
  });

  it('детермінована для тієї самої ітерації', () => {
    const order = makeOrder();
    const first = recalculateForecast(order, 5, NOW).probability;
    const second = recalculateForecast(order, 5, NOW).probability;
    expect(first).toBe(second);
  });

  it('значення округлене до чотирьох знаків', () => {
    const result = recalculateForecast(makeOrder(), 1, NOW);
    expect(result.probability).toBe(Number(result.probability.toFixed(4)));
  });

  it('не змінює початкове замовлення', () => {
    const order = makeOrder({ probability: 0.42 });
    recalculateForecast(order, 1, NOW);
    expect(order.probability).toBe(0.42);
    expect(order.history).toHaveLength(0);
  });
});
