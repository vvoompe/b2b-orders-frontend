import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Role } from '@/api/types';
import { ROLE_LABELS } from '@/api/types';
import { EmptyState } from '@/components/states/EmptyState';
import { useAuth } from '@/features/auth/authContext';

/**
 * Захист маршрутів. Неавторизованого користувача повертаємо на вхід і
 * запам'ятовуємо, звідки він прийшов, щоб після входу відкрити саме той екран.
 */
export function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return <Outlet />;
}

export interface RequireRoleProps {
  roles: readonly Role[];
}

/**
 * Обмеження за роллю. Користувач без потрібної ролі бачить пояснення,
 * а не порожній екран або помилку маршрутизації.
 */
export function RequireRole({ roles }: RequireRoleProps) {
  const { user } = useAuth();

  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    return (
      <EmptyState
        title="Доступ обмежено"
        description={`Розділ доступний лише для ролей: ${roles
          .map((role) => ROLE_LABELS[role])
          .join(', ')}.`}
        hint={`Ваша поточна роль - ${ROLE_LABELS[user.role]}. Зверніться до адміністратора, якщо потрібен ширший доступ.`}
      />
    );
  }

  return <Outlet />;
}
