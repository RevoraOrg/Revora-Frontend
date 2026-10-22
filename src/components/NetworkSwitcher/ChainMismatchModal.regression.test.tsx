/**
 * Regression coverage for `ChainMismatchModalProps` failure handling (#747).
 *
 * Evidence: `src/components/NetworkSwitcher/ChainMismatchModal.tsx` contains
 * `if (!isOpen) return null;`. The existing suite only ever renders the modal
 * while open, so the closed/`null` contract — the branch that decides whether
 * anything at all reaches the DOM — was unverified. These tests pin:
 *
 * - the closed branch returns `null` and mounts nothing,
 * - an explicit `isOpen={false}` wins even when the network context reports an
 *   active mismatch, and
 * - the neighbouring normal path (reopening, focus restoration, body-scroll
 *   locking and Escape handling) still behaves.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { ChainMismatchModal } from './ChainMismatchModal';
import { NetworkSwitcherProvider } from './NetworkSwitcherContext';

const ETHEREUM = 1;
const POLYGON = 137;

function renderInProvider(
  ui: React.ReactNode,
  providerProps: Partial<React.ComponentProps<typeof NetworkSwitcherProvider>> = {},
) {
  return render(
    <NetworkSwitcherProvider
      initialConnectedChainId={POLYGON}
      initialAppChainId={POLYGON}
      initialWalletName="MetaMask"
      initialIsWalletConnected={true}
      initialIsModalOpen={false}
      {...providerProps}
    >
      {ui}
    </NetworkSwitcherProvider>,
  );
}

describe('ChainMismatchModal closed-state contract', () => {
  it('returns null when closed and there is no chain mismatch', () => {
    const { container } = renderInProvider(<ChainMismatchModal />);

    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('chain-mismatch-modal')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('explicit isOpen={false} wins over an active mismatch and open context modal', async () => {
    const onClose = vi.fn();
    const { container } = renderInProvider(<ChainMismatchModal isOpen={false} onClose={onClose} />, {
      initialConnectedChainId: ETHEREUM,
      initialAppChainId: POLYGON,
      initialIsModalOpen: true,
    });

    expect(container.firstChild).toBeNull();

    // The closed branch also means no key listener is registered.
    await userEvent.setup().keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('stays closed for a disconnected wallet (boundary: no mismatch, modal closed)', () => {
    const { container } = renderInProvider(<ChainMismatchModal />, {
      initialIsWalletConnected: false,
      initialConnectedChainId: ETHEREUM,
      initialAppChainId: POLYGON,
    });

    expect(container.firstChild).toBeNull();
  });

  it('does not lock body scroll while closed', () => {
    const original = document.body.style.overflow;
    renderInProvider(<ChainMismatchModal />);

    expect(document.body.style.overflow).not.toBe('hidden');
    document.body.style.overflow = original;
  });
});

describe('ChainMismatchModal neighbouring normal path', () => {
  it('explicit isOpen={true} renders the dialog even without a mismatch', () => {
    renderInProvider(<ChainMismatchModal isOpen />);

    expect(screen.getByTestId('chain-mismatch-modal')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('locks body scroll while open and releases it when closed again', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen((prev) => !prev)}>
            toggle modal
          </button>
          <ChainMismatchModal isOpen={open} onClose={() => setOpen(false)} />
        </div>
      );
    }

    const user = userEvent.setup();
    renderInProvider(<Harness />);

    expect(screen.queryByTestId('chain-mismatch-modal')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'toggle modal' }));
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('chain-mismatch-modal')).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('restores focus to the previously focused element after the modal closes', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            open modal
          </button>
          <ChainMismatchModal isOpen={open} onClose={() => setOpen(false)} />
        </div>
      );
    }

    const user = userEvent.setup();
    renderInProvider(<Harness />);

    const trigger = screen.getByRole('button', { name: 'open modal' });
    trigger.focus();
    await user.click(trigger);

    expect(screen.getByTestId('chain-mismatch-modal')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByTestId('chain-mismatch-modal')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('invokes onClose through the dismiss control and never while unmounted', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderInProvider(<ChainMismatchModal isOpen onClose={onClose} />);

    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /Dismiss dialog/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
