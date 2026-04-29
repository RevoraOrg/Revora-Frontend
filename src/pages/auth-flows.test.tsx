import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Login } from './Login';
import { Signup } from './Signup';
import { ForgotPassword } from './ForgotPassword';

describe('Auth flow UX and recovery', () => {
  it('renders forgot password link near the password label on login', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(
      screen.getByText(/Need help signing in\?/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /forgot your password/i })).toHaveAttribute('href', '/forgot-password');
  });

  it('shows neutral forgot-password helper copy and a safe recovery return path', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/For security, we never confirm whether an email is registered\./i)
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email Address'), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(screen.getByText(/if an account exists for/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to sign in page/i })).toHaveAttribute('href', '/login');
  });

  it('covers signup persona selection -> form -> success, with sign-in recovery still available', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /startup founder/i }));

    // On form step, helper text should encourage recovery without dead ends
    expect(
      screen.getByText(/Already have credentials\?/i)
    ).toBeInTheDocument();

    // Ensure the form-step "Back" action is accessible and recoverable
    await user.click(screen.getByRole('button', { name: /^back$/i }));
    expect(screen.getByRole('heading', { name: /choose your account type/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^sign in$/i })).toHaveAttribute('href', '/login');

    // Exercise the other persona button handler for coverage
    await user.click(screen.getByRole('button', { name: /investor/i }));
    expect(
      screen.getByText(/Setting up your investor profile\./i)
    ).toBeInTheDocument();

    // Return to persona selection again so we can submit the startup flow
    await user.click(screen.getByRole('button', { name: /^back$/i }));
    expect(screen.getByRole('heading', { name: /choose your account type/i })).toBeInTheDocument();

    // Go to form step again for success coverage
    await user.click(screen.getByRole('button', { name: /startup founder/i }));

    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Full Name'), 'Alice Example');
    await user.type(screen.getByLabelText('Email Address'), 'alice@example.com');
    await user.type(screen.getByLabelText('Password'), 'Passw0rd!@#');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByRole('heading', { name: /check your inbox/i })).toBeInTheDocument();
    expect(screen.getByText(/we've sent a verification link to/i)).toBeInTheDocument();
    expect(screen.getByText(/alice@example\.com/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to persona selection/i }));
    expect(screen.getByRole('heading', { name: /choose your account type/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^sign in$/i })).toHaveAttribute('href', '/login');
  });

  it('submits login form for coverage without changing the UI', async () => {
    const user = userEvent.setup();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('Email Address'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'example-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
