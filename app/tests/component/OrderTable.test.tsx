import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import type { OrderSortBy, OrderSortDir } from '@/api/types';
import { OrderTable } from '@/features/orders/OrderTable';
import { makeOrders } from '../fixtures';

function renderTable(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const DEFAULT_PROPS = {
  state: 'success' as const,
  orders: makeOrders(),
  sortBy: 'createdAt' as OrderSortBy,
  sortDir: 'desc' as OrderSortDir,
  onSortChange: vi.fn(),
  onRetry: vi.fn(),
};

describe('OrderTable: стан loading', () => {
  it('показує скелетон замість порожнього екрана', () => {
    renderTable(<OrderTable {...DEFAULT_PROPS} state="loading" />);

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    expect(screen.getByText('Завантажуємо дані…')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('позначає контейнер як зайнятий для скрінрідера', () => {
    renderTable(<OrderTable {...DEFAULT_PROPS} state="loading" />);
    expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-busy', 'true');
  });
});

describe('OrderTable: стан success', () => {
  it('рендерить рядки замовлень із номером, клієнтом і сумою', () => {
    renderTable(<OrderTable {...DEFAULT_PROPS} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(DEFAULT_PROPS.orders.length + 1);
    expect(screen.getByRole('link', { name: 'ЗМ-2026-0001' })).toHaveAttribute(
      'href',
      '/orders/ord-1',
    );
    expect(screen.getByText(/900 000,00/)).toBeInTheDocument();
  });

  it('показує прогноз у відсотках для кожного замовлення', () => {
    renderTable(<OrderTable {...DEFAULT_PROPS} />);
    expect(screen.getAllByRole('progressbar')).toHaveLength(DEFAULT_PROPS.orders.length);
  });

  it('позначає активне сортування через aria-sort', () => {
    renderTable(<OrderTable {...DEFAULT_PROPS} sortBy="amount" sortDir="asc" />);

    const amountHeader = screen.getByRole('columnheader', { name: /Сума/ });
    const createdHeader = screen.getByRole('columnheader', { name: /Створено/ });

    expect(amountHeader).toHaveAttribute('aria-sort', 'ascending');
    expect(createdHeader).toHaveAttribute('aria-sort', 'none');
  });

  it('змінює напрямок сортування при повторному натисканні', async () => {
    const onSortChange = vi.fn();
    const user = userEvent.setup();

    renderTable(
      <OrderTable
        {...DEFAULT_PROPS}
        orders={makeOrders()}
        sortBy="amount"
        sortDir="asc"
        onSortChange={onSortChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Сума/ }));
    expect(onSortChange).toHaveBeenCalledWith('amount', 'desc');
  });

  it('перемикає колонку сортування з типовим напрямком', async () => {
    const onSortChange = vi.fn();
    const user = userEvent.setup();

    renderTable(<OrderTable {...DEFAULT_PROPS} sortBy="createdAt" onSortChange={onSortChange} />);

    await user.click(screen.getByRole('button', { name: /Сума/ }));
    expect(onSortChange).toHaveBeenCalledWith('amount', 'desc');
  });
});

describe('OrderTable: стан empty', () => {
  it('пояснює порожній результат без фільтрів', () => {
    renderTable(<OrderTable {...DEFAULT_PROPS} state="empty" orders={[]} />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('Замовлень поки немає')).toBeInTheDocument();
    expect(screen.getByText(/з’являться тут автоматично/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('пояснює порожній результат через фільтри й пропонує їх скинути', async () => {
    const onResetFilters = vi.fn();
    const user = userEvent.setup();

    renderTable(
      <OrderTable
        {...DEFAULT_PROPS}
        state="empty"
        orders={[]}
        hasFilters
        onResetFilters={onResetFilters}
      />,
    );

    expect(screen.getByText('За вибраними умовами замовлень не знайдено')).toBeInTheDocument();
    expect(screen.getByText(/розширити період/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Скинути фільтри' }));
    expect(onResetFilters).toHaveBeenCalledTimes(1);
  });
});

describe('OrderTable: стан error', () => {
  it('показує повідомлення і кнопку «Повторити»', () => {
    renderTable(
      <OrderTable {...DEFAULT_PROPS} state="error" orders={[]} errorMessage="Сервер не відповів" />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Список замовлень недоступний');
    expect(alert).toHaveTextContent('Сервер не відповів');
    expect(screen.getByRole('button', { name: 'Повторити' })).toBeInTheDocument();
  });

  it('викликає повторний запит при натисканні «Повторити»', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();

    renderTable(<OrderTable {...DEFAULT_PROPS} state="error" orders={[]} onRetry={onRetry} />);
    await user.click(screen.getByRole('button', { name: 'Повторити' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
