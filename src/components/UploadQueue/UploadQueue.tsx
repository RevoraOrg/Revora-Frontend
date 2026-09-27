import React, { useRef, useState, useCallback, useEffect, useId } from 'react';
import { UploadCloud, X, RotateCcw, CheckCircle2, AlertCircle, FileText, Loader2 } from 'lucide-react';
import './UploadQueue.css';
import type { UploadFile, UploadStatus, Uploader } from '../../hooks/useUploadQueue';

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface UploadQueueProps {
  queue: UploadFile[];
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string, uploader: Uploader) => void;
  onUploadAll: () => void;
  onClearComplete: () => void;
  totalCount: number;
  successCount: number;
  errorCount: number;
  uploadingCount: number;
  overallProgress: number;
  /**
   * Injected uploader — used for per-file retry and "Upload all".
   * When omitted, retry controls render disabled with an explanatory
   * tooltip and are non-functional; no error is thrown and `onRetry` is
   * never invoked.
   */
  uploader?: Uploader;
  /** Accept string forwarded to the hidden file input. */
  accept?: string;
  className?: string;
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

/**
 * Resolves the effective uploader for this render.
 *
 * Success contract: an explicitly injected uploader is used verbatim for
 * retry (and upload-all) invocations.
 *
 * Failure contract: when no uploader is provided, retry is a deterministic
 * no-op — the component falls back to an internal no-op uploader so a caller
 * may still complete the public contract without crashing, while rendering
 * a disabled retry control and emitting a single `console.warn` per mount
 * cycle so the missing dependency is observable in tests and telemetry.
 *
 * Returns whether the uploader was actually injected (drives the disabled
 * retry state) and the uploader instance to pass to callbacks.
 */
function resolveUploader(
  uploader: Uploader | undefined,
): { injected: boolean; uploader: Uploader } {
  return uploader
    ? { injected: true, uploader }
    : { injected: false, uploader: createNoopUploader() };
}

/**
 * Completed default for the optional `uploader` prop: a no-op uploader that
 * never invokes its progress callback and never rejects. Callers may pass
 * this explicitly (e.g. `uploader={createNoopUploader()}`) to satisfy the
 * contract, keeping retry permanently inert in a type-safe way.
 */
export function createNoopUploader(): Uploader {
  const noop: Uploader = () => Promise.resolve();
  return noop;
}

const RING_R = 16;
const RING_CIRC = 2 * Math.PI * RING_R;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusLabel(status: UploadStatus, progress: number): string {
  switch (status) {
    case 'uploading': return `Uploading ${progress}%`;
    case 'success':   return 'Complete';
    case 'error':     return 'Failed';
    default:          return 'Pending';
  }
}

/* ─── ProgressRing ──────────────────────────────────────────────────────── */

interface ProgressRingProps {
  status: UploadStatus;
  progress: number;
  size?: number;
}

const ProgressRing: React.FC<ProgressRingProps> = ({ status, progress, size = 40 }) => {
  const r = RING_R;
  const circ = RING_CIRC;
  const offset = status === 'success'
    ? 0
    : circ - (circ * Math.max(0, Math.min(100, progress))) / 100;

  const fillClass =
    status === 'success' ? 'upload-queue__ring-fill--success' :
    status === 'error'   ? 'upload-queue__ring-fill--error'   :
    'upload-queue__ring-fill';

  const iconClass =
    status === 'success'  ? 'upload-queue__ring-icon--success'  :
    status === 'error'    ? 'upload-queue__ring-icon--error'    :
    status === 'uploading'? 'upload-queue__ring-icon--uploading':
    'upload-queue__ring-icon';

  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg
      className="upload-queue__ring"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
    >
      <circle
        className="upload-queue__ring-track"
        cx={cx} cy={cy} r={r}
        fill="none"
        strokeWidth={3}
      />
      {status !== 'pending' && status !== 'error' && (
        <circle
          className={fillClass}
          cx={cx} cy={cy} r={r}
          fill="none"
          strokeWidth={3}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
      )}
      {/* Center icon */}
      <foreignObject x={cx - 8} y={cy - 8} width={16} height={16}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16 }}>
          {status === 'success'  && <CheckCircle2 size={14} className={iconClass} />}
          {status === 'error'    && <AlertCircle  size={14} className={iconClass} />}
          {status === 'uploading'&& <Loader2      size={14} className={`${iconClass} animate-spin-loader`} />}
          {status === 'pending'  && <FileText     size={14} className={iconClass} />}
        </div>
      </foreignObject>
    </svg>
  );
};

/* ─── QueueRow ──────────────────────────────────────────────────────────── */

interface QueueRowProps {
  item: UploadFile;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  /** True when the row is a failed upload and no uploader is injected. */
  disabled?: boolean;
  labelId: string;
}

const QueueRow: React.FC<QueueRowProps> = ({
  item,
  onRemove,
  onRetry,
  disabled = false,
  labelId,
}) => {
  const { id, file, status, progress, errorMessage } = item;
  const rowClass = [
    'upload-queue__row',
    status === 'success' ? 'upload-queue__row--success' : '',
    status === 'error'   ? 'upload-queue__row--error'   : '',
  ].filter(Boolean).join(' ');

  return (
    <li
      className={rowClass}
      aria-labelledby={labelId}
      data-testid="upload-queue-row"
      data-status={status}
    >
      <ProgressRing status={status} progress={progress} />

      <div className="upload-queue__meta">
        <span id={labelId} className="upload-queue__filename" title={file.name}>
          {file.name}
        </span>
        <div className="upload-queue__fileinfo">
          <span>{formatBytes(file.size)}</span>
          <span className="upload-queue__fileinfo-sep" aria-hidden="true">·</span>
          <span className={`upload-queue__status-text--${status}`}>
            {statusLabel(status, progress)}
          </span>
        </div>
        {status === 'error' && errorMessage && (
          <span className="upload-queue__error-msg" title={errorMessage}>
            {errorMessage}
          </span>
        )}
      </div>

      <div className="upload-queue__controls">
        {status === 'error' && (
          <button
            type="button"
            className={`upload-queue__btn upload-queue__btn--retry${
              disabled ? ' upload-queue__btn--retry-disabled' : ''
            }`}
            aria-label={`Retry upload for ${file.name}`}
            aria-disabled={disabled || undefined}
            disabled={disabled || undefined}
            title={
              disabled
                ? 'Retry unavailable: no uploader provided'
                : undefined
            }
            onClick={() => onRetry(id)}
            data-testid="retry-btn"
            data-uploader-missing={disabled || undefined}
          >
            <RotateCcw size={14} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className="upload-queue__btn upload-queue__btn--remove"
          aria-label={`Remove ${file.name} from queue`}
          onClick={() => onRemove(id)}
          data-testid="remove-btn"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
};

/* ─── SummaryBar ────────────────────────────────────────────────────────── */

interface SummaryBarProps {
  totalCount: number;
  successCount: number;
  errorCount: number;
  uploadingCount: number;
  overallProgress: number;
  pendingCount: number;
  onUploadAll: () => void;
  onClearComplete: () => void;
}

const SummaryBar: React.FC<SummaryBarProps> = ({
  totalCount,
  successCount,
  errorCount,
  uploadingCount,
  overallProgress,
  pendingCount,
  onUploadAll,
  onClearComplete,
}) => {
  const isComplete = totalCount > 0 && successCount + errorCount === totalCount;
  const isUploading = uploadingCount > 0;
  const hasPending = pendingCount > 0;

  const summaryText = isComplete
    ? `${successCount} of ${totalCount} uploaded${errorCount > 0 ? `, ${errorCount} failed` : ''}`
    : isUploading
    ? `Uploading ${uploadingCount} of ${totalCount} files…`
    : `${totalCount} file${totalCount !== 1 ? 's' : ''} queued`;

  const barFillClass = [
    'upload-queue__summary-bar-fill',
    isComplete && errorCount === 0 ? 'upload-queue__summary-bar-fill--complete' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="upload-queue__summary" data-testid="upload-queue-summary">
      <div className="upload-queue__summary-row">
        <div className="upload-queue__summary-stats">
          <span className="upload-queue__summary-label">{summaryText}</span>
          {successCount > 0 && (
            <span className="upload-queue__summary-stat upload-queue__summary-stat--success">
              <CheckCircle2 size={12} aria-hidden="true" />
              {successCount} done
            </span>
          )}
          {errorCount > 0 && (
            <span className="upload-queue__summary-stat upload-queue__summary-stat--error" aria-hidden="true">
              <AlertCircle size={12} aria-hidden="true" />
              {errorCount} failed
            </span>
          )}
          {isUploading && (
            <span className="upload-queue__summary-stat upload-queue__summary-stat--uploading">
              <Loader2 size={12} className="animate-spin-loader" aria-hidden="true" />
              {uploadingCount} uploading
            </span>
          )}
        </div>
        <div className="upload-queue__summary-actions">
          {hasPending && !isUploading && (
            <button
              type="button"
              className="upload-queue__action-btn upload-queue__action-btn--primary"
              onClick={onUploadAll}
              data-testid="upload-all-btn"
            >
              <UploadCloud size={12} aria-hidden="true" />
              Upload all
            </button>
          )}
          {successCount > 0 && (
            <button
              type="button"
              className="upload-queue__action-btn upload-queue__action-btn--ghost"
              onClick={onClearComplete}
              data-testid="clear-complete-btn"
            >
              Clear done
            </button>
          )}
        </div>
      </div>
      <div
        className="upload-queue__summary-bar"
        role="progressbar"
        aria-label="Overall upload progress"
        aria-valuenow={overallProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={barFillClass} style={{ width: `${overallProgress}%` }} />
      </div>
      <span className="upload-queue__summary-pct" aria-hidden="true">
        {overallProgress}% overall
      </span>
    </div>
  );
};

/* ─── UploadQueue ───────────────────────────────────────────────────────── */

export const UploadQueue: React.FC<UploadQueueProps> = ({
  queue,
  onAddFiles,
  onRemove,
  onRetry,
  onUploadAll,
  onClearComplete,
  totalCount,
  successCount,
  errorCount,
  uploadingCount,
  overallProgress,
  uploader,
  accept,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const liveRegionId = useId();
  const baseRowId = useId();

  const { injected: uploaderInjected, uploader: effectiveUploader } =
    resolveUploader(uploader);

  /*
   * Failure-path observability: when failed uploads exist while no uploader
   * is provided, emit a single deterministic `console.warn` per failure
   * episode so the misconfiguration is visible in tests and telemetry
   * without requiring user interaction. The guard resets once the condition
   * clears (uploader added or no failed rows remain).
   */
  const hasFailedRows = errorCount > 0;
  const warnedNoUploaderRef = useRef(false);

  useEffect(() => {
    if (!uploaderInjected && hasFailedRows) {
      if (!warnedNoUploaderRef.current) {
        warnedNoUploaderRef.current = true;
        console.warn(
          '[UploadQueue] Retry unavailable: no `uploader` prop was provided. ' +
            'Pass an Uploader to enable per-file retry.',
        );
      }
    } else {
      warnedNoUploaderRef.current = false;
    }
  }, [uploaderInjected, hasFailedRows]);

  const pendingCount = queue.filter((f) => f.status === 'pending').length;

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      onAddFiles(Array.from(files));
    },
    [onAddFiles],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    },
    [],
  );

  const handleRetry = useCallback(
    (id: string) => {
      // Defensive guard: the retry control renders disabled in this state,
      // so user-initiated clicks never reach here without an uploader.
      if (!uploaderInjected) return;
      onRetry(id, effectiveUploader);
    },
    [onRetry, uploaderInjected, effectiveUploader],
  );

  /* Live-region announcement text */
  const announcement = (() => {
    if (uploadingCount > 0) return `Uploading ${uploadingCount} file${uploadingCount !== 1 ? 's' : ''}. ${overallProgress}% complete.`;
    if (successCount === totalCount && totalCount > 0) return `All ${totalCount} files uploaded successfully.`;
    if (errorCount > 0) return `${errorCount} file${errorCount !== 1 ? 's' : ''} failed to upload.`;
    return '';
  })();

  return (
    <div className={`upload-queue ${className}`} data-testid="upload-queue">
      {/* Polite live region for state announcements */}
      <div
        id={liveRegionId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="upload-live-region"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
      >
        {announcement}
      </div>

      {/* Drop zone */}
      <div
        className={`upload-queue__dropzone${isDragOver ? ' upload-queue__dropzone--active' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Upload files. Click or drag and drop files here."
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={handleKeyDown}
        data-testid="upload-dropzone"
      >
        <UploadCloud size={28} className="upload-queue__dropzone-icon" aria-hidden="true" />
        <span className="upload-queue__dropzone-label">
          Click or drag &amp; drop files to upload
        </span>
        <span className="upload-queue__dropzone-hint">
          Multiple files supported
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        aria-hidden="true"
        tabIndex={-1}
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
        data-testid="file-input"
      />

      {/* Summary bar — only when files are queued */}
      {totalCount > 0 && (
        <SummaryBar
          totalCount={totalCount}
          successCount={successCount}
          errorCount={errorCount}
          uploadingCount={uploadingCount}
          overallProgress={overallProgress}
          pendingCount={pendingCount}
          onUploadAll={onUploadAll}
          onClearComplete={onClearComplete}
        />
      )}

      {/* File list */}
      {queue.length > 0 && (
        <ul
          className="upload-queue__list"
          aria-label={`Upload queue, ${totalCount} file${totalCount !== 1 ? 's' : ''}`}
          data-testid="upload-queue-list"
        >
          {queue.map((item, idx) => (
            <QueueRow
              key={item.id}
              item={item}
              onRemove={onRemove}
              onRetry={handleRetry}
              disabled={item.status === 'error' && !uploaderInjected}
              labelId={`${baseRowId}-row-${idx}`}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

UploadQueue.displayName = 'UploadQueue';
