import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RouteErrorBoundary } from './RouteErrorBoundary';

function Thrower({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Boom from route');
  }
  return <div>Recovered content</div>;
}

describe('RouteErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the recovery UI on render error and recovers when Retry is clicked', async () => {
    const user = userEvent.setup();
    let shouldThrow = true;

    function DynamicChild() {
      return <Thrower shouldThrow={shouldThrow} />;
    }

    render(
      <RouteErrorBoundary resetKey="/crash">
        <DynamicChild />
      </RouteErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Boom from route')).toBeInTheDocument();

    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(screen.getByText('Recovered content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('resets automatically when resetKey changes (route change)', () => {
    const { rerender } = render(
      <RouteErrorBoundary resetKey="/route-a">
        <Thrower shouldThrow={true} />
      </RouteErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(
      <RouteErrorBoundary resetKey="/route-b">
        <Thrower shouldThrow={false} />
      </RouteErrorBoundary>,
    );

    expect(screen.getByText('Recovered content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('opens and closes ErrorRecoveryPanel from the fallback UI', async () => {
    const user = userEvent.setup();

    render(
      <RouteErrorBoundary resetKey="/crash">
        <Thrower shouldThrow={true} />
      </RouteErrorBoundary>,
    );

    await user.click(screen.getByRole('button', { name: /recovery snapshots/i }));
    expect(screen.getByTestId('error-panel')).toBeInTheDocument();

    await user.click(screen.getByTestId('error-panel-close-btn'));
    expect(screen.queryByTestId('error-panel')).not.toBeInTheDocument();
  });
});
