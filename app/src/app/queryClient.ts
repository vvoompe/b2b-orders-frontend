import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';

/**
 * Налаштування кешу запитів.
 *
 * `retry` не повторює клієнтські помилки (401/403/404) - це марна робота,
 * а користувач має побачити стан помилки одразу. Помилки сервера й мережі
 * повторюються один раз, після чого показуємо кнопку «Повторити».
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status !== null && error.status < 500) return false;
          return failureCount < 1;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/** Клієнт для застосунку. Тести створюють власний, із вимкненими повторами. */
export const queryClient = createQueryClient();
