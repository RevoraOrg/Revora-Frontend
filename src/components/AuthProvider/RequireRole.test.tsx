import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  AuthProvider,
  RequireRole,
  writeStoredAuthSession,
  type AuthUser,
} from './index';

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{`${loc.pathname}${loc.search}`}</div>;
}

function renderAt(path: string, user?: AuthUser | null, withProvider = true) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <Where /> },
      { path: '/admin/*', element: <RequireRole role="admin"><div>admin area</div></RequireRole> },
      {
        path: '/investor',
        element: <RequireRole role="investor" />,
        children: [{ index: true, element: <div>investor area</div> }],
      },
      { path: '/multi', element: <RequireRole role={['startup', 'admin']}><div>multi area</div></RequireRole> },
      { path: '/startup/dashboard', element: <Where /> },
      { path: '/investor/portal', element: <Where /> },
      { path: '/admin/alerts-home', element: <Where /> },
    ],
    { initialEntries: [path] },
  );
  const ui = <RouterProvider router={router} />;
  return render(withProvider ? <AuthProvider initialUser={user}>{ui}</AuthProvider> : ui);
}

beforeEach(() => {
  sessionStorage.clear();
});

describe('RequireRole', () => {
  it('redirects unauthenticated visitors to /login with an encoded next param', () => {
    renderAt('/admin/alerts?tab=2#top', null);
    expect(screen.getByTestId('where')).toHaveTextContent(
      `/login?next=${encodeURIComponent('/admin/alerts?tab=2#top')}`,
    );
  });

  it('renders children for a matching role', () => {
    renderAt('/admin/alerts', { id: 'a@revora.test', role: 'admin' });
    expect(screen.getByText('admin area')).toBeInTheDocument();
  });

  it('renders the nested outlet when used as a layout route', () => {
    renderAt('/investor', { id: 'i@revora.test', role: 'investor' });
    expect(screen.getByText('investor area')).toBeInTheDocument();
  });

  it('bounces an investor away from /admin to their own home', () => {
    renderAt('/admin/alerts', { id: 'i@revora.test', role: 'investor' });
    expect(screen.queryByText('admin area')).not.toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/investor/portal');
  });

  it('bounces a startup away from /investor to the startup dashboard', () => {
    renderAt('/investor', { id: 's@revora.test', role: 'startup' });
    expect(screen.getByTestId('where')).toHaveTextContent('/startup/dashboard');
  });

  it('accepts any role in an allow-list', () => {
    renderAt('/multi', { id: 's@revora.test', role: 'startup' });
    expect(screen.getByText('multi area')).toBeInTheDocument();
  });

  it('rejects roles outside an allow-list', () => {
    renderAt('/multi', { id: 'i@revora.test', role: 'investor' });
    expect(screen.queryByText('multi area')).not.toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/investor/portal');
  });

  it('falls back to the stored session when rendered without a provider', () => {
    writeStoredAuthSession({ id: 'a@revora.test', role: 'admin' });
    renderAt('/admin/x', undefined, false);
    expect(screen.getByText('admin area')).toBeInTheDocument();
  });

  it('redirects to login without a provider and without a session', () => {
    renderAt('/admin/x', undefined, false);
    expect(screen.getByTestId('where')).toHaveTextContent('/login?next=%2Fadmin%2Fx');
  });
});
