import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { describeError } from '@/api/client';
import { fetchUsers, updateUserRole } from '@/api/users';
import { ROLE_LABELS, ROLE_OPTIONS, type Role, type UserAccount, type UsersResponse } from '@/api/types';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { OfflineBanner } from '@/components/states/OfflineBanner';
import { SkeletonTable } from '@/components/states/SkeletonTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/format';
import styles from './UsersPage.module.css';

function UserRow({ user }: { user: UserAccount }) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<Role>(user.role);
  const [syncedRole, setSyncedRole] = useState<Role>(user.role);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(
    null,
  );

  // Після оновлення списку роль могла змінитися на сервері - підтягуємо її
  // під час рендера, а не в ефекті.
  if (syncedRole !== user.role) {
    setSyncedRole(user.role);
    setRole(user.role);
  }

  const mutation = useMutation({
    mutationFn: () => updateUserRole(user.id, role),
    onSuccess: (result) => {
      // Оновлюємо кеш списку без повторного запиту - дані відповіді авторитетні.
      queryClient.setQueryData<UsersResponse>(['users'], (current) =>
        current === undefined
          ? current
          : {
              items: current.items.map((item) =>
                item.id === result.user.id ? result.user : item,
              ),
            },
      );
      setFeedback({ tone: 'success', text: result.message });
    },
    onError: (error: unknown) => {
      setFeedback({ tone: 'error', text: describeError(error) });
    },
  });

  const isChanged = role !== user.role;

  return (
    <tr>
      <td className={styles.td}>
        <span className={styles.userCell}>
          <strong>{user.name}</strong>
          <span className={styles.userEmail}>{user.email}</span>
        </span>
      </td>
      <td className={styles.td}>
        <div className={styles.roleCell}>
          <label className="visually-hidden" htmlFor={`role-${user.id}`}>
            {`Роль користувача ${user.name}`}
          </label>
          <select
            id={`role-${user.id}`}
            className={styles.select}
            value={role}
            onChange={(event) => {
              setRole(event.target.value as Role);
              setFeedback(null);
            }}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {ROLE_LABELS[option]}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            size="small"
            disabled={!isChanged || mutation.isPending}
            aria-busy={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Зберігаємо…' : 'Зберегти'}
          </Button>
        </div>
        <p
          className={`${styles.status} ${
            feedback?.tone === 'error' ? styles.statusError : styles.statusSuccess
          }`}
          role="status"
          aria-live="polite"
        >
          {feedback?.text ?? ''}
        </p>
      </td>
      <td className={styles.td}>
        <Badge tone={user.status === 'active' ? 'success' : 'danger'}>
          {user.status === 'active' ? 'Активний' : 'Заблокований'}
        </Badge>
      </td>
      <td className={styles.td}>{formatDate(user.lastLoginAt)}</td>
      <td className={styles.td}>{user.ordersCount}</td>
    </tr>
  );
}

/** Екран «Користувачі» (адміністратор): таблиця користувачів і зміна ролі. */
export function UsersPage() {
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: ({ signal }) => fetchUsers(signal),
  });

  const handleRetry = (): void => {
    void usersQuery.refetch();
  };

  if (usersQuery.isPending) {
    return (
      <section className={styles.page} aria-busy="true">
        <SkeletonTable rows={8} columns={5} />
      </section>
    );
  }

  const data = usersQuery.data;

  if (data === undefined) {
    return (
      <section className={styles.page}>
        <ErrorState
          title="Список користувачів недоступний"
          message={describeError(usersQuery.error)}
          onRetry={handleRetry}
        />
      </section>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="users-title">
      <div>
        <h1 className={styles.title} id="users-title">
          Користувачі
        </h1>
        <p className={styles.subtitle}>Керування ролями доступу до розділів системи</p>
      </div>

      {usersQuery.isError ? <OfflineBanner onRetry={handleRetry} /> : null}

      {data.items.length === 0 ? (
        <EmptyState
          title="Користувачів не знайдено"
          description="У системі немає жодного облікового запису."
          hint="Додайте користувача в CRM - він з’явиться тут після синхронізації."
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="visually-hidden">
              {`Користувачі системи: ${String(data.items.length)}. Роль можна змінити у випадаючому списку.`}
            </caption>
            <thead>
              <tr>
                <th scope="col" className={styles.th}>
                  Ім’я
                </th>
                <th scope="col" className={styles.th}>
                  Роль і керування
                </th>
                <th scope="col" className={styles.th}>
                  Стан
                </th>
                <th scope="col" className={styles.th}>
                  Останній вхід
                </th>
                <th scope="col" className={styles.th}>
                  Замовлень
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((user) => (
                <UserRow key={user.id} user={user} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
