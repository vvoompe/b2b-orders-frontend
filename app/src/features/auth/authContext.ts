import { createContext, useContext } from 'react';
import type { AuthUser, LoginCredentials } from '@/api/types';

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/** Доступ до стану автентифікації. Кидає помилку поза провайдером - це помилка розробника, не користувача. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) {
    throw new Error('useAuth викликано поза AuthProvider');
  }
  return value;
}
