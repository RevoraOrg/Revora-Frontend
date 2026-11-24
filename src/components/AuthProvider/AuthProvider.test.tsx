import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AUTH_STORAGE_KEY,
  AuthProvider,
  ROLE_DEFAULT_PATH,
  inferRoleFromIdentifier,
  inferRoleFromTargetPath,
  isAuthRole,
  readStoredAuthSession,
  sanitizeNextPath,
  useAuth,
  useOptionalAuth,
  writeStoredAuthSession,
  type AuthContextValue,
} from './index';
import { recentCommandsKey } from '../../hooks/useCommandPalette';
import { getCurrentUserId, storageKeyForUser } from '../AuditTrailFilters/savedFilters';

let latest: AuthContextValue;

function Probe() {
  latest = useAuth();
  return (
    <div>
      <span data-testid="user">{latest.userId ?? 'none'}</span>
      <span data-testid="role">{latest.role ?? 'none'}</span>
    </div>
  );
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('role helpers', () => {
  it('isAuthRole accepts only the three roles', () => {
    expect(isAuthRole('startup')).toBe(true);
    expect(isAuthRole('investor')).toBe(true);
    expect(isAuthRole('admin')).toBe(true);
    expect(isAuthRole('issuer')).toBe(false);
    expect(isAuthRole(undefined)).toBe(false);
    expect(isAuthRole(null)).toBe(false);
  });

  it('inferRoleFromTargetPath maps route trees to roles', () => {
    expect(inferRoleFromTargetPath('/admin')).toBe('admin');
    expect(inferRoleFromTargetPath('/admin/alerts')).toBe('admin');
    expect(inferRoleFromTargetPath('/investor/portal')).toBe('investor');
    expect(inferRoleFromTargetPath('/startup/dashboard')).toBe('startup');
    expect(inferRoleFromTargetPath('/administrator')).toBeNull();
    expect(inferRoleFromTargetPath('/')).toBeNull();
    expect(inferRoleFromTargetPath(null)).toBeNull();
    expect(inferRoleFromTargetPath(undefined)).toBeNull();
  });

  it('inferRoleFromIdentifier falls back to startup', () => {
    expect(inferRoleFromIdentifier('admin@revora.test')).toBe('admin');
    expect(inferRoleFromIdentifier('me+admin@revora.test')).toBe('admin');
    expect(inferRoleFromIdentifier('admin')).toBe('admin');
    expect(inferRoleFromIdentifier('Investor@revora.test')).toBe('investor');
    expect(inferRoleFromIdentifier('me+investor@revora.test')).toBe('investor');
    expect(inferRoleFromIdentifier('investor')).toBe('investor');
    expect(inferRoleFromIdentifier('someone@revora.test')).toBe('startup');
  });

  describe('sanitizeNextPath', () => {
    it('returns the role default when next is missing or invalid', () => {
      expect(sanitizeNextPath(null, 'admin')).toBe(ROLE_DEFAULT_PATH.admin);
      expect(sanitizeNextPath(undefined, 'investor')).toBe(ROLE_DEFAULT_PATH.investor);
      expect(sanitizeNextPath('', 'startup')).toBe(ROLE_DEFAULT_PATH.startup);
      expect(sanitizeNextPath(42 as unknown as string, 'startup')).toBe(ROLE_DEFAULT_PATH.startup);
    });

    it('rejects open redirects', () => {
      expect(sanitizeNextPath('https://evil.test', 'admin')).toBe(ROLE_DEFAULT_PATH.admin);
      expect(sanitizeNextPath('//evil.test', 'admin')).toBe(ROLE_DEFAULT_PATH.admin);
      expect(sanitizeNextPath('javascript:alert(1)', 'admin')).toBe(ROLE_DEFAULT_PATH.admin);
    });

    it('rejects paths belonging to another role tree', () => {
      expect(sanitizeNextPath('/admin/alerts', 'investor')).toBe(ROLE_DEFAULT_PATH.investor);
    });

    it('rejects auth pages to avoid loops', () => {
      expect(sanitizeNextPath('/login', 'admin')).toBe(ROLE_DEFAULT_PATH.admin);
      expect(sanitizeNextPath('/login?next=/x', 'admin')).toBe(ROLE_DEFAULT_PATH.admin);
      expect(sanitizeNextPath('/signup', 'admin')).toBe(ROLE_DEFAULT_PATH.admin);
      expect(sanitizeNextPath('/signup?next=/x', 'admin')).toBe(ROLE_DEFAULT_PATH.admin);
    });

    it('honors same-role and role-neutral paths, keeping query and hash', () => {
      expect(sanitizeNextPath('/admin/alerts?x=1#top', 'admin')).toBe('/admin/alerts?x=1#top');
      expect(sanitizeNextPath('/settings', 'investor')).toBe('/settings');
    });
  });
});

describe('session storage helpers', () => {
  it('round-trips a valid session', () => {
    writeStoredAuthSession({ id: 'a@b.co', role: 'admin' });
    expect(readStoredAuthSession()).toEqual({ id: 'a@b.co', role: 'admin' });
  });

  it('clears the session when written with null', () => {
    writeStoredAuthSession({ id: 'a@b.co', role: 'admin' });
    writeStoredAuthSession(null);
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(readStoredAuthSession()).toBeNull();
  });

  it.each([
    ['corrupt JSON', '{nope'],
    ['non-object', '"admin"'],
    ['null', 'null'],
    ['blank id', JSON.stringify({ id: '  ', role: 'admin' })],
    ['non-string id', JSON.stringify({ id: 7, role: 'admin' })],
    ['unknown role', JSON.stringify({ id: 'x', role: 'root' })],
  ])('ignores %s', (_label, raw) => {
    sessionStorage.setItem(AUTH_STORAGE_KEY, raw);
    expect(readStoredAuthSession()).toBeNull();
  });

  it('trims the stored id', () => {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ id: '  x@y.z ', role: 'investor' }));
    expect(readStoredAuthSession()).toEqual({ id: 'x@y.z', role: 'investor' });
  });

  it('survives blocked storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readStoredAuthSession()).toBeNull();
    expect(() => writeStoredAuthSession({ id: 'a', role: 'admin' })).not.toThrow();
    expect(() => writeStoredAuthSession(null)).not.toThrow();
  });
});

describe('AuthProvider', () => {
  it('starts signed out', () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(latest.isAuthenticated).toBe(false);
    expect(latest.user).toBeNull();
  });

  it('signIn with an object sets user, role and persists to sessionStorage', () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    act(() => {
      latest.signIn({ id: '  Boss@Revora.test ', role: 'admin' });
    });
    expect(screen.getByTestId('user')).toHaveTextContent('boss@revora.test');
    expect(screen.getByTestId('role')).toHaveTextContent('admin');
    expect(latest.isAuthenticated).toBe(true);
    expect(JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY)!)).toEqual({
      id: 'boss@revora.test',
      role: 'admin',
    });
  });

  it('signIn with a string infers or accepts the role', () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    act(() => {
      latest.signIn('admin@revora.test');
    });
    expect(latest.role).toBe('admin');
    act(() => {
      latest.signIn('x@revora.test', 'investor');
    });
    expect(latest.role).toBe('investor');
    act(() => {
      latest.signIn('plain@revora.test', 'bogus' as never);
    });
    expect(latest.role).toBe('startup');
  });

  it('signIn falls back to inference for an invalid object role and to a generated id', () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    act(() => {
      latest.signIn({ id: 'investor@revora.test', role: 'nope' as never });
    });
    expect(latest.role).toBe('investor');
    act(() => {
      latest.signIn({ id: '   ', role: 'admin' });
    });
    expect(latest.userId).toBe('admin-user');
  });

  it('persists across remounts within the session', () => {
    const first = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    act(() => {
      latest.signIn({ id: 'p@revora.test', role: 'investor' });
    });
    first.unmount();

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('user')).toHaveTextContent('p@revora.test');
    expect(screen.getByTestId('role')).toHaveTextContent('investor');
  });

  it('signOut clears state, session and that user\'s recent commands', () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    act(() => {
      latest.signIn({ id: 'gone@revora.test', role: 'admin' });
    });
    localStorage.setItem(recentCommandsKey('gone@revora.test'), '[]');
    localStorage.setItem(recentCommandsKey('other@revora.test'), '[]');

    act(() => {
      latest.signOut();
    });

    expect(latest.isAuthenticated).toBe(false);
    expect(latest.role).toBeNull();
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(recentCommandsKey('gone@revora.test'))).toBeNull();
    expect(localStorage.getItem(recentCommandsKey('other@revora.test'))).toBe('[]');
  });

  it('signOut while signed out is a no-op', () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(() => act(() => latest.signOut())).not.toThrow();
    expect(latest.isAuthenticated).toBe(false);
  });

  it('initialUser seeds (and persists) the session; null clears it', () => {
    const seeded = render(
      <AuthProvider initialUser={{ id: 'seed@revora.test', role: 'startup' }}>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('user')).toHaveTextContent('seed@revora.test');
    expect(readStoredAuthSession()).toEqual({ id: 'seed@revora.test', role: 'startup' });
    seeded.unmount();

    render(
      <AuthProvider initialUser={null}>
        <Probe />
      </AuthProvider>,
    );
    expect(latest.isAuthenticated).toBe(false);
    expect(readStoredAuthSession()).toBeNull();
  });
});

describe('useAuth / useOptionalAuth', () => {
  it('useAuth throws outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('useAuth must be used inside <AuthProvider>');
  });

  it('useOptionalAuth returns null outside the provider', () => {
    let value: AuthContextValue | null = {} as AuthContextValue;
    function Optional() {
      value = useOptionalAuth();
      return null;
    }
    render(<Optional />);
    expect(value).toBeNull();
  });
});

describe('per-user storage keys follow the signed-in user', () => {
  it('getCurrentUserId reflects the session and storageKeyForUser is keyed by it', () => {
    expect(getCurrentUserId()).toBe('local-user');
    writeStoredAuthSession({ id: 'alice@revora.test', role: 'admin' });
    expect(getCurrentUserId()).toBe('alice@revora.test');
    expect(storageKeyForUser()).toBe('revora-audit-saved-filters:alice@revora.test');
    writeStoredAuthSession({ id: 'bob@revora.test', role: 'admin' });
    expect(storageKeyForUser()).toBe('revora-audit-saved-filters:bob@revora.test');
    writeStoredAuthSession(null);
    expect(getCurrentUserId()).toBe('local-user');
  });

  it('recentCommandsKey uses the explicit id, then the session id, then anonymous', () => {
    expect(recentCommandsKey()).toBe('revora:recent-commands:anonymous');
    writeStoredAuthSession({ id: 'alice@revora.test', role: 'admin' });
    expect(recentCommandsKey()).toBe('revora:recent-commands:alice@revora.test');
    expect(recentCommandsKey('explicit')).toBe('revora:recent-commands:explicit');
  });
});
