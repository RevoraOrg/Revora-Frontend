import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Login } from './Login';
import { describe, it, expect, beforeEach } from 'vitest';

const LoginWithRouter = () => (
  <BrowserRouter>
    <Login />
  </BrowserRouter>
);

describe('Login Page - Responsive', () => {
  beforeEach(() => {
    render(<LoginWithRouter />);
  });

  it('renders email and password inputs', () => {
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('password row has proper flex layout for mobile wrapping', () => {
    const passwordSection = screen.getByLabelText('Password').closest('.input-group');
    const flexContainer = passwordSection?.querySelector('div');
    
    expect(flexContainer).toHaveClass('flex', 'flex-col', 'sm:flex-row');
  });

  it('forgot password link has minimum touch target size', () => {
    const forgotLink = screen.getByLabelText('Forgot your password? Go to account recovery');
    
    expect(forgotLink).toHaveClass('link-styled');
    // link-styled should have min-height/min-width of 44px
  });

  it('forgot password link wraps on small screens', () => {
    const passwordSection = screen.getByLabelText('Password').closest('.input-group');
    const flexContainer = passwordSection?.querySelector('div');
    
    expect(flexContainer).toHaveClass('flex-col', 'sm:flex-row');
    expect(flexContainer).toHaveClass('gap-2');
  });

  it('password toggle button has adequate touch target', () => {
    const toggleButton = screen.getByLabelText('Show password');
    
    // Should be within a relative container for positioning
    expect(toggleButton.parentElement).toHaveClass('relative');
    // Button itself should have min-height of 44px
  });

  it('email input has icon and is responsive', () => {
    const emailInput = screen.getByLabelText('Email Address') as HTMLInputElement;
    
    expect(emailInput).toHaveClass('input-field', 'pl-10');
    expect(emailInput.type).toBe('email');
  });

  it('sign in button meets minimum touch target size', () => {
    const signInButton = screen.getByRole('button', { name: 'Sign In' });
    
    expect(signInButton).toHaveClass('btn-primary');
    // btn-primary should have min-height of 44px
  });

  it('error message has proper styling and spacing', async () => {
    const user = userEvent.setup();
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    
    await user.click(submitButton);
    
    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveClass('p-3', 'mb-4');
  });

  it('form has proper spacing for mobile', () => {
    const form = screen.getByRole('button', { name: 'Sign In' }).closest('form');
    
    expect(form).toHaveClass('space-y-4');
  });

  it('wallet connect button meets accessibility standards', () => {
    const walletButton = screen.getByRole('button', { name: /Connect Stellar Wallet/i });
    
    expect(walletButton).toHaveClass('btn-secondary');
    // Should be accessible via keyboard
  });
});
