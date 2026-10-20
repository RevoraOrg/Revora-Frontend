import React, { useState, useId } from 'react';

export interface ChartDataPoint {
  label: string;
  value: number;
  patternId?: 'pattern-stripe' | 'pattern-dots' | 'pattern-grid';
}

export interface AccessibleChartProps {
  title: string;
  data: ChartDataPoint[];
  width?: number;
  height?: number;
  yAxisLabel?: string;
  xAxisLabel?: string;
}

const PatternFills = () => (
  <defs>
    <pattern id="pattern-stripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="4" height="8" transform="translate(0,0)" fill="currentColor" opacity="0.3"></rect>
    </pattern>
    <pattern id="pattern-dots" width="8" height="8" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="2" fill="currentColor" opacity="0.4"></circle>
    </pattern>
    <pattern id="pattern-grid" width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3"></rect>
    </pattern>
  </defs>
);

export const AccessibleChart: React.FC<AccessibleChartProps> = ({
  title,
  data,
  width = 300,
  height = 150,
  yAxisLabel,
  xAxisLabel
}) => {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const chartId = useId();
  const tableId = `table-${chartId}`;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const padding = 30;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const barWidth = Math.max((chartWidth / data.length) - 10, 10);

  return (
    <div className="accessible-chart-container space-y-4" aria-labelledby={`title-${chartId}`}>
      <h4 id={`title-${chartId}`} className="sr-only">{title}</h4>
      
      {/* Visual Chart - aria-hidden to let screen readers use the table fallback */}
      <div className="relative" aria-hidden="true">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible text-slate-400">
          <PatternFills />
          
          {/* Y-Axis */}
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="currentColor" strokeWidth="1" opacity="0.5" />
          {yAxisLabel && (
            <text x={10} y={padding - 10} fontSize="10" fill="currentColor">{yAxisLabel}</text>
          )}

          {/* X-Axis */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="currentColor" strokeWidth="1" opacity="0.5" />
          {xAxisLabel && (
            <text x={width - padding} y={height - 5} fontSize="10" fill="currentColor" textAnchor="end">{xAxisLabel}</text>
          )}

          {/* Data Points */}
          {data.map((d, i) => {
            const barHeight = (d.value / maxValue) * chartHeight;
            const x = padding + 10 + i * (barWidth + 10);
            const y = height - padding - barHeight;
            const isFocused = focusedIndex === i;

            return (
              <g
                key={i}
                onMouseEnter={() => setFocusedIndex(i)}
                onMouseLeave={() => setFocusedIndex(null)}
                onFocus={() => setFocusedIndex(i)}
                onBlur={() => setFocusedIndex(null)}
                tabIndex={-1}
                className="transition-all duration-200"
              >
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={d.patternId ? `url(#${d.patternId})` : "currentColor"}
                  className={`cursor-pointer ${isFocused ? "opacity-100" : "opacity-80"} text-primary`}
                  stroke="currentColor"
                  strokeWidth={isFocused ? 2 : 1}
                  rx={2}
                />
                
                {/* Tooltip / Focus Marker */}
                {isFocused && (
                  <g className="focus-marker">
                    <rect x={x - 10} y={y - 25} width={barWidth + 20} height={20} fill="#1e293b" rx="4" />
                    <text x={x + barWidth / 2} y={y - 12} fontSize="10" fill="#fff" textAnchor="middle">
                      {d.value}
                    </text>
                  </g>
                )}
                
                <text x={x + barWidth / 2} y={height - padding + 15} fontSize="10" fill="currentColor" textAnchor="middle">
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tabular Alternative for Accessibility */}
      <div className="sr-only">
        <table id={tableId} aria-label={title}>
          <thead>
            <tr>
              <th scope="col">{xAxisLabel || "Category"}</th>
              <th scope="col">{yAxisLabel || "Value"}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i}>
                <td>{d.label}</td>
                <td>{d.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
