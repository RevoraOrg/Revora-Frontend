import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';
import * as reportErrorModule from '../../utils/reportError';

function ThrowingChild({ shouldThrow, message = 'Boom!' }: { shouldThrow: boolean; message?: string }) {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div data-testid="safe-child">Rendered safely</div>;
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('renders children normally when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('safe-child')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('catches render errors, shows the recovery panel, and logs via reportError', () => {
    const reportSpy = vi.spyOn(reportErrorModule, 'reportError');
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingChild shouldThrow={true} message="Render crash" />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Render crash')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();

    expect(reportSpy).toHaveBeenCalledTimes(1);
    expect(reportSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Render crash' }),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('shows fallback message when error has an empty message', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} message="" />
      </ErrorBoundary>,
    );

    expect(
      screen.getByText('An unexpected error occurred while rendering this page.'),
    ).toBeInTheDocument();
  });

  it('re-renders children when Retry is clicked', async () => {
    const user = userEvent.setup();
    let shouldThrow = true;

    function FlakyChild() {
      if (shouldThrow) {
        throw new Error('Temporary failure');
      }
      return <div data-testid="recovered-child">Recovered!</div>;
    }

    render(
      <ErrorBoundary>
        <FlakyChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();

    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('recovered-child')).toHaveTextContent('Recovered!');
  });

  it('resets error state when resetKey (location) changes', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/route-a">
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKey="/route-b">
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('safe-child')).toBeInTheDocument();
  });
});
