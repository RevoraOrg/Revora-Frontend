/**
 * Dedicated behavior coverage for `NetworkSwitcherPanel`.
 *
 * The panel is the interactive popover behind `NetworkSwitcher`. It reads and
 * writes recents through `useRecentNetworks`, so every case runs inside a
 * `RecentNetworksProvider`. Covered contract:
 *
 *  - listbox/option roles and the current-network selection marker;
 *  - the recent-vs-all partitioning and the "No networks available" empty state;
 *  - selection dispatch (`onNetworkChange`) and recent-recording;
 *  - keyboard roving focus (ArrowUp/ArrowDown wrap, Home, End, Escape);
 *  - dismissal via the Close button and an outside pointer press;
 *  - representative invalid inputs: an empty network list and a single network.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NetworkSwitcherPanel } from './NetworkSwitcherPanel';
import type { Network } from './NetworkSwitcher';
import { RecentNetworksProvider } from '../RecentNetworksProvider/RecentNetworksProvider';

// ─── localStorage harness ────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

const networks: Network[] = [
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'polygon', name: 'Polygon' },
  { id: 'solana', name: 'Solana' },
  { id: 'arbitrum', name: 'Arbitrum' },
];

function renderPanel(ui: React.ReactElement) {
  return render(<RecentNetworksProvider>{ui}</RecentNetworksProvider>);
}

function baseProps() {
  return {
    networks,
    currentNetworkId: undefined as string | undefined,
    onNetworkChange: vi.fn(),
    onClose: vi.fn(),
  };
}

beforeEach(() => {
  localStorageMock.clear();
});

// ─── rendering & selection contract ──────────────────────────────────────────

describe('NetworkSwitcherPanel rendering', () => {
  it('renders a labelled listbox with every network as an option', () => {
    renderPanel(<NetworkSwitcherPanel {...baseProps()} />);

    const listbox = screen.getByRole('listbox', { name: 'Select a network' });
    expect(listbox).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(networks.length);
    networks.forEach((n) => expect(screen.getByText(n.name)).toBeInTheDocument());
  });

  it('marks the current network as selected', () => {
    renderPanel(<NetworkSwitcherPanel {...baseProps()} currentNetworkId="solana" />);

    expect(screen.getByRole('option', { name: 'Solana' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('option', { name: 'Polygon' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('shows no selected option when currentNetworkId is unknown', () => {
    renderPanel(<NetworkSwitcherPanel {...baseProps()} currentNetworkId="does-not-exist" />);

    const selected = screen
      .getAllByRole('option')
      .filter((o) => o.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(0);
  });
});

// ─── selection & recents ─────────────────────────────────────────────────────

describe('NetworkSwitcherPanel selection', () => {
  it('forwards the chosen network id', () => {
    const props = baseProps();
    renderPanel(<NetworkSwitcherPanel {...props} />);

    fireEvent.click(screen.getByRole('option', { name: 'Polygon' }));

    expect(props.onNetworkChange).toHaveBeenCalledWith('polygon');
    expect(props.onNetworkChange).toHaveBeenCalledTimes(1);
  });

  it('records the selection as a recent network and splits recents from the rest', () => {
    renderPanel(<NetworkSwitcherPanel {...baseProps()} />);

    fireEvent.click(screen.getByRole('option', { name: 'Ethereum' }));

    expect(screen.getByText('Recent Networks')).toBeInTheDocument();
    expect(screen.getByRole('separator')).toBeInTheDocument();
    // All four networks still reachable; the recent one is rendered in the recents list.
    expect(screen.getAllByRole('option')).toHaveLength(networks.length);
  });

  it('keeps the most recent selection first and de-duplicates re-selection', () => {
    renderPanel(<NetworkSwitcherPanel {...baseProps()} />);

    fireEvent.click(screen.getByRole('option', { name: 'Ethereum' }));
    fireEvent.click(screen.getByRole('option', { name: 'Polygon' }));
    // Re-select an already-recent network.
    fireEvent.click(screen.getByRole('option', { name: 'Ethereum' }));

    const recentsList = screen.getByText('Recent Networks').nextElementSibling as HTMLElement;
    const recentOptions = Array.from(recentsList.querySelectorAll('[role="option"]')).map(
      (el) => el.textContent,
    );
    expect(recentOptions).toEqual(['Ethereum', 'Polygon']);
  });
});

// ─── empty / invalid inputs ──────────────────────────────────────────────────

describe('NetworkSwitcherPanel invalid inputs', () => {
  it('renders the empty state when no networks are configured', () => {
    renderPanel(<NetworkSwitcherPanel {...baseProps()} networks={[]} />);

    expect(screen.getByText('No networks available')).toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('renders a single network and wraps arrow navigation back to itself', () => {
    renderPanel(
      <NetworkSwitcherPanel {...baseProps()} networks={[{ id: 'solo', name: 'Solo' }]} />,
    );

    const listbox = screen.getByRole('listbox');
    const option = screen.getByRole('option', { name: 'Solo' });
    option.focus();

    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(option);
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(option);
  });
});

// ─── keyboard contract ───────────────────────────────────────────────────────

describe('NetworkSwitcherPanel keyboard navigation', () => {
  function renderWithFocus() {
    renderPanel(<NetworkSwitcherPanel {...baseProps()} />);
    const listbox = screen.getByRole('listbox');
    const options = screen.getAllByRole('option');
    options[0].focus();
    return { listbox, options };
  }

  it('moves focus down and wraps past the last option', () => {
    const { listbox, options } = renderWithFocus();

    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(options[1]);

    options[options.length - 1].focus();
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(options[0]);
  });

  it('moves focus up and wraps past the first option', () => {
    const { listbox, options } = renderWithFocus();

    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(options[options.length - 1]);
  });

  it('jumps to the first and last option with Home and End', () => {
    const { listbox, options } = renderWithFocus();

    fireEvent.keyDown(listbox, { key: 'End' });
    expect(document.activeElement).toBe(options[options.length - 1]);

    fireEvent.keyDown(listbox, { key: 'Home' });
    expect(document.activeElement).toBe(options[0]);
  });

  it('closes on Escape', () => {
    const props = baseProps();
    renderPanel(<NetworkSwitcherPanel {...props} />);

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});

// ─── dismissal contract ──────────────────────────────────────────────────────

describe('NetworkSwitcherPanel dismissal', () => {
  it('closes when the Close button is pressed', () => {
    const props = baseProps();
    renderPanel(<NetworkSwitcherPanel {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on an outside pointer press but not on an inside press', () => {
    const props = baseProps();
    renderPanel(<NetworkSwitcherPanel {...props} />);

    fireEvent.mouseDown(screen.getByRole('listbox'));
    expect(props.onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(document.body);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('detaches the outside-press listener on unmount', () => {
    const props = baseProps();
    const { unmount } = renderPanel(<NetworkSwitcherPanel {...props} />);

    unmount();
    fireEvent.mouseDown(document.body);

    expect(props.onClose).not.toHaveBeenCalled();
  });
});
