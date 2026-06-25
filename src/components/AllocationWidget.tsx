import React, { useState, useId } from "react";
import { PieChart, AlignLeft } from "lucide-react";

export interface AllocationSlice {
  id: string;
  label: string;
  value: number; // dollar amount
  percentage: number; // 0-100
}

interface AllocationWidgetProps {
  slices: AllocationSlice[];
  /** Controlled view override (for tests) */
  __initialView?: "donut" | "bar";
}

// Accessible colour palette — sufficient contrast on dark backgrounds
const SLICE_COLOURS = [
  "#3b82f6", // blue   (--primary)
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
];

function DonutChart({ slices }: { slices: AllocationSlice[] }) {
  const size = 160;
  const r = 60;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const gap = 2; // degrees gap between slices

  // Build strokes from percentages
  let cumulativePct = 0;
  const segments = slices.map((s, i) => {
    const pct = s.percentage;
    const dashLen = (pct / 100) * circumference - (gap / 360) * circumference;
    const offset = circumference - (cumulativePct / 100) * circumference;
    cumulativePct += pct;
    return { ...s, dashLen, offset, colour: SLICE_COLOURS[i % SLICE_COLOURS.length] };
  });

  const totalFormatted = slices.reduce((sum, s) => sum + s.value, 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label="Donut chart showing portfolio allocation"
        >
          {/* Background ring */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth={22} />
          {segments.map((seg) => (
            <circle
              key={seg.id}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.colour}
              strokeWidth={22}
              strokeDasharray={`${seg.dashLen} ${circumference}`}
              strokeDashoffset={seg.offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              aria-label={`${seg.label}: ${seg.percentage.toFixed(1)}%`}
            />
          ))}
        </svg>
        {/* Center label */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none"
          aria-hidden="true"
        >
          <span className="text-xs text-muted">Total</span>
          <span className="text-sm font-bold">{totalFormatted}</span>
        </div>
      </div>

      {/* Legend */}
      <ul className="w-full space-y-1.5" aria-label="Allocation legend">
        {segments.map((seg) => (
          <li key={seg.id} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <span
                className="inline-block rounded-full flex-shrink-0"
                style={{ width: 10, height: 10, background: seg.colour }}
                aria-hidden="true"
              />
              {seg.label}
            </span>
            <span className="font-medium">{seg.percentage.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarView({ slices }: { slices: AllocationSlice[] }) {
  return (
    <ul className="w-full space-y-3" aria-label="Portfolio allocation by issuer">
      {slices.map((s, i) => {
        const colour = SLICE_COLOURS[i % SLICE_COLOURS.length];
        const formatted = s.value.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        });
        return (
          <li key={s.id} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>{s.label}</span>
              <span className="font-medium">{formatted} ({s.percentage.toFixed(1)}%)</span>
            </div>
            <div
              className="w-full rounded-full"
              style={{ height: 8, background: "rgba(148,163,184,0.1)" }}
              role="progressbar"
              aria-valuenow={s.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${s.label}: ${s.percentage.toFixed(1)}%`}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${s.percentage}%`, background: colour }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export const AllocationWidget: React.FC<AllocationWidgetProps> = ({
  slices,
  __initialView = "donut",
}) => {
  const [view, setView] = useState<"donut" | "bar">(__initialView);
  const toggleId = useId();

  if (slices.length === 0) {
    return (
      <section className="glass-card p-6" aria-labelledby={`${toggleId}-heading`} data-testid="allocation-widget">
        <h2 id={`${toggleId}-heading`} className="text-base font-semibold mb-4">Allocation</h2>
        <p className="text-muted text-sm text-center py-8">No holdings to display.</p>
      </section>
    );
  }

  return (
    <section className="glass-card p-6 space-y-4" aria-labelledby={`${toggleId}-heading`} data-testid="allocation-widget">
      <div className="flex items-center justify-between">
        <h2 id={`${toggleId}-heading`} className="text-base font-semibold">Allocation</h2>
        {/* Toggle between donut and bar */}
        <div role="group" aria-label="Chart view toggle" className="flex items-center gap-1">
          <button
            className={`btn--icon p-1.5 rounded-md transition-colors ${view === "donut" ? "text-primary bg-primary/10" : "text-muted hover:text-main"}`}
            onClick={() => setView("donut")}
            aria-pressed={view === "donut"}
            aria-label="Donut chart view"
            data-testid="donut-toggle"
          >
            <PieChart size={16} aria-hidden="true" />
          </button>
          <button
            className={`btn--icon p-1.5 rounded-md transition-colors ${view === "bar" ? "text-primary bg-primary/10" : "text-muted hover:text-main"}`}
            onClick={() => setView("bar")}
            aria-pressed={view === "bar"}
            aria-label="Bar chart view"
            data-testid="bar-toggle"
          >
            <AlignLeft size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {view === "donut" ? <DonutChart slices={slices} /> : <BarView slices={slices} />}
    </section>
  );
};
