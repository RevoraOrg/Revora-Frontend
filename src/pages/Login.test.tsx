import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Login } from './Login';

const renderLogin = () => {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
};

describe('Login', () => {
  it('renders the sign-in form', () => {
    renderLogin();

    expect(screen.getByText('Welcome to Revora')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('shows error for invalid email on submit', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Email Address'), 'invalid');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid email address.');
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    const submitBtn = screen.getByRole('button', { name: 'Sign In' });
    expect(submitBtn).toHaveAttribute('aria-busy', 'true');
    expect(submitBtn).toBeDisabled();
  });

  it('shows success state after loading completes', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    const successBtn = await screen.findByRole('button', { name: 'Signed In!' }, { timeout: 3000 });
    expect(successBtn).toBeDisabled();
  });

  it('disables inputs during submission', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.getByLabelText('Email Address')).toBeDisabled();
    expect(screen.getByLabelText('Password')).toBeDisabled();
  });

  it('has accessible email input', () => {
    renderLogin();

    const emailInput = screen.getByLabelText('Email Address');
    expect(emailInput).toHaveAttribute('aria-required', 'true');
  });

  it('has accessible password input', () => {
    renderLogin();

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('aria-required', 'true');
  });

  it('renders forgot password link', () => {
    renderLogin();

    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
  });

  it('renders signup link', () => {
    renderLogin();

    expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
  });
});
