import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OfferingRegistrationDemo } from './OfferingRegistrationDemo';
import { saveRecoveryFrame } from '../components/ResumeRecoveryBanner';

const RECOVERY_KEY = 'recovery_state_/startup/offering-registration';

function renderDemo() {
  return render(
    <MemoryRouter initialEntries={['/startup/offering-registration']}>
      <OfferingRegistrationDemo />
    </MemoryRouter>,
  );
}

function makeFile(name: string, sizeBytes: number): File {
  const file = new File(['x'], name, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('OfferingRegistrationDemo', () => {
  it('renders the offering registration timeline and uploader', () => {
    renderDemo();
    expect(screen.getByRole('heading', { name: /offering registration/i })).toBeInTheDocument();
    expect(screen.getByText('Upload KYC documents')).toBeInTheDocument();
  });

  it('simulates an upload to completion for a valid file', async () => {
    renderDemo();
    const input = screen.getByTestId('doc-uploader-input');
    const file = makeFile('id-card.pdf', 1024);

    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText('id-card.pdf')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId('doc-uploader-tile')).toHaveTextContent(/uploaded/i);
  });

  it('simulates a network failure for an oversized demo file and supports retry', async () => {
    renderDemo();
    const input = screen.getByTestId('doc-uploader-input');
    const bigFile = makeFile('financials.pdf', 9 * 1024 * 1024);

    fireEvent.change(input, { target: { files: [bigFile] } });

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/couldn't upload/i);

    fireEvent.click(screen.getByRole('button', { name: /retry upload/i }));

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId('doc-uploader-tile')).toHaveTextContent(/uploaded/i);
  });
});

describe('OfferingRegistrationDemo resume recovery', () => {
  it('saves a recovery frame when an upload fails', async () => {
    renderDemo();
    const input = screen.getByTestId('doc-uploader-input');
    const bigFile = makeFile('financials.pdf', 9 * 1024 * 1024);

    fireEvent.change(input, { target: { files: [bigFile] } });
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    const raw = localStorage.getItem(RECOVERY_KEY);
    expect(raw).not.toBeNull();
    const frame = JSON.parse(raw as string);
    expect(frame.variant).toBe('upload');
    expect(frame.payload.fileNames).toEqual(['financials.pdf']);
  });

  it('clears the recovery frame once a failed upload is retried to completion', async () => {
    renderDemo();
    const input = screen.getByTestId('doc-uploader-input');
    const bigFile = makeFile('financials.pdf', 9 * 1024 * 1024);

    fireEvent.change(input, { target: { files: [bigFile] } });
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(localStorage.getItem(RECOVERY_KEY)).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /retry upload/i }));
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(localStorage.getItem(RECOVERY_KEY)).toBeNull();
  });

  it('saves a recovery frame when unmounting mid-upload', () => {
    const { unmount } = renderDemo();
    const input = screen.getByTestId('doc-uploader-input');
    const file = makeFile('id-card.pdf', 1024);

    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText('id-card.pdf')).toBeInTheDocument();

    unmount();

    const raw = localStorage.getItem(RECOVERY_KEY);
    expect(raw).not.toBeNull();
    const frame = JSON.parse(raw as string);
    expect(frame.variant).toBe('upload');
    expect(frame.payload.fileNames).toEqual(['id-card.pdf']);
  });

  it('renders the resume banner and moves focus to the documents step on resume', () => {
    saveRecoveryFrame({
      page: '/startup/offering-registration',
      timestamp: Date.now(),
      variant: 'upload',
      payload: { fileNames: ['financials.pdf'] },
    });

    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
      writable: true,
    });

    renderDemo();

    expect(screen.getByTestId('resume-recovery-banner')).toBeInTheDocument();
    expect(screen.getByText('Your upload was interrupted')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('resume-recovery-resume'));

    expect(scrollIntoView).toHaveBeenCalled();
    expect(screen.getByText('Verification documents')).toHaveFocus();
    // Resuming consumes the stored frame.
    expect(localStorage.getItem(RECOVERY_KEY)).toBeNull();
    expect(screen.queryByTestId('resume-recovery-banner')).not.toBeInTheDocument();
  });

  it('does not render the resume banner when no upload was interrupted', () => {
    renderDemo();
    expect(screen.queryByTestId('resume-recovery-banner')).not.toBeInTheDocument();
  });
});
