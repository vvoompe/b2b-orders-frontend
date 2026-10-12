import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { RecalculateButton } from '@/components/ui/RecalculateButton';

/**
 * Шість станів кнопки «Перерахувати прогноз» (Рисунок 2, Розділ 1):
 * idle -> hover -> active -> loading -> success | error.
 */
function getButton(): HTMLButtonElement {
  return screen.getByRole('button');
}

describe('RecalculateButton: стани взаємодії', () => {
  it('стан 1 (idle): кнопка доступна й підписана', () => {
    render(<RecalculateButton onRecalculate={vi.fn()} />);

    const button = getButton();
    expect(button).toHaveAttribute('data-state', 'idle');
    expect(button).toHaveAccessibleName('Перерахувати прогноз');
    expect(button).toBeEnabled();
  });

  it('стан 2 (hover): наведення курсора змінює стан без запиту', async () => {
    const onRecalculate = vi.fn();
    const user = userEvent.setup();
    render(<RecalculateButton onRecalculate={onRecalculate} />);

    await user.hover(getButton());
    expect(getButton()).toHaveAttribute('data-state', 'hover');
    expect(onRecalculate).not.toHaveBeenCalled();

    await user.unhover(getButton());
    expect(getButton()).toHaveAttribute('data-state', 'idle');
  });

  it('стан 3 (active): натиснута кнопка до завершення кліку', () => {
    render(<RecalculateButton onRecalculate={vi.fn()} />);

    fireEvent.mouseDown(getButton());
    expect(getButton()).toHaveAttribute('data-state', 'active');

    fireEvent.mouseUp(getButton());
    expect(getButton()).toHaveAttribute('data-state', 'hover');
  });
});

describe('RecalculateButton: стан loading', () => {
  it('стан 4 (loading): показує очікування, блокує кнопку й позначає aria-busy', async () => {
    let resolveRequest: (() => void) | undefined;
    const onRecalculate = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const user = userEvent.setup();

    render(<RecalculateButton onRecalculate={onRecalculate} />);
    await user.click(getButton());

    expect(getButton()).toHaveAttribute('data-state', 'loading');
    expect(getButton()).toHaveAttribute('aria-busy', 'true');
    expect(getButton()).toBeDisabled();
    expect(getButton()).toHaveTextContent('Перераховуємо…');
    expect(screen.getByRole('status')).toHaveTextContent('Триває перерахунок прогнозу');

    await act(async () => {
      resolveRequest?.();
    });
  });
});

describe('RecalculateButton: стан success', () => {
  it('стан 5 (success): підтверджує оновлення й ховає його через 2 секунди', async () => {
    const onRecalculate = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<RecalculateButton onRecalculate={onRecalculate} />);
    await user.click(getButton());

    await waitFor(() => expect(getButton()).toHaveAttribute('data-state', 'success'));
    expect(getButton()).toHaveTextContent('Прогноз оновлено');
    expect(screen.getByText('Прогноз оновлено на поточних даних.')).toBeInTheDocument();

    // Підтвердження прибирається автоматично - стан не «зависає».
    await waitFor(() => expect(getButton()).toHaveAttribute('data-state', 'idle'), {
      timeout: 3000,
    });
  }, 10_000);
});

describe('RecalculateButton: стан error', () => {
  it('стан 6 (error): повідомляє про збій і дозволяє повторити', async () => {
    const onRecalculate = vi
      .fn()
      .mockRejectedValueOnce(new Error('збій'))
      .mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    render(<RecalculateButton onRecalculate={onRecalculate} />);
    await user.click(getButton());

    await waitFor(() => expect(getButton()).toHaveAttribute('data-state', 'error'));
    expect(getButton()).toBeEnabled();
    expect(getButton()).toHaveTextContent('Повторити перерахунок');
    expect(screen.getByRole('alert')).toHaveTextContent('Не вдалося перерахувати прогноз');
    expect(screen.getByRole('status')).toHaveTextContent('Не вдалося перерахувати прогноз');

    // error -> loading: повторна спроба тим самим натисканням.
    await user.click(getButton());
    await waitFor(() => expect(getButton()).toHaveAttribute('data-state', 'success'));
    expect(onRecalculate).toHaveBeenCalledTimes(2);
  });
});

describe('RecalculateButton: захист від подвійного натискання', () => {
  it('два кліки в одному такті створюють лише один запит', async () => {
    const onRecalculate = vi.fn().mockResolvedValue(undefined);
    render(<RecalculateButton onRecalculate={onRecalculate} />);

    const button = getButton();
    act(() => {
      button.click();
      button.click();
    });

    expect(onRecalculate).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(getButton()).toHaveAttribute('data-state', 'success'));
  });

  it('під час завантаження кнопка заблокована для повторного кліку', async () => {
    let resolveRequest: (() => void) | undefined;
    const onRecalculate = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const user = userEvent.setup();

    render(<RecalculateButton onRecalculate={onRecalculate} />);
    await user.click(getButton());

    expect(getButton()).toBeDisabled();
    await user.click(getButton());
    expect(onRecalculate).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRequest?.();
      await Promise.resolve();
    });
  });

  it('зовнішня заборона блокує кнопку повністю', async () => {
    const onRecalculate = vi.fn();
    const user = userEvent.setup();

    render(<RecalculateButton onRecalculate={onRecalculate} disabled />);

    expect(getButton()).toBeDisabled();
    await user.click(getButton());
    expect(onRecalculate).not.toHaveBeenCalled();
  });
});
