import { contrastRatio, wcagGrade, DARK_SURFACE, LIGHT_SURFACE } from "./contrast";
import { DARK_CHART_TOKENS, LIGHT_CHART_TOKENS } from "./tokens";

export interface ChartTooltipContrastDemoProps {
  surface?: "dark" | "light";
}

interface ContrastRow {
  name: string;
  variable: string;
  dark: string;
  light: string;
  measuredAgainst: "chart" | "tooltip" | null;
  threshold: number | null;
  note: string;
}

const CONTRAST_ROWS: ContrastRow[] = [
  {
    name: "Tooltip surface",
    variable: "--chart-tooltip-bg",
    dark: "#0f172a",
    light: "#ffffff",
    measuredAgainst: "chart",
    threshold: null,
    note: "Intentional subtle separation from the chart surface; the boundary is supplied by the 1px border below.",
  },
  {
    name: "Tooltip foreground",
    variable: "--chart-tooltip-fg",
    dark: "#f8fafc",
    light: "#1e293b",
    measuredAgainst: "tooltip",
    threshold: 4.5,
    note: "Normal text contrast against the tooltip surface (WCAG 2.1 1.4.3).",
  },
  {
    name: "Tooltip border",
    variable: "--chart-tooltip-border",
    dark: "#64748b",
    light: "#64748b",
    measuredAgainst: "tooltip",
    threshold: 3,
    note: "Non-text boundary contrast against the tooltip surface (WCAG 2.1 1.4.11).",
  },
  {
    name: "Axis label color",
    variable: "--chart-axis-label-color",
    dark: "#94a3b8",
    light: "#475569",
    measuredAgainst: "chart",
    threshold: 4.5,
    note: "12px small text contrast against the chart surface (WCAG 2.1 1.4.3).",
  },
  {
    name: "Axis label size",
    variable: "--chart-axis-label-size",
    dark: "0.75rem",
    light: "0.75rem",
    measuredAgainst: null,
    threshold: null,
    note: "12px base size that reflows and scales with 200% zoom and large-text preferences (WCAG 2.1 1.4.4).",
  },
  {
    name: "Axis label weight",
    variable: "--chart-axis-label-weight",
    dark: "500",
    light: "500",
    measuredAgainst: null,
    threshold: null,
    note: "Medium weight keeps 12px axis text crisp on dark surfaces.",
  },
];

const USAGE_CSS = `/* Tooltip surface */
.chart-tooltip {
  background: var(--chart-tooltip-bg);
  color: var(--chart-tooltip-fg);
  border: 1px solid var(--chart-tooltip-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

/* Axis labels */
.chart-axis-label {
  color: var(--chart-axis-label-color);
  font-size: var(--chart-axis-label-size);
  font-weight: var(--chart-axis-label-weight);
}`;

export function ChartTooltipContrastDemo({ surface = "dark" }: ChartTooltipContrastDemoProps) {
  const isDark = surface === "dark";

  const live = isDark
    ? {
        chartBg: "var(--bg-color)",
        chartGrid: "rgba(148, 163, 184, 0.12)",
        tooltipBg: "var(--chart-tooltip-bg)",
        tooltipFg: "var(--chart-tooltip-fg)",
        tooltipBorder: "var(--chart-tooltip-border)",
        axisColor: "var(--chart-axis-label-color)",
        axisSize: "var(--chart-axis-label-size)",
        axisWeight: "var(--chart-axis-label-weight)",
        bars: DARK_CHART_TOKENS.slice(0, 4).map((t) => t.value),
      }
    : {
        chartBg: "#f6f8fb",
        chartGrid: "rgba(2, 6, 23, 0.08)",
        tooltipBg: "#ffffff",
        tooltipFg: "#1e293b",
        tooltipBorder: "#64748b",
        axisColor: "#475569",
        axisSize: "0.75rem",
        axisWeight: 500,
        bars: LIGHT_CHART_TOKENS.slice(0, 4).map((t) => t.value),
      };

  const barHeights = [38, 56, 80, 48];

  return (
    <section
      className="dt-section glass-card dt-ta-section"
      aria-labelledby="chart-tooltip-axis-heading"
    >
      <div className="dt-guidelines-header">
        <div>
          <h2 id="chart-tooltip-axis-heading" className="dt-section-title">
            Dark-Mode Tooltip &amp; Axis Label Contrast
          </h2>
          <p className="dt-page-subtitle">
            Tokenized tooltip surfaces, foregrounds, and borders plus axis label size and color —
            validated against WCAG 2.1 AA on dark chart surfaces.
          </p>
        </div>
      </div>

      {/* Live preview */}
      <div className="dt-ta-preview" data-surface={surface}>
        <div className="dt-ta-preview-head">
          <h3 className="dt-ta-subheading">Live preview</h3>
          <span className="dt-ta-surface-tag">
            {isDark ? "Dark surface" : "Light surface"}
          </span>
        </div>

        <div className="dt-ta-chart" style={{ background: live.chartBg }}>
          <div className="dt-ta-axis dt-ta-axis-y" aria-label="Value axis">
            {["40k", "30k", "20k", "10k", "0"].map((tick) => (
              <span
                key={tick}
                className="dt-ta-axis-label"
                style={{
                  color: live.axisColor,
                  fontSize: live.axisSize,
                  fontWeight: live.axisWeight,
                }}
              >
                {tick}
              </span>
            ))}
          </div>

          <div className="dt-ta-plot">
            <div className="dt-ta-grid" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} style={{ background: live.chartGrid }} />
              ))}
            </div>

            <div className="dt-ta-tooltip" style={{ background: live.tooltipBg, borderColor: live.tooltipBorder, color: live.tooltipFg }}>
              <span className="dt-ta-tooltip-title">Q3 Revenue</span>
              <span className="dt-ta-tooltip-value">$42,300</span>
              <span className="dt-ta-tooltip-arrow" aria-hidden="true" />
            </div>

            <div className="dt-ta-bars">
              {barHeights.map((h, i) => (
                <div className="dt-ta-bar-col" key={`bar-${i}`}>
                  <div className="dt-ta-bar" style={{ height: `${h}%`, background: live.bars[i] }} />
                </div>
              ))}
            </div>
          </div>

          <div className="dt-ta-axis dt-ta-axis-x" aria-label="Category axis">
            {["Q1", "Q2", "Q3", "Q4"].map((tick) => (
              <span
                key={tick}
                className="dt-ta-axis-label"
                style={{
                  color: live.axisColor,
                  fontSize: live.axisSize,
                  fontWeight: live.axisWeight,
                }}
              >
                {tick}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Contrast verification matrix */}
      <div className="dt-ta-matrix">
        <h3 className="dt-ta-subheading">Contrast verification</h3>
        <div role="table" aria-label="Tooltip and axis label contrast verification">
          {CONTRAST_ROWS.map((row) => {
            const value = isDark ? row.dark : row.light;
            const bg =
              row.measuredAgainst === "chart"
                ? isDark
                  ? DARK_SURFACE
                  : LIGHT_SURFACE
                : row.measuredAgainst === "tooltip"
                  ? isDark
                    ? CONTRAST_ROWS[0].dark
                    : CONTRAST_ROWS[0].light
                  : null;
            const ratio = bg ? contrastRatio(value, bg) : null;
            const grade = wcagGrade(ratio);
            const pass = row.threshold !== null && ratio !== null && ratio >= row.threshold;
            const gradeClass =
              ratio === null || row.threshold === null
                ? "dt-grade--na"
                : pass
                  ? "dt-grade--pass"
                  : "dt-grade--fail";

            return (
              <div className="dt-ta-row" role="row" key={row.variable}>
                <span className="dt-token-name" role="cell">{row.name}</span>
                <code className="dt-token-value" role="cell">{row.variable}</code>
                <code className="dt-token-value" role="cell">{value}</code>
                <span className={`dt-grade ${gradeClass}`} role="cell" title={row.note}>
                  {ratio === null ? "—" : row.threshold === null ? `${ratio}:1` : `${grade} ${ratio}:1`}
                </span>
                <span className="dt-token-desc dt-ta-row-note" role="cell">{row.note}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Usage example */}
      <div className="dt-ta-usage">
        <h3 className="dt-ta-subheading">Usage example</h3>
        <pre className="dt-ta-code">
          <code>{USAGE_CSS}</code>
        </pre>
      </div>

      {/* Guidelines */}
      <div className="dt-dodont-grid dt-ta-dodont">
        <div className="dt-dodont-card dt-do-card">
          <div className="dt-dodont-header dt-do-header">
            <span className="dt-icon">✓</span>
            <h3>DO: Apply tokens to every chart tooltip</h3>
          </div>
          <p>
            Use <code>--chart-tooltip-bg</code>, <code>--chart-tooltip-fg</code>, and{" "}
            <code>--chart-tooltip-border</code> together. The 1px border keeps the surface
            boundary visible against dense chart geometry.
          </p>
        </div>

        <div className="dt-dodont-card dt-do-card">
          <div className="dt-dodont-header dt-do-header">
            <span className="dt-icon">✓</span>
            <h3>DO: Keep axis text ≥ 4.5:1 on the chart surface</h3>
          </div>
          <p>
            Axis labels are small (12px) normal text, so they require WCAG 2.1 AA contrast.{" "}
            <code>--chart-axis-label-color</code> passes on both the app surface and the
            tooltip surface.
          </p>
        </div>

        <div className="dt-dodont-card dt-dont-card">
          <div className="dt-dodont-header dt-dont-header">
            <span className="dt-icon">✕</span>
            <h3>DON'T: Use borders below 3:1 for the tooltip boundary</h3>
          </div>
          <p>
            Sub-3:1 borders such as the previous <code>#334155</code> disappear against dark
            chart backgrounds and fail WCAG 2.1 1.4.11 non-text contrast.
          </p>
        </div>

        <div className="dt-dodont-card dt-dont-card">
          <div className="dt-dodont-header dt-dont-header">
            <span className="dt-icon">✕</span>
            <h3>DON'T: Shrink or gray out axis labels below spec</h3>
          </div>
          <p>
            Keep <code>--chart-axis-label-size</code> at 0.75rem or larger and never drop the
            color below the 4.5:1 threshold. Avoid relying on low-contrast tick marks alone.
          </p>
        </div>
      </div>

      {/* Accessibility & responsive notes */}
      <div className="dt-notes-callout">
        <h4>Accessibility (WCAG 2.1 AA) &amp; Responsive Assumptions</h4>
        <ul>
          <li>
            <strong>Text contrast (1.4.3):</strong> Tooltip foreground and axis labels hold ≥ 4.5:1
            on their surfaces (tooltip text 17.1:1, axis text 7.87:1 on the dark app surface).
          </li>
          <li>
            <strong>Non-text contrast (1.4.11):</strong> The tooltip border provides a ≥ 3:1
            boundary against both the tooltip surface and the chart surface.
          </li>
          <li>
            <strong>Resize text (1.4.4):</strong> Axis size is rem-based and reflows under 200%
            zoom and large-text preferences; tooltip text uses normal document text styling.
          </li>
          <li>
            <strong>High-contrast / forced-colors:</strong> Text and borders follow the system{" "}
            <code>forced-colors</code> palette, preserving tooltip and axis legibility.
          </li>
          <li>
            <strong>RTL:</strong> Axis rows and tooltip positioning use logical CSS properties
            (<code>inset-inline</code>, <code>text-align: start</code>) and mirror cleanly in
            right-to-left layouts.
          </li>
          <li>
            <strong>Reduced motion &amp; responsiveness:</strong> No motion is introduced for
            tooltips, and the grid reflows down to 320px viewports.
          </li>
        </ul>
      </div>
    </section>
  );
}
