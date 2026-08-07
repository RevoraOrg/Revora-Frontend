import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFocusTrap } from './useFocusTrap';

// Minimal harness so the hook can be exercised directly, independent of
// DistributionFilterToolbar, including the empty-container fallback branch
// that no real popover in the app currently triggers (every popover always
// renders at least one focusable option).
function TrapHarness({
  withFocusables,
  withMiddleItem,
}: {
  withFocusables: boolean;
  withMiddleItem?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useFocusTrap<HTMLDivElement>(open);

  return (
    <div>
      <button data-testid="trigger" onClick={() => setOpen(true)}>
        Open
      </button>
      {open && (
        <div ref={panelRef} data-testid="panel">
          {withFocusables && (
            <>
              <button data-testid="first">First</button>
              {withMiddleItem && <button data-testid="middle">Middle</button>}
              <button data-testid="last">Last</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

describe('useFocusTrap', () => {
  it('focuses the container itself when it has no focusable children', async () => {
    const user = userEvent.setup();
    render(<TrapHarness withFocusables={false} />);

    await user.click(screen.getByTestId('trigger'));

    const panel = screen.getByTestId('panel');
    expect(panel).toHaveAttribute('tabindex', '-1');
    expect(document.activeElement).toBe(panel);
  });

  it('wraps Shift+Tab from the first focusable back to the last', async () => {
    const user = userEvent.setup();
    render(<TrapHarness withFocusables={true} />);

    await user.click(screen.getByTestId('trigger'));

    const first = screen.getByTestId('first');
    const last = screen.getByTestId('last');
    expect(document.activeElement).toBe(first);

    await user.tab({ shift: true });

    expect(document.activeElement).toBe(last);
  });

  it('does not throw when Tab is pressed while there are no focusable children', async () => {
    const user = userEvent.setup();
    render(<TrapHarness withFocusables={false} />);

    await user.click(screen.getByTestId('trigger'));
    const panel = screen.getByTestId('panel');
    expect(document.activeElement).toBe(panel);

    // Should hit the early-return branch in the keydown handler rather
    // than throwing on `current[0]` / `current[current.length - 1]`.
    await expect(user.keyboard('{Tab}')).resolves.not.toThrow();
  });

  it('does not intercept Tab when moving between non-boundary elements', async () => {
    const user = userEvent.setup();
    render(<TrapHarness withFocusables={true} withMiddleItem={true} />);

    await user.click(screen.getByTestId('trigger'));
    const middle = screen.getByTestId('middle');

    middle.focus();
    await user.tab();

    // Moving forward from the middle item is not a boundary case — the
    // trap should let it proceed to "last" without any special handling.
    expect(document.activeElement).toBe(screen.getByTestId('last'));
  });
});
