import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DocumentReplacementFlow, {
  type DiffSummary,
  type DocumentVersion,
  type ReplacementStep,
} from './DocumentReplacementFlow';

const oldVersion: DocumentVersion = {
  id: 'document-v1',
  versionLabel: 'v1',
  fileName: 'agreement-v1.pdf',
  fileType: 'pdf',
  fileSizeBytes: 1024,
  uploadedBy: { id: 'user-1', name: 'Alex Morgan', email: 'alex@example.com' },
  uploadedAt: '2025-01-15T12:00:00.000Z',
  sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  pageCount: 4,
  lineCount: 20,
};

const newVersion: DocumentVersion = {
  id: 'document-v2',
  versionLabel: 'v2',
  fileName: 'agreement-v2.pdf',
  fileType: 'pdf',
  fileSizeBytes: 2048,
  uploadedBy: { id: 'user-2', name: 'Sam Lee' },
  uploadedAt: '2025-02-15T12:00:00.000Z',
  pageCount: 5,
  lineCount: 24,
};

const diff: DiffSummary = {
  bytesAdded: 1024,
  bytesRemoved: 0,
  linesAdded: 4,
  linesRemoved: 0,
  pagesAdded: 1,
  pagesRemoved: 0,
  fieldsChanged: [{ name: 'Effective date', oldValue: 'Jan 1', newValue: 'Feb 1' }],
  highConfidenceMatch: false,
  summaryText: '1 KB added and one effective date changed.',
};

const stepLabels: Record<ReplacementStep, string> = {
  upload: 'Upload',
  review: 'Review',
  confirm: 'Confirm',
  success: 'Done',
};

describe('DocumentReplacementFlow', () => {
  it('renders the document version metadata and review step', () => {
    render(
      <DocumentReplacementFlow
        oldVersion={oldVersion}
        initialNewVersion={newVersion}
        initialDiff={diff}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Review changes' })).toBeInTheDocument();
    expect(screen.getByText('agreement-v1.pdf')).toBeInTheDocument();
    expect(screen.getByText('Alex Morgan')).toBeInTheDocument();
    expect(screen.getAllByText('Pages')[0].nextElementSibling).toHaveTextContent('4');
    expect(screen.getByText(/0123456789/)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Replacement progress' }).querySelector('[aria-current="step"]'))
      .toHaveTextContent(stepLabels.review);
  });

  it('shows a deterministic error when the selected file cannot be processed', async () => {
    const user = userEvent.setup();
    const onFileSelected = vi.fn().mockRejectedValue(new Error('Unsupported document format.'));
    render(<DocumentReplacementFlow oldVersion={oldVersion} onFileSelected={onFileSelected} />);

    await user.upload(
      screen.getByLabelText('Select replacement document from device'),
      new File(['bad'], 'invalid.exe', { type: 'application/octet-stream' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Unsupported document format.');
    expect(screen.getByRole('heading', { name: 'Upload replacement document' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Replacement progress' }).querySelector('[aria-current="step"]'))
      .toHaveTextContent(stepLabels.upload);
    expect(onFileSelected).toHaveBeenCalledOnce();
  });

  it('falls back to a computed summary if diff computation fails', async () => {
    const user = userEvent.setup();
    const onFileSelected = vi.fn().mockResolvedValue(newVersion);
    const onComputeDiff = vi.fn().mockRejectedValue(new Error('Diff service unavailable.'));
    render(
      <DocumentReplacementFlow
        oldVersion={oldVersion}
        onFileSelected={onFileSelected}
        onComputeDiff={onComputeDiff}
      />,
    );

    await user.upload(
      screen.getByLabelText('Select replacement document from device'),
      new File(['replacement'], newVersion.fileName, { type: 'application/pdf' }),
    );

    expect(await screen.findByRole('heading', { name: 'Review changes' })).toBeInTheDocument();
    await waitFor(() => expect(onComputeDiff).toHaveBeenCalledWith(oldVersion, newVersion));
    expect(await screen.findByText(/4 lines \+, 0 lines −/)).toBeInTheDocument();
    expect(screen.getByText(/1 pages \+, 0 pages −/)).toBeInTheDocument();
  });

  it('renders supplied diff details and supports collapsing the breakdown', async () => {
    const user = userEvent.setup();
    render(
      <DocumentReplacementFlow
        oldVersion={oldVersion}
        initialNewVersion={newVersion}
        initialDiff={diff}
      />,
    );

    expect(screen.getByText('Approximate')).toBeInTheDocument();
    expect(screen.getByText('Effective date')).toBeInTheDocument();
    expect(screen.getByText('Jan 1')).toBeInTheDocument();
    expect(screen.getByText('Feb 1')).toBeInTheDocument();
    expect(screen.getByText('+1 KB')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /What changed/ }));
    expect(screen.getByRole('button', { name: /What changed/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Effective date')).not.toBeInTheDocument();
  });

  it('moves through review, confirmation, and success with the selected decision', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <DocumentReplacementFlow
        oldVersion={oldVersion}
        initialNewVersion={newVersion}
        initialDiff={diff}
        documentName="Master agreement"
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Review changes' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Mark version v1 as active' }));
    await user.click(screen.getByRole('checkbox', { name: /Keep both versions/ }));
    await user.click(screen.getByRole('button', { name: /Continue to confirm/ }));

    expect(screen.getByRole('heading', { name: 'Confirm replacement' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Replacement progress' }).querySelector('[aria-current="step"]'))
      .toHaveTextContent(stepLabels.confirm);
    expect(screen.getByText('Master agreement')).toBeInTheDocument();
    expect(screen.getByText(/v1 · agreement-v1.pdf/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Back/ }));
    expect(screen.getByRole('heading', { name: 'Review changes' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Continue to confirm/ }));
    await user.click(screen.getByRole('button', { name: 'Confirm replacement' }));

    expect(await screen.findByRole('heading', { name: 'Document replaced' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Replacement progress' }).querySelector('[aria-current="step"]'))
      .toHaveTextContent(stepLabels.success);
    expect(onConfirm).toHaveBeenCalledWith({
      newVersion,
      oldVersion,
      keepBoth: false,
      activeVersionId: oldVersion.id,
    });
  });
});