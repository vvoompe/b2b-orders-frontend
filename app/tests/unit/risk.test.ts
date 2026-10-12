import { describe, expect, it } from 'vitest';
import {
  RISK_LABELS,
  RISK_LOW_THRESHOLD,
  RISK_MEDIUM_THRESHOLD,
  clampProbability,
  countByRisk,
  riskDescription,
  riskLabel,
  riskLevel,
} from '@/lib/risk';

describe('clampProbability', () => {
  it('лишає значення в межах діапазону', () => {
    expect(clampProbability(0.42)).toBe(0.42);
    expect(clampProbability(0)).toBe(0);
    expect(clampProbability(1)).toBe(1);
  });

  it('обрізає значення поза діапазоном', () => {
    expect(clampProbability(-0.5)).toBe(0);
    expect(clampProbability(1.7)).toBe(1);
  });

  it('обережно трактує некоректні числа', () => {
    expect(clampProbability(Number.NaN)).toBe(0);
    expect(clampProbability(Number.POSITIVE_INFINITY)).toBe(1);
    expect(clampProbability(Number.NEGATIVE_INFINITY)).toBe(0);
  });
});

describe('riskLevel: межі рівнів', () => {
  it('межа низького ризику включна', () => {
    expect(riskLevel(RISK_LOW_THRESHOLD)).toBe('low');
    expect(riskLevel(RISK_LOW_THRESHOLD - 0.0001)).toBe('medium');
  });

  it('межа середнього ризику включна', () => {
    expect(riskLevel(RISK_MEDIUM_THRESHOLD)).toBe('medium');
    expect(riskLevel(RISK_MEDIUM_THRESHOLD - 0.0001)).toBe('high');
  });

  it('висока ймовірність - низький ризик', () => {
    expect(riskLevel(0.95)).toBe('low');
  });

  it('низька ймовірність - високий ризик', () => {
    expect(riskLevel(0.05)).toBe('high');
  });

  it('некоректне значення не дає «оптимістичного» рівня', () => {
    expect(riskLevel(Number.NaN)).toBe('high');
    expect(riskLevel(-3)).toBe('high');
  });
});

describe('riskLabel і riskDescription', () => {
  it('підписує кожен рівень', () => {
    expect(riskLabel(0.8)).toBe(RISK_LABELS.low);
    expect(riskLabel(0.5)).toBe(RISK_LABELS.medium);
    expect(riskLabel(0.1)).toBe(RISK_LABELS.high);
  });

  it('пояснює кожен рівень окремим текстом', () => {
    const texts = new Set([
      riskDescription(0.8),
      riskDescription(0.5),
      riskDescription(0.1),
    ]);
    expect(texts.size).toBe(3);
  });
});

describe('countByRisk', () => {
  it('рахує замовлення за рівнями', () => {
    expect(countByRisk([0.9, 0.75, 0.5, 0.4, 0.2])).toEqual({
      low: 2,
      medium: 2,
      high: 1,
    });
  });

  it('на порожньому списку повертає нулі', () => {
    expect(countByRisk([])).toEqual({ low: 0, medium: 0, high: 0 });
  });
});
