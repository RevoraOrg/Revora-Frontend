/**
 * Focused behavior suite for the ErrorRecoveryPanel barrel entrypoint
 * (`src/components/ErrorRecoveryPanel/index.ts`, Issue #712).
 *
 * The existing `ErrorRecoveryPanel.test.tsx` exercises the component by
 * importing it directly and only covers render / grouped list / clear-all /
 * discard. This fixture goes through the public module entrypoint (`./index`)
 * and pins the parts of the panel's contract that were previously unverified:
 * retry semantics, dismissal (Escape / overlay / close button), focus
 * management, the keyboard focus trap, live region copy, group ordering and
 * the static a11y wiring.
 */

import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as barrel from './index';
import * as componentModule from './ErrorRecoveryPanel';
import { ErrorRecoveryPanel, type ErrorRecoveryPanelProps } from './index';
import { useErrorSnapshots, resetGlobalState } from '../../hooks/useErrorSnapshots';
import type { SnapshotGroup } from '../../hooks/useErrorSnapshots';

/* ─── helpers ───────────────────────────────────────────────────────────── */

interface Seed {
  group: SnapshotGroup;
  title: string;
  description?: string;
  onRetry?: () => void | Promise<void>;
  onDiscard?: () => void | Promise<void>;
}

/** Seeds snapshots into the shared global store, then renders the barrel entrypoint. */
function renderPanel(
  seeds: Seed[],
  props: Partial<Omit<ErrorRecoveryPanelProps, 'isOpen'>> & { isOpen?: boolean } = {},
) {
  const addRef: { current: ((s: Seed) => void) | null } = { current: null };
  const close = props.onClose ?? vi.fn();

  function Harness() {
    const { addSnapshot } = useErrorSnapshots();
    React.useEffect(() => {
      addRef.current = (s: Seed) => {
        addSnapshot(s);
      };
    }, [addSnapshot]);
    return null;
  }

  const view = render(
    <>
      <Harness />
      <ErrorRecoveryPanel
        isOpen={props.isOpen ?? true}
        onClose={close}
        triggerRef={props.triggerRef}
      />
    </>,
  );

  act(() => {
    for (const seed of seeds) addRef.current?.(seed);
  });

  return { ...view, close };
}

beforeEach(() => {
  resetGlobalState();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/* ─── module contract ───────────────────────────────────────────────────── */

describe('index barrel', () => {
  it('re-exports the same ErrorRecoveryPanel implementation as the component module', () => {
    expect(barrel.ErrorRecoveryPanel).toBe(componentModule.ErrorRecoveryPanel);
  });

  it('exposes no unexpected runtime additions beyond the component', () => {
    // Type-only exports disappear at runtime; the barrel should surface exactly
    // the component value.
    expect(Object.keys(barrel)).toEqual(['ErrorRecoveryPanel']);
  });
});

/* ─── lifecycle / empty state ───────────────────────────────────────────── */

describe('ErrorRecoveryPanel via barrel — lifecycle', () => {
  it('renders nothing while closed', () => {
    render(
      <ErrorRecoveryPanel isOpen={false} onClose={vi.fn()} />,
    );
    expect(screen.queryByTestId('error-panel')).toBeNull();
    expect(screen.queryByTestId('error-panel-overlay')).toBeNull();
  });

  it('renders the empty state and hides Clear All when there are no snapshots', () => {
    renderPanel([]);
    expect(screen.getByTestId('error-panel-empty')).toBeInTheDocument();
    expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
    expect(screen.queryByText('Clear All')).toBeNull();
  });

  it('pluralises the recoverable-count subtitle', () => {
    renderPanel([{ group: 'Forms', title: 'One' }]);
    expect(screen.getByText('1 recoverable item')).toBeInTheDocument();

    cleanup();
    resetGlobalState();

    renderPanel([
      { group: 'Forms', title: 'One' },
      { group: 'Forms', title: 'Two' },
    ]);
    expect(screen.getByText('2 recoverable items')).toBeInTheDocument();
  });
});

/* ─── grouping / rendering ──────────────────────────────────────────────── */

describe('grouping and row rendering', () => {
  it('orders groups by the canonical GROUP_ORDER, not insertion order', () => {
    renderPanel([
      { group: 'Other', title: 'other-item' },
      { group: 'Uploads', title: 'uploads-item' },
      { group: 'Forms', title: 'forms-item' },
      { group: 'Transactions', title: 'tx-item' },
    ]);

    const titles = screen
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(titles).toEqual(['Transactions', 'Forms', 'Uploads', 'Other']);
  });

  it('renders the description only when the snapshot provides one', () => {
    renderPanel([
      { group: 'Forms', title: 'With desc', description: 'a helpful hint' },
      { group: 'Forms', title: 'Without desc' },
    ]);

    expect(screen.getByText('a helpful hint')).toBeInTheDocument();
    expect(screen.getAllByTestId('error-item')).toHaveLength(2);
  });

  it('exposes a labelled Retry/Discard pair per row', () => {
    renderPanel([{ group: 'Forms', title: 'Save draft' }]);

    expect(screen.getByLabelText('Retry Save draft')).toBeInTheDocument();
    expect(screen.getByLabelText('Discard Save draft')).toBeInTheDocument();
  });
});

/* ─── retry / discard / clear-all ───────────────────────────────────────── */

describe('recovery actions', () => {
  it('invokes onRetry and removes only that row', () => {
    const onRetry = vi.fn();
    const onDiscard = vi.fn();
    renderPanel([
      { group: 'Forms', title: 'A', onRetry, onDiscard },
      { group: 'Forms', title: 'B' },
    ]);

    fireEvent.click(screen.getByLabelText('Retry A'));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onDiscard).not.toHaveBeenCalled();
    expect(screen.queryByText('A')).toBeNull();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('invokes onDiscard and removes only that row', () => {
    const onRetry = vi.fn();
    const onDiscard = vi.fn();
    renderPanel([
      { group: 'Forms', title: 'A', onRetry, onDiscard },
      { group: 'Forms', title: 'B' },
    ]);

    fireEvent.click(screen.getByLabelText('Discard A'));

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
    expect(screen.queryByText('A')).toBeNull();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('tolerates snapshots without onRetry/onDiscard callbacks', () => {
    renderPanel([{ group: 'Other', title: 'No callbacks' }]);

    expect(() => fireEvent.click(screen.getByLabelText('Retry No callbacks'))).not.toThrow();
    expect(screen.queryByText('No callbacks')).toBeNull();
  });

  it('clears every row via Clear All and falls back to the empty state', () => {
    renderPanel([
      { group: 'Forms', title: 'A' },
      { group: 'Uploads', title: 'B' },
    ]);

    fireEvent.click(screen.getByText('Clear All'));

    expect(screen.getByTestId('error-panel-empty')).toBeInTheDocument();
    expect(screen.queryAllByTestId('error-item')).toHaveLength(0);
  });
});

/* ─── dismissal ─────────────────────────────────────────────────────────── */

describe('dismissal', () => {
  it('closes on the close button', () => {
    const { close } = renderPanel([]);
    fireEvent.click(screen.getByTestId('error-panel-close-btn'));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('closes when the overlay is clicked', () => {
    const { close } = renderPanel([]);
    fireEvent.click(screen.getByTestId('error-panel-overlay'));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape while open and stops listening once closed', () => {
    const close = vi.fn();
    const view = renderPanel([], { onClose: close });

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(close).toHaveBeenCalledTimes(1);

    // Rerender closed: the keydown listener must be removed.
    view.rerender(<ErrorRecoveryPanel isOpen={false} onClose={close} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('ignores non-Escape keys', () => {
    const { close } = renderPanel([]);
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'a' });
    expect(close).not.toHaveBeenCalled();
  });
});

/* ─── focus management + trap ───────────────────────────────────────────── */

describe('focus management', () => {
  it('moves focus to the close button shortly after opening', () => {
    vi.useFakeTimers();
    renderPanel([]);
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(screen.getByTestId('error-panel-close-btn')).toHaveFocus();
  });

  it('returns focus to the element that was focused when the panel opened', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const triggerRef = { current: trigger };

    const close = vi.fn();
    const view = renderPanel([], { onClose: close, triggerRef });

    view.rerender(<ErrorRecoveryPanel isOpen={false} onClose={close} triggerRef={triggerRef} />);
    expect(trigger).toHaveFocus();

    trigger.remove();
  });

  it('wraps Tab from the last focusable back to the first', () => {
    renderPanel([{ group: 'Forms', title: 'A' }]);
    const panel = screen.getByTestId('error-panel');
    const focusables = panel.querySelectorAll<HTMLElement>('button');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    last.focus();
    expect(last).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(first).toHaveFocus();
  });

  it('wraps Shift+Tab from the first focusable to the last', () => {
    renderPanel([{ group: 'Forms', title: 'A' }]);
    const panel = screen.getByTestId('error-panel');
    const focusables = panel.querySelectorAll<HTMLElement>('button');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    first.focus();
    expect(first).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });
});

/* ─── static a11y wiring ────────────────────────────────────────────────── */

describe('static a11y wiring', () => {
  it('marks the panel as a modal dialog labelled by its title', () => {
    renderPanel([]);
    const panel = screen.getByTestId('error-panel');
    expect(panel).toHaveAttribute('role', 'dialog');
    expect(panel).toHaveAttribute('aria-modal', 'true');
    expect(panel).toHaveAttribute('aria-labelledby', 'error-panel-title');
    expect(screen.getByText('Recovery Snapshots')).toHaveAttribute('id', 'error-panel-title');
  });

  it('hides the overlay from assistive technology and labels the close control', () => {
    renderPanel([]);
    expect(screen.getByTestId('error-panel-overlay')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('error-panel-close-btn')).toHaveAttribute(
      'aria-label',
      'Close recovery panel',
    );
  });
});
