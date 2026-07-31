import { useCallback, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Image as ImageIcon,
} from "lucide-react";
import type { TokenGroup } from "./tokens";
import {
  computeTokenDiff,
  diffFilename,
  formatDiff,
  isHexColor,
  type ChangeStatus,
  type ExportFormat,
  type TokenDiffEntry,
  type TokenDiffGroup,
} from "./tokenDiff";

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 1800);
    });
  }, []);

  return { copied, copy };
}

function downloadDiff(text: string, format: ExportFormat) {
  const blob = new Blob([text], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = diffFilename(format);
  link.click();
  URL.revokeObjectURL(url);
}

const STATUS_LABELS: Record<ChangeStatus, string> = {
  added: "Added",
  changed: "Changed",
  removed: "Removed",
  unchanged: "Unchanged",
};

function ValueCell({
  value,
  type,
  isBinary,
}: {
  value?: string;
  type: TokenGroup["type"];
  isBinary: boolean;
}) {
  if (!value) return <span className="dt-diff-na">—</span>;
  if (isBinary)
    return (
      <span className="dt-diff-binary">
        <ImageIcon size={14} aria-hidden="true" />
        Binary asset
      </span>
    );

  const isColor = type === "color" && isHexColor(value);
  return (
    <span className="dt-diff-value">
      {isColor && (
        <span
          className="dt-diff-swatch"
          style={{ background: value }}
          aria-hidden="true"
        />
      )}
      <code>{value}</code>
    </span>
  );
}

function DiffRow({ entry }: { entry: TokenDiffEntry }) {
  const badgeText = STATUS_LABELS[entry.status];
  return (
    <div
      className={`dt-diff-row dt-diff-row--${entry.status}`}
      role="row"
      aria-label={`${entry.name}: ${badgeText.toLowerCase()}`}
    >
      <div role="cell" className="dt-diff-cell dt-diff-token">
        <span className={`dt-diff-badge dt-diff-badge--${entry.status}`}>
          {badgeText}
        </span>
        <span className="dt-diff-token-name">
          {entry.name}
          <code className="dt-diff-var">{entry.variable}</code>
        </span>
      </div>
      <div role="cell" className="dt-diff-cell dt-diff-before">
        {entry.status === "added" ? (
          <span className="dt-diff-na">—</span>
        ) : (
          <ValueCell
            value={entry.before}
            type={entry.type}
            isBinary={entry.isBinary}
          />
        )}
      </div>
      <div role="cell" className="dt-diff-cell dt-diff-after">
        {entry.status === "removed" ? (
          <span className="dt-diff-na">—</span>
        ) : (
          <ValueCell
            value={entry.after}
            type={entry.type}
            isBinary={entry.isBinary}
          />
        )}
      </div>
    </div>
  );
}

interface TokenDiffProps {
  before: TokenGroup[];
  after: TokenGroup[];
}

export function TokenDiff({ before, after }: TokenDiffProps) {
  const [showAll, setShowAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ChangeStatus | "all">("all");
  const [format, setFormat] = useState<ExportFormat>("json");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const { copy, copied } = useCopy();

  const groups = useMemo(
    () => computeTokenDiff(before, after),
    [before, after]
  );

  const counts = useMemo(() => {
    const c = { added: 0, changed: 0, removed: 0, unchanged: 0 };
    for (const group of groups) {
      for (const entry of group.entries) c[entry.status] += 1;
    }
    return c;
  }, [groups]);

  const hasChanges = counts.added + counts.changed + counts.removed > 0;

  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          entries: group.entries.filter((entry) => {
            const matchesStatus =
              statusFilter === "all" || entry.status === statusFilter;
            const matchesVisibility =
              showAll || entry.status !== "unchanged";
            return matchesStatus && matchesVisibility;
          }),
        }))
        .filter((group) => group.entries.length > 0),
    [groups, statusFilter, showAll]
  );

  const toggleGroup = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exportText = useMemo(() => formatDiff(groups, format), [groups, format]);

  const statusFilters: Array<ChangeStatus | "all"> = [
    "all",
    "added",
    "changed",
    "removed",
  ];

  return (
    <section
      className="dt-section glass-card dt-diff-section"
      aria-labelledby="token-diff-heading"
    >
      <div className="dt-diff-header">
        <div className="dt-diff-header-text">
          <h2 id="token-diff-heading" className="dt-section-title">
            Token Diff & Export
            <span className="dt-section-count">
              {counts.added + counts.changed + counts.removed} changes
            </span>
          </h2>
          <p className="dt-diff-subtitle">
            Changes between the last saved snapshot and the current draft.
          </p>
        </div>

        <div className="dt-diff-summary" role="list">
          {(Object.keys(STATUS_LABELS) as ChangeStatus[]).map((status) => (
            <span
              key={status}
              role="listitem"
              aria-label={`${counts[status]} ${STATUS_LABELS[status].toLowerCase()}`}
              className={`dt-diff-chip dt-diff-chip--${status}`}
            >
              <span className="dt-diff-chip-count">{counts[status]}</span>
              {STATUS_LABELS[status]}
            </span>
          ))}
        </div>
      </div>

      <div className="dt-diff-toolbar">
        <div
          className="dt-diff-toggle"
          role="group"
          aria-label="Filter diff by status"
        >
          {statusFilters.map((status) => {
            const label =
              status === "all" ? "All" : STATUS_LABELS[status];
            const count =
              status === "all"
                ? counts.added + counts.changed + counts.removed
                : counts[status];
            return (
              <button
                key={status}
                className={`dt-diff-toggle-btn ${
                  statusFilter === status ? "dt-diff-toggle-btn--active" : ""
                }`}
                aria-pressed={statusFilter === status}
                onClick={() => setStatusFilter(status)}
              >
                {label}
                <span className="dt-diff-toggle-count">{count}</span>
              </button>
            );
          })}
        </div>

        <button
          className="dt-diff-showall-btn"
          aria-pressed={showAll}
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll ? "Hide unchanged" : "Show unchanged"}
        </button>
      </div>

      {hasChanges ? (
        <div className="dt-diff-groups">
          {visibleGroups.length === 0 ? (
            <div className="dt-diff-empty" role="status" aria-live="polite">
              <p>
                No tokens match the current filter. Try{" "}
                <button
                  className="dt-diff-link-btn"
                  onClick={() => setStatusFilter("all")}
                >
                  clearing the status filter
                </button>
                .
              </p>
            </div>
          ) : (
            visibleGroups.map((group) => (
              <DiffGroup
                key={group.id}
                group={group}
                isCollapsed={collapsed.has(group.id)}
                onToggle={toggleGroup}
              />
            ))
          )}
        </div>
      ) : (
        <div className="dt-diff-empty dt-diff-empty--nochanges" role="status" aria-live="polite">
          <ImageIcon size={32} aria-hidden="true" />
          <p className="dt-diff-empty-title">No token changes</p>
          <p className="dt-diff-empty-text">
            The current draft matches the last saved snapshot. Edit a token to
            preview its diff here.
          </p>
        </div>
      )}

      {hasChanges && (
        <div className="dt-export-panel">
          <div className="dt-export-header">
            <h3 className="dt-export-title">Export diff</h3>
            <div
              className="dt-export-tabs"
              role="tablist"
              aria-label="Export format"
            >
              {(["json", "css", "sass"] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={format === f}
                  className={`dt-export-tab ${
                    format === f ? "dt-export-tab--active" : ""
                  }`}
                  onClick={() => setFormat(f)}
                >
                  {f === "json" ? "JSON" : f === "css" ? "CSS variables" : "Sass"}
                </button>
              ))}
            </div>
          </div>

          <pre
            className="dt-export-preview"
            tabIndex={0}
            aria-label={`Diff export preview (${format})`}
          >
            {exportText}
          </pre>

          <div className="dt-export-actions">
            <button
              className="dt-export-action-btn"
              onClick={() => copy(exportText, format)}
              aria-label={`Copy diff as ${format}`}
            >
              {copied === format ? (
                <Check size={14} aria-hidden="true" />
              ) : (
                <Copy size={14} aria-hidden="true" />
              )}
              {copied === format ? "Copied" : "Copy"}
            </button>
            <button
              className="dt-export-action-btn dt-export-action-btn--secondary"
              onClick={() => downloadDiff(exportText, format)}
              aria-label={`Download diff as ${format}`}
            >
              <Download size={14} aria-hidden="true" />
              Download
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function DiffGroup({
  group,
  isCollapsed,
  onToggle,
}: {
  group: TokenDiffGroup;
  isCollapsed: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="dt-diff-group">
      <button
        className="dt-diff-group-header"
        aria-expanded={!isCollapsed}
        onClick={() => onToggle(group.id)}
      >
        <span className="dt-diff-group-caret" aria-hidden="true">
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </span>
        <span className="dt-diff-group-label">{group.label}</span>
        <span className="dt-section-count">{group.entries.length} shown</span>
      </button>

      {!isCollapsed && (
        <div
          className="dt-diff-table"
          role="table"
          aria-label={`${group.label} token changes`}
        >
          <div role="row" className="dt-diff-row dt-diff-row--head">
            <div role="columnheader" className="dt-diff-cell dt-diff-token">
              Token
            </div>
            <div role="columnheader" className="dt-diff-cell dt-diff-before">
              Before
            </div>
            <div role="columnheader" className="dt-diff-cell dt-diff-after">
              After
            </div>
          </div>
          {group.entries.map((entry) => (
            <DiffRow key={entry.variable} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
