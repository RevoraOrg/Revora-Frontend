import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegenerateCodesDialog } from './RegenerateCodesDialog';

describe('RegenerateCodesDialog', () => {
  it('focuses the Cancel button on mount and exposes accessible dialog attributes', () => {
    render(
      <RegenerateCodesDialog
        isPending={false}
        error={null}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: /regenerate recovery codes/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-describedby');

    const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
    expect(cancelButton).toHaveFocus();
  });

  it('calls onCancel and onConfirm when the respective buttons are clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <RegenerateCodesDialog
        isPending={false}
        error={null}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /^regenerate codes$/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('traps Tab from the last focusable element to the first and Shift+Tab in reverse', () => {
    render(
      <RegenerateCodesDialog
        isPending={false}
        error={null}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
    const confirmButton = screen.getByRole('button', { name: /^regenerate codes$/i });

    // Cancel has initial focus; Shift+Tab wraps to the last focusable element
    expect(cancelButton).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(confirmButton).toHaveFocus();

    // Tab on the last focusable element wraps back to the first
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false });
    expect(cancelButton).toHaveFocus();
  });

  it('moves focus back inside the dialog on Tab or Shift+Tab when activeElement is outside', () => {
    render(
      <div>
        <button type="button">Outside</button>
        <RegenerateCodesDialog
          isPending={false}
          error={null}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </div>,
    );

    const dialog = screen.getByRole('dialog');
    const outsideButton = screen.getByRole('button', { name: /^outside$/i });
    const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
    const confirmButton = screen.getByRole('button', { name: /^regenerate codes$/i });

    outsideButton.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false });
    expect(cancelButton).toHaveFocus();

    outsideButton.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(confirmButton).toHaveFocus();
  });

  it('calls onCancel on Escape when not pending', () => {
    const onCancel = vi.fn();
    render(
      <RegenerateCodesDialog
        isPending={false}
        error={null}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not call onCancel on Escape and disables buttons when isPending is true', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <RegenerateCodesDialog
        isPending={true}
        error={null}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const dialog = screen.getByRole('dialog');
    const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
    const confirmButton = screen.getByRole('button', { name: /regenerating…/i });

    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();
    expect(confirmButton).toHaveAttribute('aria-busy', 'true');

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();

    // Tab when all buttons are disabled should safely prevent default
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(onCancel).not.toHaveBeenCalled();

    // Unrelated keys are ignored
    fireEvent.keyDown(dialog, { key: 'a' });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('renders error messages through FormError when error is provided', () => {
    const { rerender } = render(
      <RegenerateCodesDialog
        isPending={false}
        error={null}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(
      <RegenerateCodesDialog
        isPending={false}
        error="Failed to regenerate recovery codes."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('id', 'regenerate-error');
    expect(alert).toHaveTextContent('Failed to regenerate recovery codes.');
  });
});
