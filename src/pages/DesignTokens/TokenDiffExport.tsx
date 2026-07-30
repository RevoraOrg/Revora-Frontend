import React, { useState, useMemo, useEffect, useRef } from "react";
import { type TokenGroup, type Token } from "./tokens";
import "./TokenDiffExport.css";

// ─── Diff Logic ──────────────────────────────────────────────────────────────

type DiffStatus = "added" | "removed" | "changed" | "unchanged";

interface TokenDiff {
  status: DiffStatus;
  groupLabel: string;
  variable: string;
  name: string;
  oldValue?: string;
  newValue?: string;
}

function computeDiff(prev: TokenGroup[], curr: TokenGroup[]): TokenDiff[] {
  const diffs: TokenDiff[] = [];

  const prevMap = new Map<string, { group: string; token: Token }>();
  for (const g of prev) {
    for (const t of g.tokens) {
      prevMap.set(t.variable, { group: g.label, token: t });
    }
  }

  const currMap = new Map<string, { group: string; token: Token }>();
  for (const g of curr) {
    for (const t of g.tokens) {
      currMap.set(t.variable, { group: g.label, token: t });
    }
  }

  // Check added and changed
  for (const [v, currItem] of currMap.entries()) {
    const prevItem = prevMap.get(v);
    if (!prevItem) {
      diffs.push({
        status: "added",
        groupLabel: currItem.group,
        variable: v,
        name: currItem.token.name,
        newValue: currItem.token.value,
      });
    } else if (prevItem.token.value !== currItem.token.value) {
      diffs.push({
        status: "changed",
        groupLabel: currItem.group,
        variable: v,
        name: currItem.token.name,
        oldValue: prevItem.token.value,
        newValue: currItem.token.value,
      });
    }
  }

  // Check removed
  for (const [v, prevItem] of prevMap.entries()) {
    if (!currMap.has(v)) {
      diffs.push({
        status: "removed",
        groupLabel: prevItem.group,
        variable: v,
        name: prevItem.token.name,
        oldValue: prevItem.token.value,
      });
    }
  }

  return diffs.sort((a, b) => a.variable.localeCompare(b.variable));
}

// ─── Formatting Logic ────────────────────────────────────────────────────────

function generateJSON(diffs: TokenDiff[]): string {
  const payload: Record<string, any> = {};
  for (const d of diffs) {
    payload[d.variable] = {
      status: d.status,
      oldValue: d.oldValue ?? null,
      newValue: d.newValue ?? null,
    };
  }
  return JSON.stringify(payload, null, 2);
}

function generateCSS(diffs: TokenDiff[]): string {
  let css = "/* Changed Design Tokens */\n:root {\n";
  for (const d of diffs) {
    if (d.status === "added" || d.status === "changed") {
      css += `  ${d.variable}: ${d.newValue};\n`;
    }
  }
  css += "}\n";
  return css;
}

function generateSass(diffs: TokenDiff[]): string {
  let sass = "// Changed Design Tokens\n";
  for (const d of diffs) {
    if (d.status === "added" || d.status === "changed") {
      // Convert --var to $var
      const sassVar = d.variable.replace(/^--/, "$");
      sass += `${sassVar}: ${d.newValue};\n`;
    }
  }
  return sass;
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface TokenDiffExportProps {
  isOpen: boolean;
  onClose: () => void;
  previousTokens: TokenGroup[];
  currentTokens: TokenGroup[];
}

export function TokenDiffExport({ isOpen, onClose, previousTokens, currentTokens }: TokenDiffExportProps) {
  const [format, setFormat] = useState<"json" | "css" | "sass">("json");
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Compute diffs
  const diffs = useMemo(() => computeDiff(previousTokens, currentTokens), [previousTokens, currentTokens]);

  const outputCode = useMemo(() => {
    switch (format) {
      case "json": return generateJSON(diffs);
      case "css": return generateCSS(diffs);
      case "sass": return generateSass(diffs);
    }
  }, [format, diffs]);

  const handleCopy = () => {
    navigator.clipboard.writeText(outputCode).then(() => {
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="tde-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="tde-modal-title">
      <div className="tde-modal-content">
        <div className="tde-header">
          <h2 id="tde-modal-title" className="tde-title">Review Changes & Export</h2>
          <button className="tde-close-btn" onClick={onClose} aria-label="Close modal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="tde-body">
          {/* Diff View Panel */}
          <div className="tde-diff-panel">
            {diffs.length === 0 ? (
              <div className="tde-empty" role="status">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No changes detected.</p>
              </div>
            ) : (
              <>
                <div className="tde-diff-header">
                  <span>Token</span>
                  <span>Previous</span>
                  <span>Current</span>
                </div>
                <div role="table" aria-label="Token differences">
                  {diffs.map((d) => (
                    <div
                      key={d.variable}
                      className={`tde-diff-row tde-diff-row--${d.status}`}
                      role="row"
                    >
                      <div className="tde-cell tde-cell-name">
                        <span className={`tde-badge tde-badge--${d.status}`}>{d.status}</span>
                        <span title={d.variable}>{d.variable}</span>
                      </div>
                      <div className="tde-cell">
                        {d.oldValue ? (
                          <span className={`tde-cell-value ${d.status === "changed" || d.status === "removed" ? "tde-cell-value--old" : ""}`}>
                            {d.oldValue}
                          </span>
                        ) : (
                          <span className="tde-cell-value tde-cell-value--none">—</span>
                        )}
                      </div>
                      <div className="tde-cell">
                        {d.newValue ? (
                          <span className={`tde-cell-value ${d.status === "changed" || d.status === "added" ? "tde-cell-value--new" : ""}`}>
                            {d.newValue}
                          </span>
                        ) : (
                          <span className="tde-cell-value tde-cell-value--none">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Export Panel */}
          <div className="tde-export-panel">
            <div className="tde-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={format === "json"}
                className={`tde-tab-btn ${format === "json" ? "tde-tab-btn--active" : ""}`}
                onClick={() => setFormat("json")}
              >
                JSON
              </button>
              <button
                role="tab"
                aria-selected={format === "css"}
                className={`tde-tab-btn ${format === "css" ? "tde-tab-btn--active" : ""}`}
                onClick={() => setFormat("css")}
              >
                CSS Vars
              </button>
              <button
                role="tab"
                aria-selected={format === "sass"}
                className={`tde-tab-btn ${format === "sass" ? "tde-tab-btn--active" : ""}`}
                onClick={() => setFormat("sass")}
              >
                Sass
              </button>
            </div>
            <div className="tde-code-wrap">
              <pre className="tde-code" aria-label={`Exported ${format} code`}>{outputCode}</pre>
            </div>
            <div className="tde-footer">
              <button
                className="tde-copy-btn"
                onClick={handleCopy}
                disabled={diffs.length === 0}
                aria-label={`Copy ${format} to clipboard`}
              >
                {copied ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    Copy {format.toUpperCase()}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
