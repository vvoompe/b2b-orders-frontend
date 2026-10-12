import { describe, expect, it } from 'vitest';
import { hasErrors, validateLoginForm } from '@/features/auth/validation';

describe('validateLoginForm', () => {
  it('приймає коректні дані', () => {
    expect(validateLoginForm('manager@demo.ua', 'manager123')).toEqual({});
    expect(hasErrors(validateLoginForm('manager@demo.ua', 'manager123'))).toBe(false);
  });

  it('вимагає email', () => {
    expect(validateLoginForm('', 'manager123').email).toBe('Введіть email');
    expect(validateLoginForm('   ', 'manager123').email).toBe('Введіть email');
  });

  it('перевіряє формат email', () => {
    expect(validateLoginForm('manager', 'manager123').email).toContain('@');
    expect(validateLoginForm('manager@demo', 'manager123').email).toContain('домен');
  });

  it('вимагає пароль', () => {
    expect(validateLoginForm('manager@demo.ua', '').password).toBe('Введіть пароль');
  });

  it('вимагає мінімальну довжину пароля', () => {
    expect(validateLoginForm('manager@demo.ua', '123').password).toContain('щонайменше');
  });

  it('повертає обидві помилки одразу', () => {
    const errors = validateLoginForm('', '');
    expect(hasErrors(errors)).toBe(true);
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });
});
