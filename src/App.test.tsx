import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, type AuthUser } from './components/AuthProvider';
import { DensityProvider } from './components/DensityProvider';
import { RecentNetworksProvider } from './components/RecentNetworksProvider';
import { ThemeProvider } from './components/ThemeProvider';
import { WalletConnectionProvider } from './components/WalletConnection/WalletConnectionContext';
import { routes } from './App';
import { I18nProvider } from './i18n/I18nProvider';

vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn().mockResolvedValue(false),
  requestAccess: vi.fn().mockResolvedValue({ address: '', error: undefined }),
  getAddress: vi.fn().mockResolvedValue({ address: '', error: undefined }),
  getNetworkDetails: vi.fn().mockResolvedValue({
    network: 'TESTNET',
    networkPassphrase: 'Test SDF Network ; September 2015',
    error: undefined,
  }),
}));

vi.mock('./lib/soroban/revoraContract', () => ({
  getContractSummary: vi.fn().mockResolvedValue({
    periodCount: 0,
    authorizedOfferingsCount: 0,
  }),
}));

vi.mock('./pages/Login', () => ({ Login: () => null }));
vi.mock('./pages/AdminCompliancePage', () => ({
  AdminCompliancePage: () => <h1>Compliance workflow</h1>,
}));

const ADMIN: AuthUser = { id: 'admin@revora.test', role: 'admin' };
const INVESTOR: AuthUser = { id: 'investor@revora.test', role: 'investor' };

function withProviders(ui: ReactElement, user: AuthUser | null = null) {
  return (
    <I18nProvider>
      <AuthProvider initialUser={user}>
        <ThemeProvider>
          <DensityProvider>
            <RecentNetworksProvider>
              <WalletConnectionProvider>{ui}</WalletConnectionProvider>
            </RecentNetworksProvider>
          </DensityProvider>
        </ThemeProvider>
      </AuthProvider>
    </I18nProvider>
  );
}

function renderAtPath(path: string, user: AuthUser | null = null) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return {
    ...render(withProviders(<RouterProvider router={router} />, user)),
    router,
  };
}

describe('admin compliance route', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('renders the workflow at /admin/compliance for admins', async () => {
    const { router } = renderAtPath('/admin/compliance', ADMIN);

    expect(await screen.findByRole('heading', { level: 1, name: /compliance workflow/i })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/compliance');
  });

  it('links to the workflow from the admin home section', () => {
    renderAtPath('/', ADMIN);

    expect(screen.getByRole('link', { name: 'Compliance workflow' })).toHaveAttribute(
      'href',
      '/admin/compliance',
    );
  });

  it('redirects unauthenticated visitors to login', async () => {
    const { router } = renderAtPath('/admin/compliance');

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('keeps the workflow restricted to admins', async () => {
    const { router } = renderAtPath('/admin/compliance', INVESTOR);

    await waitFor(() => expect(router.state.location.pathname).toBe('/investor/portal'));
    expect(screen.queryByRole('heading', { name: /compliance workflow/i })).not.toBeInTheDocument();
  });
});
