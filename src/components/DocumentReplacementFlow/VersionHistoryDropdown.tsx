/**
 * VersionHistoryDropdown — Issue #449
 *
 * A <select>-based dropdown that lists all available document versions
 * and lets the user switch the "active" version without going through the
 * full replacement wizard. Lives above the DocumentReplacementFlow or
 * inline on a document detail page.
 *
 * Accessibility (WCAG 2.1 AA):
 * - Native <select> element: keyboard-operable by default (Tab + arrow keys)
 * - Visible label associated via htmlFor / id
 * - aria-describedby for helper text
 * - Active version indicated both visually (badge) and semantically (option text)
 * - Reduced-motion: no animation introduced
 */

import React, { useId } from 'react';
import { ShieldCheck, History } from 'lucide-react';
import type { DocumentVersion } from './DocumentReplacementFlow.types';
import { formatDate } from '../../constants/i18n';
import type { SupportedLocale } from '../../constants/i18n';
import './VersionHistoryDropdown.css';

export interface VersionHistoryDropdownProps {
  /** All available versions, newest first */
  versions: DocumentVersion[];
  /** ID of the currently active version */
  activeVersionId: string;
  /** Called when the user selects a different version */
  onVersionChange: (versionId: string) => void;
  locale?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const VersionHistoryDropdown: React.FC<VersionHistoryDropdownProps> = ({
  versions,
  activeVersionId,
  onVersionChange,
  locale = 'en-US',
  label = 'Version history',
  disabled = false,
  className = '',
}) => {
  const selectId = useId();
  const helpId = `${selectId}-help`;

  if (versions.length === 0) return null;

  return (
    <div className={`vhd-root ${className}`} data-testid="version-history-dropdown">
      <div className="vhd-header">
        <History size={14} aria-hidden="true" className="vhd-header-icon" />
        <label htmlFor={selectId} className="vhd-label">
          {label}
        </label>
        {/* Active badge */}
        {versions.some((v) => v.id === activeVersionId) && (
          <span className="vhd-active-badge" aria-hidden="true">
            <ShieldCheck size={10} aria-hidden="true" />
            Active
          </span>
        )}
      </div>

      <select
        id={selectId}
        className="vhd-select"
        value={activeVersionId}
        onChange={(e) => onVersionChange(e.target.value)}
        disabled={disabled}
        aria-describedby={helpId}
        data-testid="version-history-select"
      >
        {versions.map((version) => {
          const isActive = version.id === activeVersionId;
          const uploadedDate = formatDate(
            version.uploadedAt,
            locale as SupportedLocale,
            { month: 'short', day: 'numeric', year: 'numeric' },
          );
          return (
            <option key={version.id} value={version.id}>
              {version.versionLabel} — {version.fileName} ({uploadedDate}){isActive ? ' [Active]' : ''}
            </option>
          );
        })}
      </select>

      <p id={helpId} className="vhd-help">
        Select a version to view its metadata. The version marked [Active] is the one currently in use.
      </p>

      {/* Read-only metadata for selected version */}
      {(() => {
        const selected = versions.find((v) => v.id === activeVersionId);
        if (!selected) return null;
        return (
          <dl className="vhd-meta" aria-label="Selected version details">
            <div className="vhd-meta-item">
              <dt>Uploaded by</dt>
              <dd title={selected.uploadedBy.email}>{selected.uploadedBy.name}</dd>
            </div>
            <div className="vhd-meta-item">
              <dt>Uploaded</dt>
              <dd>
                {formatDate(selected.uploadedAt, locale as SupportedLocale, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </dd>
            </div>
            <div className="vhd-meta-item">
              <dt>File type</dt>
              <dd>{selected.fileType.toUpperCase()}</dd>
            </div>
            {selected.sha256 && (
              <div className="vhd-meta-item vhd-meta-item--hash">
                <dt>SHA-256</dt>
                <dd
                  className="vhd-hash"
                  title={selected.sha256}
                  aria-label={`SHA-256 checksum: ${selected.sha256}`}
                >
                  {selected.sha256.slice(0, 10)}…{selected.sha256.slice(-6)}
                </dd>
              </div>
            )}
          </dl>
        );
      })()}
    </div>
  );
};

VersionHistoryDropdown.displayName = 'VersionHistoryDropdown';
