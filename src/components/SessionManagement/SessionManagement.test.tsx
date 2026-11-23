import React from 'react';
import { render, screen, within, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { SessionManagement } from './SessionManagement';
import { MOCK_SESSIONS } from './sessionsMock';

type User = ReturnType<typeof userEvent.setup>;

const SESSIONS = [
  {
    id: 'cur',
    deviceName: 'Laptop',
    deviceType: 'desktop' as const,
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
    deviceType: 'mobile' as const,
    browser: 'Safari 18',
    os: 'iOS',
    ipAddress: '192.0.2.2',
    location: 'Abuja, NG',
    lastActive: '2026-06-25T22:15:00Z',
    isCurrent: false,
  },
  {
    id: 'tablet',
    deviceName: 'Tablet',
    deviceType: 'tablet' as const,
    browser: 'Safari 18',
    os: 'iPadOS',
    ipAddress: '192.0.2.3',
    location: 'Kano, NG',
    lastActive: '2026-06-24T14:45:00Z',
    isCurrent: false,
  },
];

function setup(props: {
  __onRevokeSingle?: (id: string) => Promise<void>;
  __onRevokeAll?: () => Promise<void>;
}) {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <SessionManagement __initialSessions={SESSIONS} {...props} />
    </MemoryRouter>,
  );
  return { user };
}

async function openSingleDialog(user: User) {
  await user.click(screen.getByRole('button', { name: 'View details for Phone' }));
  await user.click(screen.getByRole('button', { name: 'Revoke session' }));
  return screen.getByRole('dialog', { name: 'Revoke session?' });
}

async function openAllDialog(user: User) {
  await user.click(screen.getByRole('button', { name: /sign out of all other devices/i }));
  return screen.getByRole('dialog', { name: 'Sign out everywhere?' });
}

describe('SessionManagement revoke failures', () => {
  it('keeps the session, shows an error and clears the spinner when a single revoke rejects', async () => {
    const onRevokeSingle = vi.fn().mockRejectedValue(new Error('network down'));
    const { user } = setup({ __onRevokeSingle: onRevokeSingle });

    const dialog = await openSingleDialog(user);
    await user.click(within(dialog).getByRole('button', { name: 'Revoke' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/try again/i);
    expect(within(dialog).queryByText('Revoking...')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Retry' })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeEnabled();
    expect(screen.getByTestId('session-phone')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/failed/i);
  });

  it('removes the session when Retry succeeds after a failed single revoke', async () => {
    const onRevokeSingle = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(undefined);
    const { user } = setup({ __onRevokeSingle: onRevokeSingle });

    const dialog = await openSingleDialog(user);
    await user.click(within(dialog).getByRole('button', { name: 'Revoke' }));
    await user.click(await within(dialog).findByRole('button', { name: 'Retry' }));

    expect(onRevokeSingle).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('session-phone')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Revoke session?' })).not.toBeInTheDocument();
  });

  it('keeps the other sessions and shows an error when revoke-all rejects', async () => {
    const onRevokeAll = vi.fn().mockRejectedValue(new Error('network down'));
    const { user } = setup({ __onRevokeAll: onRevokeAll });

    const dialog = await openAllDialog(user);
    await user.click(within(dialog).getByRole('button', { name: 'Sign out everywhere' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/try again/i);
    expect(within(dialog).queryByText('Revoking...')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Retry' })).toBeEnabled();
    expect(screen.getByTestId('session-cur')).toBeInTheDocument();
    expect(screen.getByTestId('session-phone')).toBeInTheDocument();
    expect(screen.getByTestId('session-tablet')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/failed/i);
  });

  it('does not submit a second single revoke while one is pending', async () => {
    let resolveRevoke!: () => void;
    const onRevokeSingle = vi.fn(
      () => new Promise<void>((resolve) => { resolveRevoke = resolve; }),
    );
    const { user } = setup({ __onRevokeSingle: onRevokeSingle });

    const dialog = await openSingleDialog(user);
    await user.click(within(dialog).getByRole('button', { name: 'Revoke' }));
    await user.click(within(dialog).getByRole('button', { name: 'Revoking...' }));

    expect(onRevokeSingle).toHaveBeenCalledTimes(1);
    await act(async () => { resolveRevoke(); });
  });

  it('ignores Escape and overlay clicks while a revoke is pending, then still shows the error', async () => {
    let rejectRevoke!: (reason: Error) => void;
    const onRevokeSingle = vi.fn(
      () => new Promise<void>((_, reject) => { rejectRevoke = reject; }),
    );
    const { user } = setup({ __onRevokeSingle: onRevokeSingle });

    const dialog = await openSingleDialog(user);
    await user.click(within(dialog).getByRole('button', { name: 'Revoke' }));

    fireEvent.keyDown(within(dialog).getByRole('button', { name: 'Revoking...' }), { key: 'Escape' });
    await user.click(dialog);
    expect(screen.getByRole('dialog', { name: 'Revoke session?' })).toBeInTheDocument();

    await act(async () => { rejectRevoke(new Error('network down')); });

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/try again/i);
    expect(screen.getByTestId('session-phone')).toBeInTheDocument();
  });
});

describe('SessionManagement revoke success paths', () => {
  it('removes the session, closes the dialog and announces after a successful single revoke', async () => {
    const onRevokeSingle = vi.fn().mockResolvedValue(undefined);
    const { user } = setup({ __onRevokeSingle: onRevokeSingle });

    const dialog = await openSingleDialog(user);
    await user.click(within(dialog).getByRole('button', { name: 'Revoke' }));

    expect(onRevokeSingle).toHaveBeenCalledWith('phone');
    expect(screen.queryByTestId('session-phone')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Revoke session?' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Session for Phone revoked');
  });

  it('closes the dialog and announces after a successful revoke-all', async () => {
    const onRevokeAll = vi.fn().mockResolvedValue(undefined);
    const { user } = setup({ __onRevokeAll: onRevokeAll });

    const dialog = await openAllDialog(user);
    await user.click(within(dialog).getByRole('button', { name: 'Sign out everywhere' }));

    expect(onRevokeAll).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'Sign out everywhere?' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Signed out of all other devices');
  });
});

describe('SessionManagement canonical props (sessions / onRevoke / onRevokeAll)', () => {
  it('renders with no props and falls back to MOCK_SESSIONS', () => {
    render(
      <MemoryRouter>
        <SessionManagement />
      </MemoryRouter>,
    );
    // MOCK_SESSIONS has sess-1 as the current session (MacBook Pro 16)
    expect(screen.getByTestId('session-sess-1')).toBeInTheDocument();
    expect(screen.getByText('MacBook Pro 16')).toBeInTheDocument();
  });

  it('renders sessions supplied via the canonical sessions prop', () => {
    render(
      <MemoryRouter>
        <SessionManagement sessions={SESSIONS} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('session-cur')).toBeInTheDocument();
    expect(screen.getByTestId('session-phone')).toBeInTheDocument();
    expect(screen.getByTestId('session-tablet')).toBeInTheDocument();
  });

  it('invokes the canonical onRevoke prop with the session id on confirm', async () => {
    const onRevoke = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SessionManagement sessions={SESSIONS} onRevoke={onRevoke} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'View details for Phone' }));
    await user.click(screen.getByRole('button', { name: 'Revoke session' }));
    const dialog = screen.getByRole('dialog', { name: 'Revoke session?' });
    await user.click(within(dialog).getByRole('button', { name: 'Revoke' }));

    expect(onRevoke).toHaveBeenCalledOnce();
    expect(onRevoke).toHaveBeenCalledWith('phone');
    expect(screen.queryByTestId('session-phone')).not.toBeInTheDocument();
  });

  it('invokes the canonical onRevokeAll prop on confirm', async () => {
    const onRevokeAll = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SessionManagement sessions={SESSIONS} onRevokeAll={onRevokeAll} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /sign out of all other devices/i }));
    const dialog = screen.getByRole('dialog', { name: 'Sign out everywhere?' });
    await user.click(within(dialog).getByRole('button', { name: 'Sign out everywhere' }));

    expect(onRevokeAll).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog', { name: 'Sign out everywhere?' })).not.toBeInTheDocument();
  });

  it('protects the current session — it cannot be revoked via "Sign out everywhere"', async () => {
    const onRevokeAll = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SessionManagement sessions={SESSIONS} onRevokeAll={onRevokeAll} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /sign out of all other devices/i }));
    const dialog = screen.getByRole('dialog', { name: 'Sign out everywhere?' });
    await user.click(within(dialog).getByRole('button', { name: 'Sign out everywhere' }));

    // Current session must remain
    expect(screen.getByTestId('session-cur')).toBeInTheDocument();
    // Other sessions must be gone
    expect(screen.queryByTestId('session-phone')).not.toBeInTheDocument();
    expect(screen.queryByTestId('session-tablet')).not.toBeInTheDocument();
  });

  it('MOCK_SESSIONS exported from sessionsMock.ts contains the expected default entries', () => {
    expect(MOCK_SESSIONS).toHaveLength(4);
    expect(MOCK_SESSIONS.some((s) => s.isCurrent)).toBe(true);
    expect(MOCK_SESSIONS.filter((s) => !s.isCurrent)).toHaveLength(3);
  });
});
