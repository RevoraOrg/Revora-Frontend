import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { DeleteConfirmDialog, type DeleteConfirmDialogProps } from './DeleteConfirmDialog';

expect.extend(toHaveNoViolations);

describe('DeleteConfirmDialog - Regression & Branch Coverage', () => {
  const defaultProps: DeleteConfirmDialogProps = {
    open: true,
    exportId: 'export-123',
    onConfirm: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty/Failure Branch Handling (if (!open || !exportId) return null)', () => {
    it('returns null and renders nothing when open is false (with valid exportId)', () => {
      const { container } = render(
        <DeleteConfirmDialog {...defaultProps} open={false} exportId="export-123" />
      );

      expect(container.firstChild).toBeNull();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByTestId('delete-confirm-backdrop')).not.toBeInTheDocument();
    });

    it('returns null and renders nothing when exportId is null (with open = true)', () => {
      const { container } = render(
        <DeleteConfirmDialog {...defaultProps} open={true} exportId={null} />
      );

      expect(container.firstChild).toBeNull();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByTestId('delete-confirm-backdrop')).not.toBeInTheDocument();
    });

    it('returns null and renders nothing when exportId is empty string (falsy boundary value)', () => {
      const { container } = render(
        // @ts-expect-error Testing empty string edge case
        <DeleteConfirmDialog {...defaultProps} open={true} exportId="" />
      );

      expect(container.firstChild).toBeNull();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('returns null and renders nothing when both open is false and exportId is null', () => {
      const { container } = render(
        <DeleteConfirmDialog {...defaultProps} open={false} exportId={null} />
      );

      expect(container.firstChild).toBeNull();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Normal Path & User Interactions', () => {
    it('renders the dialog, title, description, and action buttons when open and exportId is provided', () => {
      render(<DeleteConfirmDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByRole('heading', { name: /delete export/i })).toBeInTheDocument();
      expect(
        screen.getByText(/are you sure you want to delete this export\?/i)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('calls onConfirm with the exportId when clicking the Delete button', () => {
      render(<DeleteConfirmDialog {...defaultProps} exportId="exp-target-99" />);

      const deleteBtn = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteBtn);

      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
      expect(defaultProps.onConfirm).toHaveBeenCalledWith('exp-target-99');
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('calls onClose when clicking the Cancel button', () => {
      render(<DeleteConfirmDialog {...defaultProps} />);

      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelBtn);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });

    it('calls onClose when clicking directly on the backdrop overlay', () => {
      render(<DeleteConfirmDialog {...defaultProps} />);

      const backdrop = screen.getByTestId('delete-confirm-backdrop');
      fireEvent.mouseDown(backdrop);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking inside the dialog content', () => {
      render(<DeleteConfirmDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      fireEvent.mouseDown(dialog);

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('closes on Escape key press when open', () => {
      render(<DeleteConfirmDialog {...defaultProps} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('does not trigger Escape handler after unmounting or when open is false', () => {
      const { rerender } = render(<DeleteConfirmDialog {...defaultProps} open={false} />);

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(defaultProps.onClose).not.toHaveBeenCalled();

      rerender(<DeleteConfirmDialog {...defaultProps} open={true} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Focus Management and Trap Boundaries', () => {
    it('restores focus to previously active element on close transition', () => {
      const button = document.createElement('button');
      button.textContent = 'Trigger';
      document.body.appendChild(button);
      button.focus();
      expect(document.activeElement).toBe(button);

      const { rerender } = render(<DeleteConfirmDialog {...defaultProps} open={true} />);
      // Transition from open to closed
      rerender(<DeleteConfirmDialog {...defaultProps} open={false} />);

      expect(document.activeElement).toBe(button);
      document.body.removeChild(button);
    });

    it('handles keyboard Tab navigation loop within modal focusables', () => {
      render(<DeleteConfirmDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      const deleteBtn = screen.getByRole('button', { name: /delete/i });

      // Focus on first element and Shift+Tab -> should wrap to last element
      cancelBtn.focus();
      expect(document.activeElement).toBe(cancelBtn);
      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(deleteBtn);

      // Focus on last element and Tab -> should wrap to first element
      deleteBtn.focus();
      expect(document.activeElement).toBe(deleteBtn);
      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false });
      expect(document.activeElement).toBe(cancelBtn);

      // Non-Tab key should not alter focus trap
      fireEvent.keyDown(dialog, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(cancelBtn);
    });
  });

  describe('Accessibility Compliance', () => {
    it('passes automated axe audit with 0 violations when open', async () => {
      const { container } = render(<DeleteConfirmDialog {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
