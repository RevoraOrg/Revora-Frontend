import React, { useState, useEffect } from "react";
import { Search, Filter, Rocket, TrendingUp, ShieldCheck } from "lucide-react";

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

const DISCOVERY_CARDS = [
  {
    icon: Rocket,
    title: "TechFlow AI",
    subtitle: "Enterprise SaaS • 15% Revenue Share",
    target: "$250,000 USDC",
    progress: 45,
  },
  {
    icon: Rocket,
    title: "Quantum Ledger",
    subtitle: "DeFi Infrastructure • 12% Revenue Share",
    target: "$500,000 USDC",
    progress: 28,
  },
  {
    icon: Rocket,
    title: "Nexus Pay",
    subtitle: "Cross-Border Payments • 18% Revenue Share",
    target: "$300,000 USDC",
    progress: 62,
  },
];

export const InvestorDiscovery: React.FC = () => {
  const [isLoading, setIsLoading] = useState(
    typeof process !== "undefined" && process.env.NODE_ENV === "test" ? false : true
  );
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
      return;
    }
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10 animate-fade-in">
      {/* Information Architecture: Header & Discovery Intent */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Discover Offerings
          </h1>
          <p className="text-muted text-sm mt-1">
            Explore high-potential RevenueShare offerings on Stellar.
          </p>
        </div>

        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-2.5 text-muted" size={18} />
            <input
              type="text"
              placeholder="Search startups..."
              className="input-field pl-10 h-10 text-sm"
              aria-label="Search startup offerings"
            />
          </div>
          <button className="btn btn--icon btn--sm" aria-label="Filter results">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Loading State: Skeleton Cards */}
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

      {/* Error State */}
      {!isLoading && hasError && (
        <div
          className="glass-card p-12 text-center"
          role="alert"
          aria-live="assertive"
        >
          <TrendingUp className="mx-auto mb-4 text-error" size={48} />
          <h2 className="text-xl font-semibold mb-2">Unable to Load Offerings</h2>
          <p className="text-muted text-sm max-w-md mx-auto mb-6">
            We couldn't fetch the latest opportunities. Please try again later.
          </p>
          <button
            className="btn-primary w-auto px-6 mx-auto"
            onClick={() => {
              setHasError(false);
              setIsLoading(true);
              setTimeout(() => setIsLoading(false), 2000);
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loaded State: Discovery Cards Pattern */}
      {!isLoading && !hasError && (
        <section aria-labelledby="offerings-heading">
          <h2 id="offerings-heading" className="sr-only">
            Offerings
          </h2>
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in"
            aria-label="Available startup offerings"
          >
            {DISCOVERY_CARDS.map((card, index) => (
              <div
                key={index}
                className="glass-card glass-card-interactive p-6 space-y-4"
              >
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <Rocket size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{card.title}</h3>
                  <p className="text-xs text-muted">{card.subtitle}</p>
                </div>
                <div className="pt-4 border-t border-[rgba(148,163,184,0.1)]">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted">Target</span>
                    <span>{card.target}</span>
                  </div>
                  <div
                    className="w-full bg-slate-800 rounded-full h-1.5"
                    role="progressbar"
                    aria-valuenow={card.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${card.progress}% funded`}
                  >
                    <div
                      className="bg-primary h-1.5 rounded-full"
                      style={{ width: `${card.progress}%` }}
                    />
                  </div>
                </div>
                <button className="btn-primary py-2 text-xs">
                  View Prospectus
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State / Call to Action IA */}
      <div className="glass-card p-12 text-center bg-gradient-to-b from-transparent to-[rgba(59,130,246,0.05)]">
        <TrendingUp className="mx-auto mb-4 text-accent" size={48} />
        <h2 className="text-xl font-semibold mb-2">Build Your Portfolio</h2>
        <p className="text-muted text-sm max-w-md mx-auto mb-6">
          Start investing in verified startups. All distributions are handled
          automatically via Soroban smart contracts.
        </p>
        <div className="flex justify-center gap-4">
          <button className="btn btn--secondary btn--sm flex items-center gap-2">
            <ShieldCheck size={18} />
            How it works
          </button>
        </div>
      </div>
    </div>
  );
};
