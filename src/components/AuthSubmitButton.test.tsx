import { render, screen } from '@testing-library/react';
import { AuthSubmitButton } from './AuthSubmitButton';

describe('AuthSubmitButton', () => {
  it('renders the idle submit label', () => {
    render(
      <AuthSubmitButton
        idleLabel="Sign In"
        loadingLabel="Signing in..."
        successLabel="Signed in"
      />,
    );

    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
  });

  it('announces loading text and prevents double submission', () => {
    render(
      <AuthSubmitButton
        state="loading"
        idleLabel="Sign In"
        loadingLabel="Signing in..."
        successLabel="Signed in"
      />,
    );

    const button = screen.getByRole('button', { name: 'Signing in...' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('shows the success label while keeping the button disabled', () => {
    render(
      <AuthSubmitButton
        state="success"
        idleLabel="Create Account"
        loadingLabel="Creating account..."
        successLabel="Account created"
      />,
    );

    expect(screen.getByRole('button', { name: 'Account created' })).toBeDisabled();
  });
});
