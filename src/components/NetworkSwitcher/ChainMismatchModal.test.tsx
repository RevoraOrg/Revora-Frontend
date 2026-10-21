import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ChainMismatchModal } from './ChainMismatchModal';
import { NetworkSwitcherProvider } from './NetworkSwitcherContext';
import { useNetworkSwitcher } from '../../hooks/useNetworkSwitcher';
import { NetworkSwitcherBadge } from './NetworkSwitcherBadge';
import { axe } from 'jest-axe';

const renderModalInProvider = (
  ui: React.ReactNode,
  providerProps?: Partial<React.ComponentProps<typeof NetworkSwitcherProvider>>,
) => {
  return render(
    <NetworkSwitcherProvider
      initialConnectedChainId={1} // Ethereum Mainnet
      initialAppChainId={137} // Polygon PoS
      initialWalletName="MetaMask"
      initialIsWalletConnected={true}
      initialIsModalOpen={true}
      {...providerProps}
    >
      {ui}
    </NetworkSwitcherProvider>,
  );
};

describe('ChainMismatchModal', () => {
  it('renders role="dialog" with aria-modal="true"', () => {
    renderModalInProvider(<ChainMismatchModal isOpen />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Network Mismatch Detected')).toBeInTheDocument();
  });

  it('renders side-by-side chain chips for connected and required chains', () => {
    renderModalInProvider(<ChainMismatchModal isOpen />);
    const chipsContainer = screen.getByTestId('side-by-side-chips');
    expect(chipsContainer).toBeInTheDocument();

    expect(screen.getByText('Wallet Connected')).toBeInTheDocument();
    expect(screen.getByText('Ethereum Mainnet')).toBeInTheDocument();
    expect(screen.getByText('Chain ID: 1')).toBeInTheDocument();

    expect(screen.getByText('App Required')).toBeInTheDocument();
    expect(screen.getByText('Polygon PoS')).toBeInTheDocument();
    expect(screen.getByText('Chain ID: 137')).toBeInTheDocument();
  });

  it('displays auto-switch microcopy when wallet supports auto-switching', () => {
    renderModalInProvider(<ChainMismatchModal isOpen />, {
      initialWalletName: 'MetaMask',
    });

    expect(
      screen.getByText(/Click "Switch in wallet" to send a network change prompt directly to your MetaMask/i),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: /Switch wallet to Polygon PoS/i }),
    ).toBeInTheDocument();
  });

  it('displays manual-switch notice when wallet does NOT support auto-switching', () => {
    renderModalInProvider(<ChainMismatchModal isOpen />, {
      initialWalletName: 'WalletConnect',
    });

    expect(
      screen.getByText(/Your connected mobile wallet via WalletConnect does not support automatic network switching/i),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: /Manual network switch required in WalletConnect/i }),
    ).toBeDisabled();
  });

  it('handles offline / disconnected wallet state (edge case)', () => {
    renderModalInProvider(<ChainMismatchModal isOpen />, {
      initialIsWalletConnected: false,
    });

    expect(screen.getByText('Wallet Offline or Disconnected')).toBeInTheDocument();
    expect(
      screen.getByText(/Your wallet appears to be offline or disconnected/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('side-by-side-chips')).toBeNull();
  });

  it('handles unknown chain IDs gracefully with fallback name (edge case)', () => {
    renderModalInProvider(<ChainMismatchModal isOpen />, {
      initialConnectedChainId: 999999,
      initialAppChainId: 888888,
    });

    expect(screen.getByText('Unknown Network (Chain ID: 999999)')).toBeInTheDocument();
    expect(screen.getByText('Unknown Network (Chain ID: 888888)')).toBeInTheDocument();
  });

  it('expands manual switch step-by-step instructions on toggle click', async () => {
    const user = userEvent.setup();
    renderModalInProvider(<ChainMismatchModal isOpen />, {
      initialWalletName: 'MetaMask',
    });

    const helpToggle = screen.getByRole('button', {
      name: /How to switch networks manually in MetaMask/i,
    });
    expect(helpToggle).toBeInTheDocument();

    await user.click(helpToggle);

    expect(screen.getByTestId('manual-help-steps')).toBeInTheDocument();
    expect(screen.getByText(/Open the MetaMask extension/i)).toBeInTheDocument();
  });

  it('triggers switchWalletChain when primary action is clicked', async () => {
    const onSwitch = vi.fn();
    const user = userEvent.setup();

    renderModalInProvider(<ChainMismatchModal isOpen />, {
      onWalletSwitchRequested: onSwitch,
    });

    const switchBtn = screen.getByRole('button', { name: /Switch wallet to Polygon PoS/i });
    await user.click(switchBtn);

    expect(onSwitch).toHaveBeenCalledWith(137);
  });

  it('triggers changeAppChain when secondary action is clicked', async () => {
    const onAppChange = vi.fn();
    const user = userEvent.setup();

    renderModalInProvider(<ChainMismatchModal isOpen />, {
      onAppChainChanged: onAppChange,
    });

    const changeAppBtn = screen.getByRole('button', {
      name: /Change app network to Ethereum Mainnet/i,
    });
    await user.click(changeAppBtn);

    expect(onAppChange).toHaveBeenCalledWith(1);
  });

  it('closes modal when backdrop overlay is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderModalInProvider(<ChainMismatchModal isOpen onClose={onClose} />);

    const dialog = screen.getByRole('dialog');
    await user.click(dialog);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes modal when Escape key is pressed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderModalInProvider(<ChainMismatchModal isOpen onClose={onClose} />);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT close modal when clicking inside dialog content (e.target !== e.currentTarget)', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderModalInProvider(<ChainMismatchModal isOpen onClose={onClose} />);

    const dialogTitle = screen.getByText('Network Mismatch Detected');
    await user.click(dialogTitle);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('traps focus inside dialog on Tab and Shift+Tab key navigation', () => {
    renderModalInProvider(<ChainMismatchModal isOpen />);

    const closeBtn = screen.getByRole('button', { name: /Close network mismatch dialog/i });
    const dismissBtn = screen.getByRole('button', { name: /Dismiss/i });

    // Focus on first element and press Shift+Tab
    closeBtn.focus();
    fireEvent.keyDown(closeBtn, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(dismissBtn);

    // Focus on last element and press Tab
    dismissBtn.focus();
    fireEvent.keyDown(dismissBtn, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(closeBtn);
  });

  it('supports Rabby, Coinbase, Ledger, Phantom, and Generic wallet capabilities', () => {
    const wallets = ['Rabby Wallet', 'Coinbase Wallet', 'Ledger Hardware', 'Phantom', 'Custom Web3 Wallet'];

    wallets.forEach((walletName) => {
      const { unmount } = renderModalInProvider(<ChainMismatchModal isOpen />, {
        initialWalletName: walletName,
      });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      unmount();
    });
  });

  it('renders correctly under RTL layout mode (edge case)', () => {
    document.documentElement.setAttribute('dir', 'rtl');
    renderModalInProvider(<ChainMismatchModal isOpen />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    document.documentElement.removeAttribute('dir');
  });

  it('passes jest-axe accessibility audit', async () => {
    const { container } = renderModalInProvider(<ChainMismatchModal isOpen />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});


describe('ChainMismatchModal dismissal and derived open state (Issue fix)', () => {
  it('opens modal on mismatch without isOpen prop, and Dismiss closes it and keeps it closed', async () => {
    const user = userEvent.setup();
    render(
      <NetworkSwitcherProvider initialConnectedChainId={1} initialAppChainId={137}>
        <ChainMismatchModal />
      </NetworkSwitcherProvider>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Network Mismatch Detected')).toBeInTheDocument();

    const dismissBtn = screen.getByRole('button', { name: /Dismiss dialog/i });
    await user.click(dismissBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes modal on Escape key without isOpen prop and keeps it closed', async () => {
    const user = userEvent.setup();
    render(
      <NetworkSwitcherProvider initialConnectedChainId={1} initialAppChainId={137}>
        <ChainMismatchModal />
      </NetworkSwitcherProvider>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes modal on Close "X" button click without isOpen prop', async () => {
    const user = userEvent.setup();
    render(
      <NetworkSwitcherProvider initialConnectedChainId={1} initialAppChainId={137}>
        <ChainMismatchModal />
      </NetworkSwitcherProvider>,
    );

    const closeBtn = screen.getByRole('button', { name: /Close network mismatch dialog/i });
    await user.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('re-opens modal when connected chain changes to another mismatched chain after dismissal', async () => {
    const user = userEvent.setup();

    const Harness: React.FC = () => {
      const { setConnectedChainId } = useNetworkSwitcher();
      return (
        <div>
          <button onClick={() => setConnectedChainId(42161)}>Switch to Arbitrum</button>
          <button onClick={() => setConnectedChainId(137)}>Switch to Polygon</button>
          <ChainMismatchModal />
        </div>
      );
    };

    render(
      <NetworkSwitcherProvider initialConnectedChainId={1} initialAppChainId={137}>
        <Harness />
      </NetworkSwitcherProvider>,
    );

    // Initial mismatch on Ethereum (1 !== 137) opens modal
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Dismiss closes it
    const dismissBtn = screen.getByRole('button', { name: /Dismiss dialog/i });
    await user.click(dismissBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Changing connected chain to another mismatched chain (Arbitrum 42161 !== 137) re-opens it
    const arbitrumBtn = screen.getByRole('button', { name: /Switch to Arbitrum/i });
    await user.click(arbitrumBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Chain ID: 42161')).toBeInTheDocument();

    // Dismissing again on Arbitrum closes it
    await user.click(screen.getByRole('button', { name: /Dismiss dialog/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Changing to matching chain (Polygon 137) keeps it closed
    const polygonBtn = screen.getByRole('button', { name: /Switch to Polygon/i });
    await user.click(polygonBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('defaults provider to disconnected wallet so no mismatch exists until a wallet reports a chain', () => {
    render(
      <NetworkSwitcherProvider>
        <ChainMismatchModal />
      </NetworkSwitcherProvider>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('preserves persistent non-modal NetworkSwitcherBadge mismatch indicator after dismissal and allows re-opening', async () => {
    const user = userEvent.setup();

    const Harness: React.FC = () => {
      return (
        <div>
          <NetworkSwitcherBadge />
          <ChainMismatchModal />
        </div>
      );
    };

    render(
      <NetworkSwitcherProvider initialConnectedChainId={1} initialAppChainId={137}>
        <Harness />
      </NetworkSwitcherProvider>,
    );

    // Initial state: modal open, badge shows wrong network
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Wrong Network')).toBeInTheDocument();

    // Dismiss modal
    const dismissBtn = screen.getByRole('button', { name: /Dismiss dialog/i });
    await user.click(dismissBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Non-modal indicator remains active
    const badge = screen.getByTestId('network-switcher-badge');
    expect(badge).toHaveClass('ns-badge--mismatch');
    expect(screen.getByText('Wrong Network')).toBeInTheDocument();

    // Clicking badge re-opens the modal
    await user.click(badge);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
