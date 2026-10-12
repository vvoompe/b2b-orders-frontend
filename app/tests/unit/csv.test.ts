import { describe, expect, it, vi } from 'vitest';
import {
  ORDER_CSV_HEADER,
  buildCsv,
  buildCsvFileName,
  downloadCsv,
  escapeCsvValue,
  ordersToCsv,
} from '@/lib/csv';
import type { Order } from '@/api/types';
import { makeOrder } from '../fixtures';

describe('escapeCsvValue', () => {
  it('залишає простий текст без змін', () => {
    expect(escapeCsvValue('ТОВ Ромашка')).toBe('ТОВ Ромашка');
  });

  it('бере в лапки значення з комою', () => {
    expect(escapeCsvValue('Київ, вул. Хрещатик 22')).toBe('"Київ, вул. Хрещатик 22"');
  });

  it('подовоює лапки всередині значення', () => {
    expect(escapeCsvValue('ТОВ "Прогрес"')).toBe('"ТОВ ""Прогрес"""');
  });

  it('бере в лапки значення з переносом рядка', () => {
    expect(escapeCsvValue('перший\nдругий')).toBe('"перший\nдругий"');
  });
});

describe('buildCsv', () => {
  it('збирає рядки через CRLF і коми', () => {
    expect(buildCsv([['a', 'b'], ['c', 'd']])).toBe('a,b\r\nc,d');
  });
});

describe('ordersToCsv', () => {
  const order: Order = makeOrder({
    number: 'B2B-1042',
    customerName: 'ТОВ "Прогрес"',
    managerName: 'Ірина Ковальчук',
    amount: 125000,
    currency: 'UAH',
    status: 'at_risk',
    probability: 0.42,
  });

  it('починається з BOM і містить шапку', () => {
    const csv = ordersToCsv([order]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain(ORDER_CSV_HEADER.join(','));
  });

  it('екранує лапки в назві клієнта й не ламає структуру рядків', () => {
    const csv = ordersToCsv([order]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('"ТОВ ""Прогрес"""');
  });

  it('віддає суму числом, а статус - людською назвою', () => {
    const csv = ordersToCsv([order]);
    expect(csv).toContain(',125000,');
    expect(csv).toContain('Під загрозою');
  });

  it('для порожньої вибірки лишає тільки шапку', () => {
    const csv = ordersToCsv([]);
    expect(csv.split('\r\n')).toHaveLength(1);
  });
});

describe('downloadCsv', () => {
  it('створює blob, ініціює завантаження й прибирає тимчасовий URL', () => {
    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    downloadCsv('zamovlennya-2026-10-12.csv', 'a,b');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    // Після кліку тимчасове посилання з документу прибирається.
    expect(document.querySelector('a[download="zamovlennya-2026-10-12.csv"]')).toBeNull();
  });

  it('формує файл із типом text/csv, щоб Excel і браузер розпізнали формат', () => {
    const createObjectURL = vi.fn(() => 'blob:mock-url');
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    downloadCsv('файл.csv', 'Номер\nЗМ-1');

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/csv;charset=utf-8');
  });
});

describe('buildCsvFileName', () => {
  it('додає дату у форматі ISO', () => {
    expect(buildCsvFileName('zamovlennya', new Date('2026-10-12T10:00:00Z'))).toBe(
      'zamovlennya-2026-10-12.csv',
    );
  });
});
