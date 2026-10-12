import { useState, type ReactNode } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { createQueryClient } from './queryClient';

/**
 * Провайдери застосунку. Виділені окремо від `App`, щоб тести могли
 * відрендерити той самий набір провайдерів зі своїм клієнтом кешу
 * і власним маршрутизатором (MemoryRouter).
 */
export function AppProviders({
  children,
  client,
}: {
  children: ReactNode;
  client?: QueryClient;
}) {
  const [fallbackClient] = useState(() => createQueryClient());
  const queryClient = client ?? fallbackClient;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
