/**
 * Shared types for DocumentReplacementFlow and VersionHistoryDropdown (Issue #449).
 */

export interface DocumentVersion {
  /** Stable unique identifier */
  id: string;
  /** Human-readable label, e.g. "v1", "v2", "Original", "Replacement" */
  versionLabel: string;
  fileName: string;
  /** e.g. "PDF", "CSV", "XLSX" */
  fileType: string;
  fileSizeBytes: number;
  uploadedBy: {
    id: string;
    name: string;
    email?: string;
  };
  /** ISO 8601 datetime string */
  uploadedAt: string;
  sha256?: string;
  previewUrl?: string;
  /** Optional page count for paginated documents */
  pageCount?: number;
  /** Optional line count for text-based documents */
  lineCount?: number;
  notes?: string;
}

export interface DiffSummary {
  bytesAdded: number;
  bytesRemoved: number;
  linesAdded?: number;
  linesRemoved?: number;
  pagesAdded?: number;
  pagesRemoved?: number;
  fieldsChanged?: Array<{
    name: string;
    oldValue: string;
    newValue: string;
  }>;
  /** Whether the diff engine has high confidence in the result */
  highConfidenceMatch: boolean;
  /** Human-readable one-line summary */
  summaryText: string;
}

export type ReplacementStep = 'upload' | 'review' | 'confirm' | 'success';
