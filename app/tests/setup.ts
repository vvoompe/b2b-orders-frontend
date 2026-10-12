import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { clearAuthToken } from '@/api/token';
import { resetCheckMode, updateCheckMode } from '@/lib/checkMode';
import { resetMockData } from '@/mocks/data';
import { server } from '@/mocks/server';

/**
 * Спільне налаштування тестів:
 * - mock-API на MSW працює як справжній сервер (незапитувані адреси - помилка);
 * - стан між тестами не протікає: скидаємо токен, прапорці й демо-дані.
 */
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

beforeEach(() => {
  // Штучні затримки mock-API у тестах не потрібні: стан завантаження
  // перевіряється окремими тестами компонентів.
  updateCheckMode({ latencyMs: 0 });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  clearAuthToken();
  resetMockData();
  resetCheckMode();
  localStorage.clear();
});

afterAll(() => {
  server.close();
});

// jsdom не реалізує matchMedia, а на нього спираються адаптивні хуки.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  const noop = (): void => undefined;
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: noop,
      removeEventListener: noop,
      addListener: noop,
      removeListener: noop,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
