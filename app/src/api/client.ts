import { getAuthToken } from './token';

/**
 * Тонкий клієнт над fetch. Уся робота з мережею й перетворення помилок
 * зібрана в одному місці, тому компоненти ніколи не бачать «сирих» Response.
 */

export type ApiErrorKind = 'network' | 'unauthorized' | 'server' | 'client' | 'unknown';

export class ApiError extends Error {
  readonly status: number | null;
  readonly kind: ApiErrorKind;

  constructor(message: string, status: number | null, kind: ApiErrorKind) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
  }
}

/** Базова адреса mock-API. MSW перехоплює запити саме на цей префікс. */
export const API_BASE = '/api';

/**
 * Абсолютна адреса запиту. У браузері відносний шлях і так працює, але в
 * тестовому середовищі (jsdom + Node fetch) відносні шляхи недопустимі, тож
 * будуємо адресу від `window.location.origin`, коли він доступний.
 */
function resolveUrl(path: string): string {
  const relative = `${API_BASE}${path}`;
  if (typeof window !== 'undefined' && typeof window.location?.origin === 'string') {
    return `${window.location.origin}${relative}`;
  }
  return relative;
}

const NETWORK_MESSAGE =
  'Немає зв’язку із сервером. Перевірте підключення до мережі та повторіть спробу.';

/** Чи це скасування запиту (AbortController). Перевірка не залежить від середовища. */
function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (
      data !== null &&
      typeof data === 'object' &&
      'message' in data &&
      typeof (data as { message: unknown }).message === 'string'
    ) {
      return (data as { message: string }).message;
    }
  } catch {
    // Тіло не є JSON - показуємо загальне повідомлення нижче.
  }
  return `Запит не виконано (код ${response.status}).`;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * Виконує запит до mock-API.
 * @throws {ApiError} у разі помилки мережі, 401, 4xx або 5xx.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' });
  const token = getAuthToken();
  if (token !== null) headers.set('Authorization', `Bearer ${token}`);

  const init: RequestInit = { method: options.method ?? 'GET', headers };
  if (options.signal !== undefined) init.signal = options.signal;
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(resolveUrl(path), init);
  } catch (error) {
    // Перерваний запит - не помилка користувача, пробрасываемо далі як є.
    // `instanceof DOMException` тут не працює: у jsdom і в Node це різні класи.
    if (isAbortError(error)) throw error;
    throw new ApiError(NETWORK_MESSAGE, null, 'network');
  }

  if (!response.ok) {
    let kind: ApiErrorKind = 'client';
    if (response.status === 401) kind = 'unauthorized';
    else if (response.status >= 500) kind = 'server';
    const message = await readErrorMessage(response);
    throw new ApiError(message, response.status, kind);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Людиночитний текст помилки для будь-якого винятку. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message !== '') return error.message;
  return 'Сталася непередбачена помилка. Спробуйте ще раз.';
}
