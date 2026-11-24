import React, { useId, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  FileDiff,
  Minus,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import type { DiffSummary } from './types';
import { formatBytes } from './utils';

interface DiffSummaryPanelProps {
  diff: DiffSummary;
}

export const DiffSummaryPanel: React.FC<DiffSummaryPanelProps> = ({ diff }) => {
  const [expanded, setExpanded] = useState(true);
  const headerId = useId();

  return (
    <section
      className="drf-diff-summary"
      aria-labelledby={headerId}
    >
      <button
        type="button"
        className="drf-diff-summary-header"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls={`${headerId}-body`}
      >
        <div className="drf-diff-summary-title">
          <FileDiff size={18} aria-hidden="true" />
          <h3 id={headerId}>What changed</h3>
          {!diff.highConfidenceMatch && (
            <span className="drf-diff-warn-pill" title="Diff accuracy may be limited for binary files">
              <AlertTriangle size={12} aria-hidden="true" />
              Approximate
            </span>
          )}
        </div>
        <span className="drf-diff-summary-text" aria-live="polite">
          {diff.summaryText}
        </span>
        <span className="drf-diff-summary-toggle" aria-hidden="true">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {expanded && (
        <div id={`${headerId}-body`} className="drf-diff-summary-body">
          <div className="drf-diff-grid" role="group" aria-label="Change breakdown">
            <div className="drf-diff-stat drf-diff-stat--added">
              <div className="drf-diff-stat-icon" aria-hidden="true">
                <Plus size={16} />
              </div>
              <div className="drf-diff-stat-content">
                <span className="drf-diff-stat-value">
                  +{formatBytes(diff.bytesAdded)}
                </span>
                <span className="drf-diff-stat-label">Bytes added</span>
              </div>
            </div>
            <div className="drf-diff-stat drf-diff-stat--removed">
              <div className="drf-diff-stat-icon" aria-hidden="true">
                <Minus size={16} />
              </div>
              <div className="drf-diff-stat-content">
                <span className="drf-diff-stat-value">
                  −{formatBytes(diff.bytesRemoved)}
                </span>
                <span className="drf-diff-stat-label">Bytes removed</span>
              </div>
            </div>
            {diff.linesAdded !== undefined && diff.linesRemoved !== undefined && (
              <>
                <div className="drf-diff-stat drf-diff-stat--added">
                  <div className="drf-diff-stat-icon" aria-hidden="true">
                    <Plus size={16} />
                  </div>
                  <div className="drf-diff-stat-content">
                    <span className="drf-diff-stat-value">
                      +{diff.linesAdded}
                    </span>
                    <span className="drf-diff-stat-label">Lines added</span>
                  </div>
                </div>
                <div className="drf-diff-stat drf-diff-stat--removed">
                  <div className="drf-diff-stat-icon" aria-hidden="true">
                    <Minus size={16} />
                  </div>
                  <div className="drf-diff-stat-content">
                    <span className="drf-diff-stat-value">
                      −{diff.linesRemoved}
                    </span>
                    <span className="drf-diff-stat-label">Lines removed</span>
                  </div>
                </div>
              </>
            )}
            {diff.pagesAdded !== undefined && diff.pagesRemoved !== undefined && (
              <>
                <div className="drf-diff-stat drf-diff-stat--added">
                  <div className="drf-diff-stat-icon" aria-hidden="true">
                    <Plus size={16} />
                  </div>
                  <div className="drf-diff-stat-content">
                    <span className="drf-diff-stat-value">
                      +{diff.pagesAdded}
                    </span>
                    <span className="drf-diff-stat-label">Pages added</span>
                  </div>
                </div>
                <div className="drf-diff-stat drf-diff-stat--removed">
                  <div className="drf-diff-stat-icon" aria-hidden="true">
                    <Minus size={16} />
                  </div>
                  <div className="drf-diff-stat-content">
                    <span className="drf-diff-stat-value">
                      −{diff.pagesRemoved}
                    </span>
                    <span className="drf-diff-stat-label">Pages removed</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {diff.fieldsChanged && diff.fieldsChanged.length > 0 && (
            <div className="drf-fields-changed">
              <h4 className="drf-fields-changed-title">
                <Sparkles size={14} aria-hidden="true" />
                Fields changed
              </h4>
              <ul className="drf-fields-changed-list" role="list">
                {diff.fieldsChanged.map((field, idx) => (
                  <li key={`${field.name}-${idx}`} className="drf-field-row">
                    <span className="drf-field-name">{field.name}</span>
                    <span className="drf-field-val drf-field-val--old">
                      <X size={12} aria-hidden="true" /> {field.oldValue}
                    </span>
                    <span
                      className="drf-field-arrow"
                      aria-hidden="true"
                    >
                      <ArrowRight size={12} />
                    </span>
                    <span className="drf-field-val drf-field-val--new">
                      <Check size={12} aria-hidden="true" /> {field.newValue}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
