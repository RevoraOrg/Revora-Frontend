import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import TwoFactorBackupCodesPage from './TwoFactorBackupCodesPage';

expect.extend(toHaveNoViolations);

describe('TwoFactorBackupCodesPage', () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  it('reveals a code and the accessible name of the button contains the code text', () => {
    const customCodes = ['REVR-TEST-1234', 'REVR-TEST-5678'];
    render(<TwoFactorBackupCodesPage initialCodes={customCodes} />);

    const buttons = screen.getAllByRole('button', { pressed: false });
    // First code card
    const firstCodeBtn = buttons.find(b => b.classList.contains('tfa-recovery-card'));
    expect(firstCodeBtn).toBeDefined();

    // Before revealing, it is not pressed
    expect(firstCodeBtn).toHaveAttribute('aria-pressed', 'false');

    // Click to reveal
    fireEvent.click(firstCodeBtn!);

    expect(firstCodeBtn).toHaveAttribute('aria-pressed', 'true');
    // Accessible name contains the code text
    expect(firstCodeBtn).toHaveAccessibleName(expect.stringContaining('REVR-TEST-1234'));
  });

  it('shows error in polite live region when clipboard writeText rejects and has no unhandled rejection', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(<TwoFactorBackupCodesPage initialCodes={['REVR-TEST-1234']} />);

    // Reveal the code first
    const card = screen.getByRole('button', { pressed: false });
    fireEvent.click(card);

    const copyBtn = screen.getByRole('button', { name: /Copy All/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
    });

    // Check polite live region shows error message
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveTextContent(/failed to copy/i);
  });

  it('passes jest-axe accessibility checks in both concealed and revealed states', async () => {
    const { container } = render(<TwoFactorBackupCodesPage initialCodes={['REVR-TEST-1234', 'REVR-TEST-5678']} />);
    let results = await axe(container);
    expect(results).toHaveNoViolations();

    // Reveal one
    const cards = screen.getAllByRole('button', { pressed: false });
    fireEvent.click(cards[0]);

    results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('takes codes from a prop instead of module constant', () => {
    const customCodes = ['CUSTOM-1', 'CUSTOM-2', 'CUSTOM-3'];
    render(<TwoFactorBackupCodesPage initialCodes={customCodes} />);

    expect(screen.getByText('Revealed: 0/3')).toBeInTheDocument();
    const cards = screen.getAllByRole('button', { pressed: false });
    expect(cards).toHaveLength(3);
  });

  it('appends anchor to DOM before clicking and revokes object URL asynchronously on download', async () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    let clicked = false;
    let appendedToBody = false;

    const originalAppendChild = document.body.appendChild.bind(document.body);
    const originalRemoveChild = document.body.removeChild.bind(document.body);

    vi.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => {
      if (node instanceof HTMLAnchorElement) {
        appendedToBody = true;
      }
      return originalAppendChild(node);
    });

    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked = true;
      // Assert that click was called while anchor was in DOM
      expect(document.body.contains(this)).toBe(true);
    });

    render(<TwoFactorBackupCodesPage initialCodes={['REVR-TEST-1234']} />);

    // Reveal code first
    const card = screen.getByRole('button', { pressed: false });
    fireEvent.click(card);

    const downloadBtn = screen.getByRole('button', { name: /Download/i });
    fireEvent.click(downloadBtn);

    expect(appendedToBody).toBe(true);
    expect(clicked).toBe(true);
    // revokeObjectURL should NOT be called synchronously
    expect(revokeObjectURLMock).not.toHaveBeenCalled();

    // Wait for async revoke
    await waitFor(() => {
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  it('clears clipboard timer on unmount', () => {
    vi.useFakeTimers();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    const { unmount } = render(<TwoFactorBackupCodesPage initialCodes={['REVR-TEST-1234']} />);

    const card = screen.getByRole('button', { pressed: false });
    fireEvent.click(card);

    const copyBtn = screen.getByRole('button', { name: /Copy All/i });
    fireEvent.click(copyBtn);

    unmount();
    // Fast-forward timers to ensure no state update or unhandled error on unmounted component
    vi.runAllTimers();
    vi.useRealTimers();
  });
});
