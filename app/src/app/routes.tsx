import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { EmptyState } from '@/components/states/EmptyState';
import { SkeletonPanel } from '@/components/states/SkeletonTable';
import { LoginPage } from '@/features/auth/LoginPage';
import { OrderDetailPage } from '@/features/orders/OrderDetailPage';
import { OrdersPage } from '@/features/orders/OrdersPage';
import { AppLayout } from './AppLayout';
import { RequireAuth, RequireRole } from './guards';

/**
 * Важкі розділи вантажимо на вимогу: бібліотека графіків (Recharts) потрібна
 * лише аналітику, тому менеджер не тягне її в початковому бандлі.
 */
const AnalyticsPage = lazy(() =>
  import('@/features/analytics/AnalyticsPage').then((module) => ({
    default: module.AnalyticsPage,
  })),
);
const UsersPage = lazy(() =>
  import('@/features/users/UsersPage').then((module) => ({ default: module.UsersPage })),
);

function LazySection({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<SkeletonPanel rows={5} label="Завантажуємо розділ…" />}>{children}</Suspense>
  );
}

/**
 * Карта маршрутів застосунку (розділ 3 ТЗ):
 * /login, /orders, /orders/:id, /analytics, /admin/users.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/orders" replace />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:orderId" element={<OrderDetailPage />} />

          <Route element={<RequireRole roles={['analyst', 'admin']} />}>
            <Route
              path="/analytics"
              element={
                <LazySection>
                  <AnalyticsPage />
                </LazySection>
              }
            />
          </Route>

          <Route element={<RequireRole roles={['admin']} />}>
            <Route
              path="/admin/users"
              element={
                <LazySection>
                  <UsersPage />
                </LazySection>
              }
            />
          </Route>

          <Route
            path="*"
            element={
              <EmptyState
                title="Сторінку не знайдено"
                description="Адреса не відповідає жодному розділу застосунку."
                hint="Скористайтеся навігацією у верхній частині екрана."
              />
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
