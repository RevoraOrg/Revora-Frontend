import { WalletConnectionProvider } from '../components/WalletConnection/WalletConnectionContext';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, readStoredAuthSession } from '../components/AuthProvider';
import { Login } from './Login';
import { I18nProvider } from '../i18n/I18nProvider';

const renderLogin = () => {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <WalletConnectionProvider><Login /></WalletConnectionProvider>
      </I18nProvider>
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


function Landing() {
  const loc = useLocation();
  return <div data-testid="landing">{`${loc.pathname}${loc.search}`}</div>;
}

const renderLoginFlow = (entry = '/login', withProvider = true) => {
  const tree = (
    <MemoryRouter initialEntries={[entry]}>
      <WalletConnectionProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Landing />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </WalletConnectionProvider>
    </MemoryRouter>
  );
  return render(withProvider ? <AuthProvider>{tree}</AuthProvider> : tree);
};

async function signInAs(email: string, role?: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email Address'), email);
  await user.type(screen.getByLabelText('Password'), 'password123');
  if (role) await user.selectOptions(screen.getByLabelText('Account Role'), role);
  await user.click(screen.getByRole('button', { name: 'Sign In' }));
}

describe('Login auth wiring', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('offers the three roles', () => {
    renderLoginFlow();
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Startup', 'Investor', 'Admin']);
  });

  it('does not sign in or navigate when the email is invalid', async () => {
    renderLoginFlow();
    await signInAs('invalid');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(readStoredAuthSession()).toBeNull();
    expect(screen.queryByTestId('landing')).not.toBeInTheDocument();
  });

  it.each([
    ['startup', '/startup/dashboard'],
    ['investor', '/investor/portal'],
    ['admin', '/admin/alerts'],
  ])('signing in as %s stores the role and lands on %s', async (role, landing) => {
    renderLoginFlow();
    await signInAs('Person@Revora.test', role);

    expect(await screen.findByTestId('landing', {}, { timeout: 4000 })).toHaveTextContent(landing);
    expect(readStoredAuthSession()).toEqual({ id: 'person@revora.test', role });
  });

  it('returns to the originally requested page via ?next=', async () => {
    renderLoginFlow(`/login?next=${encodeURIComponent('/admin/alerts?tab=2')}`);
    await signInAs('boss@revora.test');

    expect(await screen.findByTestId('landing', {}, { timeout: 4000 })).toHaveTextContent(
      '/admin/alerts?tab=2',
    );
    expect(readStoredAuthSession()?.role).toBe('admin');
  });

  it('preselects the role implied by next', () => {
    renderLoginFlow(`/login?next=${encodeURIComponent('/investor/portfolio')}`);
    expect(screen.getByLabelText('Account Role')).toHaveValue('investor');
  });

  it('an explicit role choice beats the role implied by next, and the cross-role next is dropped', async () => {
    renderLoginFlow(`/login?next=${encodeURIComponent('/admin/alerts')}`);
    await signInAs('x@revora.test', 'investor');

    expect(await screen.findByTestId('landing', {}, { timeout: 4000 })).toHaveTextContent(
      '/investor/portal',
    );
    expect(readStoredAuthSession()?.role).toBe('investor');
  });

  it('ignores an open-redirect next value', async () => {
    renderLoginFlow(`/login?next=${encodeURIComponent('https://evil.test/x')}`);
    await signInAs('x@revora.test', 'startup');

    expect(await screen.findByTestId('landing', {}, { timeout: 4000 })).toHaveTextContent(
      '/startup/dashboard',
    );
  });

  it('infers the role from the email when no role is chosen and next is absent', async () => {
    renderLoginFlow();
    await signInAs('admin@revora.test');
    expect(await screen.findByTestId('landing', {}, { timeout: 4000 })).toHaveTextContent('/admin/alerts');
  });

  it('still persists the session when rendered without an AuthProvider', async () => {
    renderLoginFlow('/login', false);
    await signInAs('solo@revora.test', 'investor');
    expect(await screen.findByTestId('landing', {}, { timeout: 4000 })).toHaveTextContent('/investor/portal');
    expect(readStoredAuthSession()).toEqual({ id: 'solo@revora.test', role: 'investor' });
  });

  it('carries next over to the sign-up link', () => {
    renderLoginFlow(`/login?next=${encodeURIComponent('/admin/alerts')}`);
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      `/signup?next=${encodeURIComponent('/admin/alerts')}`,
    );
  });
});
