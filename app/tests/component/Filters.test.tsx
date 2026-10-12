import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import type { Customer } from '@/api/types';
import { Filters } from '@/features/orders/Filters';
import { DEFAULT_ORDER_FILTERS, type OrderFilters } from '@/lib/queryParams';

const CUSTOMERS: readonly Customer[] = [
  { id: 'cst-01', name: 'ТОВ «Агротерра»', industry: 'Агро', tier: 1 },
  { id: 'cst-02', name: 'ПрАТ «Метал Інвест»', industry: 'Металлургія', tier: 1 },
];

function renderFilters(value: Partial<OrderFilters> = {}, isBusy = false) {
  const onApply = vi.fn();
  const onReset = vi.fn();

  const view = render(
    <Filters
      value={{ ...DEFAULT_ORDER_FILTERS, ...value }}
      customers={CUSTOMERS}
      isBusy={isBusy}
      onApply={onApply}
      onReset={onReset}
    />,
  );

  return { ...view, onApply, onReset };
}

describe('Filters: розмітка й доступність', () => {
  it('має підписані поля й кнопки', () => {
    renderFilters();

    expect(screen.getByRole('form', { name: 'Фільтри списку замовлень' })).toBeInTheDocument();
    expect(screen.getByLabelText('Період з')).toBeInTheDocument();
    expect(screen.getByLabelText('Період до')).toBeInTheDocument();
    expect(screen.getByLabelText('Клієнт')).toBeInTheDocument();
    expect(screen.getByLabelText('Статус')).toBeInTheDocument();
    expect(screen.getByLabelText('Сортування')).toBeInTheDocument();
    expect(screen.getByLabelText('Мінімальна сума')).toBeInTheDocument();
    expect(screen.getByLabelText('Максимальна сума')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Застосувати' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Скинути' })).toBeInTheDocument();
  });

  it('містить усіх клієнтів у списку', () => {
    renderFilters();
    expect(screen.getByRole('option', { name: 'ТОВ «Агротерра»' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'ПрАТ «Метал Інвест»' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Усі клієнти' })).toBeInTheDocument();
  });

  it('позначає форму як зайняту під час запиту', () => {
    renderFilters({}, true);
    expect(screen.getByRole('form', { name: 'Фільтри списку замовлень' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });
});

describe('Filters: застосування', () => {
  it('передає змінені умови разом із першою сторінкою', async () => {
    const user = userEvent.setup();
    const { onApply } = renderFilters({ page: 5 });

    await user.selectOptions(screen.getByLabelText('Клієнт'), 'cst-02');
    await user.selectOptions(screen.getByLabelText('Статус'), 'won');
    await user.type(screen.getByLabelText('Мінімальна сума'), '100000');
    await user.click(screen.getByRole('button', { name: 'Застосувати' }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cst-02',
        status: 'won',
        amountMin: '100000',
        page: 1,
      }),
    );
  });

  it('передає вибраний період', async () => {
    const { onApply } = renderFilters();

    fireEvent.change(screen.getByLabelText('Період з'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Період до'), { target: { value: '2026-06-30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Застосувати' }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ dateFrom: '2026-01-01', dateTo: '2026-06-30' }),
    );
  });

  it('передає вибране сортування', async () => {
    const user = userEvent.setup();
    const { onApply } = renderFilters();

    await user.selectOptions(screen.getByLabelText('Сортування'), 'amount:asc');
    await user.click(screen.getByRole('button', { name: 'Застосувати' }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'amount', sortDir: 'asc' }),
    );
  });

  it('не викликає застосування, поки форму не підтверджено', async () => {
    const user = userEvent.setup();
    const { onApply } = renderFilters();

    await user.selectOptions(screen.getByLabelText('Статус'), 'lost');
    expect(onApply).not.toHaveBeenCalled();
  });
});

describe('Filters: скидання', () => {
  it('очищає поля й повідомляє батьківський компонент', async () => {
    const user = userEvent.setup();
    const { onReset } = renderFilters({
      customerId: 'cst-01',
      status: 'won',
      amountMin: '50000',
      page: 3,
    });

    await user.click(screen.getByRole('button', { name: 'Скинути' }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Клієнт')).toHaveValue('');
    expect(screen.getByLabelText('Статус')).toHaveValue('');
    expect(screen.getByLabelText('Мінімальна сума')).toHaveValue(null);
  });

  it('після скидання застосовує типові фільтри', async () => {
    const user = userEvent.setup();
    const { onApply } = renderFilters({ status: 'won' });

    await user.click(screen.getByRole('button', { name: 'Скинути' }));
    await user.click(screen.getByRole('button', { name: 'Застосувати' }));

    expect(onApply).toHaveBeenCalledWith(DEFAULT_ORDER_FILTERS);
  });
});

describe('Filters: синхронізація з URL', () => {
  it('показує значення, передані ззовні', () => {
    renderFilters({ customerId: 'cst-02', status: 'at_risk' });

    expect(screen.getByLabelText('Клієнт')).toHaveValue('cst-02');
    expect(screen.getByLabelText('Статус')).toHaveValue('at_risk');
  });

  it('оновлює чернетку, коли фільтри змінилися ззовні (наприклад, кнопкою «Назад»)', () => {
    const { rerender } = render(
      <Filters
        value={DEFAULT_ORDER_FILTERS}
        customers={CUSTOMERS}
        onApply={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    rerender(
      <Filters
        value={{ ...DEFAULT_ORDER_FILTERS, status: 'won' }}
        customers={CUSTOMERS}
        onApply={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Статус')).toHaveValue('won');
  });

  it('показує кількість активних фільтрів', () => {
    renderFilters({ status: 'won', amountMin: '1000' });
    expect(screen.getByRole('status')).toHaveTextContent('Застосовано фільтрів: 2');
  });

  it('без фільтрів пояснює, що показано всі замовлення', () => {
    renderFilters();
    expect(screen.getByRole('status')).toHaveTextContent('Фільтри не застосовано');
  });
});
