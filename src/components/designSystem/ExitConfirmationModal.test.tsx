import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExitConfirmationModal, ExitConfirmationModalProps } from './ExitConfirmationModal';
import { axe } from 'jest-axe';

describe('ExitConfirmationModal', () => {
  const defaultProps = {
    isOpen: true,
    onStay: vi.fn(),
    onDiscard: vi.fn(),
    onSaveAndExit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(<ExitConfirmationModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(screen.getByText(/You have unsaved changes/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stay on page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save & Exit' })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ExitConfirmationModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onStay when Stay button is clicked', async () => {
    const user = userEvent.setup();
    render(<ExitConfirmationModal {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: 'Stay on page' }));
    expect(defaultProps.onStay).toHaveBeenCalledTimes(1);
  });

  it('calls onDiscard when Discard button is clicked', async () => {
    const user = userEvent.setup();
    render(<ExitConfirmationModal {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(defaultProps.onDiscard).toHaveBeenCalledTimes(1);
  });

  it('calls onSaveAndExit when Save button is clicked', async () => {
    const user = userEvent.setup();
    render(<ExitConfirmationModal {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: 'Save & Exit' }));
    expect(defaultProps.onSaveAndExit).toHaveBeenCalledTimes(1);
  });

  it('calls onStay when Escape key is pressed', async () => {
    const user = userEvent.setup();
    render(<ExitConfirmationModal {...defaultProps} />);
    await user.keyboard('{Escape}');
    expect(defaultProps.onStay).toHaveBeenCalledTimes(1);
  });

  it('traps focus inside the modal', async () => {
    const user = userEvent.setup();
    render(<ExitConfirmationModal {...defaultProps} />);

    // Initial focus should be on the "Stay on page" button (safest action)
    expect(screen.getByRole('button', { name: 'Stay on page' })).toHaveFocus();

    // Tab should cycle
    await user.tab();
    expect(screen.getByRole('button', { name: 'Save & Exit' })).toHaveFocus();

    await user.tab();
    // After last element, it should loop to the close button (first focusable)
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();

    // Shift+Tab should cycle backwards
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Save & Exit' })).toHaveFocus();
  });

  it('passes a11y checks', async () => {
    const { container } = render(<ExitConfirmationModal {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('restores focus when closed', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button data-testid="outside-button">Outside</button>
        <ExitConfirmationModal {...defaultProps} />
      </div>
    );

    const outsideButton = screen.getByTestId('outside-button');
    outsideButton.focus();
    expect(outsideButton).toHaveFocus();

    const { rerender } = render(
      <div>
        <button data-testid="outside-button">Outside</button>
        <ExitConfirmationModal {...defaultProps} isOpen={true} />
      </div>
    );

    expect(screen.getByRole('button', { name: 'Stay on page' })).toHaveFocus();

    rerender(
      <div>
        <button data-testid="outside-button">Outside</button>
        <ExitConfirmationModal {...defaultProps} isOpen={false} />
      </div>
    );

    expect(outsideButton).toHaveFocus();
  });
});

// ─── Regression: ExitConfirmationModalProps failure-handling paths ───────────
// Covers the early-return at line 92: `if (!isOpen) return null`
// and all neighboring normal / boundary paths.
describe('ExitConfirmationModal – regression: isOpen failure path (line 92)', () => {
  const baseProps: ExitConfirmationModalProps = {
    isOpen: true,
    onStay: vi.fn(),
    onDiscard: vi.fn(),
  };

  beforeEach(() => vi.clearAllMocks());

  // ── Failure path: isOpen = false → component returns null ──────────────────

  it('returns null (renders nothing) when isOpen is false', () => {
    const { container } = render(<ExitConfirmationModal {...baseProps} isOpen={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('mounts no dialog role when isOpen is false', () => {
    render(<ExitConfirmationModal {...baseProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not call onStay, onDiscard, or onSaveAndExit when isOpen is false and Escape is pressed', async () => {
    const onStay = vi.fn();
    const onDiscard = vi.fn();
    const onSaveAndExit = vi.fn();
    render(
      <ExitConfirmationModal
        {...baseProps}
        isOpen={false}
        onStay={onStay}
        onDiscard={onDiscard}
        onSaveAndExit={onSaveAndExit}
      />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onStay).not.toHaveBeenCalled();
    expect(onDiscard).not.toHaveBeenCalled();
    expect(onSaveAndExit).not.toHaveBeenCalled();
  });

  it('transitions from closed to open and renders the dialog', () => {
    const { rerender } = render(<ExitConfirmationModal {...baseProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();

    rerender(<ExitConfirmationModal {...baseProps} isOpen={true} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('transitions from open to closed and removes the dialog from the DOM', () => {
    const { rerender } = render(<ExitConfirmationModal {...baseProps} isOpen={true} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(<ExitConfirmationModal {...baseProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  // ── Normal path: isOpen = true → modal renders completely ──────────────────

  it('renders dialog with default title and description when open', () => {
    render(<ExitConfirmationModal {...baseProps} isOpen={true} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(
      screen.getByText('You have unsaved changes. Are you sure you want to leave this page?'),
    ).toBeInTheDocument();
  });

  it('renders custom title and description when provided', () => {
    render(
      <ExitConfirmationModal
        {...baseProps}
        isOpen={true}
        title="Custom Title"
        description="Custom description text."
      />,
    );
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom description text.')).toBeInTheDocument();
  });

  it('renders custom button labels when provided', () => {
    render(
      <ExitConfirmationModal
        {...baseProps}
        isOpen={true}
        onSaveAndExit={vi.fn()}
        stayButtonLabel="Keep editing"
        discardButtonLabel="Throw away"
        saveButtonLabel="Save & go"
      />,
    );
    expect(screen.getByRole('button', { name: 'Keep editing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Throw away' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save & go' })).toBeInTheDocument();
  });

  // ── Boundary: optional onSaveAndExit omitted → no save button ──────────────

  it('omits the Save & Exit button when onSaveAndExit is not provided', () => {
    render(<ExitConfirmationModal {...baseProps} isOpen={true} />);
    // baseProps has no onSaveAndExit
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
  });

  it('shows the Save & Exit button only when onSaveAndExit is provided', () => {
    render(
      <ExitConfirmationModal {...baseProps} isOpen={true} onSaveAndExit={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Save & Exit' })).toBeInTheDocument();
  });

  // ── Boundary: isSaving flag ─────────────────────────────────────────────────

  it('disables the Save & Exit button while isSaving is true', () => {
    render(
      <ExitConfirmationModal
        {...baseProps}
        isOpen={true}
        onSaveAndExit={vi.fn()}
        isSaving={true}
      />,
    );
    const saveBtn = screen.getByRole('button', { name: /save/i });
    expect(saveBtn).toBeDisabled();
  });

  it('enables the Save & Exit button when isSaving is false', () => {
    render(
      <ExitConfirmationModal
        {...baseProps}
        isOpen={true}
        onSaveAndExit={vi.fn()}
        isSaving={false}
      />,
    );
    const saveBtn = screen.getByRole('button', { name: 'Save & Exit' });
    expect(saveBtn).not.toBeDisabled();
  });

  // ── Boundary: Close (×) button invokes onStay ───────────────────────────────

  it('calls onStay when the close (×) icon button is clicked', async () => {
    const onStay = vi.fn();
    const user = userEvent.setup();
    render(<ExitConfirmationModal {...baseProps} isOpen={true} onStay={onStay} />);
    await user.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onStay).toHaveBeenCalledTimes(1);
  });

  // ── ARIA contract ───────────────────────────────────────────────────────────

  it('exposes the correct ARIA role and modal attributes when open', () => {
    render(<ExitConfirmationModal {...baseProps} isOpen={true} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'exit-modal-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'exit-modal-desc');
  });
});
