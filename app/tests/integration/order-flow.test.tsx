import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AppProviders } from '@/app/AppProviders';
import { OrdersPage } from '@/features/orders/OrdersPage';
import { updateCheckMode } from '@/lib/checkMode';
import { createTestQueryClient, renderApp } from '../render';

/**
 * Інтеграційні тести наскрізних потоків на mock-API (MSW):
 * логін -> список -> картка -> перерахунок прогнозу.
 */

/** Допоміжний компонент: показує поточний query-рядок, щоб перевіряти URL. */
function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.search}</p>;
}

async function signInAsManager(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  renderApp('/login');
  await user.click(screen.getAllByRole('button', { name: 'Заповнити' })[0] as HTMLElement);
  await user.click(screen.getByRole('button', { name: 'Увійти' }));
  await screen.findByRole('heading', { name: 'Замовлення' });
}

describe('Наскрізний потік: логін -> список -> картка -> перерахунок', () => {
  it('менеджер входить, відкриває замовлення й перераховує прогноз', async () => {
    const user = userEvent.setup();
    await signInAsManager(user);

    // Список: дані завантажено, менеджер підставився у шапці.
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Олена Гриценко')).toBeInTheDocument();
    expect(screen.getByText('Менеджер')).toBeInTheDocument();

    const orderLinks = screen.getAllByRole('link', { name: /^ЗМ-2026-/ });
    expect(orderLinks.length).toBeGreaterThan(0);

    // Картка замовлення.
    await user.click(orderLinks[0] as HTMLElement);
    const detailHeading = await screen.findByRole('heading', { name: /^Замовлення ЗМ-2026-/ });
    expect(detailHeading).toBeInTheDocument();

    // Перерахування прогнозу: кнопка проходить увесь шлях idle -> loading -> success.
    const recalculate = screen.getByRole('button', { name: 'Перерахувати прогноз' });
    expect(recalculate).toHaveAttribute('data-state', 'idle');

    await user.click(recalculate);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Прогноз оновлено/ })).toHaveAttribute(
        'data-state',
        'success',
      ),
    );

    // Історія змін поповнилася записом про ручний перерахунок.
    expect(screen.getByText(/ручний перерахунок/)).toBeInTheDocument();
  });
});

describe('Список замовлень: стани панелі', () => {
  it('показує помилку, а кнопка «Повторити» відновлює дані', async () => {
    const user = userEvent.setup();
    await signInAsManager(user);

    // Запит починає падати - стан error із кнопкою «Повторити».
    updateCheckMode({ orders: 'error' });
    await user.selectOptions(screen.getByLabelText('Статус'), 'won');
    await user.click(screen.getByRole('button', { name: 'Застосувати' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Список замовлень недоступний');

    // Проблема зникла - повторний запит повертає дані.
    updateCheckMode({ orders: 'auto' });
    await user.click(screen.getByRole('button', { name: 'Повторити' }));

    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('показує порожній результат із поясненням і порадою', async () => {
    const user = userEvent.setup();

    updateCheckMode({ orders: 'empty' });
    await signInAsManager(user);

    const empty = await screen.findByTestId('empty-state');
    expect(empty).toHaveTextContent('Замовлень поки немає');
    expect(empty).toHaveTextContent(/з’являться тут автоматично/);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('показує банер застарілих даних, коли оновлення не пройшло', async () => {
    const user = userEvent.setup();
    await signInAsManager(user);
    await screen.findByRole('table');

    // Дані вже на екрані, але зв'язок зникає: показуємо таблицю + банер.
    updateCheckMode({ networkDown: true });
    await user.selectOptions(screen.getByLabelText('Статус'), 'won');
    await user.click(screen.getByRole('button', { name: 'Застосувати' }));

    const banners = await screen.findAllByTestId('offline-banner');
    expect(banners.length).toBeGreaterThan(0);
    expect(banners[0]).toHaveTextContent(/можуть бути застарілими/);
  });
});

describe('Список замовлень: фільтри в URL', () => {
  it('зберігає застосовані фільтри в query-рядку та тримає їх після скидання', async () => {
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();

    render(
      <AppProviders client={queryClient}>
        <MemoryRouter initialEntries={['/orders']}>
          <OrdersPage />
          <LocationProbe />
        </MemoryRouter>
      </AppProviders>,
    );

    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe(''));

    await user.selectOptions(screen.getByLabelText('Статус'), 'won');
    await user.selectOptions(screen.getByLabelText('Сортування'), 'amount:desc');
    await user.click(screen.getByRole('button', { name: 'Застосувати' }));

    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toContain('status=won'),
    );
    expect(screen.getByTestId('location').textContent).toContain('sortBy=amount');

    // Скидання прибирає параметри з URL.
    await user.click(screen.getByRole('button', { name: 'Скинути' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe(''));
  });

  it('фільтрує показ замовлень відповідно до умов', async () => {
    const user = userEvent.setup();
    await signInAsManager(user);
    await screen.findByRole('table');

    await user.selectOptions(screen.getByLabelText('Статус'), 'won');
    await user.click(screen.getByRole('button', { name: 'Застосувати' }));

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1);
    });

    const table = screen.getByRole('table');
    expect(within(table).queryByText('Втрачено')).not.toBeInTheDocument();
  });
});
