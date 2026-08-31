// src/components/AppShell/RoleDashboard/DashboardWidgetContent.tsx
//
// Ready-state body renderer for dashboard widgets. Works over the closed
// DashboardWidgetContent vocabulary (metrics / rows / progress) so every role
// variant shares one body implementation — no per-role content branches leak
// layout differences.

import React from 'react';
import './DashboardWidgetContent.css';
import type {
	DashboardMetric,
	DashboardWidgetContent as DashboardWidgetContentData,
} from './roleDashboard.types';

const sparklinePoints = (values: number[]): string => {
  const max = Math.max(...values, 1);
  const step = 100 / Math.max(values.length - 1, 1);
  return values
    .map((v, i) => `${i * step},${100 - (v / max) * 90}`)
    .join(' ');
};

function toneClass(
  tone: DashboardMetric['tone'] | 'neutral' | 'positive' | 'negative'
): string {
  switch (tone) {
    case 'positive':
      return 'rd-tone--positive';
    case 'negative':
      return 'rd-tone--negative';
    default:
      return 'rd-tone--neutral';
  }
}

const formatDelta = (delta: number): string =>
  `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`;

function MetricTile({ metric }: { metric: DashboardMetric }) {
  return (
    <div className="rd-metric">
      <span className="rd-metric__label">{metric.label}</span>
      <span className="rd-metric__value">{metric.value}</span>
      <div className="rd-metric__meta">
        {metric.sparkline && metric.sparkline.length > 0 && (
          <svg
            viewBox="0 0 100 100"
            className="rd-sparkline"
            aria-label={`Sparkline for ${metric.label}`}
            role="img"
          >
            <polyline
              points={sparklinePoints(metric.sparkline)}
              className="rd-sparkline__line"
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
        {typeof metric.delta === 'number' && (
          <span className={toneClass(metric.tone)}>
            {formatDelta(metric.delta)}
          </span>
        )}
      </div>
    </div>
  );
}

const maxRowValue = (rows: { value: string; tone?: DashboardMetric['tone'] }[]): number => {
  const parsed = rows
    .map((row) => Number.parseFloat(row.value))
    .filter((n) => !Number.isNaN(n));
  return parsed.length > 0 ? Math.max(...parsed) : 1;
};

function RowsBody({
  rows,
}: {
  rows: Array<{ label: string; value: string; tone?: DashboardMetric['tone'] }>;
}) {
  const scale = maxRowValue(rows);
  return (
    <ul className="rd-rows">
      {rows.map((row) => (
        <li key={row.label} className="rd-row">
          <span className="rd-row__label">{row.label}</span>
          <span className="rd-row__meter" aria-hidden="true">
            <span
              className={`rd-row__fill ${toneClass(row.tone)}`}
              style={{ width: `${(Number.parseFloat(row.value) / scale) * 100 || 0}%` }}
            />
          </span>
          <span className={`rd-row__value ${toneClass(row.tone)}`}>{row.value}</span>
        </li>
      ))}
    </ul>
  );
}

const clampProgress = (value: number): number =>
  Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

function ProgressBody({
  label,
  value,
  progress,
  note,
}: {
  label: string;
  value: string;
  progress: number;
  note?: string;
}) {
  const clamped = clampProgress(progress);
  return (
    <div className="rd-progress">
      <div className="rd-progress__head">
        <span className="rd-progress__label">{label}</span>
        <span className="rd-progress__value">{value}</span>
      </div>
      <div
        className="rd-progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        aria-label={label}
      >
        <span className="rd-progress__fill" style={{ width: `${clamped}%` }} />
      </div>
      {note && <p className="rd-progress__note">{note}</p>}
    </div>
  );
}

export const DashboardWidgetContent: React.FC<{
  content: DashboardWidgetContentData;
}> = ({ content }) => {
  switch (content.kind) {
    case 'metrics':
      return (
        <div className="rd-metrics">
          {content.metrics.map((metric) => (
            <MetricTile key={metric.label} metric={metric} />
          ))}
        </div>
      );
    case 'rows':
      return <RowsBody rows={content.rows} />;
    case 'progress':
      return (
        <ProgressBody
          label={content.label}
          value={content.value}
          progress={content.progress}
          note={content.note}
        />
      );
    default:
      return null;
  }
};

export default DashboardWidgetContent;