/**
 * PayoutSchedule — Gantt-style timeline view with table alternative (Issue #219, #444).
 *
 * Features:
 * - Gantt chart with lane rows per issuer, payout bars with status colours,
 *   today marker, and zoom controls (week/month/quarter)
 * - Accessible table with status pills and tooltips
 * - Hover popovers on gantt bars
 * - WCAG 2.1 AA, responsive, RTL-ready
 */

import React, { useState, useMemo } from 'react';
import { Calendar, Table2, BarChart3 } from 'lucide-react';
import { PayoutStatusPill, PAYOUT_STATUS_ORDER } from '../components/PayoutStatusPill';
import { EmptyState } from '../components/designSystem/EmptyState';
import { CalendarExportDialog } from '../components/CalendarExportDialog';
import { Button } from '../components/Button';

export interface Payout {
  id: string;
  recipient: string;
  amount: string;
  scheduledFor: string;
  status: string;
}

export type ZoomLevel = 'week' | 'month' | 'quarter';
export type PayoutData = Payout;

export const DEMO_PAYOUTS: Payout[] = [
  { id: '1', recipient: 'Issuer A', amount: 'USDC 12,500', scheduledFor: '2026-07-15', status: 'confirmed' },
  { id: '2', recipient: 'Issuer B', amount: 'USDC 8,000', scheduledFor: '2026-08-01', status: 'scheduled' },
  { id: '3', recipient: 'Issuer C', amount: 'USDC 5,200', scheduledFor: '2026-07-20', status: 'sending' },
  { id: '4', recipient: 'Issuer D', amount: 'USDC 15,000', scheduledFor: '2026-06-30', status: 'failed' },
  { id: '5', recipient: 'Issuer A', amount: 'USDC 3,500', scheduledFor: '2026-08-10', status: 'preparing' },
  { id: '6', recipient: 'Issuer B', amount: 'USDC 2,100', scheduledFor: '2026-07-05', status: 'retrying' },
  { id: '7', recipient: 'Issuer C', amount: 'USDC 9,800', scheduledFor: '2026-05-15', status: 'canceled' },
];

function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

function daysBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

function getRange(items: Payout[], zoom: ZoomLevel): { start: Date; end: Date } {
  if (!items || items.length === 0) {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);
    return { start, end };
  }
  const dates = items.map((i) => parseDate(i.scheduledFor).getTime());
  const minTime = Math.min(...dates);
  const maxTime = Math.max(...dates);
  const start = new Date(minTime);
  const end = new Date(maxTime);

  if (zoom === 'week') {
    start.setDate(start.getDate() - 3);
    end.setDate(end.getDate() + 7);
  } else if (zoom === 'quarter') {
    start.setMonth(start.getMonth() - 1);
    end.setMonth(end.getMonth() + 3);
  } else {
    // month
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() + 30);
  }
  return { start, end };
}

function statusBarColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'scheduled':
      return '#94a3b8';
    case 'preparing':
      return '#3b82f6';
    case 'sending':
      return '#06b6d4';
    case 'confirmed':
      return '#10b981';
    case 'retrying':
      return '#f59e0b';
    case 'failed':
      return '#ef4444';
    case 'canceled':
    case 'cancelled':
      return '#64748b';
    default:
      return '#94a3b8';
  }
}

interface PayoutScheduleProps {
  payouts?: Payout[];
  empty?: boolean;
}

export const PayoutSchedule: React.FC<PayoutScheduleProps> = ({
  payouts: payoutsProp,
  empty = false,
}) => {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [showGantt, setShowGantt] = useState(false); // default to table view
  const [zoom, setZoom] = useState<ZoomLevel>('month');

  const payouts = payoutsProp ?? DEMO_PAYOUTS;

  /* ─── Group by issuer for Gantt lanes ─── */
  const lanes = useMemo(() => {
    const map = new Map<string, PayoutData[]>();
    for (const p of payouts) {
      const arr = map.get(p.recipient) ?? [];
      arr.push(p);
      map.set(p.recipient, arr);
    }
    return Array.from(map.entries()).map(([issuer, items]) => ({
      issuer,
      items: items.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor)),
    }));
  }, [payouts]);

  /* ─── Time range ─── */
  const range = useMemo(() => getRange(lanes.flatMap((l) => l.items), zoom), [lanes, zoom]);
  const totalDays = daysBetween(range.start, range.end) || 1;

  const todayOffset = daysBetween(range.start, new Date());

  /* ─── Tooltip state for gantt bars ─── */
  const [hoveredPayout, setHoveredPayout] = useState<string | null>(null);

  if (empty) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-10 animate-fade-in">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payout Schedule</h1>
            <p className="text-muted text-sm mt-1">
              View upcoming and past RevenueShare payout dates.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => setIsExportDialogOpen(true)}
            style={{ width: 'auto' }}
          >
            <Calendar size={18} />
            Subscribe
          </Button>
        </div>
        <EmptyState
          variant="payout-schedule"
          title="No payouts scheduled"
          description="Payouts will appear here once revenue is reported and the distribution cycle begins."
          primaryAction={{
            label: 'Report Revenue',
            href: '/startup/report-revenue',
          }}
          secondaryAction={{
            label: 'Learn How It Works',
            href: '/',
          }}
        />
        <CalendarExportDialog
          isOpen={isExportDialogOpen}
          onClose={() => setIsExportDialogOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payout Schedule</h1>
          <p className="text-muted text-sm mt-1">
            View upcoming and past RevenueShare payout dates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div role="tablist" aria-label="View options" className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-border">
            <button
              role="tab"
              type="button"
              aria-selected={!showGantt}
              onClick={() => setShowGantt(false)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                !showGantt ? 'bg-primary text-white' : 'text-muted hover:text-text-main'
              }`}
            >
              <Table2 size={14} />
              Table
            </button>
            <button
              role="tab"
              type="button"
              aria-selected={showGantt}
              onClick={() => setShowGantt(true)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                showGantt ? 'bg-primary text-white' : 'text-muted hover:text-text-main'
              }`}
            >
              <BarChart3 size={14} />
              Gantt
            </button>
          </div>

          <Button
            variant="secondary"
            onClick={() => setIsExportDialogOpen(true)}
            style={{ width: 'auto' }}
          >
            <Calendar size={18} />
            Subscribe
          </Button>
        </div>
      </div>

      {/* Gantt View */}
      {showGantt && (
        <div className="rounded-xl border border-[rgba(148,163,184,0.15)] bg-[rgba(15,23,42,0.35)] p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[rgba(148,163,184,0.1)]">
            <span className="text-xs text-muted font-medium">
              {range.start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} – {range.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <div role="group" aria-label="Zoom controls" className="flex items-center gap-1">
              {(['week', 'month', 'quarter'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  aria-pressed={zoom === level}
                  onClick={() => setZoom(level)}
                  className={`px-2.5 py-1 text-xs font-medium rounded capitalize transition-colors ${
                    zoom === level ? 'bg-primary/20 text-primary border border-primary/30' : 'text-muted hover:text-text-main'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Gantt lanes */}
          {lanes.map((lane) => (
            <div key={lane.issuer} className="flex items-center mb-3 last:mb-0">
              {/* Lane label */}
              <div className="w-36 shrink-0 pr-3 flex items-center gap-2">
                <span className="text-sm font-semibold text-text-main truncate" title={lane.issuer}>
                  {lane.issuer}
                </span>
                <span className="text-[10px] text-muted whitespace-nowrap">
                  {lane.items.length}
                </span>
              </div>

              {/* Bar track */}
              <div className="flex-1 relative h-8 rounded-md bg-[rgba(2,6,23,0.4)] border border-[rgba(148,163,184,0.06)]">
                {/* Today marker */}
                {todayOffset >= 0 && todayOffset <= totalDays && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-primary/60 z-10 pointer-events-none"
                    style={{ left: `${(todayOffset / totalDays) * 100}%` }}
                    aria-hidden="true"
                  >
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-primary" />
                  </div>
                )}

                {/* Payout bars */}
                {lane.items.map((item) => {
                  const itemDate = parseDate(item.scheduledFor);
                  const offset = daysBetween(range.start, itemDate);
                  const pct = (offset / totalDays) * 100;
                  const color = statusBarColor(item.status);
                  const isFailedOrCanceled = item.status === 'failed' || item.status === 'canceled';
                  const isHovered = hoveredPayout === item.id;

                  return (
                    <div
                      key={item.id}
                      className="absolute rounded-sm transition-all duration-150 cursor-default"
                      style={{
                        left: `${Math.max(0, pct)}%`,
                        width: `${Math.max(2, 100 / totalDays)}%`,
                        top: '25%',
                        height: '50%',
                        minWidth: 4,
                        backgroundColor: color,
                        opacity: isHovered ? 1 : 0.8,
                        ...(isFailedOrCanceled
                          ? {
                              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 6px), ${color}`,
                            }
                          : {}),
                      }}
                      title={`${lane.issuer}: ${item.amount} — ${item.scheduledFor} — ${item.status}`}
                      onMouseEnter={() => setHoveredPayout(item.id)}
                      onMouseLeave={() => setHoveredPayout(null)}
                    >
                      {/* Tooltip */}
                      {isHovered && (
                        <div
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-20 pointer-events-none"
                          role="tooltip"
                        >
                          <div className="bg-[#0f172a] border border-[rgba(148,163,184,0.2)] rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap shadow-xl">
                            <div className="font-semibold text-text-main">{lane.issuer}</div>
                            <div className="text-muted mt-0.5">{item.amount}</div>
                            <div className="text-muted">{item.scheduledFor}</div>
                            <div className="mt-0.5">
                              <PayoutStatusPill status={item.status} variant="compact" showTooltip={false} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Gantt pattern key */}
          <div className="mt-4 pt-3 border-t border-[rgba(148,163,184,0.1)]">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-muted">Pattern key:</span>
              <span className="flex items-center gap-1 text-[10px] text-muted">
                <span
                  className="inline-block w-3 h-3 rounded-sm"
                  style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px), #64748b' }}
                />
                Failed / Canceled
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted">
                <span className="inline-block w-2 h-0.5 rounded bg-primary/60" />
                Today marker
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Table View */}
      {!showGantt && (
        <div
          className="rounded-xl border border-[rgba(148,163,184,0.15)] bg-[rgba(15,23,42,0.35)] overflow-x-auto"
          data-testid="payout-schedule-table"
        >
          <table className="psp-table w-full">
            <thead>
              <tr>
                <th scope="col">Recipient</th>
                <th scope="col">Amount</th>
                <th scope="col">Scheduled For</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.id} className="psp-table-row" data-testid={`payout-row-${payout.id}`}>
                  <td className="font-medium text-text-main">{payout.recipient}</td>
                  <td className="text-muted">{payout.amount}</td>
                  <td className="text-muted">{payout.scheduledFor}</td>
                  <td>
                    <PayoutStatusPill status={payout.status} variant="compact" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Status Legend (always visible, full variant pills) */}
      <div
        className="rounded-xl border border-[rgba(148,163,184,0.15)] bg-[rgba(15,23,42,0.35)] p-4"
        data-testid="payout-status-legend"
      >
        <h2 className="text-sm font-semibold text-text-main mb-2">Status Legend</h2>
        <p className="text-xs text-muted mb-3 max-w-lg">
          Payouts move through these lifecycle stages. Each status has a distinct icon,
          label, and colour so meaning is never conveyed by colour alone.
        </p>
        <ul className="flex flex-wrap gap-2" aria-label="Payout status definitions">
          {PAYOUT_STATUS_ORDER.map((status) => (
            <li key={status}>
              <PayoutStatusPill status={status} variant="full" />
            </li>
          ))}
        </ul>
      </div>

      <CalendarExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
      />
    </div>
  );
};

export default PayoutSchedule;
