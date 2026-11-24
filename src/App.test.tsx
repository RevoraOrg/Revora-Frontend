import type { ReactElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { App, routes } from './App';
import { WalletConnectionProvider } from "./components/WalletConnection/WalletConnectionContext";
import { I18nProvider } from "./i18n/I18nProvider";
import { COMMAND_GROUPS } from "./components/CommandPalette/commandPaletteData";

function withProviders(ui: ReactElement) {
  return (
    <I18nProvider>
      <WalletConnectionProvider>{ui}</WalletConnectionProvider>
    </I18nProvider>
import {
  AUTH_STORAGE_KEY,
  AuthProvider,
  type AuthUser,
} from "./components/AuthProvider";

const STARTUP: AuthUser = { id: 'founder@revora.test', role: 'startup' };
const INVESTOR: AuthUser = { id: 'investor@revora.test', role: 'investor' };
const ADMIN: AuthUser = { id: 'admin@revora.test', role: 'admin' };

function withProviders(ui: ReactElement, user: AuthUser | null = null) {
  return (
    <AuthProvider initialUser={user}>
      <WalletConnectionProvider>{ui}</WalletConnectionProvider>
    </AuthProvider>
import { ThemeProvider } from "./components/ThemeProvider";

function withProviders(ui: ReactElement) {
  return (
    <ThemeProvider>
      <WalletConnectionProvider>{ui}</WalletConnectionProvider>
    </ThemeProvider>
  );
}

function renderAtPath(path: string, user: AuthUser | null = null) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return {
    ...render(withProviders(<RouterProvider router={router} />)),
    router,
  };
}
import userEvent from '@testing-library/user-event';
import { beforeEach, vi } from 'vitest';
import { App, routes } from './App';
  const result = render(withProviders(<RouterProvider router={router} />, user));
  return { ...result, router };
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('App Components Accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'en-US';
    document.documentElement.dir = 'ltr';
  });

  it('renders standard links and buttons correctly', () => {
    renderAtPath("/");
    
    // Test that the 'Get started' and 'Sign In' links render and have href attributes
    const getStartedLink = screen.getByText('Get started');
    const signInLink = screen.getByText('Sign In');
    
    expect(getStartedLink).toBeInTheDocument();
    expect(getStartedLink.tagName.toLowerCase()).toBe('a');
    expect(signInLink).toBeInTheDocument();
    expect(signInLink.tagName.toLowerCase()).toBe('a'); 
  });

  it('renders the header correctly', () => {
    renderAtPath("/");
    const heading = screen.getByRole('heading', { name: /Revora on Stellar/i });
    expect(heading).toBeInTheDocument();
  });

  it('opens the command palette with Ctrl+K and exposes the shortcut on the header trigger', async () => {
    renderAtPath("/");

    const trigger = screen.getByRole('button', { name: /open command palette/i });
    expect(trigger).toHaveAttribute('aria-keyshortcuts', 'Control+k');
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(await screen.findByPlaceholderText('Search commands…')).toBeInTheDocument();
  });

  it('searches and navigates to the investor ledger', async () => {
    const { router } = renderAtPath("/");
    const user = userEvent.setup();

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const search = await screen.findByPlaceholderText('Search commands…');
    await user.type(search, 'ledger');
    await user.keyboard('{ArrowDown}{Enter}');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/investor/ledger');
    });
  });

  it('closes the palette with Escape and restores focus', async () => {
    renderAtPath("/");
    const user = userEvent.setup();
    const trigger = screen.getByRole('button', { name: /open command palette/i });
    trigger.focus();

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const search = await screen.findByPlaceholderText('Search commands…');
    await user.keyboard('{Escape}');

    expect(screen.queryByPlaceholderText('Search commands…')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('opens the shortcuts overlay with ? and restores focus after Escape', async () => {
    renderAtPath("/");
    const trigger = screen.getByRole('button', { name: /open command palette/i });
    trigger.focus();

    fireEvent.keyDown(window, { key: '?' });
    const dialog = await screen.findByRole('dialog', { name: 'Keyboard Shortcuts' });
    fireEvent.keyDown(dialog, { key: 'Escape' });

    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole('dialog', { name: 'Keyboard Shortcuts' })).not.toBeInTheDocument();
  });

  it('only exposes navigation commands for registered routes', () => {
    const routePaths = new Set(
      routes.flatMap((route) =>
        route.children?.map((child) => child.path).filter(
          (path): path is string => Boolean(path && path !== '*'),
        ) ?? [],
      ),
    );
    const navigationCommands = COMMAND_GROUPS.find((group) => group.key === 'navigate')?.items ?? [];

    expect(navigationCommands.length).toBeGreaterThan(0);
    for (const command of navigationCommands) {
      expect(command.description).toBeDefined();
      expect(routePaths.has(command.description ?? '')).toBe(true);
    }
  });

  it('switches the active locale and updates document direction', async () => {
    renderAtPath("/");
    const user = userEvent.setup();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'ar-SA');

    expect(await screen.findByRole('heading', { name: /ريفورا على Stellar/ })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ar-SA');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it.each([
    ["/login", "Welcome to Revora", null],
    ["/signup", "Choose your account type", null],
    ["/forgot-password", "Forgot Password?", null],
    ["/startup/dashboard", "Acme Corp Dashboard", STARTUP],
    ["/investor/portal", "Discover Offerings", INVESTOR],
  ])("renders the existing route %s", (path, heading, user) => {
    renderAtPath(path, user);
    ["/login", "Welcome to Revora"],
    ["/signup", "Choose your account type"],
    ["/forgot-password", "Forgot Password?"],
    ["/startup/dashboard", "Acme Corp Dashboard"],
    ["/investor/portal", "Discover Offerings"],
    ["/investor/compare", "Multi-Issuer Comparison"],
  ])("renders the existing route %s", (path, heading) => {
    renderAtPath(path);
    expect(
      screen.getByRole("heading", { name: heading }),
    ).toBeInTheDocument();
  });

  it('provides a skip-to-content link that moves focus to main', async () => {
    render(withProviders(<App />));
    const user = userEvent.setup();

    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    const main = screen.getByRole('main');

    await user.tab();
    expect(skipLink).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(main).toHaveFocus();
  });

  it('uses a single main landmark on each route', () => {
    render(withProviders(<App />));
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('does not throw if skip target is missing', async () => {
    render(withProviders(<App />));
    const user = userEvent.setup();

    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    const originalGetElementById = document.getElementById.bind(document);
    const getElementByIdSpy = vi.spyOn(document, 'getElementById').mockImplementation((id: string) => {
      if (id === 'main-content') return null;
      return originalGetElementById(id);
    });

    await user.click(skipLink);
    expect(skipLink).toBeInTheDocument();
    getElementByIdSpy.mockRestore();
  });

  it('enforces one h1 on the investor discovery route and keeps heading hierarchy', () => {
    window.history.pushState({}, '', '/investor/portal');
    render(withProviders(<App />, INVESTOR));

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: /discover offerings/i })).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 2, name: /offerings/i })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 }).length).toBeGreaterThan(0);
  });

  it('renders the startup dashboard route', () => {
    window.history.pushState({}, '', '/startup/dashboard');
    render(withProviders(<App />, STARTUP));
    expect(screen.getByRole('heading', { level: 1, name: /acme corp dashboard/i })).toBeInTheDocument();
  });

  it('renders the offering registration route with its document uploader', () => {
    window.history.pushState({}, '', '/startup/offering-registration');
    render(withProviders(<App />, STARTUP));
    expect(screen.getByRole('heading', { level: 1, name: /offering registration/i })).toBeInTheDocument();
    expect(screen.getByText('Upload KYC documents')).toBeInTheDocument();
  });

  it('sets aria-current="page" on the Investor nav link for /investor/portfolio', () => {
    renderAtPath('/investor/portfolio', INVESTOR);

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const activeLinks = nav.querySelectorAll('[aria-current]');

    expect(activeLinks).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Investor' })).toHaveAttribute('aria-current', 'page');
  });

  it.each([
    ['/startup/dashboard', 'Startup'],
    ['/investor/portfolio', 'Investor'],
    ['/admin/alerts', 'Admin'],
    ['/settings', 'Settings'],
    ['/settings/compliance', 'Settings'],
  ])('marks exactly one primary nav link as current on %s', (path, activeName) => {
    renderAtPath(path);
    ['/startup/dashboard', 'Startup', STARTUP],
    ['/investor/portfolio', 'Investor', INVESTOR],
    ['/admin/alerts', 'Admin', ADMIN],
  ])('marks exactly one primary nav link as current on %s', (path, activeName, user) => {
    renderAtPath(path, user);

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const activeLinks = nav.querySelectorAll('[aria-current="page"]');

    expect(activeLinks).toHaveLength(1);
    expect(screen.getByRole('link', { name: activeName })).toHaveAttribute('aria-current', 'page');
  });

  it('renders home section list items without literal bullet characters and preserves plain-text items', () => {
    renderAtPath('/');

    const lists = screen.getAllByRole('list');
    expect(lists.length).toBeGreaterThanOrEqual(3);

    const items = screen.getAllByRole('listitem');
    expect(items.length).toBeGreaterThan(0);

    for (const item of items) {
      expect(item.textContent).not.toContain('•');
    }

    const configureItem = screen.getByText('Configure RevenueShare offerings');
    expect(configureItem.tagName.toLowerCase()).toBe('li');
    expect(configureItem.querySelector('a')).toBeNull();

    const investItem = screen.getByText('Invest using USDC on Stellar');
    expect(investItem.tagName.toLowerCase()).toBe('li');
    expect(investItem.querySelector('a')).toBeNull();
  it.each(['/', '/startup/dashboard', '/investor/portal', '/settings/notifications'])(
    'renders the notification bell in the header on %s',
    (path) => {
      renderAtPath(path);
      expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    },
  );

  it('renders the notification preferences route', () => {
    renderAtPath('/settings/notifications');
    expect(screen.getByRole('heading', { name: 'Notification settings' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /notification preferences/i, level: 2 })).toBeInTheDocument();
  });
});

describe('Role-guarded routes', () => {
  it.each([
    ['/startup', '/startup'],
    ['/startup/dashboard', '/startup/dashboard'],
    ['/investor/portal', '/investor/portal'],
    ['/admin/alerts', '/admin/alerts'],
    ['/admin/scheduled-exports', '/admin/scheduled-exports'],
  ])('redirects an unauthenticated visit to %s to /login with next', (path, next) => {
    const { router } = renderAtPath(path);

    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent(next)}`);
    expect(screen.getByRole('heading', { name: 'Welcome to Revora' })).toBeInTheDocument();
  });

  it('keeps unauthenticated visits to public routes open', () => {
    const { router } = renderAtPath('/forgot-password');
    expect(router.state.location.pathname).toBe('/forgot-password');
  });

  it('lets an admin open /admin/alerts', () => {
    const { router } = renderAtPath('/admin/alerts', ADMIN);
    expect(router.state.location.pathname).toBe('/admin/alerts');
    expect(screen.getByRole('heading', { level: 1, name: /alerts inbox/i })).toBeInTheDocument();
  });

  it.each([
    ['/admin/alerts', INVESTOR, '/investor/portal'],
    ['/admin', INVESTOR, '/investor/portal'],
    ['/admin/scheduled-exports', STARTUP, '/startup/dashboard'],
    ['/startup/dashboard', INVESTOR, '/investor/portal'],
    ['/investor/portfolio', ADMIN, '/admin/alerts'],
    ['/investor/ledger', STARTUP, '/startup/dashboard'],
  ])('keeps %s closed to a cross-role user and redirects them home', (path, user, home) => {
    const { router } = renderAtPath(path, user);
    expect(router.state.location.pathname).toBe(home);
  });

  it('investor never sees admin content', () => {
    renderAtPath('/admin/alerts', INVESTOR);
    expect(screen.queryByRole('heading', { name: /alerts inbox/i })).not.toBeInTheDocument();
  });

  it('role index routes redirect to each role default page', () => {
    expect(renderAtPath('/startup', STARTUP).router.state.location.pathname).toBe('/startup/dashboard');
  });

  it('sign out clears state and returns to login', async () => {
    const user = userEvent.setup();
    const { router } = renderAtPath('/admin/alerts', ADMIN);
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('after sign out a protected route redirects to login again', async () => {
    const user = userEvent.setup();
    const { router } = renderAtPath('/admin/alerts', ADMIN);
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));

    await router.navigate('/admin/alerts');
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent('/admin/alerts')}`);
  });
});

describe('Role-aware header navigation', () => {
  it('shows every area plus Sign in when signed out', () => {
    renderAtPath('/');
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(within(nav).getByRole('link', { name: 'Startup' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Investor' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Admin' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });

  it.each([
    [STARTUP, 'Startup', ['Investor', 'Admin']],
    [INVESTOR, 'Investor', ['Startup', 'Admin']],
    [ADMIN, 'Admin', ['Startup', 'Investor']],
  ])('shows only the %# role area and a Sign out action', (user, visible, hidden) => {
    renderAtPath('/', user);
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(within(nav).getByRole('link', { name: visible })).toBeInTheDocument();
    for (const name of hidden) {
      expect(within(nav).queryByRole('link', { name })).not.toBeInTheDocument();
    }
    expect(within(nav).getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
  });
});
