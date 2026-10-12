import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckModePanel } from '@/components/CheckModePanel';
import { CHECK_MODE_STORAGE_KEY, DEFAULT_CHECK_MODE, readCheckMode } from '@/lib/checkMode';
import { renderWithProviders } from '../render';

/**
 * Панель «Режим перевірки»: саме нею перемикаються обов'язкові стани
 * інтерфейсу, і саме вона зберігає вибір у localStorage.
 */
describe('CheckModePanel', () => {
  it('спочатку згорнута й нічого не зберігає', () => {
    renderWithProviders(<CheckModePanel />);

    expect(screen.getByRole('button', { name: 'Режим перевірки' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('розгортається у панель із керуванням станами всіх екранів', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CheckModePanel />);

    await user.click(screen.getByRole('button', { name: 'Режим перевірки' }));

    const panel = screen.getByRole('complementary', { name: 'Режим перевірки' });
    expect(panel).toBeInTheDocument();
    expect(screen.getByLabelText('Список замовлень')).toBeInTheDocument();
    expect(screen.getByLabelText('Картка замовлення')).toBeInTheDocument();
    expect(screen.getByLabelText('Аналітика')).toBeInTheDocument();
    expect(screen.getByLabelText('Користувачі')).toBeInTheDocument();
    expect(screen.getByLabelText('Перерахунок прогнозу')).toBeInTheDocument();
    expect(screen.getByLabelText('Затримка відповіді, мс')).toBeInTheDocument();
    expect(screen.getByLabelText(/Імітувати відсутність мережі/)).toBeInTheDocument();
  });

  it('зберігає вибраний стан у localStorage', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CheckModePanel />);

    await user.click(screen.getByRole('button', { name: 'Режим перевірки' }));
    await user.selectOptions(screen.getByLabelText('Список замовлень'), 'empty');

    await waitFor(() => expect(readCheckMode().orders).toBe('empty'));
    const raw = localStorage.getItem(CHECK_MODE_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? '{}')).toMatchObject({ orders: 'empty' });
  });

  it('перемикає режим обриву мережі', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CheckModePanel />);

    await user.click(screen.getByRole('button', { name: 'Режим перевірки' }));
    await user.click(screen.getByLabelText(/Імітувати відсутність мережі/));

    await waitFor(() => expect(readCheckMode().networkDown).toBe(true));
  });

  it('скидає налаштування до типових', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CheckModePanel />);

    await user.click(screen.getByRole('button', { name: 'Режим перевірки' }));
    await user.selectOptions(screen.getByLabelText('Аналітика'), 'error');
    await waitFor(() => expect(readCheckMode().analytics).toBe('error'));

    await user.click(screen.getByRole('button', { name: 'Скинути' }));

    await waitFor(() => expect(readCheckMode()).toEqual(DEFAULT_CHECK_MODE));
    expect(localStorage.getItem(CHECK_MODE_STORAGE_KEY)).toBeNull();
  });

  it('змінює затримку відповіді', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CheckModePanel />);

    await user.click(screen.getByRole('button', { name: 'Режим перевірки' }));
    const latency = screen.getByLabelText('Затримка відповіді, мс');
    await user.clear(latency);
    await user.type(latency, '1500');

    await waitFor(() => expect(readCheckMode().latencyMs).toBe(1500));
  });
});
