/**
 * Tests for the UploadQueue barrel (index.ts).
 *
 * The index re-exports UploadQueue and UploadQueueProps. These tests confirm
 * the public contract is intact so that consumers importing from the barrel
 * get the same component and types they expect.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Import exclusively through the barrel — this is the contract under test.
import { UploadQueue } from './index';
import type { UploadQueueProps } from './index';
import type { UploadFile } from '../../hooks/useUploadQueue';

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function makeItem(overrides: Partial<UploadFile> = {}): UploadFile {
  return {
    id: `id-${Math.random()}`,
    file: new File(['x'], overrides.file?.name ?? 'file.pdf', { type: 'application/pdf' }),
    status: 'pending',
    progress: 0,
    ...overrides,
  };
}

function baseProps(overrides: Partial<UploadQueueProps> = {}): UploadQueueProps {
  return {
    queue: [],
    onAddFiles: vi.fn(),
    onRemove: vi.fn(),
    onRetry: vi.fn(),
    onUploadAll: vi.fn(),
    onClearComplete: vi.fn(),
    totalCount: 0,
    successCount: 0,
    errorCount: 0,
    uploadingCount: 0,
    overallProgress: 0,
    ...overrides,
  };
}

/* ─── Module contract ───────────────────────────────────────────────────── */

describe('UploadQueue barrel (index.ts)', () => {
  it('exports UploadQueue as a renderable React component', () => {
    expect(typeof UploadQueue).toBe('function');
  });

  it('renders without errors with minimal valid props', () => {
    render(<UploadQueue {...baseProps()} />);
    expect(screen.getByTestId('upload-queue')).toBeInTheDocument();
  });

  it('UploadQueueProps type is compatible — component accepts full prop set', () => {
    // Compile-time check: if the type export were wrong this file wouldn't build.
    const props: UploadQueueProps = baseProps({
      queue: [makeItem()],
      totalCount: 1,
      accept: '.pdf',
      className: 'test-class',
    });
    render(<UploadQueue {...props} />);
    expect(screen.getByTestId('upload-queue')).toBeInTheDocument();
  });
});

/* ─── Primary state transitions via the barrel export ──────────────────── */

describe('UploadQueue (via barrel) – state transitions', () => {
  it('shows the drop zone in the initial empty state', () => {
    render(<UploadQueue {...baseProps()} />);
    expect(screen.getByTestId('upload-dropzone')).toBeInTheDocument();
    expect(screen.queryByTestId('upload-queue-list')).not.toBeInTheDocument();
  });

  it('shows a queue row when a file is added', () => {
    const item = makeItem({ file: new File([''], 'invoice.pdf') });
    render(<UploadQueue {...baseProps({ queue: [item], totalCount: 1 })} />);
    expect(screen.getByTestId('upload-queue-list')).toBeInTheDocument();
    expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
  });

  it('transitions to uploading state and shows progress', () => {
    const item = makeItem({ status: 'uploading', progress: 55 });
    render(<UploadQueue {...baseProps({ queue: [item], totalCount: 1, uploadingCount: 1, overallProgress: 55 })} />);
    expect(screen.getByText('Uploading 55%')).toBeInTheDocument();
  });

  it('transitions to success state', () => {
    const item = makeItem({ status: 'success', progress: 100 });
    render(<UploadQueue {...baseProps({ queue: [item], totalCount: 1, successCount: 1, overallProgress: 100 })} />);
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('transitions to error state and shows retry button', () => {
    const item = makeItem({ status: 'error', errorMessage: 'Connection lost' });
    render(<UploadQueue {...baseProps({ queue: [item], totalCount: 1, errorCount: 1 })} />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Connection lost')).toBeInTheDocument();
    expect(screen.getByTestId('retry-btn')).toBeInTheDocument();
  });
});

/* ─── Invalid / boundary inputs ────────────────────────────────────────── */

describe('UploadQueue (via barrel) – invalid inputs', () => {
  it('does not call onAddFiles when files dropped is an empty list', () => {
    const onAddFiles = vi.fn();
    render(<UploadQueue {...baseProps({ onAddFiles })} />);
    fireEvent.drop(screen.getByTestId('upload-dropzone'), {
      dataTransfer: { files: [] },
    });
    expect(onAddFiles).not.toHaveBeenCalled();
  });

  it('does not call onAddFiles when dataTransfer.files is null', () => {
    const onAddFiles = vi.fn();
    render(<UploadQueue {...baseProps({ onAddFiles })} />);
    fireEvent.drop(screen.getByTestId('upload-dropzone'), {
      dataTransfer: { files: null },
    });
    expect(onAddFiles).not.toHaveBeenCalled();
  });

  it('does not call onRetry when no uploader is provided', () => {
    const onRetry = vi.fn();
    const item = makeItem({ status: 'error' });
    render(<UploadQueue {...baseProps({ queue: [item], onRetry, uploader: undefined, totalCount: 1, errorCount: 1 })} />);
    fireEvent.click(screen.getByTestId('retry-btn'));
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('renders safely when overallProgress is 0 and queue is empty', () => {
    render(<UploadQueue {...baseProps({ overallProgress: 0 })} />);
    expect(screen.getByTestId('upload-queue')).toBeInTheDocument();
  });

  it('renders safely with all four status variants simultaneously', () => {
    const queue: UploadFile[] = [
      makeItem({ status: 'pending' }),
      makeItem({ status: 'uploading', progress: 40 }),
      makeItem({ status: 'success', progress: 100 }),
      makeItem({ status: 'error', errorMessage: 'Timeout' }),
    ];
    render(
      <UploadQueue
        {...baseProps({
          queue,
          totalCount: 4,
          successCount: 1,
          errorCount: 1,
          uploadingCount: 1,
          overallProgress: 35,
        })}
      />,
    );
    expect(screen.getAllByTestId('upload-queue-row')).toHaveLength(4);
  });
});
