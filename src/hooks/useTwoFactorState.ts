/**
 * useTwoFactorState — shared in-memory 2FA state store.
 *
 * Provides a single source of truth for the 2FA flow across the security
 * settings page, so that:
 *   - completing the TwoFactorSetup wizard marks the account as 2FA-enabled
 *     and stores the recovery codes
 *   - TwoFactorBackupCodesPage reads and updates the same code list
 *   - revoking a session removes it from the session list (and the aria-live
 *     region announces the change)
 *
 * This module uses a simple Context + useState pattern.  Production code
 * should replace the state initializers with server-fetched data; the shape
 * of the store is kept deliberately thin so that swap-out is easy.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { SessionDevice } from '../components/SessionManagement/SessionManagement';
import { MOCK_SESSIONS } from '../components/SessionManagement/sessionsMock';
import { DEFAULT_RECOVERY_CODES } from '../components/TwoFactorSetup/constants';

export type TwoFactorMethod = 'totp' | 'sms';

export interface TwoFactorState {
  /** Whether 2FA is currently enabled for the account */
  enabled: boolean;
  /** Which 2FA method is active (meaningful only when enabled === true) */
  method: TwoFactorMethod | null;
  /** Current recovery codes — empty list means none generated yet */
  recoveryCodes: string[];
  /** Active sessions list */
  sessions: SessionDevice[];
  /** Mark 2FA as enabled with the given method and initial recovery codes */
  enable: (method: TwoFactorMethod, codes: string[]) => void;
  /** Update recovery codes (e.g., after a regenerate call) */
  setRecoveryCodes: (codes: string[]) => void;
  /** Remove a session by id */
  revokeSession: (sessionId: string) => void;
  /** Remove all sessions except the current one */
  revokeAllSessions: () => void;
}

const TwoFactorContext = createContext<TwoFactorState | null>(null);

export interface TwoFactorProviderProps {
  children: React.ReactNode;
  /** Seed sessions — defaults to MOCK_SESSIONS (useful for tests) */
  initialSessions?: SessionDevice[];
  /** Seed enabled state — useful for tests that start post-setup */
  initialEnabled?: boolean;
  /** Seed recovery codes — useful for tests */
  initialCodes?: string[];
}

export function TwoFactorProvider({
  children,
  initialSessions = MOCK_SESSIONS,
  initialEnabled = false,
  initialCodes = DEFAULT_RECOVERY_CODES,
}: TwoFactorProviderProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [method, setMethod] = useState<TwoFactorMethod | null>(null);
  const [recoveryCodes, setRecoveryCodesState] = useState<string[]>(
    initialEnabled ? initialCodes : [],
  );
  const [sessions, setSessions] = useState<SessionDevice[]>(initialSessions);

  const enable = useCallback((m: TwoFactorMethod, codes: string[]) => {
    setEnabled(true);
    setMethod(m);
    setRecoveryCodesState(codes);
  }, []);

  const setRecoveryCodes = useCallback((codes: string[]) => {
    setRecoveryCodesState(codes);
  }, []);

  const revokeSession = useCallback((sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }, []);

  const revokeAllSessions = useCallback(() => {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
  }, []);

  const value: TwoFactorState = {
    enabled,
    method,
    recoveryCodes,
    sessions,
    enable,
    setRecoveryCodes,
    revokeSession,
    revokeAllSessions,
  };

  return React.createElement(TwoFactorContext.Provider, { value }, children);
}

/** Access the shared 2FA state. Must be used inside a TwoFactorProvider. */
export function useTwoFactorState(): TwoFactorState {
  const ctx = useContext(TwoFactorContext);
  if (!ctx) {
    throw new Error('useTwoFactorState must be used within a TwoFactorProvider');
  }
  return ctx;
}
