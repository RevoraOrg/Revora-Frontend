import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { axe } from 'jest-axe';
import { ShareLinkDialog, ShareLinkDialogProps } from './ShareLinkDialog';

describe('ShareLinkDialog', () => {
  const defaultProps: ShareLinkDialogProps = {
    open: true,
    exportId: 'exp-999',
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  describe('Branch Evidence & Empty-Result Path (open = false)', () => {
    it('returns null and does not render any DOM elements when open is false', () => {
      const { container } = render(
        <ShareLinkDialog open={false} exportId="exp-123" onClose={vi.fn()} />
      );

      expect(container.firstChild).toBeNull();
      expect(container.innerHTML).toBe('');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByTestId('share-link-backdrop')).not.toBeInTheDocument();
      expect(screen.queryByText('Share Export Link')).not.toBeInTheDocument();
    });

    it('returns null when both open is false and exportId is null', () => {
      const { container } = render(
        <ShareLinkDialog open={false} exportId={null} onClose={vi.fn()} />
      );

      expect(container.firstChild).toBeNull();
      expect(container.innerHTML).toBe('');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not register Escape keydown listener when closed', () => {
      const onClose = vi.fn();
      render(<ShareLinkDialog open={false} exportId="exp-123" onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('cleans up Escape keydown listener when unmounted', () => {
      const onClose = vi.fn();
      const { unmount } = render(
        <ShareLinkDialog open={true} exportId="exp-123" onClose={onClose} />
      );

      unmount();
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('restores focus to previously active element when transitioning from open to closed', () => {
      const triggerBtn = document.createElement('button');
      triggerBtn.textContent = 'Open Dialog';
      document.body.appendChild(triggerBtn);
      triggerBtn.focus();
      expect(document.activeElement).toBe(triggerBtn);

      const onClose = vi.fn();
      const { rerender } = render(
        <ShareLinkDialog open={true} exportId="exp-123" onClose={onClose} />
      );

      // Transition to closed
      rerender(<ShareLinkDialog open={false} exportId="exp-123" onClose={onClose} />);
      expect(document.activeElement).toBe(triggerBtn);

      document.body.removeChild(triggerBtn);
    });

    it('handles focus restoration safely when previouslyFocused element has no focus method', () => {
      const onClose = vi.fn();
      const { rerender } = render(
        <ShareLinkDialog open={false} exportId="exp-123" onClose={onClose} />
      );

      // Open without prior focused element
      rerender(<ShareLinkDialog open={true} exportId="exp-123" onClose={onClose} />);
      // Close without error
      expect(() => {
        rerender(<ShareLinkDialog open={false} exportId="exp-123" onClose={onClose} />);
      }).not.toThrow();
    });
  });

  describe('Neighboring Normal Path (open = true)', () => {
    it('renders dialog with all expected controls and ARIA attributes', () => {
      render(<ShareLinkDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');

      const title = screen.getByText('Share Export Link');
      expect(title).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-labelledby', title.id);

      expect(screen.getByLabelText('Link Expiration')).toHaveValue('7d');
      expect(screen.getByRole('button', { name: 'Revoke Link' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy Link' })).toBeInTheDocument();
    });

    it('updates expiration option when changed', () => {
      render(<ShareLinkDialog {...defaultProps} />);

      const select = screen.getByLabelText('Link Expiration');
      fireEvent.change(select, { target: { value: '30d' } });
      expect(select).toHaveValue('30d');

      fireEvent.change(select, { target: { value: '24h' } });
      expect(select).toHaveValue('24h');

      fireEvent.change(select, { target: { value: 'never' } });
      expect(select).toHaveValue('never');
    });

    it('copies link successfully and displays confirmation status', async () => {
      render(<ShareLinkDialog {...defaultProps} exportId="exp-abc" />);

      const copyBtn = screen.getByRole('button', { name: 'Copy Link' });
      fireEvent.click(copyBtn);

      const expectedUrl = `${window.location.origin}/investor/export/exp-abc?exp=7d`;
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedUrl);
        expect(screen.getByText('Link copied to clipboard.')).toBeInTheDocument();
      });
    });

    it('reflects updated expiration parameter in copied link', async () => {
      render(<ShareLinkDialog {...defaultProps} exportId="exp-456" />);

      const select = screen.getByLabelText('Link Expiration');
      fireEvent.change(select, { target: { value: '24h' } });

      const copyBtn = screen.getByRole('button', { name: 'Copy Link' });
      fireEvent.click(copyBtn);

      const expectedUrl = `${window.location.origin}/investor/export/exp-456?exp=24h`;
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedUrl);
        expect(screen.getByText('Link copied to clipboard.')).toBeInTheDocument();
      });
    });

    it('displays revoke confirmation when Revoke Link is clicked', () => {
      render(<ShareLinkDialog {...defaultProps} />);

      const revokeBtn = screen.getByRole('button', { name: 'Revoke Link' });
      fireEvent.click(revokeBtn);

      expect(screen.getByText('Link revoked.')).toBeInTheDocument();
    });

    it('calls onClose when Cancel button is clicked', () => {
      const onClose = vi.fn();
      render(<ShareLinkDialog {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', () => {
      const onClose = vi.fn();
      render(<ShareLinkDialog {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(<ShareLinkDialog {...defaultProps} onClose={onClose} />);

      const backdrop = screen.getByTestId('share-link-backdrop');
      fireEvent.mouseDown(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking inside the dialog card', () => {
      const onClose = vi.fn();
      render(<ShareLinkDialog {...defaultProps} onClose={onClose} />);

      const dialog = screen.getByRole('dialog');
      fireEvent.mouseDown(dialog);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('resets expiration and status when dialog is closed and re-opened', async () => {
      const { rerender } = render(<ShareLinkDialog {...defaultProps} />);

      // Change expiration and revoke
      fireEvent.change(screen.getByLabelText('Link Expiration'), { target: { value: '30d' } });
      fireEvent.click(screen.getByRole('button', { name: 'Revoke Link' }));
      expect(screen.getByText('Link revoked.')).toBeInTheDocument();

      // Close dialog
      rerender(<ShareLinkDialog {...defaultProps} open={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Reopen dialog
      rerender(<ShareLinkDialog {...defaultProps} open={true} />);
      expect(screen.getByLabelText('Link Expiration')).toHaveValue('7d');
      expect(screen.queryByText('Link revoked.')).not.toBeInTheDocument();
    });
  });

  describe('Failure and Error Handling', () => {
    it('gracefully handles clipboard write failure by displaying the raw URL in status', async () => {
      navigator.clipboard.writeText = vi.fn().mockRejectedValue(new Error('Permission denied'));

      render(<ShareLinkDialog {...defaultProps} exportId="exp-fail" />);

      fireEvent.click(screen.getByRole('button', { name: 'Copy Link' }));

      const expectedUrl = `${window.location.origin}/investor/export/exp-fail?exp=7d`;
      await waitFor(() => {
        expect(screen.getByText(expectedUrl)).toBeInTheDocument();
      });
      expect(screen.queryByText('Link copied to clipboard.')).not.toBeInTheDocument();
    });

    it('gracefully handles clipboard rejection with string error', async () => {
      navigator.clipboard.writeText = vi.fn().mockImplementation(() => Promise.reject('Rejected string'));

      render(<ShareLinkDialog {...defaultProps} exportId="exp-err" />);

      fireEvent.click(screen.getByRole('button', { name: 'Copy Link' }));

      const expectedUrl = `${window.location.origin}/investor/export/exp-err?exp=7d`;
      await waitFor(() => {
        expect(screen.getByText(expectedUrl)).toBeInTheDocument();
      });
    });
  });

  describe('Boundary Inputs for ShareLinkDialogProps', () => {
    it('handles exportId as null deterministically without throwing', async () => {
      render(<ShareLinkDialog open={true} exportId={null} onClose={vi.fn()} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const copyBtn = screen.getByRole('button', { name: 'Copy Link' });
      expect(() => fireEvent.click(copyBtn)).not.toThrow();

      const expectedUrl = `${window.location.origin}/investor/export/null?exp=7d`;
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedUrl);
        expect(screen.getByText('Link copied to clipboard.')).toBeInTheDocument();
      });
    });

    it('handles exportId as empty string deterministically', async () => {
      render(<ShareLinkDialog open={true} exportId="" onClose={vi.fn()} />);

      const copyBtn = screen.getByRole('button', { name: 'Copy Link' });
      fireEvent.click(copyBtn);

      const expectedUrl = `${window.location.origin}/investor/export/?exp=7d`;
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedUrl);
      });
    });

    it('handles exportId with special characters and symbols', async () => {
      const specialId = 'exp#2026?token=abc&page=1';
      render(<ShareLinkDialog open={true} exportId={specialId} onClose={vi.fn()} />);

      fireEvent.click(screen.getByRole('button', { name: 'Copy Link' }));

      const expectedUrl = `${window.location.origin}/investor/export/${specialId}?exp=7d`;
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedUrl);
      });
    });
  });

  describe('Keyboard Navigation & Focus Trap', () => {
    it('wraps focus from last element to first element on Tab', () => {
      render(<ShareLinkDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'button, select, input, textarea, [href], [tabindex]:not([tabindex="-1"])'
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      last.focus();
      expect(document.activeElement).toBe(last);

      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false });
      expect(document.activeElement).toBe(first);
    });

    it('wraps focus from first element to last element on Shift+Tab', () => {
      render(<ShareLinkDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'button, select, input, textarea, [href], [tabindex]:not([tabindex="-1"])'
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      first.focus();
      expect(document.activeElement).toBe(first);

      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(last);
    });

    it('does not prevent default or wrap when pressing Tab on non-last element', () => {
      render(<ShareLinkDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'button, select, input, textarea, [href], [tabindex]:not([tabindex="-1"])'
      );
      const first = focusables[0];
      first.focus();

      const event = fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false });
      expect(event).toBe(true); // default not prevented
      expect(document.activeElement).toBe(first);
    });

    it('does not prevent default or wrap when pressing Shift+Tab on non-first element', () => {
      render(<ShareLinkDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'button, select, input, textarea, [href], [tabindex]:not([tabindex="-1"])'
      );
      const last = focusables[focusables.length - 1];
      last.focus();

      const event = fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
      expect(event).toBe(true); // default not prevented
      expect(document.activeElement).toBe(last);
    });

    it('filters out disabled elements when calculating focus trap boundaries', () => {
      render(<ShareLinkDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      const copyBtn = screen.getByRole('button', { name: 'Copy Link' });
      copyBtn.setAttribute('disabled', 'true');

      const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
      cancelBtn.focus();

      // Since copyBtn is disabled, cancelBtn is now the effective last element
      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false });
      const select = screen.getByLabelText('Link Expiration');
      expect(document.activeElement).toBe(select);
    });

    it('ignores non-Tab keydown events in handleKeyDown', () => {
      render(<ShareLinkDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      const first = dialog.querySelector<HTMLElement>('select')!;
      first.focus();

      fireEvent.keyDown(dialog, { key: 'ArrowDown', shiftKey: false });
      expect(document.activeElement).toBe(first);
    });
  });

  describe('Accessibility Compliance', () => {
    it('passes automated axe accessibility audit when open', async () => {
      const { container } = render(<ShareLinkDialog {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
