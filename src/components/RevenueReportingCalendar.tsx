/**
 * Revenue Reporting Calendar — Issue #153
 *
 * A responsive, accessible month-grid calendar that provides issuers
 * with a month-by-month overview of report due dates, submission
 * status, and acceptance status, with quick access to submit reports.
 *
 * Features:
 * - WAI-ARIA Grid pattern with full keyboard navigation
 * - Status indicators (Due, Submitted, Accepted, Overdue)
 * - Side panel with report details and Submit Report CTA
 * - Responsive: desktop (side-by-side), tablet (collapsible), mobile (stacked)
 * - Dark mode and RTL support
 * - Edge cases: loading, empty, error, overdue, multiple reports
 */

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useId,
  KeyboardEvent,
  MouseEvent,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Send,
  X,
  Menu,
  List,
  Upload,
  LayoutGrid,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Bell,
} from "lucide-react";
import {
  formatDate,
  formatCurrency,
  SupportedLocale,
  LOCALE_FORMAT_SETTINGS,
} from "../constants/i18n";
import { TERMINOLOGY } from "../constants/terminology";
import { Button } from "./Button";
import {
  RevenueReportingCalendarProps,
  DayCellData,
  RevenueReport,
  ReportStatus,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_COLORS,
  OverdueSeverity,
  OVERDUE_SEVERITY_LABELS,
  OVERDUE_SEVERITY_COLORS,
  getOverdueDays,
  getOverdueSeverity,
} from './RevenueReportingCalendar.types';
import RevenueCalendarCsvImport from './RevenueCalendarCsvImport';
import {
  getPayoutStatusDefinition,
  normalizePayoutStatus,
  type PayoutStatus,
  type PayoutStatusTone,
} from './PayoutStatusPill/payoutStatuses';
import { useReducedMotion } from '../hooks/useReducedMotion';
import './RevenueReportingCalendar.css';

/* ─── Helpers ──────────────────────────────────────────────────────── */

function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseISODate(iso: string): {
  year: number;
  month: number;
  day: number;
} {
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

function isSameDay(a: string, b: string): boolean {
  return a === b;
}

function isToday(iso: string): boolean {
  const today = new Date();
  const d = parseISODate(iso);
  return (
    d.year === today.getFullYear() &&
    d.month === today.getMonth() &&
    d.day === today.getDate()
  );
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(
  year: number,
  month: number,
  weekStartsOn: number,
): number {
  const day = new Date(year, month, 1).getDay();
  return (day - weekStartsOn + 7) % 7;
}

function getPrimaryStatus(reports: RevenueReport[]): ReportStatus {
  if (reports.length === 0) return "none";
  // Priority: overdue > due > submitted > accepted
  if (reports.some((r) => r.status === "overdue")) return "overdue";
  if (reports.some((r) => r.status === "due")) return "due";
  if (reports.some((r) => r.status === "submitted")) return "submitted";
  return "accepted";
}

function isOverdue(report: RevenueReport): boolean {
  if (report.status === "accepted" || report.status === "submitted")
    return false;
  const due = new Date(report.dueDate);
  const now = new Date();
  return due < now;
}

function getMonthReports(
  reports: RevenueReport[],
  year: number,
  month: number,
): RevenueReport[] {
  return reports.filter((r) => {
    const d = parseISODate(r.date);
    return d.year === year && d.month === month;
  });
}

/* ─── Build Day Cells ──────────────────────────────────────────────── */

function buildDayCells(
  year: number,
  month: number,
  reports: RevenueReport[],
  selectedDates: string[],
  weekStartsOn: number,
): DayCellData[] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month, weekStartsOn);
  const cells: DayCellData[] = [];

  const sortedDates = [...selectedDates].sort();
  const getSelectionProps = (date: string) => {
    const isSelected = selectedDates.includes(date);
    if (!isSelected || sortedDates.length < 2) return { isSelected };
    const isRangeStart = date === sortedDates[0];
    const isRangeEnd = date === sortedDates[sortedDates.length - 1];
    const isInRange = isSelected && !isRangeStart && !isRangeEnd;
    return { isSelected, isRangeStart, isRangeEnd, isInRange };
  };

  // Previous month padding
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const date = toISODate(prevYear, prevMonth, day);
    const dayReports = reports.filter((r) => r.date === date);
    cells.push({
      date,
      day,
      inMonth: false,
      isToday: isToday(date),
      ...getSelectionProps(date),
      reports: dayReports,
      primaryStatus: getPrimaryStatus(dayReports),
    });
  }

  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = toISODate(year, month, day);
    const dayReports = reports.filter((r) => r.date === date);
    cells.push({
      date,
      day,
      inMonth: true,
      isToday: isToday(date),
      ...getSelectionProps(date),
      reports: dayReports,
      primaryStatus: getPrimaryStatus(dayReports),
    });
  }

  // Next month padding (fill to complete 6 rows × 7 = 42 cells, or just fill the last row)
  const remaining = 42 - cells.length;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  for (let day = 1; day <= remaining; day++) {
    const date = toISODate(nextYear, nextMonth, day);
    const dayReports = reports.filter((r) => r.date === date);
    cells.push({
      date,
      day,
      inMonth: false,
      isToday: isToday(date),
      ...getSelectionProps(date),
      reports: dayReports,
      primaryStatus: getPrimaryStatus(dayReports),
    });
  }

  return cells;
}

/* ─── Status Dot ───────────────────────────────────────────────────── */

function StatusDot({ status }: { status: ReportStatus }) {
  if (status === "none") return null;
  const color = REPORT_STATUS_COLORS[status];
  return (
    <span
      className="rc-status-dot"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

/* ─── Overdue Badge ────────────────────────────────────────────────── */

function OverdueBadge({ dueDate }: { dueDate: string }) {
  const days = getOverdueDays(dueDate);
  const severity = getOverdueSeverity(days);
  const color = OVERDUE_SEVERITY_COLORS[severity];

  return (
    <span
      className={`rc-overdue-badge rc-overdue-badge--${severity}`}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      {severity === 'critical' ? (
        <AlertOctagon size={10} aria-hidden="true" />
      ) : (
        <AlertTriangle size={10} aria-hidden="true" />
      )}
      <span className="rc-overdue-badge-days">{days}</span>
    </span>
  );
}

/* ─── Day Cell Hover / Focus Preview ───────────────────────────────── */

/**
 * Timing is deliberately short but not instant for a pointer hover so users
 * can move across the grid without a preview flashing for every date. Focus
 * opens immediately: a keyboard user should not need to wait for the same
 * information. Blur/mouse leave keeps the card available briefly to prevent
 * an accidental close while navigating adjacent cells.
 */
const PREVIEW_HOVER_OPEN_DELAY = 300;
const PREVIEW_CLOSE_DELAY = 150;
const PREVIEW_GUTTER = 8;
const PREVIEW_WIDTH = 240;
const PREVIEW_ESTIMATED_HEIGHT = 132;

function usePreviewTimer(reducedMotion: boolean) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOpenTimer = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const open = useCallback((immediately = false) => {
    clearCloseTimer();
    if (dismissed) return;

    clearOpenTimer();
    if (reducedMotion || immediately) {
      setVisible(true);
      return;
    }

    openTimer.current = setTimeout(() => {
      openTimer.current = null;
      setVisible(true);
    }, PREVIEW_HOVER_OPEN_DELAY);
  }, [clearCloseTimer, clearOpenTimer, dismissed, reducedMotion]);

  const close = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    if (reducedMotion) {
      setVisible(false);
      return;
    }

    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setVisible(false);
    }, PREVIEW_CLOSE_DELAY);
  }, [clearCloseTimer, clearOpenTimer, reducedMotion]);

  const dismiss = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    setDismissed(true);
    setVisible(false);
  }, [clearCloseTimer, clearOpenTimer]);

  /** ESC dismissal applies only to this hover/focus session. */
  const resetDismissal = useCallback(() => {
    setDismissed(false);
  }, []);

  const closeImmediate = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    setVisible(false);
  }, [clearCloseTimer, clearOpenTimer]);

  useEffect(() => () => {
    clearOpenTimer();
    clearCloseTimer();
  }, [clearCloseTimer, clearOpenTimer]);

  return {
    visible,
    open,
    close,
    dismiss,
    resetDismissal,
    closeImmediate,
  };
}

/* ─── Preview Position ─────────────────────────────────────────────── */

type PreviewPlacement =
  | 'top'
  | 'bottom'
  | 'top-start'
  | 'bottom-start'
  | 'top-end'
  | 'bottom-end';

/**
 * Chooses a side with enough vertical space first, then changes the horizontal
 * anchor only when a centred card would cross a viewport gutter. `start`
 * anchors the card to the cell's left edge, while `end` anchors it to the
 * right edge. CSS mirrors those logical placement names in RTL.
 */
function getPreviewPlacement(
  anchorEl: HTMLElement | null,
  previewWidth = PREVIEW_WIDTH,
  previewHeight = PREVIEW_ESTIMATED_HEIGHT,
): PreviewPlacement {
  if (!anchorEl || typeof window === 'undefined') return 'top';

  const rect = anchorEl.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const spaceAbove = rect.top;
  const spaceBelow = viewportHeight - rect.bottom;
  const vertical: 'top' | 'bottom' = spaceAbove >= previewHeight + PREVIEW_GUTTER
    ? 'top'
    : spaceBelow >= previewHeight + PREVIEW_GUTTER
      ? 'bottom'
      : spaceAbove > spaceBelow
        ? 'top'
        : 'bottom';

  const centeredLeft = rect.left + (rect.width - previewWidth) / 2;
  const centeredRight = centeredLeft + previewWidth;
  if (centeredLeft < PREVIEW_GUTTER) return `${vertical}-start`;
  if (centeredRight > viewportWidth - PREVIEW_GUTTER) return `${vertical}-end`;
  return vertical;
}

/* ─── Preview Data ─────────────────────────────────────────────────── */

type VarianceDirection = 'up' | 'down' | 'flat';

interface RevenueVariance {
  pct: number | null;
  direction: VarianceDirection;
  isNew: boolean;
}

/** Compute percentage variance only when both periods include reported revenue. */
function getVariance(
  current: RevenueReport[],
  prior: RevenueReport[],
): RevenueVariance {
  const currentWithRevenue = current.filter((report) => report.grossRevenue !== undefined);
  const priorWithRevenue = prior.filter((report) => report.grossRevenue !== undefined);

  if (currentWithRevenue.length === 0 || priorWithRevenue.length === 0) {
    return { pct: null, direction: 'flat', isNew: false };
  }

  const currentRevenue = currentWithRevenue.reduce(
    (sum, report) => sum + (report.grossRevenue ?? 0),
    0,
  );
  const priorRevenue = priorWithRevenue.reduce(
    (sum, report) => sum + (report.grossRevenue ?? 0),
    0,
  );

  if (priorRevenue === 0) {
    return {
      pct: null,
      direction: currentRevenue > 0 ? 'up' : 'flat',
      isNew: currentRevenue > 0,
    };
  }

  const pct = ((currentRevenue - priorRevenue) / priorRevenue) * 100;
  return {
    pct,
    direction: pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat',
    isNew: false,
  };
}

interface PayoutSummary {
  label: string;
  description: string;
  tone: PayoutStatusTone | 'unknown';
}

/**
 * A period can contain more than one report. Preserve the explicit payout
 * signal when all reports agree; otherwise clearly disclose that it is mixed
 * instead of showing a potentially misleading single state.
 */
function getPayoutSummary(reports: RevenueReport[]): PayoutSummary {
  const statuses = reports.flatMap((report) => (
    report.payoutStatus ? [normalizePayoutStatus(report.payoutStatus)] : []
  ));

  if (statuses.length === 0) {
    return {
      label: 'Not available',
      description: 'No payout status is available for this reporting period.',
      tone: 'unknown',
    };
  }

  const uniqueStatuses = [...new Set(statuses)];
  if (uniqueStatuses.length > 1) {
    return {
      label: 'Mixed',
      description: `Multiple payout statuses: ${uniqueStatuses
        .map((status) => getPayoutStatusDefinition(status).label)
        .join(', ')}.`,
      tone: 'unknown',
    };
  }

  const status: PayoutStatus = uniqueStatuses[0];
  const definition = getPayoutStatusDefinition(status);
  return {
    label: definition.label,
    description: definition.description,
    tone: definition.tone,
  };
}

/** Returns the five most recent date-level reported-revenue totals for the sparkline. */
function getSparkTrendValues(reports: RevenueReport[], date: string): number[] {
  const revenueByDate = new Map<string, number>();

  reports.forEach((report) => {
    if (report.date > date || report.grossRevenue === undefined) return;
    revenueByDate.set(
      report.date,
      (revenueByDate.get(report.date) ?? 0) + report.grossRevenue,
    );
  });

  return [...revenueByDate.entries()]
    .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
    .slice(-5)
    .map(([, revenue]) => revenue);
}

/* ─── Spark Trend ──────────────────────────────────────────────────── */

/** Mini sparkline. It is intentionally decorative: the KPI values provide the text equivalent. */
function SparkTrend({ values }: { values: number[] }) {
  if (values.length < 2) return null;

  const width = 48;
  const height = 18;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="rc-preview-spark"
      focusable="false"
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Day Cell Preview ─────────────────────────────────────────────── */

interface DayCellPreviewProps {
  cell: DayCellData;
  priorReports: RevenueReport[];
  trendValues: number[];
  locale: string;
  placement: PreviewPlacement;
  id: string;
}

const DayCellPreview: React.FC<DayCellPreviewProps> = ({
  cell,
  priorReports,
  trendValues,
  locale,
  placement,
  id,
}) => {
  const reports = cell.reports;
  const totalRevenue = reports.reduce((sum, report) => sum + (report.grossRevenue ?? 0), 0);
  const currency = reports.find((report) => report.currency)?.currency ?? 'USD';
  const hasRevenue = reports.some((report) => report.grossRevenue !== undefined);
  const variance = getVariance(reports, priorReports);
  const payout = getPayoutSummary(reports);
  const primaryStatus = cell.primaryStatus;
  const statusColor = primaryStatus !== 'none' ? REPORT_STATUS_COLORS[primaryStatus] : undefined;
  const statusLabel = REPORT_STATUS_LABELS[primaryStatus];

  const VarianceIcon = variance.direction === 'up'
    ? TrendingUp
    : variance.direction === 'down'
      ? TrendingDown
      : Minus;
  const varianceClass = `rc-preview-variance--${variance.direction}`;
  const varianceText = variance.isNew
    ? 'New'
    : variance.pct !== null
      ? `${variance.pct > 0 ? '+' : ''}${variance.pct.toFixed(1)}%`
      : '—';

  return (
    <div
      id={id}
      role="tooltip"
      className={`rc-day-preview rc-day-preview--${placement}`}
      data-testid="revenue-calendar-preview"
    >
      <div className="rc-preview-header">
        <span className="rc-preview-date">
          {formatDate(cell.date, locale as SupportedLocale, {
            month: 'short',
            day: 'numeric',
          })}
        </span>
        {primaryStatus !== 'none' && (
          <span
            className="rc-preview-status-pill"
            style={{ color: statusColor, borderColor: statusColor }}
          >
            {statusLabel}
          </span>
        )}
      </div>

      <div className="rc-preview-kpis">
        <div className="rc-preview-kpi">
          <span className="rc-preview-kpi-label">Reported revenue</span>
          <span className="rc-preview-kpi-value">
            {hasRevenue
              ? formatCurrency(totalRevenue, currency, locale as SupportedLocale)
              : '—'}
          </span>
        </div>

        <div className={`rc-preview-kpi rc-preview-payout rc-preview-payout--${payout.tone}`}>
          <span className="rc-preview-kpi-label">Payout status</span>
          <span className="rc-preview-kpi-value" title={payout.description}>
            {payout.label}
          </span>
        </div>

        <div className={`rc-preview-kpi rc-preview-variance ${varianceClass}`}>
          <span className="rc-preview-kpi-label">vs prior period</span>
          <span className="rc-preview-kpi-value rc-preview-variance-value">
            <VarianceIcon size={11} aria-hidden="true" />
            {varianceText}
          </span>
        </div>
      </div>

      {hasRevenue && trendValues.length >= 2 && (
        <div className="rc-preview-spark-row">
          <SparkTrend values={trendValues} />
          <span className="rc-preview-spark-label">Revenue trend</span>
        </div>
      )}

      <span className="rc-preview-arrow" aria-hidden="true" />
    </div>
  );
};

/* ─── Agenda View (Mobile) ─────────────────────────────────────────── */

interface AgendaViewProps {
  reports: RevenueReport[];
  selectedDate: string | undefined;
  locale: string;
  onSelect: (date: string) => void;
  onSubmitReport?: (date: string) => void;
  viewMonth: string;
}

/**
 * The agenda remains the touch-first equivalent of the compact hover preview:
 * touch users select a row for the full details rather than relying on hover.
 */
const AgendaView: React.FC<AgendaViewProps> = ({
  reports,
  selectedDate,
  locale,
  onSelect,
  onSubmitReport,
  viewMonth,
}) => {
  const agendaReports = useMemo(() => reports
    .filter((report) => report.date.startsWith(viewMonth))
    .slice()
    .sort((first, second) => first.date.localeCompare(second.date)), [reports, viewMonth]);

  if (agendaReports.length === 0) {
    return (
      <div className="rc-agenda-view rc-agenda-empty" role="status">
        <Calendar size={32} aria-hidden="true" />
        <p className="rc-agenda-empty-text">No reports scheduled for this month.</p>
      </div>
    );
  }

  return (
    <div className="rc-agenda-view">
      <ul className="rc-agenda-list" role="list" aria-label="Revenue report agenda">
        {agendaReports.map((report) => {
          const effectiveStatus: ReportStatus = isOverdue(report) ? 'overdue' : report.status;
          const isSelected = selectedDate === report.date;
          const dateLabel = formatDate(report.date, locale as SupportedLocale, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
          const rowLabel = [
            dateLabel,
            REPORT_STATUS_LABELS[effectiveStatus],
            report.grossRevenue !== undefined
              ? formatCurrency(report.grossRevenue, report.currency ?? 'USD', locale as SupportedLocale)
              : '',
            isSelected ? 'selected' : '',
          ].filter(Boolean).join(', ');

          return (
            <li key={report.id} className="rc-agenda-listitem" role="listitem">
              <button
                type="button"
                className={`rc-agenda-row rc-agenda-row--${effectiveStatus}${isSelected ? ' rc-agenda-row--selected' : ''}`}
                onClick={() => onSelect(report.date)}
                aria-label={rowLabel}
                aria-pressed={isSelected}
              >
                <span className="rc-agenda-row-date" aria-hidden="true">
                  <span className="rc-agenda-row-weekday">
                    {formatDate(report.date, locale as SupportedLocale, { weekday: 'short' })}
                  </span>
                  <span className="rc-agenda-row-day">{parseISODate(report.date).day}</span>
                </span>
                <span className="rc-agenda-row-body">
                  <span className="rc-agenda-row-header">
                    <span className={`rc-status-pill rc-status-pill--${effectiveStatus}`}>
                      {REPORT_STATUS_LABELS[effectiveStatus]}
                    </span>
                    {report.dueDate && (
                      <span className="rc-agenda-row-duedate">
                        <Clock size={12} aria-hidden="true" />
                        Due {formatDate(report.dueDate, locale as SupportedLocale, {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </span>
                    )}
                  </span>
                  {report.grossRevenue !== undefined && (
                    <span className="rc-agenda-row-revenue">
                      {formatCurrency(report.grossRevenue, report.currency ?? 'USD', locale as SupportedLocale)}
                    </span>
                  )}
                </span>
                <ChevronRight className="rc-agenda-row-chevron" size={18} aria-hidden="true" />
              </button>
              {(effectiveStatus === 'due' || effectiveStatus === 'overdue') && onSubmitReport && (
                <div className="rc-agenda-row-cta">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onSubmitReport(report.date)}
                    aria-label={`Submit ${effectiveStatus} report for ${dateLabel}`}
                  >
                    {effectiveStatus === 'overdue' ? 'Submit Now' : 'Submit Report'}
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

/* ─── Calendar Day Cell ────────────────────────────────────────────── */

interface CalendarDayCellProps {
  cell: DayCellData;
  isTabbable: boolean;
  onSelect: (date: string, event: MouseEvent | KeyboardEvent) => void;
  onFocus: (date: string) => void;
  locale: string;
  /** Reports from the same day in the preceding month, used for variance. */
  priorReports: RevenueReport[];
  /** Recent date-level revenue totals, used to draw the decorative sparkline. */
  trendValues: number[];
}

const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  cell,
  isTabbable,
  onSelect,
  onFocus,
  locale,
  priorReports,
  trendValues,
}) => {
  const reducedMotion = useReducedMotion();
  const {
    visible,
    open,
    close,
    dismiss,
    resetDismissal,
    closeImmediate,
  } = usePreviewTimer(reducedMotion);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<PreviewPlacement>('top');
  const previewId = `rc-preview-${useId()}`;

  const updatePlacement = useCallback(() => {
    setPlacement(getPreviewPlacement(anchorRef.current));
  }, []);

  const handleHoverOpen = useCallback(() => {
    updatePlacement();
    open();
  }, [open, updatePlacement]);

  const handleFocus = () => {
    onFocus(cell.date);
    updatePlacement();
    open(true);
  };

  const handleBlur = () => {
    close();
    resetDismissal();
  };

  const handleMouseLeave = () => {
    close();
    resetDismissal();
  };

  useEffect(() => {
    if (!visible) return;

    const handleViewportChange = () => updatePlacement();
    window.addEventListener('resize', handleViewportChange);
    // Capture catches scrolling containers as well as document scrolling.
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [updatePlacement, visible]);

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    closeImmediate();
    onSelect(cell.date, event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      // Keep focus on the cell and suppress the card until focus/hover clears.
      event.preventDefault();
      event.stopPropagation();
      dismiss();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      closeImmediate();
      onSelect(cell.date, event);
    }
  };

  const statusLabel = REPORT_STATUS_LABELS[cell.primaryStatus];
  const dateFormatted = formatDate(cell.date, locale as SupportedLocale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const overdueReport = cell.primaryStatus === 'overdue'
    ? cell.reports.find((report) => report.status === 'overdue')
    : undefined;
  const overdueDays = overdueReport ? getOverdueDays(overdueReport.dueDate) : 0;
  const overdueSeverity = overdueReport ? getOverdueSeverity(overdueDays) : null;
  const severityLabel = overdueSeverity ? OVERDUE_SEVERITY_LABELS[overdueSeverity] : '';
  const ariaLabel = [
    `${dateFormatted}.`,
    cell.primaryStatus === 'overdue'
      ? `Report overdue. ${severityLabel}. ${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue.`
      : `${statusLabel}.`,
    cell.reports.length > 1 ? `${cell.reports.length} reports.` : '',
    cell.isSelected ? 'Selected.' : '',
  ].filter(Boolean).join(' ');
  const cellClass = [
    'rc-day-cell',
    !cell.inMonth && 'rc-day-cell--outside',
    cell.isToday && 'rc-day-cell--today',
    cell.isSelected && 'rc-day-cell--selected',
    cell.isRangeStart && 'rc-day-cell--range-start',
    cell.isRangeEnd && 'rc-day-cell--range-end',
    cell.isInRange && 'rc-day-cell--in-range',
    cell.primaryStatus !== 'none' && `rc-day-cell--${cell.primaryStatus}`,
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={anchorRef}
      role="gridcell"
      className={cellClass}
      tabIndex={isTabbable ? 0 : -1}
      aria-selected={cell.isSelected}
      aria-label={ariaLabel}
      aria-describedby={visible && cell.reports.length > 0 ? previewId : undefined}
      onClick={handleClick}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleHoverOpen}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      data-date={cell.date}
    >
      <span className="rc-day-number">{cell.day}</span>
      <StatusDot status={cell.primaryStatus} />
      {cell.primaryStatus === 'overdue' && overdueReport && (
        <OverdueBadge dueDate={overdueReport.dueDate} />
      )}
      {cell.reports.length > 1 && (
        <span className="rc-day-count" aria-hidden="true">
          {cell.reports.length}
        </span>
      )}

      {visible && cell.reports.length > 0 && (
        <DayCellPreview
          id={previewId}
          cell={cell}
          priorReports={priorReports}
          trendValues={trendValues}
          locale={locale}
          placement={placement}
        />
      )}
    </div>
  );
};

/* ─── Calendar Grid (WAI-ARIA Grid) ────────────────────────────────── */

interface CalendarGridComponentProps {
  days: DayCellData[];
  selectedDates: string[];
  focusedDate: string | undefined;
  weekStartsOn: number;
  onDateSelect: (date: string, e: MouseEvent | KeyboardEvent) => void;
  onFocusDate: (date: string) => void;
  locale: string;
  ariaLabel: string;
  /** All reports — used to look up prior-period data for hover previews */
  allReports: RevenueReport[];
}

const CalendarGridComponent: React.FC<CalendarGridComponentProps> = ({
  days,
  selectedDates,
  focusedDate,
  weekStartsOn,
  onDateSelect,
  onFocusDate,
  locale,
  ariaLabel,
  allReports,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const dayNames = useMemo(() => {
    const names: string[] = [];
    for (let i = 0; i < 7; i++) {
      const day = (weekStartsOn + i) % 7;
      const date = new Date(2024, 0, day + 7); // Use a known Sunday
      names.push(
        date.toLocaleDateString(locale as SupportedLocale, {
          weekday: "short",
        }),
      );
    }
    return names;
  }, [weekStartsOn, locale]);

  // Group days into rows of 7
  const rows: DayCellData[][] = useMemo(() => {
    const result: DayCellData[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  // Roving tabindex: a single cell is reachable with Tab. Focus then moves
  // within the grid using arrow keys.
  const activeDate = focusedDate
    ?? selectedDates[0]
    ?? days.find((cell) => cell.inMonth)?.date
    ?? days[0]?.date;

  // Focus the active cell when focusedDate changes
  useEffect(() => {
    if (focusedDate && gridRef.current) {
      const activeCell = gridRef.current.querySelector(
        `[data-date="${focusedDate}"]`,
      ) as HTMLElement | null;
      if (activeCell) {
        activeCell.focus({ preventScroll: true });
      }
    }
  }, [focusedDate]);

  const handleGridKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!focusedDate) return;
    const currentIndex = days.findIndex((d) => d.date === focusedDate);
    if (currentIndex === -1) return;

    let newIndex = currentIndex;
    const cols = 7;

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        newIndex = Math.min(currentIndex + 1, days.length - 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        newIndex = Math.max(currentIndex - 1, 0);
        break;
      case "ArrowDown":
        e.preventDefault();
        newIndex = Math.min(currentIndex + cols, days.length - 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        newIndex = Math.max(currentIndex - cols, 0);
        break;
      case 'Home': {
        e.preventDefault();
        // Move to first day of current week row
        const rowStart = Math.floor(currentIndex / cols) * cols;
        newIndex = rowStart;
        break;
      }
      case 'End': {
        e.preventDefault();
        // Move to last day of current week row
        const rowEnd = Math.min(
          Math.floor(currentIndex / cols) * cols + cols - 1,
          days.length - 1,
        );
        newIndex = rowEnd;
        break;
      }
      case 'PageUp': {
        e.preventDefault();
        // Move to same day in previous month
        const currentDay = days[currentIndex].day;
        const currentMonth = parseISODate(days[currentIndex].date).month;
        const currentYear = parseISODate(days[currentIndex].date).year;
        let prevMonth = currentMonth - 1;
        let prevYear = currentYear;
        if (prevMonth < 0) {
          prevMonth = 11;
          prevYear--;
        }
        const daysInPrev = getDaysInMonth(prevYear, prevMonth);
        const targetDay = Math.min(currentDay, daysInPrev);
        const targetDate = toISODate(prevYear, prevMonth, targetDay);
        const targetIndex = days.findIndex((d) => d.date === targetDate);
        if (targetIndex !== -1) {
          newIndex = targetIndex;
        }
        break;
      }
      case "PageDown": {
        e.preventDefault();
        // Move to same day in next month
        const curDay = days[currentIndex].day;
        const curMonth = parseISODate(days[currentIndex].date).month;
        const curYear = parseISODate(days[currentIndex].date).year;
        let nextMonth = curMonth + 1;
        let nextYear = curYear;
        if (nextMonth > 11) {
          nextMonth = 0;
          nextYear++;
        }
        const daysInNext = getDaysInMonth(nextYear, nextMonth);
        const tDay = Math.min(curDay, daysInNext);
        const tDate = toISODate(nextYear, nextMonth, tDay);
        const tIndex = days.findIndex((d) => d.date === tDate);
        if (tIndex !== -1) {
          newIndex = tIndex;
        }
        break;
      }
      default:
        return;
    }

    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < days.length) {
      onFocusDate(days[newIndex].date);
    }
  };

  return (
    <div
      ref={gridRef}
      className="rc-calendar-grid"
      role="grid"
      aria-label={ariaLabel}
      onKeyDown={handleGridKeyDown}
    >
      {/* Day name headers */}
      <div className="rc-grid-header" role="row">
        {dayNames.map((name, i) => (
          <div
            key={i}
            className="rc-grid-header-cell"
            role="columnheader"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Week rows */}
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="rc-grid-row" role="row">
          {row.map((cell) => {
            // Prior period: same day number one month back
            const { year: cy, month: cm, day: cd } = parseISODate(cell.date);
            const priorMonth = cm === 0 ? 11 : cm - 1;
            const priorYear = cm === 0 ? cy - 1 : cy;
            const priorDate = toISODate(priorYear, priorMonth, cd);
            const priorReports = allReports.filter((r) => r.date === priorDate);
            return (
              <CalendarDayCell
                key={cell.date}
                cell={cell}
                isTabbable={cell.date === activeDate}
                onSelect={onDateSelect}
                onFocus={onFocusDate}
                locale={locale}
                priorReports={priorReports}
                trendValues={getSparkTrendValues(allReports, cell.date)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

/* ─── Details Panel ────────────────────────────────────────────────── */

const DetailsPanel: React.FC<DetailsPanelProps> = ({
  selectedDate,
  reports,
  monthReports,
  viewMonth,
  locale,
  onSubmitReport,
  onReportAction,
  isOpen = true,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<"day" | "month">("day");

  const selectedReports = selectedDate
    ? reports.filter((r) => r.date === selectedDate)
    : [];

  const monthDueReports = monthReports.filter(
    (r) => r.status === "due" || r.status === "overdue",
  );
  const monthSubmittedReports = monthReports.filter(
    (r) => r.status === "submitted",
  );
  const monthAcceptedReports = monthReports.filter(
    (r) => r.status === "accepted",
  );

  const formatReportDate = (iso: string) =>
    formatDate(iso, locale as SupportedLocale, {
      month: "short",
      day: "numeric",
    });

  const formatDueDate = (iso: string) =>
    formatDate(iso, locale as SupportedLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const renderReportItem = (report: RevenueReport) => {
    const overdue = isOverdue(report);
    const displayStatus = overdue ? "overdue" : report.status;
    const statusColor = REPORT_STATUS_COLORS[displayStatus];
    const statusLabel = REPORT_STATUS_LABELS[displayStatus];

    return (
      <div key={report.id} className="rc-report-item">
        <div className="rc-report-item-header">
          <span
            className="rc-report-status-badge"
            style={{ backgroundColor: statusColor }}
            aria-label={statusLabel}
          />
          <span className="rc-report-status-label">{statusLabel}</span>
          <span className="rc-report-date">
            {formatReportDate(report.date)}
          </span>
        </div>
        <div className="rc-report-item-body">
          {report.grossRevenue !== undefined && (
            <p className="rc-report-revenue">
              {formatCurrency(
                report.grossRevenue,
                report.currency || "USD",
                locale as SupportedLocale,
              )}
            </p>
          )}
          {report.dueDate && (
            <p className="rc-report-due">
              <Clock size={12} aria-hidden="true" />
              Due: {formatDueDate(report.dueDate)}
            </p>
          )}
          {report.acceptedAt && (
            <p className="rc-report-accepted">
              <CheckCircle2 size={12} aria-hidden="true" />
              Accepted: {formatReportDate(report.acceptedAt)}
            </p>
          )}
          {report.notes && <p className="rc-report-notes">{report.notes}</p>}
        </div>
        <div className="rc-report-item-actions">
          {displayStatus === "due" && onSubmitReport && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onSubmitReport(report.date)}
              aria-label={`Submit report for ${formatReportDate(report.date)}`}
            >
              <Send size={14} aria-hidden="true" />
              Submit Report
            </Button>
          )}
          {displayStatus === "submitted" && (
            <span className="rc-report-awaiting">Awaiting review</span>
          )}
          {displayStatus === "accepted" && (
            <span className="rc-report-confirmed">Confirmed</span>
          )}
          {displayStatus === "overdue" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onSubmitReport?.(report.date)}
              aria-label={`Submit overdue report for ${formatReportDate(report.date)}`}
            >
              <AlertTriangle size={14} aria-hidden="true" />
              Submit Now
            </Button>
          )}
        </div>
      </div>
    );
  };

  const [monthLabel, yearStr] = viewMonth.split("-");
  const monthName = new Date(
    Number(yearStr),
    Number(monthLabel) - 1,
  ).toLocaleDateString(locale as SupportedLocale, {
    month: "long",
    year: "numeric",
  });

  return (
    <aside
      className={`rc-details-panel ${isOpen ? "rc-details-panel--open" : "rc-details-panel--closed"}`}
      aria-label="Report details panel"
    >
      {/* Mobile close button */}
      {onClose && (
        <button
          type="button"
          className="rc-details-close"
          onClick={onClose}
          aria-label="Close details panel"
        >
          <X size={18} aria-hidden="true" />
        </button>
      )}

      <div className="rc-details-header">
        <Calendar size={18} aria-hidden="true" />
        <h2 className="rc-details-title">{monthName}</h2>
      </div>

      {/* View mode toggle */}
      <div className="rc-details-toggle" role="tablist" aria-label="View mode">
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === "day"}
          className={`rc-details-tab ${viewMode === "day" ? "rc-details-tab--active" : ""}`}
          onClick={() => setViewMode("day")}
        >
          Day
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === "month"}
          className={`rc-details-tab ${viewMode === "month" ? "rc-details-tab--active" : ""}`}
          onClick={() => setViewMode("month")}
        >
          Month
        </button>
      </div>

      {viewMode === "day" ? (
        <div className="rc-details-content" role="tabpanel">
          {selectedDate ? (
            <>
              <h3 className="rc-details-day-title">
                {formatDate(selectedDate, locale as SupportedLocale, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h3>

              {selectedReports.length === 0 ? (
                <div className="rc-details-empty">
                  <p className="rc-details-empty-text">
                    No reports for this date.
                  </p>
                  {onSubmitReport && (
                    <Button
                      variant="primary"
                      onClick={() => onSubmitReport(selectedDate)}
                      className="rc-submit-cta"
                    >
                      <Send size={16} aria-hidden="true" />
                      Submit Report
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rc-details-reports">
                  {selectedReports.map(renderReportItem)}
                </div>
              )}
            </>
          ) : (
            <div className="rc-details-empty">
              <p className="rc-details-empty-text">
                Select a date to view report details.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="rc-details-content" role="tabpanel">
          {/* Month summary */}
          <div className="rc-month-summary">
            <div className="rc-month-stat">
              <span className="rc-month-stat-value">
                {monthDueReports.length}
              </span>
              <span className="rc-month-stat-label">Due / Overdue</span>
            </div>
            <div className="rc-month-stat">
              <span className="rc-month-stat-value">
                {monthSubmittedReports.length}
              </span>
              <span className="rc-month-stat-label">Submitted</span>
            </div>
            <div className="rc-month-stat">
              <span className="rc-month-stat-value">
                {monthAcceptedReports.length}
              </span>
              <span className="rc-month-stat-label">Accepted</span>
            </div>
          </div>

          {/* Quick submit CTA for month */}
          {monthDueReports.length > 0 && onSubmitReport && (
            <Button
              variant="primary"
              className="rc-submit-cta rc-submit-cta--month"
              onClick={() => {
                // Submit for the first due/overdue report
                const firstDue = monthDueReports[0];
                if (firstDue) onSubmitReport(firstDue.date);
              }}
            >
              <Send size={16} aria-hidden="true" />
              Submit {monthDueReports.length} Pending Report
              {monthDueReports.length > 1 ? "s" : ""}
            </Button>
          )}

          {/* Month report list */}
          {monthReports.length === 0 ? (
            <p className="rc-details-empty-text">
              No reports scheduled for this month.
            </p>
          ) : (
            <div className="rc-month-reports">
              {monthReports.map(renderReportItem)}
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

/* ─── Bulk Action Bar ──────────────────────────────────────────────── */

interface BulkActionBarProps {
  selectedDates: string[];
  reports: RevenueReport[];
  onClose: () => void;
  onExport: () => void;
  onNudge: () => void;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedDates,
  reports,
  onClose,
  onExport,
  onNudge,
}) => {
  if (selectedDates.length <= 1) return null;

  const selectedReports = reports.filter(r => selectedDates.includes(r.date));
  const canNudge = selectedReports.some(r => r.status === 'due' || r.status === 'overdue');

  return (
    <div className="rc-bulk-action-bar" role="toolbar" aria-label="Bulk actions">
      <div className="rc-bulk-info">
        <span className="rc-bulk-count">{selectedDates.length} period{selectedDates.length > 1 ? 's' : ''} selected</span>
      </div>
      <div className="rc-bulk-actions">
        <Button variant="secondary" size="sm" onClick={onExport} aria-label="Export selected reports">
          <Download size={16} aria-hidden="true" /> Export
        </Button>
        <Button 
          variant="primary" 
          size="sm" 
          onClick={onNudge} 
          disabled={!canNudge}
          aria-label={canNudge ? "Nudge owners for due/overdue reports" : "No due/overdue reports to nudge"}
        >
          <Bell size={16} aria-hidden="true" /> Nudge Owners
        </Button>
        <button type="button" className="rc-bulk-close" onClick={onClose} aria-label="Clear selection">
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

/* ─── Main Component ───────────────────────────────────────────────── */

export const RevenueReportingCalendar: React.FC<
  RevenueReportingCalendarProps
> = ({
  reports,
  selectedDate: controlledSelectedDate,
  selectedDates: controlledSelectedDates,
  viewMonth: controlledViewMonth,
  isLoading = false,
  error = null,
  locale = "en-US",
  weekStartsOn = 0, // Sunday by default
  onDateSelect,
  onDatesSelect,
  onMonthChange,
  onSubmitReport,
  onReportAction,
  className = "",
}) => {
  // Start at the first supplied reporting month; fall back to the current month
  // only when no reporting data is available.
  const today = new Date();
  const todayMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const defaultMonth = reports[0]?.date.slice(0, 7) || todayMonth;

  const [internalViewMonth, setInternalViewMonth] = useState(defaultMonth);
  
  // Initialize from controlled props, favoring the array prop if present
  const defaultSelectedDates = controlledSelectedDates 
    ? controlledSelectedDates 
    : controlledSelectedDate 
      ? [controlledSelectedDate] 
      : [];
      
  const [internalSelectedDates, setInternalSelectedDates] = useState<string[]>(defaultSelectedDates);
  const [lastSelectedDate, setLastSelectedDate] = useState<string | undefined>(
    defaultSelectedDates[defaultSelectedDates.length - 1]
  );
  const [focusedDate, setFocusedDate] = useState<string | undefined>(undefined);
  const [panelOpen, setPanelOpen] = useState(true);
  const [mobileView, setMobileView] = useState<"calendar" | "agenda">("agenda");
  const [showImportWizard, setShowImportWizard] = useState(false);

  const viewMonth = controlledViewMonth ?? internalViewMonth;
  const selectedDates = controlledSelectedDates ?? internalSelectedDates;
  
  // For backwards compatibility and single-date details panel
  const selectedDate = selectedDates.length === 1 ? selectedDates[0] : undefined;

  const [viewYear, viewMonthNum] = useMemo(() => {
    const [y, m] = viewMonth.split("-").map(Number);
    return [y, m - 1];
  }, [viewMonth]);

  // Build day cells
  const dayCells = useMemo(
    () =>
      buildDayCells(
        viewYear,
        viewMonthNum,
        reports,
        selectedDates,
        weekStartsOn,
      ),
    [viewYear, viewMonthNum, reports, selectedDates, weekStartsOn],
  );

  // Month reports
  const monthReports = useMemo(
    () => getMonthReports(reports, viewYear, viewMonthNum),
    [reports, viewYear, viewMonthNum],
  );

  // Navigation handlers
  const goToPrevMonth = useCallback(() => {
    let newMonth = viewMonthNum - 1;
    let newYear = viewYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    const newMonthStr = `${newYear}-${String(newMonth + 1).padStart(2, "0")}`;
    setInternalViewMonth(newMonthStr);
    onMonthChange?.(newMonthStr);
  }, [viewMonthNum, viewYear, onMonthChange]);

  const goToNextMonth = useCallback(() => {
    let newMonth = viewMonthNum + 1;
    let newYear = viewYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    const newMonthStr = `${newYear}-${String(newMonth + 1).padStart(2, "0")}`;
    setInternalViewMonth(newMonthStr);
    onMonthChange?.(newMonthStr);
  }, [viewMonthNum, viewYear, onMonthChange]);

  const handleDateSelect = useCallback(
    (date: string, e?: MouseEvent | KeyboardEvent) => {
      let newSelection: string[] = [];
      
      if (e?.shiftKey && lastSelectedDate) {
        // Range selection
        const start = new Date(lastSelectedDate).getTime();
        const end = new Date(date).getTime();
        const minDate = new Date(Math.min(start, end));
        const maxDate = new Date(Math.max(start, end));
        
        // Include all dates in the range
        const range: string[] = [];
        let curr = new Date(minDate);
        while (curr <= maxDate) {
          range.push(curr.toISOString().split('T')[0]);
          curr.setDate(curr.getDate() + 1);
        }
        
        // Merge with existing if ctrl/cmd is held, otherwise replace
        if (e.ctrlKey || e.metaKey) {
          newSelection = Array.from(new Set([...selectedDates, ...range]));
        } else {
          newSelection = range;
        }
      } else if (e?.ctrlKey || e?.metaKey) {
        // Toggle selection
        if (selectedDates.includes(date)) {
          newSelection = selectedDates.filter(d => d !== date);
        } else {
          newSelection = [...selectedDates, date];
        }
      } else {
        // Single selection
        newSelection = [date];
      }

      setInternalSelectedDates(newSelection);
      setLastSelectedDate(date);
      
      onDateSelect?.(date);
      onDatesSelect?.(newSelection);
      
      // Open panel on mobile when date is selected and it's a single selection
      if (newSelection.length === 1) {
        setPanelOpen(true);
      }
    },
    [onDateSelect, onDatesSelect, selectedDates, lastSelectedDate],
  );

  const handleFocusDate = useCallback((date: string) => {
    setFocusedDate(date);
  }, []);

  const handleSubmitReport = useCallback(
    (date: string) => {
      onSubmitReport?.(date);
    },
    [onSubmitReport],
  );

  const handleReportAction = useCallback(
    (reportId: string, action: string) => {
      onReportAction?.(reportId, action);
    },
    [onReportAction],
  );

  // Month label
  const monthName = new Date(viewYear, viewMonthNum).toLocaleDateString(
    locale as SupportedLocale,
    { month: "long", year: "numeric" },
  );

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`rc-container ${className}`}
        aria-busy="true"
        aria-label="Loading calendar"
      >
        <div className="rc-loading">
          <div className="rc-loading-spinner" aria-hidden="true" />
          <p className="rc-loading-text">Loading reports…</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`rc-container ${className}`} role="alert">
        <div className="rc-error">
          <AlertTriangle size={24} aria-hidden="true" />
          <p className="rc-error-text">{error}</p>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rc-container ${className}`}>
      {/* Mobile panel toggle */}
      <button
        type="button"
        className="rc-mobile-toggle"
        onClick={() => setPanelOpen((prev) => !prev)}
        aria-expanded={panelOpen}
        aria-controls="rc-details-panel"
        aria-label={panelOpen ? "Hide details panel" : "Show details panel"}
      >
        <Menu size={18} aria-hidden="true" />
        {panelOpen ? "Hide Details" : "Show Details"}
      </button>

      <div className="rc-layout">
        {/* Calendar section */}
        <section
          className="rc-calendar-section"
          aria-label="Revenue reporting calendar"
        >
          {/* Month navigation */}
          <div className="rc-month-nav">
            <button
              type="button"
              className="rc-nav-btn"
              onClick={goToPrevMonth}
              aria-label={`Previous month: ${new Date(viewYear, viewMonthNum - 1).toLocaleDateString(locale as SupportedLocale, { month: "long", year: "numeric" })}`}
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <h2 className="rc-month-title">{monthName}</h2>
            <button
              type="button"
              className="rc-nav-btn"
              onClick={goToNextMonth}
              aria-label={`Next month: ${new Date(viewYear, viewMonthNum + 1).toLocaleDateString(locale as SupportedLocale, { month: "long", year: "numeric" })}`}
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
          
          <div className="rc-actions" style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 var(--spacing-6) var(--spacing-4)' }}>
            <Button variant="secondary" onClick={() => setShowImportWizard(true)} aria-label="Import historical revenue from CSV">
              <Upload size={16} aria-hidden="true" />
              Import CSV
            </Button>
          </div>

          {/* Mobile view toggle (calendar/agenda */}
          <div
            className="rc-view-toggle"
            role="tablist"
            aria-label="Calendar view mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobileView === "calendar"}
              className={`rc-view-toggle-btn ${mobileView === "calendar" ? "rc-view-toggle-btn--active" : ""}`}
              onClick={() => setMobileView("calendar")}
              aria-label="Calendar view"
            >
              <Calendar size={16} aria-hidden="true" />
              <span>Calendar</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileView === "agenda"}
              className={`rc-view-toggle-btn ${mobileView === "agenda" ? "rc-view-toggle-btn--active" : ""}`}
              onClick={() => setMobileView("agenda")}
              aria-label="Agenda view"
            >
              <List size={16} aria-hidden="true" />
              <span>Agenda</span>
            </button>
          </div>

          {/* Legend */}
          <div
            className={`rc-legend ${mobileView === "agenda" ? "rc-legend--hidden-on-agenda" : ""}`}
            aria-label="Status legend"
          >
            <span className="rc-legend-item">
              <span
                className="rc-legend-dot"
                style={{ backgroundColor: "var(--rc-status-due)" }}
                aria-hidden="true"
              />
              Due
            </span>
            <span className="rc-legend-item">
              <span
                className="rc-legend-dot"
                style={{ backgroundColor: "var(--rc-status-submitted)" }}
                aria-hidden="true"
              />
              Submitted
            </span>
            <span className="rc-legend-item">
              <span
                className="rc-legend-dot"
                style={{ backgroundColor: "var(--rc-status-accepted)" }}
                aria-hidden="true"
              />
              Accepted
            </span>
            <span className="rc-legend-item">
              <span className="rc-legend-dot" style={{ backgroundColor: 'var(--rc-overdue-mild)' }} aria-hidden="true" />
              Overdue (1–3 days)
            </span>
            <span className="rc-legend-item">
              <span className="rc-legend-dot" style={{ backgroundColor: 'var(--rc-overdue-moderate)' }} aria-hidden="true" />
              Overdue (4–29 days)
            </span>
            <span className="rc-legend-item">
              <span className="rc-legend-dot" style={{ backgroundColor: 'var(--rc-overdue-critical)' }} aria-hidden="true" />
              Overdue (30+ days)
            </span>
          </div>

          {/* Calendar grid (shown on desktop, or when mobile view is calendar */}
          <div
            className={`rc-calendar-wrapper ${mobileView === "agenda" ? "rc-calendar-wrapper--hidden-on-agenda" : ""}`}
          >
            <CalendarGridComponent
              days={dayCells}
              selectedDates={selectedDates}
              focusedDate={focusedDate}
              weekStartsOn={weekStartsOn}
              onDateSelect={handleDateSelect}
              onFocusDate={handleFocusDate}
              locale={locale}
              allReports={reports}
              ariaLabel={`Revenue reporting calendar for ${monthName}. Use arrow keys to navigate, Home and End for row edges, Page Up and Page Down for month navigation, Enter or Space to select.`}
            />
          </div>

          {/* Agenda view (shown when mobile view is agenda) */}
          <div
            className={`rc-agenda-wrapper ${mobileView === "calendar" ? "rc-agenda-wrapper--hidden-on-calendar" : ""}`}
          >
            <AgendaView
              reports={reports}
              selectedDate={selectedDate}
              locale={locale}
              onSelect={handleDateSelect}
              onSubmitReport={handleSubmitReport}
              viewMonth={viewMonth}
            />
          </div>
        </section>

        {/* Details panel */}
        <div id="rc-details-panel" className="rc-details-wrapper">
          <DetailsPanel
            selectedDate={selectedDate}
            reports={reports}
            monthReports={monthReports}
            viewMonth={viewMonth}
            locale={locale}
            onSubmitReport={handleSubmitReport}
            onReportAction={handleReportAction}
            isOpen={panelOpen}
            onClose={() => setPanelOpen(false)}
          />
        </div>
      </div>
      
      {/* Import Wizard Modal */}
      {showImportWizard && (
        <div className="rc-modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'var(--color-overlay, rgba(0, 0, 0, 0.5))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: 'var(--spacing-4)'
        }}>
          <RevenueCalendarCsvImport 
            onCancel={() => setShowImportWizard(false)}
            onImport={(rows) => {
              console.log('Imported rows:', rows);
              setShowImportWizard(false);
              // Handle import logic here
            }}
          />
        </div>
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedDates={selectedDates}
        reports={reports}
        onClose={() => {
          setInternalSelectedDates([]);
          setLastSelectedDate(undefined);
          onDatesSelect?.([]);
        }}
        onExport={() => {
          console.log('Export selected:', selectedDates);
          // Trigger actual export
        }}
        onNudge={() => {
          console.log('Nudging owners for:', selectedDates);
          // Trigger actual nudge
        }}
      />
    </div>
  );
};

export default RevenueReportingCalendar;
