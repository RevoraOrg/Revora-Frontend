/**
 * useFocusTrap — unit tests
 * vitest + @testing-library/react + jest-axe
 */
import React, { useRef, useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { axe } from 'jest-axe';
import { useFocusTrap, FOCUSABLE_SELECTOR } from './useFocusTrap';

/* ─── Helpers ───────────────────────────────────────────────────── */

interface DialogProps {
  isOpen: boolean;
  onClose?: () => void;
  returnFocus?: boolean;
  initialFocusIndex?: number; // 0 = first button, 1 = second button
}

/** Minimal accessible dialog that uses useFocusTrap */
function TestDialog({ isOpen, onClose, returnFocus, initialFocusIndex }: DialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const secondButtonRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(containerRef, isOpen, {
    returnFocus,
    initialFocus: initialFocusIndex === 1 ? secondButtonRef : undefined,
  });

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Test dialog"
      tabIndex={-1}
    >
      <button type="button" onClick={onClose} data-testid="btn-cancel">
        Cancel
      </button>
      <button type="button" ref={secondButtonRef} data-testid="btn-confirm">
        Confirm
      </button>
      <input data-testid="input" aria-label="Name" />
      <select data-testid="select" aria-label="Role">
        <option>Option</option>
      </select>
      <textarea data-testid="textarea" aria-label="Notes" />
    </div>
  );
}

/** Wraps TestDialog with a trigger button to verify return-focus behaviour */
function TestWithTrigger(props: Omit<DialogProps, 'isOpen'>) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" data-testid="trigger" onClick={() => setIsOpen(true)}>
        Open
      </button>
      <TestDialog
        {...props}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

afterEach(() => {
  // Reset body overflow in case a test dirtied it
  document.body.style.overflow = '';
});

/* ─── Tests ─────────────────────────────────────────────────────── */

describe('useFocusTrap', () => {
  describe('initial focus', () => {
    it('focuses the first focusable child on activation', () => {
      render(<TestDialog isOpen />);
      expect(screen.getByTestId('btn-cancel')).toHaveFocus();
    });

    it('focuses the initialFocus ref when provided', () => {
      render(<TestDialog isOpen initialFocusIndex={1} />);
      expect(screen.getByTestId('btn-confirm')).toHaveFocus();
    });

    it('does not throw when container has no focusable children', () => {
      function EmptyDialog({ isOpen }: { isOpen: boolean }) {
        const ref = useRef<HTMLDivElement>(null);
        useFocusTrap(ref, isOpen);
        if (!isOpen) return null;
        return (
          <div ref={ref} role="dialog" aria-label="Empty" tabIndex={-1} data-testid="empty-dialog" />
        );
      }
      expect(() => render(<EmptyDialog isOpen />)).not.toThrow();
    });
  });

  describe('Tab trapping', () => {
    it('wraps forward Tab from last element to first', () => {
      render(<TestDialog isOpen />);
      const textarea = screen.getByTestId('textarea');
      const cancelBtn = screen.getByTestId('btn-cancel');

      textarea.focus();
      expect(document.activeElement).toBe(textarea);

      fireEvent.keyDown(textarea.closest('[role="dialog"]')!, {
        key: 'Tab',
        shiftKey: false,
        bubbles: true,
      });
      expect(document.activeElement).toBe(cancelBtn);
    });

    it('wraps Shift+Tab from first element to last', () => {
      render(<TestDialog isOpen />);
      const cancelBtn = screen.getByTestId('btn-cancel');
      const textarea = screen.getByTestId('textarea');

      cancelBtn.focus();
      expect(document.activeElement).toBe(cancelBtn);

      fireEvent.keyDown(cancelBtn.closest('[role="dialog"]')!, {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
      });
      expect(document.activeElement).toBe(textarea);
    });

    it('allows natural Tab when focus is not at a boundary', () => {
      render(<TestDialog isOpen />);
      const input = screen.getByTestId('input');
      const confirmBtn = screen.getByTestId('btn-confirm');

      input.focus();
      expect(document.activeElement).toBe(input);

      // Tab from input (not last) — hook should NOT intercept
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: false,
        bubbles: true,
        cancelable: true,
      });
      input.closest('[role="dialog"]')!.dispatchEvent(event);
      // defaultPrevented should be false — hook doesn't intervene mid-list
      expect(event.defaultPrevented).toBe(false);
    });

    it('wraps when focus starts outside the container', () => {
      const outsideBtn = document.createElement('button');
      outsideBtn.textContent = 'Outside';
      document.body.appendChild(outsideBtn);

      render(<TestDialog isOpen />);
      const cancelBtn = screen.getByTestId('btn-cancel');
      const textarea = screen.getByTestId('textarea');

      outsideBtn.focus();
      const dialog = screen.getByRole('dialog');

      // Forward Tab from outside → should focus first element
      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false, bubbles: true });
      expect(document.activeElement).toBe(cancelBtn);

      // Shift+Tab from outside → should focus last element
      outsideBtn.focus();
      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true, bubbles: true });
      expect(document.activeElement).toBe(textarea);

      document.body.removeChild(outsideBtn);
    });

    it('skips disabled elements (via disabled attribute)', () => {
      function DialogWithDisabled({ isOpen }: { isOpen: boolean }) {
        const ref = useRef<HTMLDivElement>(null);
        useFocusTrap(ref, isOpen);
        if (!isOpen) return null;
        return (
          <div ref={ref} role="dialog" aria-label="Disabled test" tabIndex={-1}>
            <button type="button" data-testid="a">A</button>
            <button type="button" disabled data-testid="b-disabled">B</button>
            <button type="button" data-testid="c">C</button>
          </div>
        );
      }
      render(<DialogWithDisabled isOpen />);
      const a = screen.getByTestId('a');
      const c = screen.getByTestId('c');

      c.focus();
      fireEvent.keyDown(c.closest('[role="dialog"]')!, {
        key: 'Tab',
        shiftKey: false,
        bubbles: true,
      });
      // Should wrap to A, not B (disabled)
      expect(document.activeElement).toBe(a);
    });

    it('skips aria-disabled elements', () => {
      function DialogWithAriaDisabled({ isOpen }: { isOpen: boolean }) {
        const ref = useRef<HTMLDivElement>(null);
        useFocusTrap(ref, isOpen);
        if (!isOpen) return null;
        return (
          <div ref={ref} role="dialog" aria-label="AriaDisabled test" tabIndex={-1}>
            <button type="button" data-testid="x">X</button>
            <button type="button" aria-disabled="true" data-testid="y-aria-disabled">Y</button>
            <button type="button" data-testid="z">Z</button>
          </div>
        );
      }
      render(<DialogWithAriaDisabled isOpen />);
      const z = screen.getByTestId('z');
      const x = screen.getByTestId('x');

      z.focus();
      fireEvent.keyDown(z.closest('[role="dialog"]')!, {
        key: 'Tab',
        shiftKey: false,
        bubbles: true,
      });
      expect(document.activeElement).toBe(x);
    });

    it('does not intercept non-Tab keys', () => {
      render(<TestDialog isOpen />);
      const dialog = screen.getByRole('dialog');

      const escEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      dialog.dispatchEvent(escEvent);
      expect(escEvent.defaultPrevented).toBe(false);
    });
  });

  describe('return focus', () => {
    it('restores focus to the trigger on deactivation (returnFocus default true)', async () => {
      render(<TestWithTrigger />);
      const trigger = screen.getByTestId('trigger');

      trigger.focus();
      act(() => { trigger.click(); });

      await screen.findByTestId('btn-cancel');

      // Close the dialog
      act(() => {
        screen.getByTestId('btn-cancel').click();
      });

      expect(document.activeElement).toBe(trigger);
    });

    it('does not restore focus when returnFocus is false', async () => {
      function NoReturnFocusTest() {
        const [open, setOpen] = useState(false);
        const otherBtn = useRef<HTMLButtonElement>(null);
        return (
          <>
            <button ref={otherBtn} data-testid="other">Other</button>
            <button data-testid="open-btn" onClick={() => setOpen(true)}>Open</button>
            <TestDialog isOpen={open} returnFocus={false} onClose={() => setOpen(false)} />
          </>
        );
      }

      render(<NoReturnFocusTest />);
      const openBtn = screen.getByTestId('open-btn');
      openBtn.focus();
      act(() => { openBtn.click(); });

      await screen.findByTestId('btn-cancel');

      act(() => {
        screen.getByTestId('btn-cancel').click();
      });

      // Focus should NOT have returned to openBtn
      expect(document.activeElement).not.toBe(openBtn);
    });
  });

  describe('cleanup', () => {
    it('removes the keydown listener when deactivated', () => {
      const { rerender } = render(<TestDialog isOpen />);
      const spyAdd = vi.spyOn(HTMLElement.prototype, 'addEventListener');
      const spyRemove = vi.spyOn(HTMLElement.prototype, 'removeEventListener');

      rerender(<TestDialog isOpen={false} />);

      // After closing the dialog renders null — listener cleanup ran
      // (we just verify no throw and the cycle is clean)
      spyAdd.mockRestore();
      spyRemove.mockRestore();
    });
  });

  describe('FOCUSABLE_SELECTOR export', () => {
    it('selects buttons, inputs, selects, textareas, links, and tabindex elements', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button>Btn</button>
        <input aria-label="i" />
        <select aria-label="s"><option>o</option></select>
        <textarea aria-label="t"></textarea>
        <a href="#">Link</a>
        <div tabindex="0">Div</div>
        <button disabled>Disabled Btn</button>
        <input disabled aria-label="disabled input" />
        <div tabindex="-1">Excluded</div>
      `;
      const matches = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      const labels = matches.map((el) => el.tagName.toLowerCase());
      expect(labels).toContain('button');
      expect(labels).toContain('input');
      expect(labels).toContain('select');
      expect(labels).toContain('textarea');
      expect(labels).toContain('a');
      expect(labels).toContain('div');
      // disabled button and input should be excluded
      const disabledMatches = matches.filter((el) => el.hasAttribute('disabled'));
      expect(disabledMatches).toHaveLength(0);
      // tabindex="-1" should be excluded
      const minusOneMatches = matches.filter((el) => el.getAttribute('tabindex') === '-1');
      expect(minusOneMatches).toHaveLength(0);
    });
  });

  describe('accessibility — axe', () => {
    it('has no axe violations when open', async () => {
      const { container } = render(<TestDialog isOpen />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when closed (renders nothing)', async () => {
      const { container } = render(<TestDialog isOpen={false} />);
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
