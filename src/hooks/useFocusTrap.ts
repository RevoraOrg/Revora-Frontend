import { useEffect, useRef } from 'react';

/**
 * Traps Tab/Shift+Tab focus inside a container while it's open, moves focus
 * to the first focusable element on open, and returns focus to whatever was
 * focused before open (normally the trigger button) when it closes —
 * whether closed via Escape, outside click, or an explicit Apply/Close action.
 *
 * Usage:
 *   const panelRef = useFocusTrap<HTMLDivElement>(openPopover === 'date');
 *   <div ref={panelRef} role="dialog"> ... </div>
 */
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap<T extends HTMLElement>(isOpen: boolean) {
  const containerRef = useRef<T>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Remember whatever had focus before this container opened (the trigger).
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    /* v8 ignore next 2 -- defensive guard; React attaches the ref before
       this effect runs for any mounted panel, so this branch is unreachable
       in normal operation and is not worth a contrived test. */
    if (!container) return;

    // NOTE: deliberately not filtering by `offsetParent` here — jsdom (and
    // some other non-layout test environments) never populates it, which
    // silently breaks the trap under test even though it works visually in
    // a real browser. Every open popover/sheet in this component is fully
    // visible while mounted, so a plain selector match is sufficient and
    // test-environment-safe.
    const getFocusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

    const focusables = getFocusables();
    const first = focusables[0];

    if (first) {
      first.focus();
    } else {
      container.setAttribute('tabindex', '-1');
      container.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const current = getFocusables();
      if (current.length === 0) return;
      const firstEl = current[0];
      const lastEl = current[current.length - 1];

      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Return focus to the trigger that opened this container.
      previouslyFocusedRef.current?.focus?.();
    };
  }, [isOpen]);

  return containerRef;
}
