import { CheckModePanel } from '@/components/CheckModePanel';
import { AppProviders } from './AppProviders';
import { AppRoutes } from './routes';

/**
 * Корінь застосунку. Панель «Режим перевірки» доступна на всіх екранах,
 * зокрема на вході - щоб можна було продемонструвати збій авторизації.
 */
export function App() {
  return (
    <AppProviders>
      <AppRoutes />
      <CheckModePanel />
    </AppProviders>
  );
}
