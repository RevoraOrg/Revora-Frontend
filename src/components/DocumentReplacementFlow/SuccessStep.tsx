import React, { useId } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { formatDate, type SupportedLocale } from '../../constants/i18n';
import { Button } from '../Button';
import type { DocumentVersion } from './types';

interface SuccessStepProps {
  oldVersion: DocumentVersion;
  newVersion: DocumentVersion;
  keepBoth: boolean;
  activeVersionId: string;
  documentName?: string;
  locale: string;
  onDone?: () => void;
}

export const SuccessStep: React.FC<SuccessStepProps> = ({
  oldVersion,
  newVersion,
  keepBoth,
  activeVersionId,
  documentName,
  locale,
  onDone,
}) => {
  const headingId = useId();
  const activeVersion =
    activeVersionId === newVersion.id ? newVersion : oldVersion;

  return (
    <section className="drf-step-panel drf-step-panel--success" aria-labelledby={headingId}>
      <div className="drf-success-icon" aria-hidden="true">
        <CheckCircle2 size={48} />
      </div>
      <div className="drf-step-heading drf-step-heading--center">
        <h2 id={headingId}>
          {keepBoth ? 'Versions saved' : 'Document replaced'}
        </h2>
        <p className="drf-step-sub">
          {keepBoth
            ? `Both versions are available in the document history. ${activeVersion.versionLabel} is marked as the active version.`
            : `${newVersion.versionLabel} has replaced ${oldVersion.versionLabel}.`}
          {documentName ? ` (${documentName})` : ''}
        </p>
      </div>

      <div className="drf-success-summary">
        <div className="drf-success-row">
          <span className="drf-success-label">Active version</span>
          <span className="drf-success-value drf-success-value--active">
            <ShieldCheck size={14} aria-hidden="true" />
            {activeVersion.versionLabel} · {activeVersion.fileName}
          </span>
        </div>
        <div className="drf-success-row">
          <span className="drf-success-label">Uploaded</span>
          <span className="drf-success-value">
            {formatDate(
              newVersion.uploadedAt,
              locale as SupportedLocale,
              {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              },
            )}
          </span>
        </div>
        <div className="drf-success-row">
          <span className="drf-success-label">By</span>
          <span className="drf-success-value">
            {newVersion.uploadedBy.name}
          </span>
        </div>
        {keepBoth && (
          <div className="drf-success-row">
            <span className="drf-success-label">Version history</span>
            <span className="drf-success-value">
              {oldVersion.versionLabel} & {newVersion.versionLabel} retained
            </span>
          </div>
        )}
      </div>

      <div className="drf-step-actions drf-step-actions--center">
        {onDone && (
          <Button variant="primary" onClick={onDone} type="button">
            Done
          </Button>
        )}
      </div>
    </section>
  );
};
