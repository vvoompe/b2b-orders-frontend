import { render, type RenderResult } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { AppProviders } from '@/app/AppProviders';
import { AppRoutes } from '@/app/routes';

/**
 * Тестовий клієнт кешу: повтори вимкнені, щоб стан помилки наступав одразу,
 * а не після серії повторних запитів.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

/** Рендерить застосунок на заданому маршруті. */
export function renderApp(route = '/login'): RenderResult {
  return render(
    <AppProviders client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[route]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  );
}

/** Рендерить довільний елемент у провайдерах застосунку (для компонентних тестів). */
export function renderWithProviders(ui: ReactElement): RenderResult {
  return render(<AppProviders client={createTestQueryClient()}>{ui}</AppProviders>);
}
