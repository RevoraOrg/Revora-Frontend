import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { TwoFactorRecoveryPage } from './TwoFactorRecoveryPage';
import { ApiError } from '../lib/api/errors';
import { configureMockAdapter, resetMockAdapter } from '../lib/api/mockAdapter';

const renderPage = () =>
  render(
    <MemoryRouter>
      <TwoFactorRecoveryPage />
    </MemoryRouter>
  );

describe('TwoFactorRecoveryPage', () => {
  afterEach(() => {
    resetMockAdapter();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('shows an explicit demo banner and enables the demo verifier when DEV is true', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_DEMO_MODE', '');

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent(/demo mode active/i);
    expect(
      screen.queryByText(/two-factor recovery is currently unavailable/i)
    ).not.toBeInTheDocument();

    // Advance through the email step and verify the demo code works.
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send recovery code/i }));

    await waitFor(
      () => {
        expect(
          screen.getByRole('textbox', { name: /recovery code/i })
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    fireEvent.change(screen.getByRole('textbox', { name: /recovery code/i }), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(
      () => {
        expect(
          screen.getByRole('heading', { name: /recovery successful/i })
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('shows an unavailable message and hides the demo flow in non-demo mode', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_DEMO_MODE', '');

    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent(
      /two-factor recovery is currently unavailable/i
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /back to sign in page/i })
    ).toBeInTheDocument();
  });

  it('enables the demo flow when VITE_DEMO_MODE is "true" outside DEV', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_DEMO_MODE', 'true');

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent(/demo mode active/i);
    expect(
      screen.queryByText(/two-factor recovery is currently unavailable/i)
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('surfaces ApiError through FormError when the mock adapter fails', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_DEMO_MODE', '');
    configureMockAdapter({
      latencyMs: 0,
      failNext: new ApiError({
        code: 'SERVER_ERROR',
        message: 'Recovery service temporarily unavailable.',
        status: 503,
        retryable: true,
      }),
    });

    renderPage();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send recovery code/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /recovery service temporarily unavailable/i
      );
    });
  });
});
