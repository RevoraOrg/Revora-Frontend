import React, { useState, useId } from "react";
import { LineChart, Table } from "lucide-react";

export interface PerformanceDataPoint {
  month: string; // e.g. "Jan", "Feb"
  value: number; // portfolio value
}

interface PerformanceTrendWidgetProps {
  data: PerformanceDataPoint[];
  currency?: string;
  /** Controlled view override (for tests) */
  __initialView?: "chart" | "table";
}

function formatCurrency(value: number, currency = "USD") {
  return value.toLocaleString("en-US", { style: "currency", currency, maximumFractionDigits: 0 });
}

function sparklinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  return points.reduce((d, p, i) => d + (i === 0 ? `M ${p.x},${p.y}` : ` L ${p.x},${p.y}`), "");
}

function LineChartView({ data, currency }: { data: PerformanceDataPoint[]; currency?: string }) {
  const W = 320;
  const H = 120;
  const padX = 8;
  const padY = 12;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const pts = data.map((d, i) => ({
    x: padX + (i / Math.max(data.length - 1, 1)) * (W - 2 * padX),
    y: H - padY - ((d.value - minVal) / range) * (H - 2 * padY),
  }));

  const path = sparklinePath(pts);
  // Fill path: close at bottom-right and bottom-left
  const fillPath = `${path} L ${pts[pts.length - 1].x},${H - padY} L ${pts[0].x},${H - padY} Z`;

  const isPositive = data.length > 1 && data[data.length - 1].value >= data[0].value;
  const lineColour = isPositive ? "var(--success, #10b981)" : "var(--error, #ef4444)";

  return (
    <div>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="12-month portfolio performance trend line chart"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="perf-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColour} stopOpacity="0.2" />
            <stop offset="100%" stopColor={lineColour} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Fill area */}
        <path d={fillPath} fill="url(#perf-fill)" />
        {/* Line */}
        <path d={path} fill="none" stroke={lineColour} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {/* Data points */}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={lineColour}
            aria-label={`${data[i].month}: ${formatCurrency(data[i].value, currency)}`}
          />
        ))}
        {/* X-axis month labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={pts[i].x}
            y={H}
            textAnchor="middle"
            fontSize={9}
            fill="var(--text-muted, #cbd5e1)"
            aria-hidden="true"
          >
            {d.month}
          </text>
        ))}
      </svg>
    </div>
  );
}

function TableView({ data, currency }: { data: PerformanceDataPoint[]; currency?: string }) {
  return (
    <div className="overflow-x-auto" role="region" aria-label="Performance data table">
      <table className="w-full text-sm" aria-label="12-month portfolio performance">
        <thead>
          <tr className="border-b border-[rgba(148,163,184,0.1)]">
            <th scope="col" className="text-left text-xs text-muted font-medium pb-2">Month</th>
            <th scope="col" className="text-right text-xs text-muted font-medium pb-2">Value</th>
            <th scope="col" className="text-right text-xs text-muted font-medium pb-2">Change</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => {
            const prev = i > 0 ? data[i - 1].value : d.value;
            const change = d.value - prev;
            const changePct = prev !== 0 ? (change / prev) * 100 : 0;
            const isPositive = change >= 0;
            return (
              <tr key={d.month} className="border-b border-[rgba(148,163,184,0.05)]">
                <td className="py-1.5 text-xs">{d.month}</td>
                <td className="py-1.5 text-xs text-right font-medium">{formatCurrency(d.value, currency)}</td>
                <td className={`py-1.5 text-xs text-right ${i === 0 ? "text-muted" : isPositive ? "text-success" : "text-error"}`}>
                  {i === 0 ? "—" : `${isPositive ? "+" : ""}${changePct.toFixed(1)}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const PerformanceTrendWidget: React.FC<PerformanceTrendWidgetProps> = ({
  data,
  currency = "USD",
  __initialView = "chart",
}) => {
  const [view, setView] = useState<"chart" | "table">(__initialView);
  const headingId = useId();

  if (data.length === 0) {
    return (
      <section className="glass-card p-6" aria-labelledby={headingId} data-testid="performance-widget">
        <h2 id={headingId} className="text-base font-semibold mb-4">12-Month Performance</h2>
        <p className="text-muted text-sm text-center py-8">No performance data available.</p>
      </section>
    );
  }

  const first = data[0].value;
  const last = data[data.length - 1].value;
  const overallChange = first !== 0 ? ((last - first) / first) * 100 : 0;
  const isPositive = overallChange >= 0;

  return (
    <section className="glass-card p-6 space-y-4" aria-labelledby={headingId} data-testid="performance-widget">
      <div className="flex items-center justify-between">
        <div>
          <h2 id={headingId} className="text-base font-semibold">12-Month Performance</h2>
          <span
            className={`text-xs font-medium ${isPositive ? "text-success" : "text-error"}`}
            aria-label={`Overall change: ${isPositive ? "+" : ""}${overallChange.toFixed(1)}%`}
          >
            {isPositive ? "+" : ""}{overallChange.toFixed(1)}% overall
          </span>
        </div>
        <div role="group" aria-label="View toggle" className="flex items-center gap-1">
          <button
            className={`btn--icon p-1.5 rounded-md transition-colors ${view === "chart" ? "text-primary bg-primary/10" : "text-muted hover:text-main"}`}
            onClick={() => setView("chart")}
            aria-pressed={view === "chart"}
            aria-label="Line chart view"
            data-testid="chart-toggle"
          >
            <LineChart size={16} aria-hidden="true" />
          </button>
          <button
            className={`btn--icon p-1.5 rounded-md transition-colors ${view === "table" ? "text-primary bg-primary/10" : "text-muted hover:text-main"}`}
            onClick={() => setView("table")}
            aria-pressed={view === "table"}
            aria-label="Table view"
            data-testid="table-toggle"
          >
            <Table size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {view === "chart" ? (
        <LineChartView data={data} currency={currency} />
      ) : (
        <TableView data={data} currency={currency} />
      )}
    </section>
  );
};
