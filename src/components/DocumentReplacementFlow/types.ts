export interface DocumentVersion {
  id: string;
  versionLabel: string; // e.g. "v1", "v2", "Original", "Replacement"
  fileName: string;
  fileType: string; // e.g. "PDF", "CSV", "XLSX"
  fileSizeBytes: number;
  uploadedBy: {
    id: string;
    name: string;
    email?: string;
  };
  uploadedAt: string; // ISO
  sha256?: string;
  previewUrl?: string;
  /** Optional page count for docs */
  pageCount?: number;
  /** Optional line count for text docs */
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
  highConfidenceMatch: boolean; // whether the diff engine is confident
  summaryText: string; // human-readable summary
}

export type ReplacementStep = 'upload' | 'review' | 'confirm' | 'success';

export interface DocumentReplacementFlowProps {
  /** Existing document to replace */
  oldVersion: DocumentVersion;
  /** Optional pre-uploaded new version; if omitted, step 1 uploads one */
  initialNewVersion?: DocumentVersion | null;
  /** Optional pre-computed diff (e.g. from API) */
  initialDiff?: DiffSummary | null;
  /** Locale */
  locale?: string;
  /** Optional document name override */
  documentName?: string;
  /** Called with the final decision on submit */
  onConfirm?: (result: {
    newVersion: DocumentVersion;
    oldVersion: DocumentVersion;
    keepBoth: boolean;
    activeVersionId: string;
  }) => void;
  /** Called when the flow is canceled */
  onCancel?: () => void;
  /** Called when a new file is picked / dropped. Return the new DocumentVersion. */
  onFileSelected?: (file: File) => Promise<DocumentVersion> | DocumentVersion;
  /** Called when a diff is needed. Return DiffSummary if available. */
  onComputeDiff?: (
    oldVersion: DocumentVersion,
    newVersion: DocumentVersion,
  ) => Promise<DiffSummary> | DiffSummary;
  /** Additional CSS class */
  className?: string;
}
