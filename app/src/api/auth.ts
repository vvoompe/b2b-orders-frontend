import { apiRequest } from './client';
import type { AuthResponse, LoginCredentials } from './types';

/** Автентифікація. Реальний сервер у проєкті відсутній - відповідає MSW. */
export function loginRequest(credentials: LoginCredentials): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { email: credentials.email, password: credentials.password },
  });
}
