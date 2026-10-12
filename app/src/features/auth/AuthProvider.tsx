import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { loginRequest } from '@/api/auth';
import { clearAuthToken, setAuthToken } from '@/api/token';
import type { AuthUser, LoginCredentials } from '@/api/types';
import { AuthContext, type AuthContextValue } from './authContext';

/**
 * Стан автентифікації.
 *
 * Токен зберігається в пам'яті модуля (`api/token.ts`), а не в localStorage,
 * тому закриття вкладки або перезавантаження сторінки завершує сесію - це
 * вимога захищеності з ТЗ. Стан користувача живе лише в пам'яті React.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthUser> => {
    const response = await loginRequest(credentials);
    setAuthToken(response.token);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback((): void => {
    clearAuthToken();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, login, logout }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
