/**
 * Токен доступу живе ЛИШЕ в пам'яті модуля.
 *
 * Це свідома вимога безпеки з ТЗ: у localStorage токен не потрапляє, тож
 * сторонній скрипт (XSS) не може прочитати його з постійного сховища.
 * Наслідок: після перезавантаження сторінки користувач входить заново.
 */
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function clearAuthToken(): void {
  authToken = null;
}

export function hasAuthToken(): boolean {
  return authToken !== null;
}
