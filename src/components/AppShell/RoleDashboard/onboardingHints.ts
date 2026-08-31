// src/components/AppShell/RoleDashboard/onboardingHints.ts
//
// Per-role first-run onboarding hints.
//
// Each role has a small dismissible hint strip. The dismissed flag is persisted
// per role in localStorage (key `revora.dashboard-hint.<role>`). Storage access
// is defensive: an unavailable or corrupted storage simply falls back to
// "show the hint" — never crashes the dashboard.

import { useCallback, useEffect, useState } from 'react';
import type { UserRole } from './roleDashboard.types';

export const HINT_KEY_PREFIX = 'revora.dashboard-hint.';

/** Injectable storage boundary (keeps the module testable without a DOM). */
export interface DashboardHintStorage {
  read(key: string): boolean | null;
  write(key: string, dismissed: boolean): void;
}

/** localStorage-backed storage; degrades to in-memory when unavailable. */
export class LocalStorageHintStorage implements DashboardHintStorage {
  read(key: string): boolean | null {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return null;
      const parsed: unknown = JSON.parse(raw);
      return parsed === true;
    } catch {
      // Missing localStorage, quota exceeded, or corrupt JSON → show the hint.
      return null;
    }
  }

  write(key: string, dismissed: boolean): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(dismissed));
    } catch {
      // Non-fatal: the hint simply stays visible for this session.
    }
  }
}

export const DEFAULT_HINT_STORAGE = new LocalStorageHintStorage();

export function hintStorageKey(role: UserRole): string {
  return `${HINT_KEY_PREFIX}${role}`;
}

export interface OnboardingHintState {
  /** Whether the hint should currently be shown. */
  show: boolean;
  /** Persist dismissal and hide the hint. */
  dismiss: () => void;
}

/**
 * Resolve whether a role's onboarding hint should be shown.
 *
 * @param role               Dashboard role being viewed.
 * @param storage            Storage backend (defaults to localStorage).
 * @param initiallyDismissed Forces the hint off (e.g. server-side rendering or
 *                           a "never show again" global preference).
 */
export function useOnboardingHint(
  role: UserRole,
  storage: DashboardHintStorage = DEFAULT_HINT_STORAGE,
  initiallyDismissed = false
): OnboardingHintState {
  const [dismissed, setDismissed] = useState<boolean>(initiallyDismissed);

  useEffect(() => {
    if (initiallyDismissed) {
      setDismissed(true);
      return;
    }
    const stored = storage.read(hintStorageKey(role));
    setDismissed(stored === true);
  }, [role, storage, initiallyDismissed]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    storage.write(hintStorageKey(role), true);
  }, [role, storage]);

  return { show: !dismissed, dismiss };
}