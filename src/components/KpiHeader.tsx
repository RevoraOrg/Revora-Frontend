import React from "react";
import { TrendingUp, TrendingDown, DollarSign, BarChart2, Percent, Activity } from "lucide-react";

export interface KpiItem {
  id: string;
  label: string;
  value: string;
  /** Optional change: positive = gain, negative = loss, undefined = neutral */
  change?: number;
  changeLabel?: string;
}

interface KpiHeaderProps {
  totalInvested: string;
  currentValue: string;
  totalReturn: number; // percentage
  activeHoldings: number;
}

function KpiCard({ label, value, change, changeLabel, icon }: KpiItem & { icon: React.ReactNode }) {
  const isPositive = change !== undefined && change >= 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <div className="glass-card p-5 flex flex-col gap-2" data-testid="kpi-card">
      <div className="flex items-center justify-between">
        <span className="text-muted text-xs font-medium uppercase tracking-wide">{label}</span>
        <span className="text-muted" aria-hidden="true">{icon}</span>
      </div>
      <span className="text-2xl font-bold tracking-tight">{value}</span>
      {change !== undefined && (
        <div
          className={`flex items-center gap-1 text-xs font-medium ${isPositive ? "text-success" : "text-error"}`}
          aria-label={`${changeLabel ?? (isPositive ? "Increase" : "Decrease")} of ${Math.abs(change)}%`}
        >
          {isPositive ? (
            <TrendingUp size={13} aria-hidden="true" />
          ) : (
            <TrendingDown size={13} aria-hidden="true" />
          )}
          <span>{isPositive && !isNegative ? "+" : ""}{change.toFixed(1)}%</span>
          {changeLabel && <span className="text-muted font-normal">{changeLabel}</span>}
        </div>
      )}
    </div>
  );
}

export const KpiHeader: React.FC<KpiHeaderProps> = ({
  totalInvested,
  currentValue,
  totalReturn,
  activeHoldings,
}) => (
  <section aria-labelledby="kpi-heading" data-testid="kpi-header">
    <h2 id="kpi-heading" className="sr-only">Portfolio Key Metrics</h2>
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
      role="list"
      aria-label="Portfolio key metrics"
    >
      <div role="listitem">
        <KpiCard
          id="total-invested"
          label="Total Invested"
          value={totalInvested}
          icon={<DollarSign size={16} />}
        />
      </div>
      <div role="listitem">
        <KpiCard
          id="current-value"
          label="Current Value"
          value={currentValue}
          change={totalReturn}
          changeLabel="overall"
          icon={<BarChart2 size={16} />}
        />
      </div>
      <div role="listitem">
        <KpiCard
          id="total-return"
          label="Total Return"
          value={`${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(1)}%`}
          change={totalReturn}
          icon={<Percent size={16} />}
        />
      </div>
      <div role="listitem">
        <KpiCard
          id="active-holdings"
          label="Active Holdings"
          value={String(activeHoldings)}
          icon={<Activity size={16} />}
        />
      </div>
    </div>
  </section>
);
