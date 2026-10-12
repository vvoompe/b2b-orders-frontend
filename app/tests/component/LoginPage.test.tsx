import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/features/auth/LoginPage';
import { updateCheckMode } from '@/lib/checkMode';
import { renderWithProviders } from '../render';

function renderLogin() {
  return renderWithProviders(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/orders" element={<h1>Список замовлень</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage: клієнтська валідація', () => {
  it('підсвічує порожні поля й каже, яке саме поле винне', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: 'Увійти' }));

    expect(screen.getByText('Введіть email')).toBeInTheDocument();
    expect(screen.getByText('Введіть пароль')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email')).toHaveFocus();
  });

  it('перевіряє формат email', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'manager');
    await user.type(screen.getByLabelText('Пароль'), 'manager123');
    await user.click(screen.getByRole('button', { name: 'Увійти' }));

    expect(screen.getByText(/має містити символ @/)).toBeInTheDocument();
  });

  it('знімає помилку поля, щойно користувач почав його виправляти', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: 'Увійти' }));
    await user.type(screen.getByLabelText('Email'), 'm');

    expect(screen.queryByText('Введіть email')).not.toBeInTheDocument();
  });

  it('забороняє підказку про довжину пароля лише коли він занадто короткий', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'manager@demo.ua');
    await user.type(screen.getByLabelText('Пароль'), '123');
    await user.click(screen.getByRole('button', { name: 'Увійти' }));

    expect(screen.getByText(/щонайменше 6 символів/)).toBeInTheDocument();
  });
});

describe('LoginPage: серверна відмова', () => {
  it('показує однакове повідомлення без підказки, яке поле винне', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'manager@demo.ua');
    await user.type(screen.getByLabelText('Пароль'), 'неправильний');
    await user.click(screen.getByRole('button', { name: 'Увійти' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Невірний email або пароль');
    expect(alert.textContent).not.toContain('користувача не існує');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'false');
  });

  it('дозволяє заповнити демонстраційні облікові дані однією кнопкою', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getAllByRole('button', { name: 'Заповнити' })[0] as HTMLElement);

    expect(screen.getByLabelText('Email')).toHaveValue('manager@demo.ua');
    expect(screen.getByLabelText('Пароль')).toHaveValue('manager123');
  });

  it('показує стан завантаження під час запиту', async () => {
    // Свідомо збільшуємо затримку mock-API, щоб устигнути побачити стан loading.
    updateCheckMode({ latencyMs: 400 });
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getAllByRole('button', { name: 'Заповнити' })[0] as HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Увійти' }));

    expect(screen.getByRole('form', { name: 'Форма входу' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Входимо…' })).toBeDisabled();
    expect(await screen.findByRole('heading', { name: 'Список замовлень' })).toBeInTheDocument();
  });
});
