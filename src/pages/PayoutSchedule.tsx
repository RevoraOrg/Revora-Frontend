/**
 * PayoutSchedule — Gantt-style timeline view with table alternative (Issue #442).
 *
 * Features:
 * - Gantt chart with lane rows per issuer, payout bars with status colours/patterns,
 *   today marker, zoom controls (week / month / quarter)
 * - Hover popovers + click-through to PayoutDrillDownPanel slide-over
 * - Accessible table alternative for keyboard / screen-reader users
 * - WCAG 2.1 AA: colour is never the only cue (patterns + labels),
 *   all interactive elements keyboard-reachable, aria roles correct
 * - Responsive with horizontal scroll on mobile
 * - Dark-mode, high-contrast, forced-colors, print safe
 * - RTL-ready (logical properties throughout)
 */

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useId,
} from 'react';
import { Calendar, BarChart3, Table2 } from 'lucide-react';
import './PayoutSchedule.css';
import {
  PayoutStatusPill,
  PAYOUT_STATUS_ORDER,
} from '../components/PayoutStatusPill';
import { EmptyState } from '../components/designSystem/EmptyState';
import { CalendarExportDialog } from '../components/CalendarExportDialog';
import { Button } from '../components/Button';
import {
  PayoutDrillDownPanel,
} from '../components/PayoutDrillDownPanel';
import type { PayoutDetail } from '../components/PayoutDrillDownPanel/PayoutDrillDownPanel.types';

// ─── Types ────────────────────────────────────────────────────────────────

export type ZoomLevel = 'week' | 'month' | 'quarter';

export interface PayoutData {
  id: string;
  /** Issuer / lane name */
  issuer: string;
  recipient: string;
  amount: string;
  /** ISO-8601 date (YYYY-MM-DD) */
  scheduledFor: string;
  status: string;
}

/** @deprecated use PayoutData. Kept for backward-compat with old Payout interface. */
export interface Payout extends PayoutData {}

interface LaneRow {
  issuer: string;
  items: PayoutData[];
}

interface GanttRange {
  start: Date;
  end: Date;
}

interface PayoutScheduleProps {
  payouts?: PayoutData[];
  /** When true, renders the empty state instead of data views. */
  empty?: boolean;
}

// ─── Demo data ────────────────────────────────────────────────────────────

export const DEMO_PAYOUTS: PayoutData[] = [
  { id: '1', issuer: 'Issuer A', recipient: '0x1234...abcd', amount: 'USDC 12,500', scheduledFor: '2026-07-15', status: 'confirmed' },
  { id: '2', issuer: 'Issuer A', recipient: '0x1234...abcd', amount: 'USDC 12,500', scheduledFor: '2026-08-15', status: 'scheduled' },
  { id: '3', issuer: 'Issuer B', recipient: '0x5678...ef01', amount: 'USDC 8,250',  scheduledFor: '2026-07-01', status: 'sending' },
  { id: '4', issuer: 'Issuer B', recipient: '0x5678...ef01', amount: 'USDC 8,250',  scheduledFor: '2026-08-01', status: 'preparing' },
  { id: '5', issuer: 'Issuer C', recipient: '0x9abc...def0', amount: 'USDC 3,100',  scheduledFor: '2026-06-15', status: 'retrying' },
  { id: '6', issuer: 'Issuer C', recipient: '0x9abc...def0', amount: 'USDC 3,100',  scheduledFor: '2026-07-15', status: 'failed' },
  { id: '7', issuer: 'Issuer D', recipient: '0x2468...1357', amount: 'USDC 500',    scheduledFor: '2026-06-01', status: 'canceled' },
  { id: '8', issuer: 'Issuer D', recipient: '0x2468...1357', amount: 'USDC 500',    scheduledFor: '2026-08-01', status: 'scheduled' },
];

// ─── Date utilities ───────────────────────────────────────────────────────

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${dy}`;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function formatMonthYear(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function formatRangeLabel(start: Date, end: Date): string {
  const s = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const e = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${s} – ${e}`;
}

// ─── Gantt range calculation ──────────────────────────────────────────────

export function getRange(items: PayoutData[], zoom: ZoomLevel, today = new Date()): GanttRange {
  if (items.length === 0) {
    // Fallback: show 30 days around today
    return { start: addDays(today, -7), end: addDays(today, 23) };
  }

  const dates = items.map((i) => parseDate(i.scheduledFor));
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  // Pad by zoom-appropriate margins
  const padStart = zoom === 'week' ? 2 : zoom === 'month' ? 5 : 14;
  const padEnd   = zoom === 'week' ? 3 : zoom === 'month' ? 10 : 21;

  const start = addDays(minDate, -padStart);
  const end   = addDays(maxDate, padEnd);

  // Ensure today is always visible
  const clampedStart = daysBetween(start, today) < 0 ? addDays(today, -padStart) : start;
  const clampedEnd   = daysBetween(end, today) > 0   ? addDays(today, padEnd)    : end;

  // Enforce minimum window per zoom
  const minDays = zoom === 'week' ? 7 : zoom === 'month' ? 28 : 84;
  const span = daysBetween(clampedStart, clampedEnd);
  if (span < minDays) {
    return { start: clampedStart, end: addDays(clampedStart, minDays) };
  }

  return { start: clampedStart, end: clampedEnd };
}

// ─── Tick generation ──────────────────────────────────────────────────────

interface Tick {
  label: string;
  pct: number;
}

export function buildTicks(start: Date, end: Date, zoom: ZoomLevel): Tick[] {
  const totalDays = daysBetween(start, end) || 1;
  const ticks: Tick[] = [];

  if (zoom === 'week') {
    // Every day
    let cur = new Date(start);
    while (cur <= end) {
      const pct = (daysBetween(start, cur) / totalDays) * 100;
      ticks.push({
        label: cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        pct,
      });
      cur = addDays(cur, 1);
    }
  } else if (zoom === 'month') {
    // First of each month + every 7 days
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      if (cur >= start) {
        const pct = (daysBetween(start, cur) / totalDays) * 100;
        ticks.push({ label: formatMonthYear(cur), pct });
      }
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  } else {
    // Quarter: first of each month
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      if (cur >= start) {
        const pct = (daysBetween(start, cur) / totalDays) * 100;
        ticks.push({ label: formatMonthYear(cur), pct });
      }
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  }

  return ticks;
}

// ─── Sub-components ───────────────────────────────────────────────────────

interface GanttBarProps {
  item: PayoutData;
  issuer: string;
  leftPct: number;
  widthPct: number;
  onSelect: (item: PayoutData) => void;
}

const GanttBar: React.FC<GanttBarProps> = ({
  item,
  issuer,
  leftPct,
  widthPct,
  onSelect,
}) => {
  const [hovered, setHovered] = useState(false);
  const tooltipId = useId();
  const titleAttr = `${issuer}: ${item.amount} — ${item.scheduledFor} — ${item.status}`;

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(item);
      }
    },
    [item, onSelect],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      className={`psg-bar psg-bar--${item.status}`}
      style={{
        left: `${Math.max(0, Math.min(99, leftPct))}%`,
        width: `${Math.max(0.5, widthPct)}%`,
      }}
      title={titleAttr}
      aria-label={titleAttr}
      aria-describedby={hovered ? tooltipId : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={() => onSelect(item)}
      onKeyDown={handleKey}
    >
      {hovered && (
        <div className="psg-tooltip" role="tooltip" id={tooltipId}>
          <div className="psg-tooltip__inner">
            <div className="psg-tooltip__issuer">{issuer}</div>
            <div className="psg-tooltip__amount">{item.amount}</div>
            <div className="psg-tooltip__date">{item.scheduledFor}</div>
            <PayoutStatusPill
              status={item.status}
              variant="compact"
              showTooltip={false}
            />
          </div>
          <div className="psg-tooltip__caret" aria-hidden="true" />
        </div>
      )}
    </div>
  );
};

interface GanttLaneProps {
  lane: LaneRow;
  range: GanttRange;
  totalDays: number;
  barWidthDays: number;
  onSelect: (item: PayoutData) => void;
  todayOffsetPct: number | null;
}

const GanttLane: React.FC<GanttLaneProps> = ({
  lane,
  range,
  totalDays,
  barWidthDays,
  onSelect,
  todayOffsetPct,
}) => {
  return (
    <div className="psg-lane" role="row">
      {/* Lane label */}
      <div className="psg-lane-label" role="rowheader">
        <span
          className="psg-lane-label__name"
          title={lane.issuer}
        >
          {lane.issuer}
        </span>
        <span className="psg-lane-label__count" aria-label={`${lane.items.length} payouts`}>
          {lane.items.length}
        </span>
      </div>

      {/* Bar track */}
      <div className="psg-lane-track" role="gridcell">
        {/* Today marker within the lane */}
        {todayOffsetPct !== null &&
          todayOffsetPct >= 0 &&
          todayOffsetPct <= 100 && (
            <div
              className="psg-today-marker"
              style={{ left: `${todayOffsetPct}%` }}
              aria-hidden="true"
            >
              <div className="psg-today-marker__dot" />
            </div>
          )}

        {/* Payout bars */}
        {lane.items.map((item) => {
          const itemDate = parseDate(item.scheduledFor);
          const offset = daysBetween(range.start, itemDate);
          const leftPct = (offset / totalDays) * 100;
          const widthPct = (barWidthDays / totalDays) * 100;

          return (
            <GanttBar
              key={item.id}
              item={item}
              issuer={lane.issuer}
              leftPct={leftPct}
              widthPct={widthPct}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
};

// ─── Gantt View ───────────────────────────────────────────────────────────

interface GanttViewProps {
  lanes: LaneRow[];
  zoom: ZoomLevel;
  onZoomChange: (z: ZoomLevel) => void;
  onSelect: (item: PayoutData) => void;
}

const GanttView: React.FC<GanttViewProps> = ({
  lanes,
  zoom,
  onZoomChange,
  onSelect,
}) => {
  const today = useMemo(() => new Date(), []);
  const allItems = useMemo(() => lanes.flatMap((l) => l.items), [lanes]);
  const range = useMemo(() => getRange(allItems, zoom, today), [allItems, zoom, today]);
  const totalDays = useMemo(() => daysBetween(range.start, range.end) || 1, [range]);
  const ticks = useMemo(() => buildTicks(range.start, range.end, zoom), [range, zoom]);
  const rangeLabel = useMemo(() => formatRangeLabel(range.start, range.end), [range]);

  // bar width: 1 day visually, or a minimum fraction of total span
  const barWidthDays = zoom === 'week' ? 1 : zoom === 'month' ? 2 : 4;

  const todayOffsetPct = useMemo(() => {
    const off = daysBetween(range.start, today);
    if (off < 0 || off > totalDays) return null;
    return (off / totalDays) * 100;
  }, [range, today, totalDays]);

  const ZOOM_OPTIONS: ZoomLevel[] = ['week', 'month', 'quarter'];

  return (
    <div>
      {/* Controls bar */}
      <div className="psg-controls">
        <span className="psg-range-label" aria-live="polite" aria-atomic="true">
          {rangeLabel}
        </span>
        <div
          className="psg-zoom-group"
          role="group"
          aria-label="Zoom controls"
        >
          {ZOOM_OPTIONS.map((z) => (
            <button
              key={z}
              type="button"
              className="psg-zoom-btn"
              aria-pressed={zoom === z}
              onClick={() => onZoomChange(z)}
            >
              {z.charAt(0).toUpperCase() + z.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Gantt card */}
      <div className="psg-gantt-card">
        <div className="psg-gantt-scroll">
          <div
            className="psg-gantt-inner"
            role="grid"
            aria-label="Payout schedule Gantt chart"
            aria-rowcount={lanes.length}
          >
            {/* Date tick header */}
            <div className="psg-gantt-header" role="row" aria-hidden="true">
              <div className="psg-gantt-label-spacer" />
              <div className="psg-gantt-ticks">
                {ticks.map((tick, i) => (
                  <span
                    key={i}
                    className="psg-gantt-tick"
                    style={{ left: `${tick.pct}%` }}
                  >
                    {tick.label}
                  </span>
                ))}
                {/* Today label in header */}
                {todayOffsetPct !== null && (
                  <span
                    className="psg-today-marker__label"
                    style={{ left: `${todayOffsetPct}%`, position: 'absolute', top: 0 }}
                    aria-hidden="true"
                  >
                    Today
                  </span>
                )}
              </div>
            </div>

            {/* Lane rows */}
            {lanes.map((lane) => (
              <GanttLane
                key={lane.issuer}
                lane={lane}
                range={range}
                totalDays={totalDays}
                barWidthDays={barWidthDays}
                onSelect={onSelect}
                todayOffsetPct={todayOffsetPct}
              />
            ))}
          </div>
        </div>

        {/* Pattern key legend */}
        <div className="psg-pattern-key">
          <span className="psg-pattern-key__label">Pattern key:</span>
          <span className="psg-pattern-key__item">
            <span
              className="psg-pattern-key__swatch psg-bar--failed"
              style={{ display: 'inline-block', opacity: 1 }}
              aria-hidden="true"
            />
            Failed / Canceled
          </span>
          <span className="psg-pattern-key__item">
            <span
              className="psg-pattern-key__today-line"
              aria-hidden="true"
            />
            Today marker
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Table View (accessible alternative) ─────────────────────────────────

interface TableViewProps {
  lanes: LaneRow[];
  onSelect: (item: PayoutData) => void;
}

const TableView: React.FC<TableViewProps> = ({ lanes, onSelect }) => {
  const allItems = lanes.flatMap((lane) =>
    lane.items.map((item) => ({ ...item, issuer: lane.issuer })),
  );

  return (
    <div className="psg-table-card" data-testid="payout-schedule-table">
      <table className="psg-table">
        <thead>
          <tr>
            <th scope="col">Issuer</th>
            <th scope="col">Recipient</th>
            <th scope="col">Amount</th>
            <th scope="col">Scheduled For</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {allItems.map((item) => (
            <tr
              key={item.id}
              className="psg-table-row"
              data-testid={`payout-row-${item.id}`}
            >
              <td className="psg-table__issuer">{item.issuer}</td>
              <td>{item.recipient}</td>
              <td className="psg-table__amount">{item.amount}</td>
              <td className="psg-table__date">{item.scheduledFor}</td>
              <td>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  aria-label={`Open details for ${item.issuer} payout on ${item.scheduledFor}`}
                  onClick={() => onSelect(item)}
                >
                  <PayoutStatusPill status={item.status} variant="compact" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────

export const PayoutSchedule: React.FC<PayoutScheduleProps> = ({
  payouts = DEMO_PAYOUTS,
  empty = false,
}) => {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState<'table' | 'gantt'>('table');
  const [zoom, setZoom] = useState<ZoomLevel>('month');
  const [selectedItem, setSelectedItem] = useState<PayoutData | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const ganttTabRef = useRef<HTMLButtonElement>(null);
  const tableTabRef = useRef<HTMLButtonElement>(null);

  // Group payouts into issuer lanes
  const lanes = useMemo<LaneRow[]>(() => {
    const map = new Map<string, PayoutData[]>();
    for (const p of payouts) {
      const key = p.issuer ?? p.recipient;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([issuer, items]) => ({
      issuer,
      items: items.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor)),
    }));
  }, [payouts]);

  const handleSelect = useCallback((item: PayoutData) => {
    setSelectedItem(item);
    setIsPanelOpen(true);
  }, []);

  const handlePanelClose = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  // Build a minimal PayoutDetail for the drill-down panel
  const panelData = useMemo<PayoutDetail | null>(() => {
    if (!selectedItem) return null;
    return {
      id: selectedItem.id,
      payoutNumber: `#${selectedItem.id}`,
      date: selectedItem.scheduledFor,
      time: '00:00',
      status: (selectedItem.status === 'confirmed'
        ? 'completed'
        : selectedItem.status === 'sending' || selectedItem.status === 'preparing'
        ? 'processing'
        : selectedItem.status === 'failed' || selectedItem.status === 'retrying'
        ? 'failed'
        : 'scheduled') as 'completed' | 'processing' | 'failed' | 'scheduled',
      grossAmount: parseFloat(selectedItem.amount.replace(/[^0-9.]/g, '')) || 0,
      netAmount: parseFloat(selectedItem.amount.replace(/[^0-9.]/g, '')) || 0,
      protocolFeeUsd: 0,
      currency: 'USD',
      offeringName: selectedItem.issuer,
      offeringId: selectedItem.issuer,
      gasFeeUsd: 0,
      gasFeeEth: 0,
      gasPriceGwei: 0,
      estimatedGasUsd: 0,
      estimatedGasPriceGwei: 0,
      executionNetwork: 'Stellar',
      blockNumber: 0,
      contractAddress: '',
      transactionHash: '',
      recipientsCount: 1,
      recipients: [
        {
          id: selectedItem.id,
          walletAddress: selectedItem.recipient,
          tier: 'Standard',
          sharePercentage: 100,
          amount: parseFloat(selectedItem.amount.replace(/[^0-9.]/g, '')) || 0,
          status: (selectedItem.status === 'confirmed' ? 'success'
            : selectedItem.status === 'failed' ? 'failed'
            : 'pending') as 'success' | 'pending' | 'failed',
          gasAllocatedGwei: 0,
        },
      ],
      retries: [],
    };
  }, [selectedItem]);

  // ── Empty state ──
  if (empty) {
    return (
      <div className="psg-page">
        <header className="psg-header">
          <div>
            <h1 className="psg-header__title">Payout Schedule</h1>
            <p className="psg-header__sub">View upcoming and past RevenueShare payout dates.</p>
          </div>
          <Button variant="secondary" onClick={() => setIsExportDialogOpen(true)} style={{ width: 'auto' }}>
            <Calendar size={16} aria-hidden="true" />
            Subscribe
          </Button>
        </header>
        <EmptyState
          variant="payout-schedule"
          title="No payouts scheduled"
          description="Payouts will appear here once revenue is reported and the distribution cycle begins."
          primaryAction={{ label: 'Report Revenue', href: '/startup/report-revenue' }}
          secondaryAction={{ label: 'Learn How It Works', href: '/' }}
        />
        <CalendarExportDialog isOpen={isExportDialogOpen} onClose={() => setIsExportDialogOpen(false)} />
      </div>
    );
  }

  // ── Data view ──
  return (
    <div className="psg-page">
      {/* ── Header ── */}
      <header className="psg-header">
        <div>
          <h1 className="psg-header__title">Payout Schedule</h1>
          <p className="psg-header__sub">View upcoming and past RevenueShare payout dates.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View toggle */}
          <div
            className="psg-view-toggle"
            role="tablist"
            aria-label="View mode"
          >
            <button
              ref={tableTabRef}
              type="button"
              role="tab"
              id="tab-table"
              aria-selected={activeView === 'table'}
              aria-controls="panel-table"
              className="psg-view-toggle__btn"
              onClick={() => setActiveView('table')}
            >
              <Table2 size={14} aria-hidden="true" />
              Table
            </button>
            <button
              ref={ganttTabRef}
              type="button"
              role="tab"
              id="tab-gantt"
              aria-selected={activeView === 'gantt'}
              aria-controls="panel-gantt"
              className="psg-view-toggle__btn"
              onClick={() => setActiveView('gantt')}
            >
              <BarChart3 size={14} aria-hidden="true" />
              Gantt
            </button>
          </div>

          <Button variant="secondary" onClick={() => setIsExportDialogOpen(true)} style={{ width: 'auto' }}>
            <Calendar size={16} aria-hidden="true" />
            Subscribe
          </Button>
        </div>
      </header>

      {/* ── Table panel ── */}
      <div
        id="panel-table"
        role="tabpanel"
        aria-labelledby="tab-table"
        hidden={activeView !== 'table'}
      >
        {activeView === 'table' && (
          <TableView lanes={lanes} onSelect={handleSelect} />
        )}
      </div>

      {/* ── Gantt panel ── */}
      <div
        id="panel-gantt"
        role="tabpanel"
        aria-labelledby="tab-gantt"
        hidden={activeView !== 'gantt'}
      >
        {activeView === 'gantt' && (
          <GanttView
            lanes={lanes}
            zoom={zoom}
            onZoomChange={setZoom}
            onSelect={handleSelect}
          />
        )}
      </div>

      {/* ── Status legend (always visible) ── */}
      <section
        className="psg-legend-card"
        data-testid="payout-status-legend"
        aria-labelledby="legend-heading"
      >
        <h2 id="legend-heading" className="psg-legend-card__title">Status Legend</h2>
        <p className="psg-legend-card__copy">
          Payouts move through these lifecycle stages. Each status has a distinct icon,
          label, and colour so meaning is never conveyed by colour alone.
        </p>
        <ul className="psg-legend-card__list" aria-label="Payout status definitions">
          {PAYOUT_STATUS_ORDER.map((status) => (
            <li key={status}>
              <PayoutStatusPill status={status} variant="full" />
            </li>
          ))}
        </ul>
      </section>

      {/* ── Drill-down panel ── */}
      <PayoutDrillDownPanel
        isOpen={isPanelOpen}
        payoutId={selectedItem?.id ?? null}
        payoutData={panelData}
        onClose={handlePanelClose}
        triggerRef={activeView === 'gantt' ? ganttTabRef : tableTabRef}
      />

      {/* ── Calendar export dialog ── */}
      <CalendarExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
      />
    </div>
  );
};

export default PayoutSchedule;
