import React, { useState, useEffect, useCallback, useId } from "react";
import {
  Search,
  Filter,
  Rocket,
  TrendingUp,
  ShieldCheck,
  SearchX,
  ServerCrash,
  RefreshCw,
  X,
  SlidersHorizontal,
  PackageOpen,
} from "lucide-react";

// ─── Skeleton Loading Card ─────────────────────────────────────────────────────

const SkeletonCard: React.FC = () => (
  <div className="glass-card p-6 space-y-4" aria-hidden="true">
    <div className="skeleton-pulse skeleton-icon" />
    <div className="space-y-2">
      <div className="skeleton-pulse skeleton-pulse-lg" />
      <div className="skeleton-pulse skeleton-pulse-sm" />
    </div>
    <div className="pt-4 border-t border-[rgba(148,163,184,0.1)]">
      <div className="flex justify-between text-xs mb-2">
        <div className="skeleton-pulse" style={{ width: "3rem", height: "0.75rem" }} />
        <div className="skeleton-pulse" style={{ width: "5rem", height: "0.75rem" }} />
      </div>
      <div className="skeleton-pulse skeleton-bar" />
    </div>
    <div className="skeleton-pulse skeleton-button" />
  </div>
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface Offering {
  id: number;
  name: string;
  category: string;
  revenueShare: number;
  target: number;
  raised: number;
}

/** Discriminated union for all UI states of the discovery result area */
type DiscoveryState =
  | { kind: 'loaded'; offerings: Offering[] }
  | { kind: 'filtered-empty'; query: string; hasFilters: boolean }
  | { kind: 'truly-empty' }
  | { kind: 'error'; retryCount: number };

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_OFFERINGS: Offering[] = [
  { id: 1, name: 'TechFlow AI', category: 'Enterprise SaaS', revenueShare: 15, target: 250000, raised: 112500 },
  { id: 2, name: 'Quantum Ledger', category: 'DeFi Infrastructure', revenueShare: 12, target: 500000, raised: 140000 },
  { id: 3, name: 'Nexus Pay', category: 'Cross-Border Payments', revenueShare: 18, target: 300000, raised: 186000 },
];

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  /** 'filtered' = no matches for current query/filters; 'truly-empty' = no offerings exist yet */
  variant: 'filtered' | 'truly-empty';
  query?: string;
  onClearFilters: () => void;
}

/**
 * DiscoveryEmptyState
 *
 * Displayed when the result grid has no items to show.
 * Distinguishes two sub-cases:
 *  - `filtered`: active search/filter produced zero results → offer a reset action
 *  - `truly-empty`: the platform has no offerings at all yet → encourage exploration
 */
export const DiscoveryEmptyState: React.FC<EmptyStateProps> = ({
  variant,
  query,
  onClearFilters,
}) => {
  const headingId = useId();
  const isFiltered = variant === 'filtered';

  return (
    <div
      className="discovery-state-container"
      role="status"
      aria-labelledby={headingId}
      aria-live="polite"
      data-testid="discovery-empty-state"
    >
      <div className="discovery-state-icon-wrap discovery-state-icon-wrap--empty" aria-hidden="true">
        {isFiltered ? (
          <SearchX size={36} strokeWidth={1.5} />
        ) : (
          <PackageOpen size={36} strokeWidth={1.5} />
        )}
      </div>

      <h2 id={headingId} className="discovery-state-title">
        {isFiltered ? 'No offerings match your search' : 'No offerings yet'}
      </h2>

      <p className="discovery-state-body">
        {isFiltered ? (
          <>
            We couldn't find any offerings
            {query ? (
              <>
                {' '}for{' '}
                <span className="discovery-state-query" aria-label={`search term: ${query}`}>
                  "{query}"
                </span>
              </>
            ) : (
              ' matching the active filters'
            )}
            . Try adjusting or clearing your search.
          </>
        ) : (
          'New revenue-share offerings will appear here once startups list on Revora. Check back soon.'
        )}
      </p>

      {isFiltered && (
        <button
          className="btn-secondary discovery-state-action"
          onClick={onClearFilters}
          aria-label="Clear all search filters and show all offerings"
          data-testid="clear-filters-btn"
        >
          <X size={16} aria-hidden="true" />
          Clear filters
        </button>
      )}

      {!isFiltered && (
        <div className="flex items-center gap-3 mt-2">
          <button className="btn-secondary discovery-state-action" aria-label="Learn how Revora works">
            <ShieldCheck size={16} aria-hidden="true" />
            How it works
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Error State ──────────────────────────────────────────────────────────────

interface ErrorStateProps {
  onRetry: () => void;
  retryCount?: number;
}

/**
 * DiscoveryErrorState
 *
 * Displayed when the offering list fails to load.
 * Provides a reassuring message and a retry action with an attempt counter.
 * Uses role="alert" so screen readers announce the failure immediately.
 */
export const DiscoveryErrorState: React.FC<ErrorStateProps> = ({ onRetry, retryCount = 0 }) => {
  const headingId = useId();

  return (
    <div
      className="discovery-state-container"
      role="alert"
      aria-labelledby={headingId}
      aria-live="assertive"
      data-testid="discovery-error-state"
    >
      <div className="discovery-state-icon-wrap discovery-state-icon-wrap--error" aria-hidden="true">
        <ServerCrash size={36} strokeWidth={1.5} />
      </div>

      <h2 id={headingId} className="discovery-state-title">
        Couldn't load offerings
      </h2>

      <p className="discovery-state-body">
        Something went wrong while fetching the latest offerings. Your portfolio and account are
        unaffected — this is a temporary display issue.
      </p>

      {retryCount > 0 && (
        <p className="discovery-state-retry-hint" aria-live="polite">
          Retried {retryCount} {retryCount === 1 ? 'time' : 'times'} — still no luck.
        </p>
      )}

      <button
        className="btn-primary discovery-state-action"
        onClick={onRetry}
        aria-label="Retry loading offerings"
        data-testid="retry-btn"
      >
        <RefreshCw size={16} aria-hidden="true" />
        Try again
      </button>
    </div>
  );
};

// ─── Offering Card ────────────────────────────────────────────────────────────

const OfferingCard: React.FC<{ offering: Offering }> = ({ offering }) => {
  const progressPct = Math.round((offering.raised / offering.target) * 100);

  return (
    <div
      className="glass-card glass-card-interactive p-6 space-y-4"
      data-testid={`offering-card-${offering.id}`}
    >
      <div
        className="h-12 w-12 rounded-lg flex items-center justify-center text-primary"
        style={{ background: 'rgba(59,130,246,0.1)' }}
        aria-hidden="true"
      >
        <Rocket size={24} />
      </div>
      <div>
        <h3 className="font-semibold text-lg">{offering.name}</h3>
        <p className="text-xs text-muted">
          {offering.category} • {offering.revenueShare}% Revenue Share
        </p>
      </div>
      <div className="pt-4 border-t border-[rgba(148,163,184,0.1)]">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted">Target</span>
          <span>${offering.target.toLocaleString()} USDC</span>
        </div>
        <div
          className="w-full bg-slate-800 rounded-full h-1.5"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${progressPct}% funded`}
        >
          <div
            className="bg-primary h-1.5 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
      <button className="btn-primary py-2 text-xs" aria-label={`View prospectus for ${offering.name}`}>
        View Prospectus
      </button>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * InvestorDiscovery
 *
 * Result area states (in priority order):
 *  1. isLoading → Skeleton cards
 *  2. error state (hasError / __simulateState) → DiscoveryErrorState
 *  3. filtered-empty → DiscoveryEmptyState variant="filtered"
 *  4. truly-empty → DiscoveryEmptyState variant="truly-empty"
 *  5. loaded → OfferingCard grid
 *
 * The `__simulateState` prop is provided for test / Storybook overrides only.
 */
export const InvestorDiscovery: React.FC<{
  /** Test/Storybook override — skips loading delay and optionally forces a UI state */
  __simulateState?: DiscoveryState;
}> = ({ __simulateState }) => {
  const [isLoading, setIsLoading] = useState(!__simulateState);
  const [query, setQuery] = useState('');
  const [filtersActive, setFiltersActive] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (__simulateState) return;
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, [__simulateState]);

  // The seed offerings: either from __simulateState (if kind='loaded') or the
  // module-level mock data. Kept stable so useCallback deps don't thrash.
  const seedOfferings =
    __simulateState?.kind === 'loaded' ? __simulateState.offerings : MOCK_OFFERINGS;

  const resolveState = useCallback((): DiscoveryState => {
    // Non-loaded forced states always win (error / empty variants)
    if (
      __simulateState &&
      __simulateState.kind !== 'loaded'
    ) {
      return __simulateState;
    }

    // For 'loaded' __simulateState OR no override: derive from live search/filter
    const trimmed = query.trim().toLowerCase();
    const filtered =
      trimmed || filtersActive
        ? seedOfferings.filter((o) => o.name.toLowerCase().includes(trimmed))
        : seedOfferings;

    if (seedOfferings.length === 0) return { kind: 'truly-empty' };
    if (filtered.length === 0) return { kind: 'filtered-empty', query: trimmed, hasFilters: filtersActive };
    return { kind: 'loaded', offerings: filtered };
  }, [query, filtersActive, __simulateState, seedOfferings]);

  const state = resolveState();

  const handleClearFilters = () => {
    setQuery('');
    setFiltersActive(false);
    setRetryCount(0);
  };

  const handleRetry = () => {
    setRetryCount((c) => c + 1);
  };

  const handleToggleFilters = () => {
    setFiltersActive((f) => !f);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10 animate-fade-in">
      {/* ── Page header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discover Offerings</h1>
          <p className="text-muted text-sm mt-1">
            Explore high-potential RevenueShare offerings on Stellar.
          </p>
        </div>

        {/* ── Search + Filter bar ── */}
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-2.5 text-muted" size={18} aria-hidden="true" />
            <input
              id="offering-search"
              type="search"
              placeholder="Search startups…"
              className="input-field pl-10 h-10 text-sm"
              aria-label="Search startup offerings"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
            {query && (
              <button
                className="absolute right-3 top-2.5 text-muted hover:text-main transition-colors"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                data-testid="clear-search-btn"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          <button
            className={`btn btn--icon btn--sm ${filtersActive ? 'discovery-filter-btn--active' : ''}`}
            aria-label={filtersActive ? 'Filters active — click to clear' : 'Filter results'}
            aria-pressed={filtersActive}
            onClick={handleToggleFilters}
            data-testid="filter-toggle-btn"
          >
            <SlidersHorizontal size={18} aria-hidden="true" />
            {filtersActive && <span className="discovery-filter-badge" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* ── Active filter indicator ── */}
      {filtersActive && (
        <div className="flex items-center gap-2 text-xs text-muted" aria-live="polite">
          <Filter size={14} aria-hidden="true" />
          <span>Filters active</span>
          <button
            className="link-styled text-xs"
            onClick={handleClearFilters}
            aria-label="Clear all active filters"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Loading State: Skeleton Cards ── */}
      {isLoading && (
        <div
          role="status"
          aria-label="Loading available offerings"
          aria-busy="true"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((item) => (
              <SkeletonCard key={item} />
            ))}
          </div>
          <span className="sr-only">Loading available startup offerings...</span>
        </div>
      )}

      {/* ── Result area (shown after loading) ── */}
      {!isLoading && (
        <section aria-label="Offering results" aria-live="polite">
          {state.kind === 'loaded' && (
            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in"
              aria-label="Available startup offerings"
            >
              {state.offerings.map((o) => (
                <OfferingCard key={o.id} offering={o} />
              ))}
            </div>
          )}

          {state.kind === 'filtered-empty' && (
            <DiscoveryEmptyState
              variant="filtered"
              query={state.query}
              onClearFilters={handleClearFilters}
            />
          )}

          {state.kind === 'truly-empty' && (
            <DiscoveryEmptyState variant="truly-empty" onClearFilters={handleClearFilters} />
          )}

          {state.kind === 'error' && (
            <DiscoveryErrorState onRetry={handleRetry} retryCount={state.retryCount} />
          )}
        </section>
      )}

      {/* ── Portfolio CTA (loaded state only, after loading) ── */}
      {!isLoading && state.kind === 'loaded' && (
        <div className="glass-card p-12 text-center bg-gradient-to-b from-transparent to-[rgba(59,130,246,0.05)]">
          <TrendingUp className="mx-auto mb-4 text-accent" size={48} aria-hidden="true" />
          <h2 className="text-xl font-semibold mb-2">Build Your Portfolio</h2>
          <p className="text-muted text-sm max-w-md mx-auto mb-6">
            Start investing in verified startups. All distributions are handled
            automatically via Soroban smart contracts.
          </p>
          <div className="flex justify-center gap-4">
            <button className="btn btn--secondary btn--sm flex items-center gap-2">
              <ShieldCheck size={18} aria-hidden="true" />
              How it works
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
