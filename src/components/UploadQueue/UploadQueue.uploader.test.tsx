import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { UploadQueue, createNoopUploader } from './UploadQueue';
import type { UploadFile, Uploader } from '../../hooks/useUploadQueue';

/**
 * Focused suite for the `uploader` retry contract on <UploadQueue/>.
 *
 * Success path: an injected uploader is forwarded verbatim to `onRetry`.
 * Failure path: a missing uploader renders a disabled retry control with an
 * explanatory tooltip and `data-uploader-missing`, clicks are a no-op that
 * emits a single deterministic `console.warn`, and `onRetry` is never called.
 */

expect.extend(toHaveNoViolations);

/* ─── Fixtures ──────────────────────────────────────────────────────────── */

function makeItem(overrides: Partial<UploadFile> = {}): UploadFile {
  return {
    id: `id-${Math.random()}`,
    file: new File(['hello'], overrides.file?.name ?? 'document.pdf', { type: 'application/pdf' }),
    status: 'pending',
    progress: 0,
    ...overrides,
  };
}

type QueueProps = React.ComponentProps<typeof UploadQueue>;

type RetryFn = QueueProps['onRetry'];
type RetryMock = ReturnType<typeof vi.fn<RetryFn>>;

function baseQueueProps(): QueueProps {
  return {
    queue: [],
    onAddFiles: vi.fn<(files: File[]) => void>(),
    onRemove: vi.fn<(id: string) => void>(),
    onRetry: vi.fn<RetryFn>(),
    onUploadAll: vi.fn<() => void>(),
    onClearComplete: vi.fn<() => void>(),
    totalCount: 0,
    successCount: 0,
    errorCount: 0,
    uploadingCount: 0,
    overallProgress: 0,
  };
}

function renderQueue(props: Partial<QueueProps> = {}) {
  const initial = { ...baseQueueProps(), ...props };
  const utils = render(<UploadQueue {...initial} />);
  const rerenderProps = (next: Partial<QueueProps> = {}) =>
    utils.rerender(<UploadQueue {...initial} {...next} />);
  return { ...utils, rerenderProps };
}

/* ─── Supported inputs: uploader injected ───────────────────────────────── */

describe('UploadQueue uploader contract – injected uploader (supported inputs)', () => {
  let onRetry: RetryMock;
  let uploader: Uploader;

  beforeEach(() => {
    onRetry = vi.fn<RetryFn>();
    uploader = vi.fn((_file: File, onProgress: (pct: number) => void) => {
      onProgress(100);
      return Promise.resolve();
    });
  });

  it('forwards the failed id and the injected uploader to onRetry on retry click', () => {
    renderQueue({
      queue: [makeItem({ id: 'retry-1', status: 'error', errorMessage: 'Boom' })],
      onRetry,
      uploader,
      totalCount: 1,
      errorCount: 1,
    });

    fireEvent.click(screen.getByTestId('retry-btn'));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith('retry-1', uploader);
  });

  it('keeps the retry control enabled and free of the uploader-missing marker', () => {
    renderQueue({
      queue: [makeItem({ id: 'retry-1', status: 'error' })],
      onRetry,
      uploader,
      totalCount: 1,
      errorCount: 1,
    });

    const btn = screen.getByTestId('retry-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.dataset.uploaderMissing).toBeUndefined();
    expect(btn.className).not.toContain('upload-queue__btn--retry-disabled');
  });

  it('does not emit a console.warn when the uploader is provided', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderQueue({
      queue: [makeItem({ id: 'retry-1', status: 'error' })],
      onRetry,
      uploader,
      totalCount: 1,
      errorCount: 1,
    });

    fireEvent.click(screen.getByTestId('retry-btn'));

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('only offers retry on failed rows and never on pending rows', () => {
    renderQueue({
      queue: [
        makeItem({ id: 'err-1', status: 'error', errorMessage: 'Offline' }),
        makeItem({ id: 'pend-1', status: 'pending' }),
      ],
      onRetry,
      uploader,
      totalCount: 2,
      errorCount: 1,
    });

    expect(screen.getAllByTestId('retry-btn')).toHaveLength(1);
    fireEvent.click(screen.getByTestId('retry-btn'));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith('err-1', uploader);
  });

  it('retries each of two failed rows with the same injected uploader', () => {
    renderQueue({
      queue: [
        makeItem({ id: 'err-1', status: 'error' }),
        makeItem({ id: 'err-2', status: 'error' }),
      ],
      onRetry,
      uploader,
      totalCount: 2,
      errorCount: 2,
    });

    const retryButtons = screen.getAllByTestId('retry-btn');
    expect(retryButtons).toHaveLength(2);
    fireEvent.click(retryButtons[0]);
    fireEvent.click(retryButtons[1]);

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry.mock.calls.map((call) => call[0])).toEqual(['err-1', 'err-2']);
    for (const call of onRetry.mock.calls) {
      expect(call[1]).toBe(uploader);
    }
  });
});

/* ─── Rejected inputs: uploader missing ─────────────────────────────────── */

describe('UploadQueue uploader contract – missing uploader (failure path)', () => {
  let onRetry: RetryMock;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    onRetry = vi.fn<RetryFn>();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('renders the failed retry control disabled with an explanatory tooltip', () => {
    renderQueue({
      queue: [makeItem({ id: 'retry-1', status: 'error', errorMessage: 'Network unreachable' })],
      onRetry,
      uploader: undefined,
      totalCount: 1,
      errorCount: 1,
    });

    const btn = screen.getByTestId('retry-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(btn.getAttribute('title')).toBe('Retry unavailable: no uploader provided');
    expect(btn.className).toContain('upload-queue__btn--retry-disabled');
    expect(btn.dataset.uploaderMissing).toBe('true');
  });

  it('never invokes onRetry when the disabled retry control is clicked', () => {
    renderQueue({
      queue: [makeItem({ id: 'retry-1', status: 'error' })],
      onRetry,
      uploader: undefined,
      totalCount: 1,
      errorCount: 1,
    });

    fireEvent.click(screen.getByTestId('retry-btn'));

    expect(onRetry).not.toHaveBeenCalled();
  });

  it('emits exactly one deterministic console.warn per failure episode', () => {
    renderQueue({
      queue: [makeItem({ id: 'retry-1', status: 'error' })],
      onRetry,
      uploader: undefined,
      totalCount: 1,
      errorCount: 1,
    });

    // Warn fires at render time — no interaction is required to observe it.
    fireEvent.click(screen.getByTestId('retry-btn')); // disabled control: no-op

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('no `uploader` prop was provided'),
    );
  });

  it('warns once per failure episode and resets after the condition clears', () => {
    const { rerenderProps } = renderQueue({
      queue: [makeItem({ id: 'retry-1', status: 'error' })],
      onRetry,
      uploader: undefined,
      totalCount: 1,
      errorCount: 1,
    });
    expect(warnSpy).toHaveBeenCalledTimes(1); // first failed render

    rerenderProps({ uploader: () => Promise.resolve() }); // uploader arrives → clears
    expect(warnSpy).toHaveBeenCalledTimes(1); // no new warn

    rerenderProps({ uploader: undefined }); // failure episode returns → warn again
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it('transitions the retry control to disabled when the uploader is removed after mount', () => {
    const uploader: Uploader = () => Promise.resolve();
    const { rerenderProps } = renderQueue({
      queue: [makeItem({ id: 'retry-1', status: 'error' })],
      onRetry,
      uploader,
      totalCount: 1,
      errorCount: 1,
    });

    expect((screen.getByTestId('retry-btn') as HTMLButtonElement).disabled).toBe(false);

    rerenderProps({ uploader: undefined }); // same queue, uploader now absent

    const btn = screen.getByTestId('retry-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('title')).toBe('Retry unavailable: no uploader provided');

    fireEvent.click(btn);
    expect(onRetry).not.toHaveBeenCalled();
  });
});

/* ─── Explicit no-op uploader (completed contract) ──────────────────────── */

describe('UploadQueue uploader contract – explicit no-op uploader', () => {
  let onRetry: RetryMock;

  beforeEach(() => {
    onRetry = vi.fn<RetryFn>();
  });

  it('accepts createNoopUploader() so retry stays clickable and type-safe', async () => {
    const noop = createNoopUploader();
    renderQueue({
      queue: [makeItem({ id: 'retry-1', status: 'error' })],
      onRetry,
      uploader: noop,
      totalCount: 1,
      errorCount: 1,
    });

    const btn = screen.getByTestId('retry-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);

    expect(onRetry).toHaveBeenCalledWith('retry-1', noop);
    await expect(noop(new File(['x'], 'f.pdf'), vi.fn())).resolves.toBeUndefined();
  });

  it('createNoopUploader resolves without ever invoking its progress callback', async () => {
    const onProgress = vi.fn();
    await expect(
      createNoopUploader()(new File(['x'], 'f.pdf'), onProgress),
    ).resolves.toBeUndefined();
    expect(onProgress).not.toHaveBeenCalled();
  });
});

/* ─── Upload-all boundary ───────────────────────────────────────────────── */

describe('UploadQueue uploader contract – upload-all boundary', () => {
  it('renders "Upload all" for pending files with or without an uploader (caller-owned)', () => {
    const onUploadAll = vi.fn<QueueProps['onUploadAll']>();
    const first = renderQueue({
      queue: [makeItem({ id: 'pend-1', status: 'pending' })],
      onUploadAll,
      uploader: undefined,
      totalCount: 1,
    });
    expect(screen.getByTestId('upload-all-btn')).toBeInTheDocument();
    first.unmount();

    renderQueue({
      queue: [makeItem({ id: 'pend-1', status: 'pending' })],
      onUploadAll,
      uploader: () => Promise.resolve(),
      totalCount: 1,
    });
    expect(screen.getByTestId('upload-all-btn')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('upload-all-btn'));
    expect(onUploadAll).toHaveBeenCalledTimes(1);
  });
});

/* ─── Accessibility ─────────────────────────────────────────────────────── */

describe('UploadQueue uploader contract – accessibility', () => {
  it('has no axe violations for a failed row when no uploader is provided', async () => {
    const { container } = renderQueue({
      queue: [makeItem({ id: 'retry-1', status: 'error', errorMessage: 'Network unreachable' })],
      onRetry: vi.fn<RetryFn>(),
      uploader: undefined,
      totalCount: 1,
      errorCount: 1,
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations for a failed row with an enabled retry button', async () => {
    const { container } = renderQueue({
      queue: [makeItem({ id: 'retry-1', status: 'error', errorMessage: 'Network unreachable' })],
      onRetry: vi.fn<RetryFn>(),
      uploader: () => Promise.resolve(),
      totalCount: 1,
      errorCount: 1,
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it('exposes the disabled retry state to assistive tech via aria-disabled and tooltip', () => {
    renderQueue({
      queue: [makeItem({ id: 'retry-1', status: 'error' })],
      onRetry: vi.fn<RetryFn>(),
      uploader: undefined,
      totalCount: 1,
      errorCount: 1,
    });

    const row = screen.getByTestId('upload-queue-row');
    const btn = within(row).getByTestId('retry-btn');
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn).toHaveAttribute('title', 'Retry unavailable: no uploader provided');
    expect(btn).toHaveAccessibleName('Retry upload for document.pdf');
  });
});
