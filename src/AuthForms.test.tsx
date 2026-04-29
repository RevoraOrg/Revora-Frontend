import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';

describe('Login Form Interactions', () => {
  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Click to show password
    const toggleButton = screen.getByLabelText(/show password/i);
    await user.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText(/hide password/i)).toBeInTheDocument();

    // Click to hide password
    const toggleButtonHide = screen.getByLabelText(/hide password/i);
    await user.click(toggleButtonHide);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('displays error states correctly', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'test@example.com');
    
    const passwordInput = screen.getByLabelText('Password');
    await user.type(passwordInput, 'wrongpass');

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitBtn);

    // Mock failure triggers invalid email or password
    const errorMessage = await screen.findByText(/invalid email or password/i);
    expect(errorMessage).toBeInTheDocument();
    
    // Check aria attributes
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAttribute('aria-describedby', 'login-error');
  });
});

describe('Signup Form Validation', () => {
  it('displays inline field validation errors', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    // Select persona to reach the form
    const startupBtn = screen.getByText(/startup founder/i);
    await user.click(startupBtn);

    const submitBtn = screen.getByRole('button', { name: /create account/i });
    await user.click(submitBtn);

    // Validation should catch empty name, invalid email, short password
    expect(await screen.findByText(/full name is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/please enter a valid email address/i)).toBeInTheDocument();
    expect(await screen.findByText(/password must be at least 12 characters long/i)).toBeInTheDocument();
    
    // ARIA attributes check
    const nameInput = screen.getByLabelText(/full name/i);
    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    expect(nameInput).toHaveAttribute('aria-describedby', 'name-error');
  });
});
