import { describe, expect, it, vi } from 'vitest';
import {
  CHECK_MODE_MAX_LATENCY,
  CHECK_MODE_MIN_LATENCY,
  CHECK_MODE_STORAGE_KEY,
  DEFAULT_CHECK_MODE,
  isSimulatedNetworkDown,
  normalizeCheckMode,
  readCheckMode,
  resetCheckMode,
  subscribeCheckMode,
  updateCheckMode,
  writeCheckMode,
} from '@/lib/checkMode';

describe('normalizeCheckMode', () => {
  it('на порожньому вході повертає типові значення', () => {
    expect(normalizeCheckMode(null)).toEqual(DEFAULT_CHECK_MODE);
    expect(normalizeCheckMode({})).toEqual(DEFAULT_CHECK_MODE);
    expect(normalizeCheckMode('сміття')).toEqual(DEFAULT_CHECK_MODE);
  });

  it('відкидає невідомі режими станів', () => {
    const flags = normalizeCheckMode({ orders: 'зламано', users: 'error' });
    expect(flags.orders).toBe(DEFAULT_CHECK_MODE.orders);
    expect(flags.users).toBe('error');
  });

  it('обмежує затримку допустимим діапазоном', () => {
    expect(normalizeCheckMode({ latencyMs: -100 }).latencyMs).toBe(CHECK_MODE_MIN_LATENCY);
    expect(normalizeCheckMode({ latencyMs: 99_999 }).latencyMs).toBe(CHECK_MODE_MAX_LATENCY);
    expect(normalizeCheckMode({ latencyMs: 250.6 }).latencyMs).toBe(251);
    expect(normalizeCheckMode({ latencyMs: 'швидко' }).latencyMs).toBe(
      DEFAULT_CHECK_MODE.latencyMs,
    );
  });

  it('приймає лише логічне значення для обриву мережі', () => {
    expect(normalizeCheckMode({ networkDown: true }).networkDown).toBe(true);
    expect(normalizeCheckMode({ networkDown: 'так' }).networkDown).toBe(false);
  });
});

describe('readCheckMode / writeCheckMode', () => {
  it('записує прапорці в localStorage', () => {
    writeCheckMode({ ...DEFAULT_CHECK_MODE, orders: 'empty', latencyMs: 1500 });

    const raw = localStorage.getItem(CHECK_MODE_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? '{}')).toMatchObject({ orders: 'empty', latencyMs: 1500 });
    expect(readCheckMode().orders).toBe('empty');
  });

  it('updateCheckMode змінює лише передані поля', () => {
    writeCheckMode({ ...DEFAULT_CHECK_MODE, orders: 'error', latencyMs: 900 });
    const updated = updateCheckMode({ analytics: 'empty' });

    expect(updated.orders).toBe('error');
    expect(updated.latencyMs).toBe(900);
    expect(updated.analytics).toBe('empty');
  });

  it('resetCheckMode прибирає ключ зі сховища', () => {
    writeCheckMode({ ...DEFAULT_CHECK_MODE, networkDown: true });
    const flags = resetCheckMode();

    expect(flags).toEqual(DEFAULT_CHECK_MODE);
    expect(localStorage.getItem(CHECK_MODE_STORAGE_KEY)).toBeNull();
  });

  it('читає збережені прапорці після повторного завантаження модуля', async () => {
    localStorage.setItem(
      CHECK_MODE_STORAGE_KEY,
      JSON.stringify({ orders: 'empty', forecast: 'error', latencyMs: 300 }),
    );

    vi.resetModules();
    const fresh = await import('@/lib/checkMode');

    expect(fresh.readCheckMode()).toEqual({
      ...fresh.DEFAULT_CHECK_MODE,
      orders: 'empty',
      forecast: 'error',
      latencyMs: 300,
    });
  });

  it('не падає на пошкодженому JSON і повертає типові значення', async () => {
    localStorage.setItem(CHECK_MODE_STORAGE_KEY, '{це не json');

    vi.resetModules();
    const fresh = await import('@/lib/checkMode');

    expect(fresh.readCheckMode()).toEqual(fresh.DEFAULT_CHECK_MODE);
  });
});

describe('subscribeCheckMode', () => {
  it('повідомляє слухача про зміну прапорців', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCheckMode(listener);

    updateCheckMode({ networkDown: true });
    expect(listener).toHaveBeenCalledTimes(1);

    updateCheckMode({ networkDown: false });
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    updateCheckMode({ networkDown: true });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('реагує на зміну сховища з іншої вкладки', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCheckMode(listener);

    window.dispatchEvent(
      new StorageEvent('storage', { key: CHECK_MODE_STORAGE_KEY, newValue: '{}' }),
    );
    expect(listener).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new StorageEvent('storage', { key: 'інший-ключ', newValue: '{}' }));
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });
});

describe('isSimulatedNetworkDown', () => {
  it('відображає поточний прапорець', () => {
    updateCheckMode({ networkDown: false });
    expect(isSimulatedNetworkDown()).toBe(false);

    updateCheckMode({ networkDown: true });
    expect(isSimulatedNetworkDown()).toBe(true);
  });
});
