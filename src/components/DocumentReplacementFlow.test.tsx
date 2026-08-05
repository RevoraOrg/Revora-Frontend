/**
 * DocumentReplacementFlow.test.tsx — Issue #449
 *
 * Covers the 4-step wizard, diff summary, version retention toggle,
 * active-version selection, version history dropdown, and WCAG 2.1 AA
 * accessibility requirements (axe, keyboard, aria attributes).
 *
 * Test runner: vitest + @testing-library/react + jest-axe
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { DocumentReplacementFlow } from './DocumentReplacementFlow';
import { VersionHistoryDropdown } from './DocumentReplacementFlow/VersionHistoryDropdown';
import type { DocumentVersion, DiffSummary } from './DocumentReplacementFlow';

expect.extend(toHaveNoViolations);

/* ─── Fixtures ──────────────────────────────────────────────────── */

const OLD_VERSION: DocumentVersion = {
  id: 'ver-001',
  versionLabel: 'v1 (original)',
  fileName: 'prospectus.pdf',
  fileType: 'PDF',
  fileSizeBytes: 2_457_600,
  uploadedBy: { id: 'u1', name: 'Alice Mwangi', email: 'alice@example.com' },
  uploadedAt: '2026-01-15T09:30:00Z',
  sha256: 'aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666aaaa1111bbbb2222cc',
  pageCount: 24,
};

const NEW_VERSION: DocumentVersion = {
  id: 'ver-002',
  versionLabel: 'v2 (amended)',
  fileName: 'prospectus-amended.pdf',
  fileType: 'PDF',
  fileSizeBytes: 2_764_800,
  uploadedBy: { id: 'u2', name: 'Bob Okafor', email: 'bob@example.com' },
  uploadedAt: '2026-07-28T14:15:00Z',
  sha256: 'bbbb2222cccc3333dddd4444eeee5555ffff6666aaaa1111bbbb2222cccc3333dd',
  pageCount: 27,
};

const MOCK_DIFF: DiffSummary = {
  bytesAdded: 307_200,
  bytesRemoved: 0,
  pagesAdded: 3,
  pagesRemoved: 0,
  highConfidenceMatch: true,
  summaryText: '307.2 KB added · 3 pages added',
  fieldsChanged: [
    { name: 'Revenue share %', oldValue: '8.5%', newValue: '7.0%' },
    { name: 'Lock-up period', oldValue: '18 months', newValue: '12 months' },
  ],
};

const ALL_VERSIONS: DocumentVersion[] = [NEW_VERSION, OLD_VERSION];

/* ─── Helper ────────────────────────────────────────────────────── */

function renderPreloaded(overrides?: Partial<React.ComponentProps<typeof DocumentReplacementFlow>>) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const utils = render(
    <DocumentReplacementFlow
      oldVersion={OLD_VERSION}
      initialNewVersion={NEW_VERSION}
      initialDiff={MOCK_DIFF}
      documentName="Nexus Cloud Prospectus"
      locale="en-US"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { ...utils, onConfirm, onCancel };
}

/* ═══════════════════════════════════════════════════════════════════
   Step indicator
   ══════════════════════════════════════════════════════════════════ */

describe('StepIndicator', () => {
  it('renders all 4 steps', () => {
    renderPreloaded();
    expect(screen.getByRole('list', { name: /replacement progress/i })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('marks the current step with aria-current="step"', () => {
    renderPreloaded();
    const reviewStep = screen.getByRole('listitem', { name: /review/i });
    // The review step should be aria-current=step because we start on review (preloaded)
    const current = screen.getByRole('list', { name: /replacement progress/i })
      .querySelector('[aria-current="step"]');
    expect(current).not.toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   Upload step
   ══════════════════════════════════════════════════════════════════ */

describe('Upload step', () => {
  it('renders the dropzone when no initialNewVersion is given', () => {
    render(
      <DocumentReplacementFlow
        oldVersion={OLD_VERSION}
        locale="en-US"
      />,
    );
    expect(
      screen.getByRole('region', { name: /upload replacement document/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/select replacement document from device/i),
    ).toBeInTheDocument();
  });

  it('shows the current document card in upload step', () => {
    render(<DocumentReplacementFlow oldVersion={OLD_VERSION} locale="en-US" />);
    expect(screen.getByText(/prospectus\.pdf/i)).toBeInTheDocument();
    expect(screen.getByText(/v1 \(original\)/i)).toBeInTheDocument();
  });

  it('shows Cancel button when onCancel is provided', () => {
    const onCancel = vi.fn();
    render(
      <DocumentReplacementFlow
        oldVersion={OLD_VERSION}
        onCancel={onCancel}
        locale="en-US"
      />,
    );
    const cancel = screen.getByRole('button', { name: /cancel/i });
    expect(cancel).toBeInTheDocument();
    fireEvent.click(cancel);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('advances to review step after a file is selected (via onFileSelected callback)', async () => {
    const onFileSelected = vi.fn().mockResolvedValue(NEW_VERSION);
    render(
      <DocumentReplacementFlow
        oldVersion={OLD_VERSION}
        onFileSelected={onFileSelected}
        locale="en-US"
      />,
    );
    const input = screen.getByLabelText(/select replacement document from device/i);
    const file = new File(['hello world'], 'prospectus-amended.pdf', { type: 'application/pdf' });
    await userEvent.upload(input, file);
    await waitFor(() => {
      expect(onFileSelected).toHaveBeenCalledWith(file);
    });
  });

  it('shows error message when onFileSelected rejects', async () => {
    const onFileSelected = vi.fn().mockRejectedValue(new Error('Server unavailable'));
    render(
      <DocumentReplacementFlow
        oldVersion={OLD_VERSION}
        onFileSelected={onFileSelected}
        locale="en-US"
      />,
    );
    const input = screen.getByLabelText(/select replacement document from device/i);
    const file = new File(['data'], 'test.pdf', { type: 'application/pdf' });
    await userEvent.upload(input, file);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/server unavailable/i);
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════
   Review step — version cards
   ══════════════════════════════════════════════════════════════════ */

describe('Review step — VersionCards', () => {
  it('renders both version cards side by side', () => {
    renderPreloaded();
    expect(screen.getByText(/previous version/i)).toBeInTheDocument();
    expect(screen.getByText(/new version/i)).toBeInTheDocument();
    // File names
    expect(screen.getByText('prospectus.pdf')).toBeInTheDocument();
    expect(screen.getByText('prospectus-amended.pdf')).toBeInTheDocument();
  });

  it('shows metadata fields: size, uploaded by, type', () => {
    renderPreloaded();
    // Both cards should have uploader info
    expect(screen.getByText('Alice Mwangi')).toBeInTheDocument();
    expect(screen.getByText('Bob Okafor')).toBeInTheDocument();
  });

  it('shows truncated SHA-256 hashes', () => {
    renderPreloaded();
    // sha256.slice(0,10)...sha256.slice(-6)
    expect(screen.getByTitle(OLD_VERSION.sha256!)).toBeInTheDocument();
    expect(screen.getByTitle(NEW_VERSION.sha256!)).toBeInTheDocument();
  });

  it('renders the VS divider', () => {
    renderPreloaded();
    expect(screen.getByText(/^VS$/i)).toBeInTheDocument();
  });

  it('marks new version as active by default', () => {
    renderPreloaded();
    // The active badge should appear once, associated with new version card
    const activeBadges = screen.getAllByText(/^active$/i);
    expect(activeBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('allows selecting old version as active via radio', async () => {
    renderPreloaded();
    const radios = screen.getAllByRole('radio', { name: /mark version/i });
    // There should be 2 radios (one per version)
    expect(radios).toHaveLength(2);
    // Click the old-version radio
    await userEvent.click(radios[0]);
    // The old version radio should now be checked
    expect(radios[0]).toBeChecked();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   Review step — diff summary panel
   ══════════════════════════════════════════════════════════════════ */

describe('Review step — DiffSummaryPanel', () => {
  it('renders the diff summary section', () => {
    renderPreloaded();
    expect(screen.getByRole('region', { name: /what changed/i })).toBeInTheDocument();
  });

  it('shows bytes added and removed stats', () => {
    renderPreloaded();
    expect(screen.getByText(/bytes added/i)).toBeInTheDocument();
    expect(screen.getByText(/bytes removed/i)).toBeInTheDocument();
  });

  it('shows pages added stat when page counts differ', () => {
    renderPreloaded();
    expect(screen.getAllByText(/pages added/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows field-level changes when fieldsChanged is provided', () => {
    renderPreloaded();
    expect(screen.getByText(/revenue share %/i)).toBeInTheDocument();
    expect(screen.getByText('8.5%')).toBeInTheDocument();
    expect(screen.getByText('7.0%')).toBeInTheDocument();
  });

  it('collapses and expands the diff panel via toggle button', async () => {
    renderPreloaded();
    const toggle = screen.getByRole('button', { name: /what changed/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows "Approximate" pill when highConfidenceMatch is false', () => {
    renderPreloaded({
      initialDiff: { ...MOCK_DIFF, highConfidenceMatch: false },
    });
    expect(screen.getByText(/approximate/i)).toBeInTheDocument();
  });

  it('shows a neutral summary when sizes are identical', () => {
    const identicalDiff: DiffSummary = {
      bytesAdded: 0,
      bytesRemoved: 0,
      highConfidenceMatch: true,
      summaryText: 'File size and contents unchanged.',
    };
    renderPreloaded({ initialDiff: identicalDiff });
    expect(screen.getByText(/file size and contents unchanged/i)).toBeInTheDocument();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   Review step — retention toggle
   ══════════════════════════════════════════════════════════════════ */

describe('Review step — retention toggle', () => {
  it('shows the "Keep both versions" checkbox checked by default', () => {
    renderPreloaded();
    const checkbox = screen.getByRole('checkbox', { name: /keep both versions/i });
    expect(checkbox).toBeChecked();
  });

  it('shows a destructive warning when unchecked', async () => {
    renderPreloaded();
    const checkbox = screen.getByRole('checkbox', { name: /keep both versions/i });
    await userEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(screen.getByRole('note')).toHaveTextContent(/permanently replaced/i);
  });

  it('hides the warning when re-checked', async () => {
    renderPreloaded();
    const checkbox = screen.getByRole('checkbox', { name: /keep both versions/i });
    await userEvent.click(checkbox); // uncheck → warning
    await userEvent.click(checkbox); // re-check → no warning
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   Wizard navigation
   ══════════════════════════════════════════════════════════════════ */

describe('Wizard navigation', () => {
  it('advances to confirm step on "Continue to confirm"', async () => {
    renderPreloaded();
    const continueBtn = screen.getByRole('button', { name: /continue to confirm/i });
    await userEvent.click(continueBtn);
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /confirm replacement/i })).toBeInTheDocument();
    });
  });

  it('returns to review step on Back from confirm', async () => {
    renderPreloaded();
    await userEvent.click(screen.getByRole('button', { name: /continue to confirm/i }));
    await waitFor(() => screen.getByRole('region', { name: /confirm replacement/i }));
    await userEvent.click(screen.getByRole('button', { name: /^back$/i }));
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /review changes/i })).toBeInTheDocument();
    });
  });

  it('calls onConfirm with correct payload and shows success step', async () => {
    const { onConfirm } = renderPreloaded();
    await userEvent.click(screen.getByRole('button', { name: /continue to confirm/i }));
    await waitFor(() => screen.getByRole('region', { name: /confirm replacement/i }));
    await userEvent.click(screen.getByRole('button', { name: /save both|confirm replacement/i }));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          newVersion: expect.objectContaining({ id: 'ver-002' }),
          oldVersion: expect.objectContaining({ id: 'ver-001' }),
          keepBoth: true,
          activeVersionId: 'ver-002',
        }),
      );
    });
    expect(
      screen.getByRole('region', { name: /versions saved|document replaced/i }),
    ).toBeInTheDocument();
  });

  it('calls onCancel when Done is clicked on success step', async () => {
    const { onCancel } = renderPreloaded();
    await userEvent.click(screen.getByRole('button', { name: /continue to confirm/i }));
    await waitFor(() => screen.getByRole('region', { name: /confirm replacement/i }));
    await userEvent.click(screen.getByRole('button', { name: /save both|confirm replacement/i }));
    await waitFor(() => screen.getByRole('button', { name: /^done$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^done$/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   Confirm step
   ══════════════════════════════════════════════════════════════════ */

describe('Confirm step', () => {
  async function goToConfirm() {
    const utils = renderPreloaded();
    await userEvent.click(screen.getByRole('button', { name: /continue to confirm/i }));
    await waitFor(() => screen.getByRole('region', { name: /confirm replacement/i }));
    return utils;
  }

  it('shows the document name in the summary', async () => {
    await goToConfirm();
    expect(screen.getByText('Nexus Cloud Prospectus')).toBeInTheDocument();
  });

  it('shows the active version label in the summary', async () => {
    await goToConfirm();
    expect(screen.getByText(/v2 \(amended\)/i)).toBeInTheDocument();
  });

  it('shows "Save both & set active" button when keepBoth is true', async () => {
    await goToConfirm();
    expect(
      screen.getByRole('button', { name: /save both & set active/i }),
    ).toBeInTheDocument();
  });

  it('shows "Confirm replacement" button when keepBoth is false', async () => {
    renderPreloaded();
    // uncheck keepBoth
    await userEvent.click(screen.getByRole('checkbox', { name: /keep both versions/i }));
    await userEvent.click(screen.getByRole('button', { name: /continue to confirm/i }));
    await waitFor(() => screen.getByRole('region', { name: /confirm replacement/i }));
    expect(
      screen.getByRole('button', { name: /confirm replacement/i }),
    ).toBeInTheDocument();
  });

  it('shows the diff summary text', async () => {
    await goToConfirm();
    expect(screen.getByText(/307\.2 KB added/i)).toBeInTheDocument();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   Success step
   ══════════════════════════════════════════════════════════════════ */

describe('Success step', () => {
  async function goToSuccess() {
    const utils = renderPreloaded();
    await userEvent.click(screen.getByRole('button', { name: /continue to confirm/i }));
    await waitFor(() => screen.getByRole('region', { name: /confirm replacement/i }));
    await userEvent.click(screen.getByRole('button', { name: /save both|confirm replacement/i }));
    await waitFor(() => screen.getByRole('region', { name: /versions saved|document replaced/i }));
    return utils;
  }

  it('shows the active version on the success screen', async () => {
    await goToSuccess();
    const successRegion = screen.getByRole('region', { name: /versions saved|document replaced/i });
    expect(within(successRegion).getByText(/v2 \(amended\)/i)).toBeInTheDocument();
  });

  it('shows uploader name on success screen', async () => {
    await goToSuccess();
    expect(screen.getByText('Bob Okafor')).toBeInTheDocument();
  });

  it('shows version history row when keepBoth is true', async () => {
    await goToSuccess();
    expect(screen.getByText(/v1.*v2.*retained|both.*retained/i)).toBeInTheDocument();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   VersionHistoryDropdown
   ══════════════════════════════════════════════════════════════════ */

describe('VersionHistoryDropdown', () => {
  it('renders nothing when versions array is empty', () => {
    const { container } = render(
      <VersionHistoryDropdown
        versions={[]}
        activeVersionId="ver-001"
        onVersionChange={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a <select> with one option per version', () => {
    render(
      <VersionHistoryDropdown
        versions={ALL_VERSIONS}
        activeVersionId="ver-002"
        onVersionChange={vi.fn()}
      />,
    );
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(within(select).getAllByRole('option')).toHaveLength(ALL_VERSIONS.length);
  });

  it('has the active version selected by default', () => {
    render(
      <VersionHistoryDropdown
        versions={ALL_VERSIONS}
        activeVersionId="ver-002"
        onVersionChange={vi.fn()}
      />,
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('ver-002');
  });

  it('calls onVersionChange when a different version is selected', async () => {
    const onChange = vi.fn();
    render(
      <VersionHistoryDropdown
        versions={ALL_VERSIONS}
        activeVersionId="ver-002"
        onVersionChange={onChange}
      />,
    );
    await userEvent.selectOptions(screen.getByRole('combobox'), 'ver-001');
    expect(onChange).toHaveBeenCalledWith('ver-001');
  });

  it('shows metadata for the currently selected version', () => {
    render(
      <VersionHistoryDropdown
        versions={ALL_VERSIONS}
        activeVersionId="ver-002"
        onVersionChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Bob Okafor')).toBeInTheDocument();
  });

  it('shows the SHA-256 truncated hash', () => {
    render(
      <VersionHistoryDropdown
        versions={ALL_VERSIONS}
        activeVersionId="ver-002"
        onVersionChange={vi.fn()}
      />,
    );
    expect(screen.getByTitle(NEW_VERSION.sha256!)).toBeInTheDocument();
  });

  it('shows Active badge when the active version is in the list', () => {
    render(
      <VersionHistoryDropdown
        versions={ALL_VERSIONS}
        activeVersionId="ver-002"
        onVersionChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/^active$/i)).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <VersionHistoryDropdown
        versions={ALL_VERSIONS}
        activeVersionId="ver-002"
        onVersionChange={vi.fn()}
        disabled
      />,
    );
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('has a visible label associated with the select', () => {
    render(
      <VersionHistoryDropdown
        versions={ALL_VERSIONS}
        activeVersionId="ver-002"
        onVersionChange={vi.fn()}
        label="Document versions"
      />,
    );
    expect(screen.getByLabelText(/document versions/i)).toBeInTheDocument();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   Edge cases
   ══════════════════════════════════════════════════════════════════ */

describe('Edge cases', () => {
  it('handles large file sizes gracefully (50 MB CSV)', () => {
    const largeCsv: DocumentVersion = {
      id: 'ver-lg',
      versionLabel: 'v1',
      fileName: 'audit-dataset.csv',
      fileType: 'CSV',
      fileSizeBytes: 52_428_800,
      uploadedBy: { id: 'u1', name: 'Alice Mwangi' },
      uploadedAt: '2026-05-01T08:00:00Z',
      lineCount: 180_000,
    };
    render(<DocumentReplacementFlow oldVersion={largeCsv} locale="en-US" />);
    // Should render upload step without crashing
    expect(screen.getByLabelText(/select replacement document from device/i)).toBeInTheDocument();
  });

  it('handles mismatched file formats (XLSX → PDF)', async () => {
    const xlsxVersion: DocumentVersion = {
      id: 'ver-xlsx',
      versionLabel: 'v1',
      fileName: 'financial-model.xlsx',
      fileType: 'XLSX',
      fileSizeBytes: 512_000,
      uploadedBy: { id: 'u1', name: 'Alice Mwangi' },
      uploadedAt: '2026-03-10T11:00:00Z',
    };
    const pdfVersion: DocumentVersion = {
      ...xlsxVersion,
      id: 'ver-pdf',
      versionLabel: 'v2',
      fileName: 'financial-model.pdf',
      fileType: 'PDF',
    };
    const { container } = render(
      <DocumentReplacementFlow
        oldVersion={xlsxVersion}
        initialNewVersion={pdfVersion}
        initialDiff={{ ...MOCK_DIFF, highConfidenceMatch: false }}
        locale="en-US"
      />,
    );
    // Should show Approximate pill (highConfidenceMatch: false)
    expect(screen.getByText(/approximate/i)).toBeInTheDocument();
  });

  it('renders review step when initialNewVersion and initialDiff are both supplied', () => {
    renderPreloaded();
    // Should skip upload step entirely
    expect(screen.queryByLabelText(/select replacement document from device/i)).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: /review changes/i })).toBeInTheDocument();
  });

  it('does not crash when sha256 is absent from version', () => {
    const noHash: DocumentVersion = { ...OLD_VERSION, sha256: undefined };
    expect(() =>
      render(
        <DocumentReplacementFlow
          oldVersion={noHash}
          initialNewVersion={{ ...NEW_VERSION, sha256: undefined }}
          initialDiff={MOCK_DIFF}
          locale="en-US"
        />,
      ),
    ).not.toThrow();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   ARIA / WCAG 2.1 AA — axe audits
   ══════════════════════════════════════════════════════════════════ */

describe('Accessibility — axe', () => {
  it('has no violations on the upload step', async () => {
    const { container } = render(
      <DocumentReplacementFlow oldVersion={OLD_VERSION} locale="en-US" />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations on the review step (preloaded)', async () => {
    const { container } = renderPreloaded();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations on the confirm step', async () => {
    const { container } = renderPreloaded();
    await userEvent.click(screen.getByRole('button', { name: /continue to confirm/i }));
    await waitFor(() => screen.getByRole('region', { name: /confirm replacement/i }));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations on the success step', async () => {
    const { container } = renderPreloaded();
    await userEvent.click(screen.getByRole('button', { name: /continue to confirm/i }));
    await waitFor(() => screen.getByRole('region', { name: /confirm replacement/i }));
    await userEvent.click(screen.getByRole('button', { name: /save both|confirm replacement/i }));
    await waitFor(() => screen.getByRole('region', { name: /versions saved|document replaced/i }));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('VersionHistoryDropdown has no violations', async () => {
    const { container } = render(
      <VersionHistoryDropdown
        versions={ALL_VERSIONS}
        activeVersionId="ver-002"
        onVersionChange={vi.fn()}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   ARIA semantics (structural checks)
   ══════════════════════════════════════════════════════════════════ */

describe('Accessibility — ARIA semantics', () => {
  it('wraps the flow in a landmark with aria-label', () => {
    const { container } = renderPreloaded();
    const root = container.querySelector('[aria-label="Document replacement flow"]');
    expect(root).not.toBeNull();
  });

  it('step indicator uses role="list"', () => {
    renderPreloaded();
    expect(screen.getByRole('list', { name: /replacement progress/i })).toBeInTheDocument();
  });

  it('diff stat group has role="group" with accessible name', () => {
    renderPreloaded();
    expect(screen.getByRole('group', { name: /change breakdown/i })).toBeInTheDocument();
  });

  it('diff summary toggle has aria-expanded', () => {
    renderPreloaded();
    const btn = screen.getByRole('button', { name: /what changed/i });
    expect(btn).toHaveAttribute('aria-expanded');
  });

  it('retention checkbox has aria-describedby pointing to descriptive text', () => {
    renderPreloaded();
    const cb = screen.getByRole('checkbox', { name: /keep both versions/i });
    const descId = cb.getAttribute('aria-describedby');
    expect(descId).toBeTruthy();
    const desc = document.getElementById(descId!);
    expect(desc).not.toBeNull();
    expect(desc!.textContent).toMatch(/previous version will remain/i);
  });

  it('version radio inputs have unique accessible names', () => {
    renderPreloaded();
    const radios = screen.getAllByRole('radio');
    const names = radios.map((r) => r.getAttribute('aria-label'));
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(radios.length);
  });

  it('error alert uses role="alert"', async () => {
    const onFileSelected = vi.fn().mockRejectedValue(new Error('Upload failed'));
    render(
      <DocumentReplacementFlow
        oldVersion={OLD_VERSION}
        onFileSelected={onFileSelected}
        locale="en-US"
      />,
    );
    const input = screen.getByLabelText(/select replacement document from device/i);
    await userEvent.upload(input, new File(['x'], 'test.pdf', { type: 'application/pdf' }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('loading state uses role="status" with aria-live', async () => {
    // Simulate diff computation in progress: provide new version but no diff
    const slowDiff = vi.fn(() => new Promise<DiffSummary>(() => {})); // never resolves
    render(
      <DocumentReplacementFlow
        oldVersion={OLD_VERSION}
        initialNewVersion={NEW_VERSION}
        onComputeDiff={slowDiff}
        locale="en-US"
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/computing changes between versions/i)).toBeInTheDocument();
    });
    const loadingEl = screen.getByText(/computing changes between versions/i).closest('[role="status"]');
    expect(loadingEl).not.toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   Keyboard navigation
   ══════════════════════════════════════════════════════════════════ */

describe('Keyboard navigation', () => {
  it('all interactive elements in upload step are reachable by Tab', async () => {
    const onCancel = vi.fn();
    render(
      <DocumentReplacementFlow
        oldVersion={OLD_VERSION}
        onCancel={onCancel}
        locale="en-US"
      />,
    );
    const user = userEvent.setup();
    // Tab through the page; we should be able to reach the file input and Cancel button
    await user.tab();
    // At least one focusable element should exist
    const focusable = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    expect(focusable.length).toBeGreaterThan(0);
  });

  it('all interactive elements in review step are reachable by Tab', async () => {
    renderPreloaded();
    const focusable = document.querySelectorAll(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled)',
    );
    // Expect at least: diff toggle, 2x radios, retention checkbox, Back, Continue
    expect(focusable.length).toBeGreaterThanOrEqual(6);
  });

  it('Back button in review step navigates to upload step', async () => {
    renderPreloaded();
    const back = screen.getByRole('button', { name: /^back$/i });
    await userEvent.click(back);
    await waitFor(() => {
      expect(screen.getByLabelText(/select replacement document from device/i)).toBeInTheDocument();
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════
   onComputeDiff callback
   ══════════════════════════════════════════════════════════════════ */

describe('onComputeDiff callback', () => {
  it('calls onComputeDiff and renders its result', async () => {
    const customDiff: DiffSummary = {
      bytesAdded: 1024,
      bytesRemoved: 512,
      highConfidenceMatch: true,
      summaryText: 'Custom diff summary from API',
    };
    const onComputeDiff = vi.fn().mockResolvedValue(customDiff);
    render(
      <DocumentReplacementFlow
        oldVersion={OLD_VERSION}
        initialNewVersion={NEW_VERSION}
        onComputeDiff={onComputeDiff}
        locale="en-US"
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Custom diff summary from API')).toBeInTheDocument();
    });
    expect(onComputeDiff).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ver-001' }),
      expect.objectContaining({ id: 'ver-002' }),
    );
  });

  it('falls back to mock diff when onComputeDiff rejects', async () => {
    const onComputeDiff = vi.fn().mockRejectedValue(new Error('Network error'));
    render(
      <DocumentReplacementFlow
        oldVersion={OLD_VERSION}
        initialNewVersion={NEW_VERSION}
        onComputeDiff={onComputeDiff}
        locale="en-US"
      />,
    );
    // Should still show a diff (fallback)
    await waitFor(() => {
      expect(
        screen.getByRole('region', { name: /what changed/i }),
      ).toBeInTheDocument();
    });
  });
});
