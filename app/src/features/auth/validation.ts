/** Клієнтська валідація форми входу (ТЗ, екран /login). */

export interface LoginFieldErrors {
  email?: string;
  password?: string;
}

/**
 * Перевірка email достатньо сувора, щоб відсіяти явні помилки вводу,
 * але не «розумніша» за сервер: складні правила все одно перевіряє він.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const MIN_PASSWORD_LENGTH = 6;

/**
 * Перевіряє поля форми. Повертає тексти помилок для конкретних полів -
 * на клієнті ми справді знаємо, яке поле винне, тому й підсвічуємо його.
 */
export function validateLoginForm(email: string, password: string): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const trimmedEmail = email.trim();

  if (trimmedEmail === '') {
    errors.email = 'Введіть email';
  } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
    errors.email = 'Email має містити символ @ і домен, наприклад manager@demo.ua';
  }

  if (password === '') {
    errors.password = 'Введіть пароль';
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Пароль має містити щонайменше ${MIN_PASSWORD_LENGTH} символів`;
  }

  return errors;
}

export function hasErrors(errors: LoginFieldErrors): boolean {
  return errors.email !== undefined || errors.password !== undefined;
}
