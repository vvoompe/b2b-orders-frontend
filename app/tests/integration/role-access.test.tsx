import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../render';

/*
 * Розділи «Аналітика» і «Користувачі» в застосунку вантажаться на вимогу
 * (React.lazy). У тестах підготовляємо ці модулі заздалегідь, щоб перевіряти
 * логіку екранів, а не швидкість завантаження чанків.
 */
import '@/features/analytics/AnalyticsPage';
import '@/features/users/UsersPage';

/** Скільки чекати на появу ліниво завантаженого розділу. */
const LAZY_TIMEOUT = 10_000;

/**
 * Перевірка доступу за ролями та двох екранів, доступних лише частині ролей:
 * «Аналітика» (менеджер + адміністратор) і «Користувачі» (лише адміністратор).
 */

async function signIn(
  user: ReturnType<typeof userEvent.setup>,
  accountIndex: number,
): Promise<void> {
  renderApp('/login');
  const fillButtons = screen.getAllByRole('button', { name: 'Заповнити' });
  await user.click(fillButtons[accountIndex] as HTMLElement);
  await user.click(screen.getByRole('button', { name: 'Увійти' }));
  await screen.findByRole('heading', { name: 'Замовлення' });
}

describe('Розділ «Аналітика»', () => {
  it('аналітик бачить KPI моделі, графік важливості ознак і тренд', async () => {
    const user = userEvent.setup();
    // 0 - менеджер, 1 - аналітик, 2 - адміністратор.
    await signIn(user, 1);

    await user.click(screen.getByRole('link', { name: 'Аналітика' }));

    expect(
      await screen.findByRole('heading', { name: 'Аналітика' }, { timeout: LAZY_TIMEOUT }),
    ).toBeInTheDocument();
    expect(await screen.findByText('ROC-AUC', {}, { timeout: LAZY_TIMEOUT })).toBeInTheDocument();
    expect(screen.getByText('F1-міра')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Важливість ознак' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Тренд метрик/ })).toBeInTheDocument();
    expect(screen.getByText(/Версія: forecast-lite/)).toBeInTheDocument();
  });

  it('менеджер отримує відмову в доступі замість порожнього екрана', async () => {
    const user = userEvent.setup();
    // Прямий перехід за адресою: охоронець відправляє на вхід і запам'ятовує,
    // звідки прийшов користувач.
    renderApp('/analytics');

    const fillButtons = await screen.findAllByRole('button', { name: 'Заповнити' });
    await user.click(fillButtons[0] as HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Увійти' }));

    expect(await screen.findByText('Доступ обмежено')).toBeInTheDocument();
    expect(screen.getByText(/Розділ доступний лише для ролей: Аналітик, Адміністратор/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Аналітика' })).not.toBeInTheDocument();
  });
});

describe('Розділ «Користувачі» (адміністратор)', () => {
  it('показує таблицю користувачів і дозволяє змінити роль', async () => {
    const user = userEvent.setup();
    await signIn(user, 2);

    await user.click(screen.getByRole('link', { name: 'Користувачі' }));

    const table = await screen.findByRole('table', {}, { timeout: LAZY_TIMEOUT });
    const rows = within(table).getAllByRole('row');
    // Шапка + 8 демонстраційних користувачів.
    expect(rows).toHaveLength(9);

    const firstRow = rows[1] as HTMLElement;
    const roleSelect = within(firstRow).getByRole('combobox');
    await user.selectOptions(roleSelect, 'analyst');

    const saveButton = within(firstRow).getByRole('button', { name: 'Зберегти' });
    expect(saveButton).toBeEnabled();
    await user.click(saveButton);

    await waitFor(() =>
      expect(within(firstRow).getByRole('status')).toHaveTextContent('Роль користувача'),
    );
    expect(roleSelect).toHaveValue('analyst');
  });

  it('менеджер не має доступу до керування користувачами', async () => {
    const user = userEvent.setup();
    expect(renderApp('/admin/users')).toBeDefined();

    const fillButtons = await screen.findAllByRole('button', { name: 'Заповнити' });
    await user.click(fillButtons[0] as HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Увійти' }));

    expect(await screen.findByText('Доступ обмежено')).toBeInTheDocument();
    expect(screen.getByText(/лише для ролей: Адміністратор/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Користувачі' })).not.toBeInTheDocument();
  });
});
