import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, FileText, Upload } from 'lucide-react';
import { formatDate, type SupportedLocale } from '../../constants/i18n';
import { Button } from '../Button';
import type { DocumentVersion } from './types';
import { formatBytes } from './utils';

interface UploadStepProps {
  oldVersion: DocumentVersion;
  onFileSelected?: (file: File) => Promise<DocumentVersion> | DocumentVersion;
  onNext: (version: DocumentVersion) => void;
  onCancel?: () => void;
  locale: string;
  preselected?: DocumentVersion | null;
}

export const UploadStep: React.FC<UploadStepProps> = ({
  oldVersion,
  onFileSelected,
  onNext,
  onCancel,
  locale,
  preselected,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingId = useId();

  // If a preselected version was passed in, skip to next step
  useEffect(() => {
    if (preselected) {
      onNext(preselected);
    }
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsProcessing(true);
      try {
        const newVersion = onFileSelected
          ? await onFileSelected(file)
          : {
              id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              versionLabel: 'v2 (replacement)',
              fileName: file.name,
              fileType:
                (file.type.split('/')[1] || file.name.split('.').pop() || 'bin').toUpperCase(),
              fileSizeBytes: file.size,
              uploadedBy: oldVersion.uploadedBy,
              uploadedAt: new Date().toISOString(),
            } as DocumentVersion;
        onNext(newVersion);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Could not process the selected file.',
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [onFileSelected, onNext, oldVersion.uploadedBy],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void processFile(f);
  };

  return (
    <section
      className="drf-step-panel"
      aria-labelledby={headingId}
    >
      <div className="drf-step-heading">
        <h2 id={headingId}>Upload replacement document</h2>
        <p className="drf-step-sub">
          Drag & drop a file below, or pick one from your device. The file will be compared with the previous version.
        </p>
      </div>

      <div
        className={`drf-dropzone ${isDragging ? 'drf-dropzone--drag' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void processFile(f);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="drf-file-input"
          onChange={handleChange}
          aria-label="Select replacement document from device"
          disabled={isProcessing}
        />

        <div className="drf-dropzone-inner" aria-hidden="true">
          <div className="drf-dropzone-icon">
            <Upload size={28} />
          </div>
          <p className="drf-dropzone-primary">
            {isProcessing
              ? 'Processing file…'
              : 'Drop your replacement file here'}
          </p>
          <p className="drf-dropzone-secondary">
            or{' '}
            <button
              type="button"
              className="drf-dropzone-link"
              onClick={() => inputRef.current?.click()}
              disabled={isProcessing}
            >
              browse files
            </button>{' '}
            on your device
          </p>
        </div>
      </div>

      {error && (
        <div className="drf-error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="drf-current-doc">
        <h4 className="drf-current-doc-title">Replacing</h4>
        <div className="drf-current-doc-card">
          <FileText size={20} aria-hidden="true" />
          <div>
            <div className="drf-current-doc-name">{oldVersion.fileName}</div>
            <div className="drf-current-doc-sub">
              {oldVersion.versionLabel} · {formatBytes(oldVersion.fileSizeBytes)} · uploaded{' '}
              {formatDate(
                oldVersion.uploadedAt,
                locale as SupportedLocale,
                { month: 'short', day: 'numeric', year: 'numeric' },
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="drf-step-actions">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} type="button">
            Cancel
          </Button>
        )}
      </div>
    </section>
  );
};
