import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  WalletConnectionProvider,
  useWalletConnection,
  TESTNET_PASSPHRASE,
} from './WalletConnectionContext';

const mockIsConnected = vi.fn();
const mockRequestAccess = vi.fn();
const mockGetAddress = vi.fn();
const mockGetNetworkDetails = vi.fn();

vi.mock('@stellar/freighter-api', () => ({
  isConnected: (...args: unknown[]) => mockIsConnected(...args),
  requestAccess: (...args: unknown[]) => mockRequestAccess(...args),
  getAddress: (...args: unknown[]) => mockGetAddress(...args),
  getNetworkDetails: (...args: unknown[]) => mockGetNetworkDetails(...args),
}));

function Consumer({
  onContext,
}: {
  onContext?: (ctx: ReturnType<typeof useWalletConnection>) => void;
}) {
  const ctx = useWalletConnection();
  onContext?.(ctx);
  return (
    <div>
      <span data-testid="status">{ctx.status}</span>
      <span data-testid="detection">{ctx.detection}</span>
      <span data-testid="address">{ctx.address ?? ''}</span>
      <span data-testid="network">{ctx.network ?? ''}</span>
      <span data-testid="error-type">{ctx.error?.type ?? ''}</span>
      <span data-testid="error-message">{ctx.error?.message ?? ''}</span>
      <button onClick={() => void ctx.connect('freighter')}>Connect</button>
      <button onClick={() => void ctx.connect('other')}>Connect Other</button>
      <button onClick={() => ctx.disconnect()}>Disconnect</button>
    </div>
  );
}

describe('WalletConnectionContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsConnected.mockResolvedValue({ isConnected: true });
    mockRequestAccess.mockResolvedValue({ address: 'GTEST123' });
    mockGetAddress.mockResolvedValue({ address: 'GTEST123' });
    mockGetNetworkDetails.mockResolvedValue({
      network: 'TESTNET',
      networkPassphrase: TESTNET_PASSPHRASE,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws when useWalletConnection is used outside WalletConnectionProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(
      'useWalletConnection requires WalletConnectionProvider',
    );
    spy.mockRestore();
  });

  it('detects installed, not-installed, and unavailable states', async () => {
    mockIsConnected.mockResolvedValueOnce({ isConnected: false });
    const { unmount } = render(
      <WalletConnectionProvider>
        <Consumer />
      </WalletConnectionProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('detection')).toHaveTextContent('not-installed');
    });
    unmount();

    mockIsConnected.mockRejectedValueOnce(new Error('boom'));
    render(
      <WalletConnectionProvider>
        <Consumer />
      </WalletConnectionProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('detection')).toHaveTextContent('unavailable');
    });
  });

  it('ignores unsupported providerId and concurrent connect calls', async () => {
    let resolveAccess!: (v: { address: string }) => void;
    mockRequestAccess.mockImplementation(
      () => new Promise((r) => { resolveAccess = r; }),
    );

    let latestCtx!: ReturnType<typeof useWalletConnection>;
    render(
      <WalletConnectionProvider>
        <Consumer onContext={(c) => { latestCtx = c; }} />
      </WalletConnectionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('detection')).toHaveTextContent('detected');
    });

    await act(async () => {
      await latestCtx.connect('albedo');
    });
    expect(screen.getByTestId('status')).toHaveTextContent('idle');

    act(() => {
      void latestCtx.connect('freighter');
      void latestCtx.connect('freighter');
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connecting');
    });

    await act(async () => {
      resolveAccess({ address: 'GTEST123' });
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });
    expect(mockRequestAccess).toHaveBeenCalledTimes(1);
  });

  it('ignores stale resolution when disconnect is called during in-flight connect', async () => {
    let resolveAccess!: (v: { address: string }) => void;
    mockRequestAccess.mockImplementation(
      () => new Promise((r) => { resolveAccess = r; }),
    );

    let latestCtx!: ReturnType<typeof useWalletConnection>;
    render(
      <WalletConnectionProvider>
        <Consumer onContext={(c) => { latestCtx = c; }} />
      </WalletConnectionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('detection')).toHaveTextContent('detected');
    });

    act(() => {
      void latestCtx.connect('freighter');
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connecting');
    });

    act(() => {
      latestCtx.disconnect();
    });
    expect(screen.getByTestId('status')).toHaveTextContent('idle');

    await act(async () => {
      resolveAccess({ address: 'GTEST123' });
    });

    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(screen.getByTestId('address')).toHaveTextContent('');
  });

  it('handles declined access and missing account/network details', async () => {
    mockRequestAccess.mockResolvedValueOnce({ error: 'User declined' });

    let latestCtx!: ReturnType<typeof useWalletConnection>;
    render(
      <WalletConnectionProvider>
        <Consumer onContext={(c) => { latestCtx = c; }} />
      </WalletConnectionProvider>,
    );

    await act(async () => {
      await latestCtx.connect('freighter');
    });

    expect(screen.getByTestId('status')).toHaveTextContent('error');
    expect(screen.getByTestId('error-type')).toHaveTextContent('rejected');
    expect(screen.getByTestId('error-message')).toHaveTextContent(
      'Connection was declined. Try again?',
    );

    mockRequestAccess.mockResolvedValueOnce({ address: 'GTEST123' });
    mockGetNetworkDetails.mockResolvedValueOnce({ error: 'no network' });

    await act(async () => {
      await latestCtx.connect('freighter');
    });

    expect(screen.getByTestId('status')).toHaveTextContent('error');
    expect(screen.getByTestId('error-message')).toHaveTextContent(
      'Unable to read your wallet account and network. Try again?',
    );
  });

  it('handles timeout during connect', async () => {
    vi.useFakeTimers();
    mockIsConnected.mockResolvedValue({ isConnected: true });
    mockRequestAccess.mockImplementation(() => new Promise(() => {}));

    let latestCtx!: ReturnType<typeof useWalletConnection>;
    render(
      <WalletConnectionProvider>
        <Consumer onContext={(c) => { latestCtx = c; }} />
      </WalletConnectionProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      void latestCtx.connect('freighter');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30001);
    });

    expect(screen.getByTestId('status')).toHaveTextContent('error');
    expect(screen.getByTestId('error-type')).toHaveTextContent('timeout');
  });

  it('disconnects if periodic refresh fails while connected', async () => {
    vi.useFakeTimers();

    let latestCtx!: ReturnType<typeof useWalletConnection>;
    render(
      <WalletConnectionProvider>
        <Consumer onContext={(c) => { latestCtx = c; }} />
      </WalletConnectionProvider>,
    );

    await act(async () => {
      await latestCtx.connect('freighter');
    });

    expect(screen.getByTestId('status')).toHaveTextContent('connected');

    mockGetAddress.mockResolvedValueOnce({ error: 'revoked' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3001);
    });

    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(screen.getByTestId('address')).toHaveTextContent('');
  });
});
