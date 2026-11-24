import React, { useId } from 'react';
import {
  Calendar,
  FileText,
  FileType,
  HardDrive,
  Hash,
  ShieldCheck,
  User,
} from 'lucide-react';
import { formatDate, type SupportedLocale } from '../../constants/i18n';
import type { DocumentVersion } from './types';
import { formatBytes } from './utils';

interface VersionCardProps {
  version: DocumentVersion;
  variant: 'old' | 'new';
  locale: string;
  isActive: boolean;
  selectable: boolean;
  onToggleActive?: () => void;
  actions?: React.ReactNode;
}

export const VersionCard: React.FC<VersionCardProps> = ({
  version,
  variant,
  locale,
  isActive,
  selectable,
  onToggleActive,
  actions,
}) => {
  const radioId = useId();

  return (
    <article
      className={`drf-version-card drf-version-card--${variant} ${isActive ? 'drf-version-card--active' : ''}`}
      aria-labelledby={`${radioId}-title`}
    >
      <header className="drf-version-card-header">
        <span
          className={`drf-version-badge drf-version-badge--${variant}`}
          aria-hidden="true"
        >
          {variant === 'old' ? 'Previous version' : 'New version'}
        </span>
        {isActive && (
          <span className="drf-active-badge" role="status" aria-live="polite">
            <ShieldCheck size={12} aria-hidden="true" />
            Active
          </span>
        )}
      </header>

      <div className="drf-version-preview">
        <div className="drf-preview-icon" aria-hidden="true">
          <FileText size={32} />
        </div>
        <div className="drf-preview-meta">
          <h4 id={`${radioId}-title`} className="drf-preview-name">
            {version.fileName}
          </h4>
          <span className="drf-preview-label">
            {version.versionLabel}
          </span>
        </div>
      </div>

      <dl className="drf-version-meta">
        <div className="drf-meta-item">
          <dt aria-hidden="true">
            <FileType size={14} /> Type
          </dt>
          <dd>{version.fileType.toUpperCase()}</dd>
        </div>
        <div className="drf-meta-item">
          <dt aria-hidden="true">
            <HardDrive size={14} /> Size
          </dt>
          <dd>{formatBytes(version.fileSizeBytes)}</dd>
        </div>
        <div className="drf-meta-item">
          <dt aria-hidden="true">
            <User size={14} /> Uploaded by
          </dt>
          <dd title={version.uploadedBy.email}>
            {version.uploadedBy.name}
          </dd>
        </div>
        <div className="drf-meta-item">
          <dt aria-hidden="true">
            <Calendar size={14} /> Uploaded
          </dt>
          <dd>
            {formatDate(
              version.uploadedAt,
              locale as SupportedLocale,
              {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              },
            )}
          </dd>
        </div>
        {version.pageCount !== undefined && (
          <div className="drf-meta-item">
            <dt aria-hidden="true">
              <FileText size={14} /> Pages
            </dt>
            <dd>{version.pageCount}</dd>
          </div>
        )}
        {version.sha256 && (
          <div className="drf-meta-item drf-meta-item--hash">
            <dt aria-hidden="true">
              <Hash size={14} /> SHA-256
            </dt>
            <dd className="drf-hash" title={version.sha256}>
              {version.sha256.slice(0, 10)}…{version.sha256.slice(-6)}
            </dd>
          </div>
        )}
      </dl>

      {selectable && (
        <label
          className="drf-active-selector"
          htmlFor={`${radioId}-radio`}
        >
          <input
            id={`${radioId}-radio`}
            type="radio"
            name="drf-active-version"
            checked={isActive}
            onChange={onToggleActive}
            aria-label={`Mark version ${version.versionLabel} as active`}
          />
          <span className="drf-active-selector-label">
            {isActive ? 'This is the active version' : 'Mark as active version'}
          </span>
        </label>
      )}

      {actions && <div className="drf-version-actions">{actions}</div>}
    </article>
  );
};
