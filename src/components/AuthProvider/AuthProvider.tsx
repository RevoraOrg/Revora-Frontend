import React, { createContext, useCallback, useContext, useState } from 'react';
import { clearRecentCommandsForUser } from '../../hooks/useCommandPalette';

export type AuthRole = 'startup' | 'investor' | 'admin';

export const AUTH_ROLES: readonly AuthRole[] = ['startup', 'investor', 'admin'];

export const AUTH_STORAGE_KEY = 'revora-auth-session';

export const ROLE_DEFAULT_PATH: Record<AuthRole, string> = {
  startup: '/startup/dashboard',
  investor: '/investor/portal',
  admin: '/admin/alerts',
};

export function isAuthRole(value: unknown): value is AuthRole {
  return value === 'startup' || value === 'investor' || value === 'admin';
}

export interface AuthUser {
  id: string;
  role: AuthRole;
}

export interface SignInParams {
  id: string;
  role: AuthRole;
}

export type SignInInput = SignInParams | string;

export interface AuthContextValue {
  user: AuthUser | null;
  userId: string | null;
  role: AuthRole | null;
  isAuthenticated: boolean;
  signIn: (input: SignInInput, role?: AuthRole) => AuthUser;
  signOut: () => void;
}

export function readStoredAuthSession(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed != null &&
      typeof parsed === 'object' &&
      typeof (parsed as AuthUser).id === 'string' &&
      (parsed as AuthUser).id.trim() !== '' &&
      isAuthRole((parsed as AuthUser).role)
    ) {
      return {
        id: (parsed as AuthUser).id.trim(),
        role: (parsed as AuthUser).role,
      };
    }
  } catch {
    // SSR / blocked storage / corrupt JSON
  }
  return null;
}

export function writeStoredAuthSession(user: AuthUser | null): void {
  try {
    if (user) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // storage unavailable
  }
}

export function inferRoleFromTargetPath(path?: string | null): AuthRole | null {
  if (!path) return null;
  if (path === '/admin' || path.startsWith('/admin/')) return 'admin';
  if (path === '/investor' || path.startsWith('/investor/')) return 'investor';
  if (path === '/startup' || path.startsWith('/startup/')) return 'startup';
  return null;
}

export function inferRoleFromIdentifier(identifier: string): AuthRole {
  const lower = identifier.trim().toLowerCase();
  if (lower.startsWith('admin@') || lower.includes('+admin') || lower === 'admin') {
    return 'admin';
  }
  if (lower.startsWith('investor@') || lower.includes('+investor') || lower === 'investor') {
    return 'investor';
  }
  return 'startup';
}

export function sanitizeNextPath(next: string | null | undefined, role: AuthRole): string {
  const fallback = ROLE_DEFAULT_PATH[role];
  if (!next || typeof next !== 'string') return fallback;
  const trimmed = next.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;
  const targetRole = inferRoleFromTargetPath(trimmed);
  if (targetRole && targetRole !== role) return fallback;
  if (trimmed === '/login' || trimmed.startsWith('/login?') || trimmed === '/signup' || trimmed.startsWith('/signup?')) {
    return fallback;
  }
  return trimmed;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (initialUser !== undefined) {
      writeStoredAuthSession(initialUser);
      return initialUser;
    }
    return readStoredAuthSession();
  });

  const signIn = useCallback((input: SignInInput, explicitRole?: AuthRole): AuthUser => {
    let rawId: string;
    let resolvedRole: AuthRole;

    if (typeof input === 'string') {
      rawId = input;
      resolvedRole = explicitRole && isAuthRole(explicitRole)
        ? explicitRole
        : inferRoleFromIdentifier(input);
    } else {
      rawId = input.id;
      resolvedRole = isAuthRole(input.role)
        ? input.role
        : inferRoleFromIdentifier(input.id);
    }

    const normalizedId = rawId.trim().toLowerCase() || `${resolvedRole}-user`;
    const nextUser: AuthUser = { id: normalizedId, role: resolvedRole };
    setUser(nextUser);
    writeStoredAuthSession(nextUser);
    return nextUser;
  }, []);

  const signOut = useCallback(() => {
    setUser((prev) => {
      if (prev?.id) {
        clearRecentCommandsForUser(prev.id);
      }
      return null;
    });
    writeStoredAuthSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userId: user?.id ?? null,
        role: user?.role ?? null,
        isAuthenticated: user !== null,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}
