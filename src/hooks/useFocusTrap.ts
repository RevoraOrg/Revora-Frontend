/**
 * useFocusTrap — shared keyboard focus-trap hook.
 *
 * Traps Tab/Shift+Tab within a container element while the trap is active.
 * Optionally captures and restores focus to the previously-focused element.
 *
 * Selector used:
 *   'button:not([disabled]):not([aria-disabled="true"]),
 *    [href],
 *    input:not([disabled]):not([aria-disabled="true"]),
 *    select:not([disabled]):not([aria-disabled="true"]),
 *    textarea:not([disabled]):not([aria-disabled="true"]),
 *    [tabindex]:not([tabindex="-1"])'
 *
 * This single selector is shared across all previously hand-rolled traps to
 * ensure consistent keyboard behaviour (e.g. <select> and <textarea> were
 * missing from some older selectors).
 *
 * Usage:
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   useFocusTrap(containerRef, isOpen, {
 *     returnFocus: true,          // restore focus on deactivation (default true)
 *     initialFocus: firstBtnRef,  // optional — which element to focus on activate
 *   });
 */

import { useEffect, useRef } from 'react';

/**
 * CSS selector for all normally-focusable, non-hidden, non-disabled elements.
 * Exported so components can use it directly when needed without duplicating it.
 */
export const FOCUSABLE_SELECTOR =
  'button:not([disabled]):not([aria-disabled="true"]),' +
  '[href],' +
  'input:not([disabled]):not([aria-disabled="true"]),' +
  'select:not([disabled]):not([aria-disabled="true"]),' +
  'textarea:not([disabled]):not([aria-disabled="true"]),' +
  '[tabindex]:not([tabindex="-1"])';

export interface UseFocusTrapOptions {
  /**
   * When true (default) the hook saves `document.activeElement` on activation
   * and restores focus to it when the trap is deactivated.
   */
  returnFocus?: boolean;
  /**
   * Optional ref to the element that should receive focus when the trap
   * activates. When omitted the first focusable child receives focus.
   */
  initialFocus?: React.RefObject<HTMLElement | null>;
}

/**
 * Activates a focus trap inside `containerRef` while `active` is `true`.
 *
 * @param containerRef  Ref to the trapping container (dialog, drawer, …).
 * @param active        Whether the trap should currently be active.
 * @param options       `returnFocus` and `initialFocus` controls.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  active: boolean,
  options: UseFocusTrapOptions = {},
): void {
  const { returnFocus = true, initialFocus } = options;
  const previousFocusRef = useRef<HTMLElement | null>(null);

  /* ── Capture / restore focus ───────────────────────────────────── */
  useEffect(() => {
    if (!returnFocus) return;

    if (active) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
    } else {
      const target = previousFocusRef.current;
      if (target && typeof target.focus === 'function' && document.contains(target)) {
        target.focus({ preventScroll: true });
      }
      previousFocusRef.current = null;
    }
  }, [active, returnFocus]);

  /* ── Initial focus + Tab trap ──────────────────────────────────── */
  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;

    // Move focus to the specified element, or the first focusable child.
    if (initialFocus?.current) {
      initialFocus.current.focus();
    } else {
      const first = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      first?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      // Re-query on every keydown so dynamically added/removed elements are
      // reflected without needing to close and re-open the trap.
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.closest('[inert]'));

      if (focusable.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const outside = !container.contains(active);

      if (e.shiftKey) {
        if (active === first || outside) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || outside) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [active, containerRef, initialFocus]);
}
