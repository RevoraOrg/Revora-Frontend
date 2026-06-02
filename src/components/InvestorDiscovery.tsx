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

      {/* Discovery Discovery: Discovery Cards Pattern */}
      <section aria-labelledby="offerings-heading">
        <h2 id="offerings-heading" className="sr-only">
          Offerings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="glass-card glass-card-interactive p-6 space-y-4"
            >
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                <Rocket size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">TechFlow AI</h3>
                <p className="text-xs text-muted">
                  Enterprise SaaS • 15% Revenue Share
                </p>
              </div>
              <div className="pt-4 border-t border-[rgba(148,163,184,0.1)]">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted">Target</span>
                  <span>$250,000 USDC</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full"
                    style={{ width: "45%" }}
                  ></div>
                </div>
              </div>
              <button className="btn-primary py-2 text-xs">
                View Prospectus
              </button>
            </div>
          ))}
        </div>
      </section>

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
