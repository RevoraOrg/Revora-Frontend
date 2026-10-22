import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { CalendarExportDialog } from './CalendarExportDialog';

/**
 * Regression coverage for the `if (!isOpen) return null;` early return in
 * `CalendarExportDialog.tsx`.
 *
 * The closed state is a hard no-op: the dialog must not mount, must not expose
 * any interactive surface, and must not call `onClose` on its own. The open
 * state was already covered; these tests pin the closed branch and the
 * open/closed transitions either side of it.
 */

const noop = () => {};

describe('CalendarExportDialog closed state', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<CalendarExportDialog isOpen={false} onClose={noop} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('Subscribe to Calendar')).toBeNull();
  });

  it('exposes no interactive surface while closed', () => {
    render(<CalendarExportDialog isOpen={false} onClose={noop} />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByLabelText(/subscription url/i)).toBeNull();
  });

  it('does not invoke onClose while closed', () => {
    const onClose = vi.fn();
    render(<CalendarExportDialog isOpen={false} onClose={onClose} />);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('unmounts the dialog when isOpen flips from true to false', () => {
    const onClose = vi.fn();
    const { container, rerender } = render(<CalendarExportDialog isOpen onClose={onClose} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(<CalendarExportDialog isOpen={false} onClose={onClose} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('dialog')).toBeNull();
    // Closing via prop is not a user dismissal, so onClose must not fire.
    expect(onClose).not.toHaveBeenCalled();
  });

  it('mounts a fully interactive dialog when isOpen flips back to true', () => {
    const onClose = vi.fn();
    const { container, rerender } = render(<CalendarExportDialog isOpen={false} onClose={onClose} />);
    expect(container).toBeEmptyDOMElement();

    rerender(<CalendarExportDialog isOpen onClose={onClose} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Subscribe to Calendar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close dialog/i })).toBeInTheDocument();
  });

  it('tolerates repeated closed renders', () => {
    const { container, rerender } = render(<CalendarExportDialog isOpen={false} onClose={noop} />);
    rerender(<CalendarExportDialog isOpen={false} onClose={noop} />);
    rerender(<CalendarExportDialog isOpen={false} onClose={noop} />);

    expect(container).toBeEmptyDOMElement();
  });
});
