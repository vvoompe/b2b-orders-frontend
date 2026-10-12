import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ROLE_LABELS } from '@/api/types';
import { OfflineBanner } from '@/components/states/OfflineBanner';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/authContext';
import { useOnlineStatus } from './hooks';
import styles from './AppLayout.module.css';

interface NavItem {
  to: string;
  label: string;
}

const BASE_NAV: readonly NavItem[] = [{ to: '/orders', label: 'Замовлення' }];

function navClass({ isActive }: { isActive: boolean }): string {
  return isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;
}

/** Каркас застосунку: шапка, навігація за ролями, глобальні банери, підвал. */
export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();

  if (user === null) {
    // Сюди можна потрапити лише в момент виходу з системи.
    return null;
  }

  const navItems: NavItem[] = [...BASE_NAV];
  if (user.role === 'analyst' || user.role === 'admin') {
    navItems.push({ to: '/analytics', label: 'Аналітика' });
  }
  if (user.role === 'admin') {
    navItems.push({ to: '/admin/users', label: 'Користувачі' });
  }

  const handleLogout = (): void => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={styles.layout}>
      <a className="skip-link" href="#main-content">
        Перейти до основного вмісту
      </a>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <p className={styles.brandTitle}>Прогноз B2B-замовлень</p>
            <p className={styles.brandSubtitle}>Система підтримки ухвалення рішень</p>
          </div>

          <nav aria-label="Основна навігація">
            <ul className={styles.navList}>
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className={navClass} end={item.to === '/orders'}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.userBox}>
            <span className={styles.userName}>
              <strong>{user.name}</strong>
              <span className={styles.userRole}>{ROLE_LABELS[user.role]}</span>
            </span>
            <Button variant="ghost" size="small" onClick={handleLogout}>
              Вийти
            </Button>
          </div>
        </div>
      </header>

      <main className={styles.main} id="main-content" tabIndex={-1}>
        <div className={styles.mainInner}>
          {!isOnline ? <OfflineBanner /> : null}
          <Outlet />
        </div>
      </main>

      <footer className={styles.footer}>
        Демонстраційний застосунок: дані надходять із mock-API (MSW), реального бекенду немає.
      </footer>
    </div>
  );
}
