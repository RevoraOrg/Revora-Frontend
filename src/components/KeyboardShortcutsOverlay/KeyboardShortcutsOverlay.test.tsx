import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeyboardShortcutsOverlay } from './KeyboardShortcutsOverlay';
import { KEYBOARD_SHORTCUT_GROUPS } from './shortcutsData';

const noop = () => {};

describe('KeyboardShortcutsOverlay', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  describe('rendering', () => {
    it('renders dialog with correct ARIA attributes when open', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('renders title as h2', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      expect(
        screen.getByRole('heading', { level: 2, name: 'Keyboard Shortcuts' }),
      ).toBeInTheDocument();
    });

    it('renders shortcut groups with h3 headings', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      KEYBOARD_SHORTCUT_GROUPS.forEach((group) => {
        expect(
          screen.getByRole('heading', { level: 3, name: group.title }),
        ).toBeInTheDocument();
      });
    });

    it('renders all shortcut labels from data', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      KEYBOARD_SHORTCUT_GROUPS.forEach((group) => {
        group.shortcuts.forEach((shortcut) => {
          expect(screen.getByText(shortcut.label)).toBeInTheDocument();
        });
      });
    });

    it('renders close button with aria-label', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      const closeBtn = screen.getByRole('button', {
        name: 'Close keyboard shortcuts',
      });
      expect(closeBtn).toBeInTheDocument();
    });

    it('renders SVG icon inside close button', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

    const closeBtn = screen.getByRole('button', {
      name: 'Close keyboard shortcuts',
    });
    const svg = closeBtn.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

    it('renders footer hint', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      const footerText = document.querySelector('.shortcuts-footer-text');
      expect(footerText).toBeInTheDocument();
      expect(footerText?.textContent).toContain('Press');
      expect(footerText?.textContent).toContain('to toggle at any time');
    });

    it('renders kbd elements for each shortcut key', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      const kbdElements = document.querySelectorAll('.shortcut-key');
      expect(kbdElements.length).toBeGreaterThan(0);
    });
  });

  describe('conditional rendering', () => {
    it('does not render when isOpen is false', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={false}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not render when isMobile is true', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={true}
        />,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not render when both isOpen false and isMobile true', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={false}
          onClose={noop}
          isMac={false}
          isMobile={true}
        />,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('close behavior', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={onClose}
          isMac={false}
          isMobile={false}
        />,
      );

      fireEvent.click(
        screen.getByRole('button', { name: 'Close keyboard shortcuts' }),
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape is pressed on close button', () => {
      const onClose = vi.fn();
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={onClose}
          isMac={false}
          isMobile={false}
        />,
      );

      const closeBtn = screen.getByRole('button', {
        name: 'Close keyboard shortcuts',
      });
      fireEvent.keyDown(closeBtn, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape is pressed on dialog interior', () => {
      const onClose = vi.fn();
      const { container } = render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={onClose}
          isMac={false}
          isMobile={false}
        />,
      );

      const dialog = container.querySelector('.shortcuts-dialog')!;
      fireEvent.keyDown(dialog, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={onClose}
          isMac={false}
          isMobile={false}
        />,
      );

      fireEvent.click(screen.getByRole('dialog'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onClose when dialog interior is clicked', () => {
      const onClose = vi.fn();
      const { container } = render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={onClose}
          isMac={false}
          isMobile={false}
        />,
      );

      const dialog = container.querySelector('.shortcuts-dialog')!;
      fireEvent.click(dialog);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('Escape event calls preventDefault', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      const closeBtn = screen.getByRole('button', {
        name: 'Close keyboard shortcuts',
      });

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      const spy = vi.spyOn(event, 'preventDefault');

      closeBtn.dispatchEvent(event);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('focus management', () => {
    it('focuses the close button on open', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      expect(
        screen.getByRole('button', { name: 'Close keyboard shortcuts' }),
      ).toHaveFocus();
    });

    it('restores focus to trigger element on close', () => {
      const triggerBtn = document.createElement('button');
      triggerBtn.textContent = 'Trigger';
      document.body.appendChild(triggerBtn);

      triggerBtn.focus();
      expect(document.activeElement).toBe(triggerBtn);

      const { rerender } = render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      rerender(
        <KeyboardShortcutsOverlay
          isOpen={false}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      expect(document.activeElement).toBe(triggerBtn);
      document.body.removeChild(triggerBtn);
    });

    it('restores focus correctly after multiple open/close cycles', () => {
      const triggerBtn = document.createElement('button');
      triggerBtn.textContent = 'Trigger';
      document.body.appendChild(triggerBtn);

      triggerBtn.focus();

      const { rerender } = render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      // First close
      rerender(
        <KeyboardShortcutsOverlay
          isOpen={false}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );
      expect(document.activeElement).toBe(triggerBtn);

      // Second open
      rerender(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );
      expect(
        screen.getByRole('button', { name: 'Close keyboard shortcuts' }),
      ).toHaveFocus();

      // Second close
      rerender(
        <KeyboardShortcutsOverlay
          isOpen={false}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );
      expect(document.activeElement).toBe(triggerBtn);

      document.body.removeChild(triggerBtn);
    });

    it('traps Tab focus within dialog (wraps from last to first)', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      const closeBtn = screen.getByRole('button', {
        name: 'Close keyboard shortcuts',
      });
      closeBtn.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      const spy = vi.spyOn(event, 'preventDefault');

      closeBtn.dispatchEvent(event);
      expect(spy).toHaveBeenCalled();
      expect(
        screen.getByRole('button', { name: 'Close keyboard shortcuts' }),
      ).toHaveFocus();

      spy.mockRestore();
    });

    it('traps Shift+Tab focus within dialog (wraps from first to last)', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      const closeBtn = screen.getByRole('button', {
        name: 'Close keyboard shortcuts',
      });
      closeBtn.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      const spy = vi.spyOn(event, 'preventDefault');

      closeBtn.dispatchEvent(event);
      expect(spy).toHaveBeenCalled();
      expect(
        screen.getByRole('button', { name: 'Close keyboard shortcuts' }),
      ).toHaveFocus();

      spy.mockRestore();
    });

    it('calls preventDefault on Tab to block native focus shift', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      const closeBtn = screen.getByRole('button', {
        name: 'Close keyboard shortcuts',
      });

      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');

      closeBtn.dispatchEvent(tabEvent);
      expect(preventDefaultSpy).toHaveBeenCalled();
      preventDefaultSpy.mockRestore();
    });
  });

  describe('ARIA and accessibility', () => {
    it('aria-labelledby references an existing h2 element', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      const dialog = screen.getByRole('dialog');
      const labelId = dialog.getAttribute('aria-labelledby');
      expect(labelId).toBeTruthy();

      const heading = document.getElementById(labelId!);
      expect(heading).toBeInTheDocument();
      expect(heading!.tagName).toBe('H2');
    });

    it('aria-describedby references an existing element with description text', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      const dialog = screen.getByRole('dialog');
      const descId = dialog.getAttribute('aria-describedby');
      expect(descId).toBeTruthy();

      const descEl = document.getElementById(descId!);
      expect(descEl).toBeInTheDocument();
      expect(descEl!.textContent).toContain('keyboard shortcuts');
      expect(descEl!.textContent).toContain('Escape');
    });

    it('close button has visible text-free label via aria-label', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      const closeBtn = screen.getByRole('button', {
        name: 'Close keyboard shortcuts',
      });
      // Button should have no visible text (icon-only)
      expect(closeBtn.textContent?.trim()).toBe('');
    });
  });

  describe('platform-aware labels', () => {
    it('renders Ctrl labels on non-Mac', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      const kbdElements = document.querySelectorAll('.shortcut-key');
      const ctrlLabels = Array.from(kbdElements).filter(
        (el) => el.textContent === 'Ctrl',
      );
      expect(ctrlLabels.length).toBeGreaterThan(0);
    });

    it('renders ⌘ labels on Mac', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={true}
          isMobile={false}
        />,
      );

      const kbdElements = document.querySelectorAll('.shortcut-key');
      const cmdLabels = Array.from(kbdElements).filter(
        (el) => el.textContent === '\u2318',
      );
      expect(cmdLabels.length).toBeGreaterThan(0);
    });

    it('renders footer hint with Ctrl+/ on non-Mac', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      const footerKbds = document.querySelectorAll(
        '.shortcuts-footer .shortcut-key',
      );
      const ctrlSlash = Array.from(footerKbds).find(
        (el) => el.textContent === 'Ctrl+/',
      );
      expect(ctrlSlash).toBeInTheDocument();
    });

    it('renders footer hint with ⌘/ on Mac', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={true}
          isMobile={false}
        />,
      );

      expect(screen.getByText(/\u2318\//)).toBeInTheDocument();
    });

    it('shortcut combo spans have aria-labels for screen readers', () => {
      render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      const comboSpans = document.querySelectorAll('.shortcut-combo');
      comboSpans.forEach((span) => {
        expect(span).toHaveAttribute('aria-label');
        expect(span.getAttribute('aria-label')!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('body scroll lock', () => {
    it('locks body scroll when open', () => {
      const { rerender } = render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <KeyboardShortcutsOverlay
          isOpen={false}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      expect(document.body.style.overflow).toBe('');
    });

    it('restores body scroll on unmount while open', () => {
      document.body.style.overflow = '';

      const { unmount } = render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      expect(document.body.style.overflow).toBe('hidden');

      unmount();
      // After unmount, the cleanup should restore original overflow
      expect(document.body.style.overflow).toBe('');
    });

    it('does not modify body scroll when closed', () => {
      document.body.style.overflow = 'auto';

      render(
        <KeyboardShortcutsOverlay
          isOpen={false}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      expect(document.body.style.overflow).toBe('auto');
    });
  });

  describe('focus trap edge cases', () => {
    it('focus trap keydown listener is added when open and removed when closed', () => {
      const addSpy = vi.spyOn(HTMLDivElement.prototype, 'addEventListener');
      const removeSpy = vi.spyOn(HTMLDivElement.prototype, 'removeEventListener');

      const { rerender } = render(
        <KeyboardShortcutsOverlay
          isOpen={true}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      rerender(
        <KeyboardShortcutsOverlay
          isOpen={false}
          onClose={noop}
          isMac={false}
          isMobile={false}
        />,
      );

      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });

  describe('shortcut data integration', () => {
    it('all shortcut groups have at least one shortcut', () => {
      KEYBOARD_SHORTCUT_GROUPS.forEach((group) => {
        expect(group.shortcuts.length).toBeGreaterThan(0);
      });
    });

    it('all shortcuts have non-empty label and keys array', () => {
      KEYBOARD_SHORTCUT_GROUPS.forEach((group) => {
        group.shortcuts.forEach((shortcut) => {
          expect(shortcut.label).toBeTruthy();
          expect(shortcut.keys.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
