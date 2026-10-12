import { useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { describeError } from '@/api/client';
import { ROLE_LABELS } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { DEMO_CREDENTIALS } from '@/mocks/data';
import { useAuth } from './authContext';
import { validateLoginForm, type LoginFieldErrors } from './validation';
import styles from './LoginPage.module.css';

interface LocationState {
  from?: string;
}

/**
 * Екран входу.
 *
 * Повідомлення про невдалий серверний вхід однакове і для неіснуючого
 * користувача, і для неправильного пароля - щоб не давати можливості
 * підбирати облікові дані (ТЗ, п. 6). На клієнті підсвічуємо лише те,
 * що перевірили самі: порожні поля та формат email.
 */
export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const redirectTo = state?.from ?? '/orders';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const clearFieldError = (field: keyof LoginFieldErrors): void => {
    setFieldErrors((current) => {
      if (current[field] === undefined) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setSubmitError(null);

    const errors = validateLoginForm(email, password);
    setFieldErrors(errors);

    if (errors.email !== undefined) {
      emailRef.current?.focus();
      return;
    }
    if (errors.password !== undefined) {
      passwordRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    void login({ email: email.trim(), password })
      .catch((error: unknown) => {
        // Текст беремо з відповіді mock-API - він однаковий для всіх видів відмови.
        setSubmitError(describeError(error));
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const fillDemo = (demoEmail: string, demoPassword: string): void => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setFieldErrors({});
    setSubmitError(null);
  };

  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <h1 className={styles.title}>Вхід у систему</h1>
        <p className={styles.subtitle}>
          Система підтримки ухвалення рішень щодо B2B-замовлень
        </p>

        <form
          className={styles.form}
          aria-label="Форма входу"
          aria-busy={isSubmitting}
          noValidate
          onSubmit={handleSubmit}
        >
          {submitError !== null ? (
            <p className={styles.formError} role="alert">
              {submitError}
            </p>
          ) : null}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              ref={emailRef}
              className={
                fieldErrors.email === undefined ? styles.input : `${styles.input} ${styles.inputInvalid}`
              }
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              aria-invalid={fieldErrors.email !== undefined}
              aria-describedby={fieldErrors.email === undefined ? undefined : 'login-email-error'}
              onChange={(event) => {
                setEmail(event.target.value);
                clearFieldError('email');
              }}
            />
            {fieldErrors.email !== undefined ? (
              <p className={styles.fieldError} id="login-email-error">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-password">
              Пароль
            </label>
            <input
              id="login-password"
              ref={passwordRef}
              className={
                fieldErrors.password === undefined
                  ? styles.input
                  : `${styles.input} ${styles.inputInvalid}`
              }
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              aria-invalid={fieldErrors.password !== undefined}
              aria-describedby={
                fieldErrors.password === undefined ? undefined : 'login-password-error'
              }
              onChange={(event) => {
                setPassword(event.target.value);
                clearFieldError('password');
              }}
            />
            {fieldErrors.password !== undefined ? (
              <p className={styles.fieldError} id="login-password-error">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>

          <Button type="submit" className={styles.submit} disabled={isSubmitting}>
            {isSubmitting ? 'Входимо…' : 'Увійти'}
          </Button>
          <p className={styles.hint}>
            Пароль не зберігається й не записується в журнали. Токен тримається лише в пам’яті
            вкладки.
          </p>
        </form>

        <section className={styles.demo} aria-label="Демонстраційні облікові записи">
          <h2 className={styles.demoTitle}>Демо-доступи</h2>
          <ul className={styles.demoList}>
            {DEMO_CREDENTIALS.map((account) => (
              <li key={account.email} className={styles.demoItem}>
                <span>
                  <strong>{ROLE_LABELS[account.role]}</strong>
                  {': '}
                  <span className={styles.demoCode}>{account.email}</span>
                  {' / '}
                  <span className={styles.demoCode}>{account.password}</span>
                </span>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => fillDemo(account.email, account.password)}
                >
                  Заповнити
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
