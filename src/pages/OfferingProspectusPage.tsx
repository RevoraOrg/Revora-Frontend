import { useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { MOCK_OFFERINGS } from '../data/offerings';
import { LockupStatusCard } from '../components/LockupStatusCard/LockupStatusCard';
import { PreOpenBanner } from '../components/PreOpenBanner';
import { HelpDrawer, type HelpDrawerContent } from '../components/HelpDrawer/HelpDrawer';

const STATE_LABELS = {
  'funding-open': 'Funding open',
  'pre-open': 'Pre-open',
  closed: 'Closed',
};

const STATE_HELP: Record<keyof typeof STATE_LABELS, HelpDrawerContent> = {
  'funding-open': {
    title: 'Funding open',
    overview: 'Review the revenue-share terms, funding progress and lockup schedule before deciding whether to invest.',
    definitions: [{ term: 'Revenue share', description: 'The portion of reported revenue allocated to investors. This is not a guaranteed rate of return.' }],
  },
  'pre-open': {
    title: 'Pre-open',
    overview: 'This sample offering is not accepting investments yet. The banner shows when the redemption window opens.',
  },
  closed: {
    title: 'Closed',
    overview: 'This offering is closed to new investments. You can still review its prospectus and financial terms.',
  },
};

const dollars = (value: number) => `$${value.toLocaleString('en-US')}`;

export function OfferingProspectusPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const offering = MOCK_OFFERINGS.find((item) => String(item.id) === id);
  const [helpOpen, setHelpOpen] = useState(false);
  const helpTrigger = useRef<HTMLButtonElement>(null);
  const resultsUrl = `/investor/portal${searchParams.size ? `?${searchParams}` : ''}`;

  if (!offering) {
    return (
      <section className="max-w-6xl mx-auto p-6 space-y-4">
        <h1 className="text-3xl font-bold">Offering not found</h1>
        <p>The requested offering is unavailable. Return to discovery to explore available offerings.</p>
        <Link to={resultsUrl} className="btn-secondary">Back to results</Link>
      </section>
    );
  }

  const progress = Math.min(100, Math.round(offering.raised / offering.target * 100));

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap gap-2 text-sm">
          <li><Link to={resultsUrl}>Investor discovery</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{offering.name}</li>
        </ol>
      </nav>
      <Link to={resultsUrl} className="btn-secondary">Back to results</Link>
      <header>
        <p className="text-sm text-muted">Prospectus · Sample offering</p>
        <h1 className="text-3xl font-bold">{offering.name}</h1>
        <p>{offering.category}</p>
      </header>
      {offering.state === 'pre-open' && offering.redemptionOpensAt && (
        <PreOpenBanner
          key={offering.id}
          targetDate={new Date(offering.redemptionOpensAt)}
          onOptIn={() => { /* Demo-only reminder; no notification service is connected. */ }}
        />
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="glass-card p-6 space-y-4" aria-labelledby="offering-overview">
            <h2 id="offering-overview" className="text-xl font-semibold">Offering overview</h2>
            <p>{offering.description}</p>
            <p>Risk level: {offering.riskLevel}</p>
          </section>
          <section className="glass-card p-6" aria-labelledby="financial-terms">
            <h2 id="financial-terms" className="text-xl font-semibold">Financial terms</h2>
            <dl className="grid gap-4 sm:grid-cols-3 mt-4">
              <div><dt>Revenue share</dt><dd>{offering.revenueShare}%</dd></div>
              <div><dt>Term length</dt><dd>{offering.termLength} months</dd></div>
              <div><dt>Minimum investment</dt><dd>{dollars(offering.minInvestment)}</dd></div>
            </dl>
          </section>
          <section className="glass-card p-6 space-y-4" aria-labelledby="funding-progress">
            <h2 id="funding-progress" className="text-xl font-semibold">Funding progress</h2>
            <p>{dollars(offering.raised)} raised of {dollars(offering.target)} target ({progress}%)</p>
            <div role="progressbar" aria-label={`${offering.name} funding progress`}
              aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}
              className="h-3 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
          </section>
          <section className="glass-card p-6" aria-labelledby="offering-highlights">
            <h2 id="offering-highlights" className="text-xl font-semibold">Offering highlights</h2>
            <ul className="list-disc pl-5 mt-4">{offering.highlights.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          {offering.lockup && <LockupStatusCard schedule={offering.lockup} />}
          <section className="glass-card p-6" aria-labelledby="risk-disclosure">
            <h2 id="risk-disclosure" className="text-xl font-semibold">Risk disclosure</h2>
            <p>Investments involve risk, including loss of capital. Revenue-share payments depend on business performance and are not guaranteed.</p>
          </section>
        </div>
        <aside aria-label="Offering status" className="glass-card p-6 space-y-4 self-start lg:sticky lg:top-6">
          <h2 className="text-xl font-semibold">{STATE_LABELS[offering.state]}</h2>
          <p>This is a sample prospectus. Investments and notifications are not connected to a live service.</p>
          <button type="button" className="btn-primary" ref={helpTrigger} onClick={() => setHelpOpen(true)}>
            Help with this offering
          </button>
        </aside>
      </div>
      <HelpDrawer isOpen={helpOpen} onClose={() => setHelpOpen(false)}
        content={STATE_HELP[offering.state]} triggerRef={helpTrigger} />
    </div>
  );
}
