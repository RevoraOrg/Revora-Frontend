import { WalletConnectionProvider } from '../components/WalletConnection/WalletConnectionContext';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, readStoredAuthSession } from '../components/AuthProvider';
import { Signup } from './Signup';
import { I18nProvider } from '../i18n/I18nProvider';

const renderSignup = () => {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <WalletConnectionProvider><Signup /></WalletConnectionProvider>
      </I18nProvider>
    </MemoryRouter>
  );
};

describe('Signup', () => {
  it('renders persona selection step initially', () => {
    renderSignup();

    expect(screen.getByText('Choose your account type')).toBeInTheDocument();
    expect(screen.getByText('Startup Founder')).toBeInTheDocument();
    expect(screen.getByText('Investor')).toBeInTheDocument();
  });

  it('proceeds to form step after selecting a persona', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByText('Startup Founder'));

    expect(screen.getByText('Create your account')).toBeInTheDocument();
  });

  it('renders password strength meter in form step', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByText('Startup Founder'));

    expect(screen.getByText('At least 12 characters')).toBeInTheDocument();
  });

  it('updates rule states as user types password', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByText('Startup Founder'));

    const passwordInput = screen.getByLabelText('Password');
    await user.type(passwordInput, 'Abcdef1!@#$%');

    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('shows error on submit with weak password', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByText('Startup Founder'));

    await user.type(screen.getByLabelText('Full Name'), 'Test User');
    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'weak');

    await user.click(screen.getByText('Create Account'));

    expect(screen.getByText('Password must meet all requirements below.')).toBeInTheDocument();
  });

  it('submits successfully with a strong password', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByText('Startup Founder'));

    await user.type(screen.getByLabelText('Full Name'), 'Test User');
    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'Abcdef1!@#$%');

    await user.click(screen.getByText('Create Account'));

    await screen.findByRole('heading', { level: 1, name: 'Check your inbox' }, { timeout: 3000 });
  });

  it('shows error alert when form has errors', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByText('Startup Founder'));

    await user.click(screen.getByText('Create Account'));

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows error for missing name on submit', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByText('Startup Founder'));

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'Abcdef1!@#$%');

    await user.click(screen.getByText('Create Account'));

    expect(screen.getByText('Full name is required')).toBeInTheDocument();
  });

  it('shows error for invalid email on submit', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByText('Startup Founder'));

    await user.type(screen.getByLabelText('Full Name'), 'Test User');
    await user.type(screen.getByLabelText('Email Address'), 'invalid');
    await user.type(screen.getByLabelText('Password'), 'Abcdef1!@#$%');

    await user.click(screen.getByText('Create Account'));

    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
  });

  it('allows going back to persona selection from form', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByText('Startup Founder'));

    await user.click(screen.getByText('Back'));

    expect(screen.getByText('Choose your account type')).toBeInTheDocument();
  });

  it('provides password visibility toggle', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByText('Startup Founder'));

    const toggleButton = screen.getByLabelText('Show password');
    await user.click(toggleButton);

    expect(screen.getByLabelText('Hide password')).toBeInTheDocument();
  });

  it('has accessible aria-describedby on password input', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByText('Startup Founder'));

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('aria-describedby', 'password-rules');
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByText('Startup Founder'));

    await user.type(screen.getByLabelText('Full Name'), 'Test User');
    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'Abcdef1!@#$%');

    await user.click(screen.getByText('Create Account'));

    const submitBtn = screen.getByRole('button', { name: 'Create Account' });
    expect(submitBtn).toHaveAttribute('aria-busy', 'true');
    expect(submitBtn).toBeDisabled();
  });

  it('disables inputs during submission', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByText('Startup Founder'));

    await user.type(screen.getByLabelText('Full Name'), 'Test User');
    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'Abcdef1!@#$%');

    await user.click(screen.getByText('Create Account'));

    expect(screen.getByLabelText('Full Name')).toBeDisabled();
    expect(screen.getByLabelText('Email Address')).toBeDisabled();
    expect(screen.getByLabelText('Password')).toBeDisabled();
  });
});


function Landing() {
  const loc = useLocation();
  return <div data-testid="landing">{`${loc.pathname}${loc.search}`}</div>;
}

const renderSignupFlow = (entry = '/signup', withProvider = true) => {
  const tree = (
    <MemoryRouter initialEntries={[entry]}>
      <WalletConnectionProvider>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </WalletConnectionProvider>
    </MemoryRouter>
  );
  return render(withProvider ? <AuthProvider>{tree}</AuthProvider> : tree);
};

async function completeSignup(persona: 'Startup Founder' | 'Investor') {
  const user = userEvent.setup();
  await user.click(screen.getByText(persona));
  await user.type(screen.getByLabelText('Full Name'), 'Test User');
  await user.type(screen.getByLabelText('Email Address'), 'New.User@Revora.test');
  await user.type(screen.getByLabelText('Password'), 'Abcdef1!@#$%');
  await user.click(screen.getByText('Create Account'));
}

describe('Signup auth wiring', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it.each([
    ['Startup Founder', 'startup', '/startup/dashboard'],
    ['Investor', 'investor', '/investor/portal'],
  ] as const)('signing up as %s sets the %s role and lands on %s', async (persona, role, landing) => {
    const user = userEvent.setup();
    renderSignupFlow();
    await completeSignup(persona);

    const continueLink = await screen.findByRole('link', { name: 'Continue to workspace' }, { timeout: 4000 });
    expect(readStoredAuthSession()).toEqual({ id: 'new.user@revora.test', role });
    await user.click(continueLink);
    expect(await screen.findByTestId('landing')).toHaveTextContent(landing);
  });

  it('does not create a session when validation fails', async () => {
    const user = userEvent.setup();
    renderSignupFlow();
    await user.click(screen.getByText('Startup Founder'));
    await user.click(screen.getByText('Create Account'));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(readStoredAuthSession()).toBeNull();
  });

  it('honors a same-role next param', async () => {
    const user = userEvent.setup();
    renderSignupFlow(`/signup?next=${encodeURIComponent('/investor/portfolio')}`);
    await completeSignup('Investor');

    const continueLink = await screen.findByRole('link', { name: 'Continue to workspace' }, { timeout: 4000 });
    await user.click(continueLink);
    expect(await screen.findByTestId('landing')).toHaveTextContent('/investor/portfolio');
  });

  it('drops a next param that targets another role area', async () => {
    const user = userEvent.setup();
    renderSignupFlow(`/signup?next=${encodeURIComponent('/admin/alerts')}`);
    await completeSignup('Startup Founder');

    const continueLink = await screen.findByRole('link', { name: 'Continue to workspace' }, { timeout: 4000 });
    expect(readStoredAuthSession()?.role).toBe('startup');
    await user.click(continueLink);
    expect(await screen.findByTestId('landing')).toHaveTextContent('/startup/dashboard');
  });

  it('persists the session when rendered without an AuthProvider', async () => {
    renderSignupFlow('/signup', false);
    await completeSignup('Investor');

    await waitFor(() =>
      expect(readStoredAuthSession()).toEqual({ id: 'new.user@revora.test', role: 'investor' }),
    );
  });

  it('carries next over to the sign-in links', async () => {
    const next = encodeURIComponent('/admin/alerts');
    const user = userEvent.setup();
    renderSignupFlow(`/signup?next=${next}`);

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', `/login?next=${next}`);
    await user.click(screen.getByText('Startup Founder'));
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', `/login?next=${next}`);
  });
});
