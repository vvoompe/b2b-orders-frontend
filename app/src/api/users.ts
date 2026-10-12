import { apiRequest } from './client';
import type { Role, UpdateUserRoleResponse, UsersResponse } from './types';

/** Список користувачів системи (доступно лише адміністратору). */
export function fetchUsers(signal?: AbortSignal): Promise<UsersResponse> {
  return apiRequest<UsersResponse>('/users', { signal });
}

/** Зміна ролі користувача. */
export function updateUserRole(userId: string, role: Role): Promise<UpdateUserRoleResponse> {
  return apiRequest<UpdateUserRoleResponse>(`/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: { role },
  });
}
