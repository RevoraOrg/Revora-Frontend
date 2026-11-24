/**
 * useTwoFactorState — unit tests
 * Tests the shared 2FA state store: enable-then-regenerate flow, session revoke
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TwoFactorProvider, useTwoFactorState } from './useTwoFactorState';
import type { SessionDevice } from '../components/SessionManagement/SessionManagement';

/* ─── Helpers ───────────────────────────────────────────────────── */

const TEST_SESSIONS: SessionDevice[] = [
  {
    id: 'cur',
    deviceName: 'Laptop',
    deviceType: 'desktop',
    browser: 'Chrome 125',
    os: 'macOS',
    ipAddress: '192.0.2.1',
    location: 'Lagos, NG',
    lastActive: '2026-06-26T10:30:00Z',
    isCurrent: true,
  },
  {
    id: 'phone',
    deviceName: 'Phone',
    deviceType: 'mobile',
    browser: 'Safari 18',
    os: 'iOS',
    ipAddress: '192.0.2.2',
    location: 'Abuja, NG',
    lastActive: '2026-06-25T22:15:00Z',
    isCurrent: false,
  },
];

/** Minimal consumer component that exposes the full store via data-testid */
function StoreConsumer() {
  const store = useTwoFactorState();
  return (
    <div>
      <div data-testid="enabled">{String(store.enabled)}</div>
      <div data-testid="method">{store.method ?? 'null'}</div>
      <div data-testid="codes">{store.recoveryCodes.join(',')}</div>
      <div data-testid="session-count">{store.sessions.length}</div>
      <div data-testid="session-ids">
        {store.sessions.map((s) => s.id).join(',')}
      </div>
      <button
        type="button"
        data-testid="enable-btn"
        onClick={() => store.enable('totp', ['CODE-1', 'CODE-2'])}
      >
        Enable
      </button>
      <button
        type="button"
        data-testid="set-codes-btn"
        onClick={() => store.setRecoveryCodes(['NEW-1', 'NEW-2', 'NEW-3'])}
      >
        SetCodes
      </button>
      <button
        type="button"
        data-testid="revoke-btn"
        onClick={() => store.revokeSession('phone')}
      >
        RevokePhone
      </button>
      <button
        type="button"
        data-testid="revoke-all-btn"
        onClick={() => store.revokeAllSessions()}
      >
        RevokeAll
      </button>
    </div>
  );
}

function renderStore(options?: {
  initialEnabled?: boolean;
  initialCodes?: string[];
  initialSessions?: SessionDevice[];
}) {
  render(
    <TwoFactorProvider
      initialSessions={options?.initialSessions ?? TEST_SESSIONS}
      initialEnabled={options?.initialEnabled}
      initialCodes={options?.initialCodes}
    >
      <StoreConsumer />
    </TwoFactorProvider>,
  );
}

/* ─── Tests ─────────────────────────────────────────────────────── */

describe('useTwoFactorState', () => {
  describe('initial state', () => {
    it('starts with 2FA disabled and no codes', () => {
      renderStore();
      expect(screen.getByTestId('enabled').textContent).toBe('false');
      expect(screen.getByTestId('method').textContent).toBe('null');
      expect(screen.getByTestId('codes').textContent).toBe('');
    });

    it('seeds initial sessions', () => {
      renderStore();
      expect(screen.getByTestId('session-count').textContent).toBe('2');
    });

    it('respects initialEnabled=true with initialCodes', () => {
      renderStore({ initialEnabled: true, initialCodes: ['A', 'B'] });
      expect(screen.getByTestId('enabled').textContent).toBe('true');
      expect(screen.getByTestId('codes').textContent).toBe('A,B');
    });
  });

  describe('enable', () => {
    it('marks 2FA as enabled, sets method and codes', () => {
      renderStore();
      act(() => { screen.getByTestId('enable-btn').click(); });

      expect(screen.getByTestId('enabled').textContent).toBe('true');
      expect(screen.getByTestId('method').textContent).toBe('totp');
      expect(screen.getByTestId('codes').textContent).toBe('CODE-1,CODE-2');
    });
  });

  describe('setRecoveryCodes (enable-then-regenerate flow)', () => {
    it('replaces existing codes with new codes', () => {
      renderStore();
      act(() => { screen.getByTestId('enable-btn').click(); });

      expect(screen.getByTestId('codes').textContent).toBe('CODE-1,CODE-2');

      act(() => { screen.getByTestId('set-codes-btn').click(); });

      // Old codes are gone, new codes are present
      expect(screen.getByTestId('codes').textContent).toBe('NEW-1,NEW-2,NEW-3');
      expect(screen.getByTestId('codes').textContent).not.toContain('CODE-1');
    });
  });

  describe('revokeSession', () => {
    it('removes the specified session', () => {
      renderStore();
      expect(screen.getByTestId('session-ids').textContent).toContain('phone');

      act(() => { screen.getByTestId('revoke-btn').click(); });

      expect(screen.getByTestId('session-ids').textContent).not.toContain('phone');
      expect(screen.getByTestId('session-count').textContent).toBe('1');
    });

    it('keeps the current session when revoking a non-current one', () => {
      renderStore();
      act(() => { screen.getByTestId('revoke-btn').click(); });

      expect(screen.getByTestId('session-ids').textContent).toContain('cur');
    });
  });

  describe('revokeAllSessions', () => {
    it('keeps only the current session', () => {
      renderStore({
        initialSessions: [
          ...TEST_SESSIONS,
          {
            id: 'extra',
            deviceName: 'Tablet',
            deviceType: 'tablet',
            browser: 'Safari',
            os: 'iPadOS',
            ipAddress: '192.0.2.3',
            location: 'Kano',
            lastActive: '2026-06-24T14:45:00Z',
            isCurrent: false,
          },
        ],
      });

      act(() => { screen.getByTestId('revoke-all-btn').click(); });

      expect(screen.getByTestId('session-count').textContent).toBe('1');
      expect(screen.getByTestId('session-ids').textContent).toBe('cur');
    });
  });

  describe('error boundary', () => {
    it('throws when used outside provider', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<StoreConsumer />)).toThrow(
        'useTwoFactorState must be used within a TwoFactorProvider',
      );
      spy.mockRestore();
    });
  });
});
