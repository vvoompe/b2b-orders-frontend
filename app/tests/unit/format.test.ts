import { describe, expect, it } from 'vitest';
import {
  EMPTY_VALUE,
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatPercent,
  formatPercentDelta,
} from '@/lib/format';

/** Intl ставить нерозривні пробіли - у звичайних рядках їх не видно. */
const plain = (value: string): string => value.replace(/[\u00A0\u202F\u2009]/g, ' ');

describe('formatMoney', () => {
  it('форматує суму в гривні з копійками', () => {
    expect(plain(formatMoney(1234567.5))).toBe('1 234 567,50 ₴');
  });

  it('форматує нуль', () => {
    expect(plain(formatMoney(0))).toBe('0,00 ₴');
  });

  it('не додає зайвих знаків для цілого числа', () => {
    expect(plain(formatMoney(950000))).toBe('950 000,00 ₴');
  });

  it('підтримує іншу валюту', () => {
    // Різні складання ICU дають або символ, або код валюти - приймаємо обидва.
    expect(plain(formatMoney(1000, 'EUR'))).toMatch(/€|EUR/);
  });

  it('повертає прочерк для некоректного числа', () => {
    expect(formatMoney(Number.NaN)).toBe(EMPTY_VALUE);
    expect(formatMoney(Number.POSITIVE_INFINITY)).toBe(EMPTY_VALUE);
  });
});

describe('formatDate', () => {
  it('форматує дату в українському форматі', () => {
    expect(formatDate('2026-10-12T09:00:00.000Z')).toBe('12.10.2026');
  });

  it('не залежить від часового поясу машини', () => {
    expect(formatDate('2026-01-01T12:00:00.000Z', 'UTC')).toBe('01.01.2026');
    expect(formatDate('2026-01-01T12:00:00.000Z', 'Europe/Kyiv')).toBe('01.01.2026');
  });

  it('повертає прочерк для некоректної дати', () => {
    expect(formatDate('не-дата')).toBe(EMPTY_VALUE);
  });
});

describe('formatDateTime', () => {
  it('додає час до дати', () => {
    expect(formatDateTime('2026-10-12T09:05:00.000Z')).toBe('12.10.2026, 12:05');
  });

  it('повертає прочерк для некоректної дати', () => {
    expect(formatDateTime('')).toBe(EMPTY_VALUE);
  });
});

describe('formatPercent', () => {
  it('переводить частку у відсотки', () => {
    expect(formatPercent(0.73)).toBe('73 %');
  });

  it('округляє до заданої кількості знаків і використовує кому', () => {
    expect(formatPercent(0.7325, 1)).toBe('73,3 %');
  });

  it('працює з нулем і одиницею', () => {
    expect(formatPercent(0)).toBe('0 %');
    expect(formatPercent(1)).toBe('100 %');
  });

  it('повертає прочерк для некоректного значення', () => {
    expect(formatPercent(Number.NaN)).toBe(EMPTY_VALUE);
  });
});

describe('formatPercentDelta', () => {
  it('додає знак плюс для зростання', () => {
    expect(formatPercentDelta(0.13)).toBe('+13 в.п.');
  });

  it('лишає мінус для падіння', () => {
    expect(formatPercentDelta(-0.05)).toBe('-5 в.п.');
  });

  it('не додає плюс для нуля', () => {
    expect(formatPercentDelta(0)).toBe('0 в.п.');
  });

  it('повертає прочерк для некоректного значення', () => {
    expect(formatPercentDelta(Number.NaN)).toBe(EMPTY_VALUE);
  });
});

describe('formatNumber', () => {
  it('групує розряди', () => {
    expect(plain(formatNumber(1234567))).toBe('1 234 567');
  });

  it('додає дробову частину за потреби', () => {
    expect(formatNumber(12.345, 2)).toBe('12,35');
  });

  it('повертає прочерк для некоректного числа', () => {
    expect(formatNumber(Number.NaN)).toBe(EMPTY_VALUE);
  });
});
