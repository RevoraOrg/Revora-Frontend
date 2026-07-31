import React from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertCircle,
  ArrowRight,
  Wallet,
  AlertTriangle,
  Minus,
  RefreshCw,
} from 'lucide-react';

export interface KPIData {
  value?: number | null;
  label: string;
  status: 'loading' | 'error' | 'empty' | 'success';
  type: 'currency' | 'number' | 'date';
  trend?: number; // percentage
  actionText?: string;
  actionLink?: string;
  /** Contextual message shown in the empty state, e.g. "No payouts scheduled" */
  emptyText?: string;
  /** Per-tile retry handler (falls back to the hero-level onRetry) */
  onRetry?: () => void;
}

interface DashboardHeroProps {
  totalValue: KPIData;
  realizedGains: KPIData;
  upcomingPayouts: KPIData;
  pendingActions: KPIData;
  sparklineData?: number[];
  isNewInvestor?: boolean;
  /** Called when the user retries an errored KPI tile */
  onRetry?: () => void;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

interface KpiTileProps {
  data: KPIData;
  icon: React.ReactNode;
  testId?: string;
  onRetry?: () => void;
}

const KpiTile: React.FC<KpiTileProps> = ({ data, icon, testId, onRetry }) => {
  const retry = data.onRetry ?? onRetry;

  if (data.status === 'loading') {
    return (
      <div
        className="glass-card p-5 flex flex-col justify-center animate-pulse h-full min-h-[120px]"
        role="status"
        aria-busy="true"
        aria-label={`${data.label} loading`}
        data-testid={testId}
      >
        <div className="w-8 h-8 bg-slate-800 rounded-full mb-3"></div>
        <div className="h-4 bg-slate-800 rounded w-1/2 mb-2"></div>
        <div className="h-6 bg-slate-800 rounded w-3/4"></div>
      </div>
    );
  }

  if (data.status === 'error') {
    return (
      <div
        className="glass-card p-5 flex flex-col justify-center h-full min-h-[120px] border-red-500/20 bg-red-500/5"
        role="status"
        aria-label={`${data.label} failed to load`}
        data-testid={testId}
      >
        <div className="text-error mb-2">
          <AlertTriangle size={24} aria-hidden="true" />
        </div>
        <div className="text-sm text-muted mb-1">{data.label}</div>
        <div className="text-sm font-medium text-error mb-3">Couldn&rsquo;t load this data.</div>
        {retry && (
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-1 self-start text-sm font-medium text-primary hover:text-primary-hover hover:underline focus-ring"
            aria-label={`Retry loading ${data.label}`}
          >
            <RefreshCw size={14} aria-hidden="true" />
            Try again
          </button>
        )}
      </div>
    );
  }

  if (data.status === 'empty' || data.value == null) {
    const emptyText = data.emptyText ?? 'No data yet';
    return (
      <div
        className="glass-card p-5 flex flex-col justify-center h-full min-h-[120px]"
        role="status"
        aria-label={`${data.label}: ${emptyText}`}
        data-testid={testId}
      >
        <div className="text-slate-400 mb-2">
          {icon}
        </div>
        <div className="text-sm text-muted mb-1">{data.label}</div>
        <div className="text-xl font-semibold text-slate-400 flex items-center gap-2">
          <Minus size={18} aria-hidden="true" />
          <span className="text-sm font-normal">{emptyText}</span>
        </div>
      </div>
    );
  }

  const isPositiveTrend = data.trend !== undefined && data.trend >= 0;

  return (
    <div className="glass-card p-5 flex flex-col justify-between h-full min-h-[120px]" data-testid={testId}>
      <div>
        <div className="flex items-center gap-2 text-muted mb-2">
          <div className="text-accent">{icon}</div>
          <span className="text-sm font-medium uppercase tracking-wide">{data.label}</span>
        </div>
        <div
          className="text-2xl lg:text-3xl font-bold text-main"
          aria-label={`${data.label}: ${data.type === 'currency' ? formatCurrency(data.value) : data.value}`}
        >
          {data.type === 'currency' ? formatCurrency(data.value) : data.value}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        {data.trend !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${isPositiveTrend ? 'text-green-400' : 'text-red-400'}`}
            aria-label={`${data.label} change: ${data.trend >= 0 ? '+' : ''}${data.trend.toFixed(1)}%`}
          >
            {isPositiveTrend ? <TrendingUp size={16} aria-hidden="true" /> : <TrendingDown size={16} aria-hidden="true" />}
            <span>{Math.abs(data.trend).toFixed(1)}%</span>
          </div>
        )}

        {data.actionText && data.actionLink && (
          <Link to={data.actionLink} className="text-sm text-primary hover:text-primary-hover hover:underline inline-flex items-center gap-1 focus-ring">
            {data.actionText} <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
};

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  totalValue,
  realizedGains,
  upcomingPayouts,
  pendingActions,
  sparklineData = [],
  isNewInvestor = false,
  onRetry,
}) => {
  // A simple SVG sparkline — responsive (full-width on mobile, fixed on sm+).
  const renderSparkline = () => {
    if (sparklineData.length < 2) return null;
    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const range = max - min || 1;
    const height = 40;
    const width = 120;

    const points = sparklineData
      .map((val, i) => {
        const x = (i / (sparklineData.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
      })
      .join(' ');

    const isPositive = sparklineData[sparklineData.length - 1] >= sparklineData[0];
    const strokeColor = isPositive ? 'var(--success, #10b981)' : 'var(--error, #ef4444)';

    return (
      <svg
        className="w-full sm:w-40 h-10 opacity-70 flex-shrink-0"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={isPositive ? 'Portfolio performance sparkline trending up' : 'Portfolio performance sparkline trending down'}
        data-testid="portfolio-sparkline"
      >
        <polyline
          points={points}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <section className="mb-8" aria-labelledby="hero-heading" data-testid="investor-hero">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6" data-testid="hero-header">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 min-w-0">
          <div className="min-w-0">
            <h1 id="hero-heading" className="text-3xl md:text-4xl font-bold tracking-tight text-main mb-2">
              {isNewInvestor ? 'Welcome to Revora' : 'Portfolio Overview'}
            </h1>
            <p className="text-muted text-base">
              {isNewInvestor
                ? 'Discover high-yield revenue share offerings and start building your portfolio.'
                : 'Track your personal returns and manage upcoming actions.'}
            </p>
          </div>
          {!isNewInvestor && renderSparkline()}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
          <Link to="/investor/portal" className="btn btn-primary whitespace-nowrap">
            Explore Offerings
          </Link>
          <Link to="/investor/settings" className="text-sm font-medium text-primary hover:text-primary-hover hover:underline whitespace-nowrap focus-ring">
            Account Settings
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6" data-testid="kpi-grid">
        <KpiTile data={totalValue} icon={<Wallet size={20} />} testId="kpi-tile-total-value" onRetry={onRetry} />
        <KpiTile data={realizedGains} icon={<DollarSign size={20} />} testId="kpi-tile-realized-gains" onRetry={onRetry} />
        <KpiTile data={upcomingPayouts} icon={<Calendar size={20} />} testId="kpi-tile-upcoming-payouts" onRetry={onRetry} />
        <KpiTile data={pendingActions} icon={<AlertCircle size={20} />} testId="kpi-tile-pending-actions" onRetry={onRetry} />
      </div>
    </section>
  );
};
