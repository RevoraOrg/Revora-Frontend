import React from "react";
import {
  ArrowUpRight,
  Filter,
  Search,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

const offerings = [
  {
    id: 1,
    name: "TechFlow AI",
    sector: "Enterprise SaaS",
    revenueShare: "15%",
    fundingProgress: 45,
    target: "$250,000 USDC",
    raised: "$112,500 raised",
    accent: "TF",
  },
  {
    id: 2,
    name: "HarvestGrid Climate Analytics",
    sector: "Climate Data",
    revenueShare: "12%",
    fundingProgress: 72,
    target: "$180,000 USDC",
    raised: "$129,600 raised",
    accent: "HG",
  },
  {
    id: 3,
    name: "MedLedger Payments",
    sector: "Healthcare Fintech",
    revenueShare: "18%",
    fundingProgress: 100,
    target: "$320,000 USDC",
    raised: "$320,000 raised",
    accent: "ML",
  },
];

export const InvestorDiscovery: React.FC = () => {
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
          <button
            className="btn-secondary w-auto h-10"
            aria-label="Filter results"
          >
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Offering cards: header, body, progress, and action zones. */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {offerings.map((offering) => (
          <article
            key={offering.id}
            className="glass-card glass-card-interactive offering-card flex h-full flex-col overflow-hidden p-6"
          >
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[rgba(148,163,184,0.2)] bg-[rgba(59,130,246,0.12)] text-sm font-bold text-primary"
                aria-hidden="true"
              >
                {offering.accent}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {offering.sector}
                </p>
                <h3 className="mt-1 text-lg font-semibold leading-snug">
                  {offering.name}
                </h3>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[rgba(15,23,42,0.35)] p-4">
                <p className="text-xs text-muted">Revenue share</p>
                <p className="mt-1 text-2xl font-bold text-main">
                  {offering.revenueShare}
                </p>
              </div>
              <div className="rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[rgba(15,23,42,0.35)] p-4">
                <p className="text-xs text-muted">Target</p>
                <p className="mt-2 text-sm font-semibold leading-5">
                  {offering.target}
                </p>
              </div>
            </div>

            <div className="mt-6 flex-1 border-t border-[rgba(148,163,184,0.12)] pt-5">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <span className="text-muted">{offering.raised}</span>
                <span
                  className="font-semibold text-main"
                  aria-label={`${offering.fundingProgress}% funded`}
                >
                  {offering.fundingProgress}%
                </span>
              </div>
              <div
                className="funding-bar"
                role="progressbar"
                aria-label={`${offering.name} funding progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={offering.fundingProgress}
              >
                <div
                  className="funding-bar-fill"
                  style={{ width: `${offering.fundingProgress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted">
                Funding progress toward current allocation
              </p>
            </div>

            <button className="btn-primary mt-6 flex items-center justify-center gap-2 py-2.5 text-sm">
              View Prospectus
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>

      {/* Empty State / Call to Action IA */}
      <div className="glass-card p-12 text-center bg-gradient-to-b from-transparent to-[rgba(59,130,246,0.05)]">
        <TrendingUp className="mx-auto mb-4 text-accent" size={48} />
        <h2 className="text-xl font-semibold mb-2">Build Your Portfolio</h2>
        <p className="text-muted text-sm max-w-md mx-auto mb-6">
          Start investing in verified startups. All distributions are handled
          automatically via Soroban smart contracts.
        </p>
        <div className="flex justify-center gap-4">
          <button className="btn-secondary w-auto px-6 flex items-center gap-2">
            <ShieldCheck size={18} />
            How it works
          </button>
        </div>
      </div>
    </div>
  );
};
