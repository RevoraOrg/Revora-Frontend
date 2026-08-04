/**
 * Revenue Calendar mobile agenda view — Issue #428
 *
 * Scrollable agenda rows with sticky month headers, status pills,
 * issuer names, and swipe-to-close / swipe-to-nudge actions.
 */

import React, {
  useMemo,
  useRef,
  useState,
  useCallback,
  KeyboardEvent,
  TouchEvent,
} from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  ChevronRight,
  XCircle,
  Bell,
} from "lucide-react";
import {
  formatDate,
  formatCurrency,
  SupportedLocale,
} from "../constants/i18n";
import { Button } from "./Button";
import {
  RevenueReport,
  ReportStatus,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_COLORS,
} from "./RevenueReportingCalendar.types";

function parseISODate(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isOverdue(report: RevenueReport): boolean {
  if (report.status === "accepted" || report.status === "submitted") return false;
  return new Date(report.dueDate) < new Date();
}

/* ─── Status Pill ──────────────────────────────────────────────────── */

interface StatusPillProps {
  status: ReportStatus;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status }) => {
  if (status === "none") return null;
  const color = REPORT_STATUS_COLORS[status];
  const label = REPORT_STATUS_LABELS[status];
  return (
    <span
      className={`rc-status-pill rc-status-pill--${status}`}
      style={{ "--rc-status-pill-color": color } as React.CSSProperties}
      role="status"
      aria-label={label}
    >
      {label}
    </span>
  );
};

/* ─── Swipeable Agenda Row ─────────────────────────────────────────── */

const SWIPE_THRESHOLD = 72;

interface AgendaRowProps {
  report: RevenueReport;
  effectiveStatus: ReportStatus;
  isSelected: boolean;
  locale: string;
  onSelect: (date: string) => void;
  onSubmitReport?: (date: string) => void;
  onSwipeClose?: (report: RevenueReport) => void;
  onSwipeNudge?: (report: RevenueReport) => void;
}

const AgendaRow: React.FC<AgendaRowProps> = ({
  report,
  effectiveStatus,
  isSelected,
  locale,
  onSelect,
  onSubmitReport,
  onSwipeClose,
  onSwipeNudge,
}) => {
  const startX = useRef<number | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [confirmAction, setConfirmAction] = useState<"close" | "nudge" | null>(
    null,
  );

  const formatLong = (iso: string) =>
    formatDate(iso, locale as SupportedLocale, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const formatDue = (iso: string) =>
    formatDate(iso, locale as SupportedLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const canAct = effectiveStatus === "due" || effectiveStatus === "overdue";
  const issuer = report.issuer?.trim() || "Unassigned issuer";

  const rowLabel = [
    formatLong(report.date),
    issuer,
    REPORT_STATUS_LABELS[effectiveStatus],
    report.grossRevenue !== undefined
      ? formatCurrency(
          report.grossRevenue,
          report.currency || "USD",
          locale as SupportedLocale,
        )
      : null,
    isSelected ? "selected" : null,
  ]
    .filter(Boolean)
    .join(" — ");

  const resetSwipe = useCallback(() => {
    setOffsetX(0);
    startX.current = null;
  }, []);

  const handleTouchStart = (e: TouchEvent) => {
    if (!canAct) return;
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (startX.current === null || !canAct) return;
    const delta = e.touches[0].clientX - startX.current;
    // Reveal actions on swipe left (negative), mirror on RTL via CSS
    setOffsetX(Math.max(-160, Math.min(0, delta)));
  };

  const handleTouchEnd = () => {
    if (startX.current === null) return;
    if (offsetX <= -SWIPE_THRESHOLD) {
      setOffsetX(-144);
    } else {
      resetSwipe();
    }
    startX.current = null;
  };

  const requestClose = () => {
    setConfirmAction("close");
  };

  const requestNudge = () => {
    setConfirmAction("nudge");
  };

  const confirm = () => {
    if (confirmAction === "close") onSwipeClose?.(report);
    if (confirmAction === "nudge") onSwipeNudge?.(report);
    setConfirmAction(null);
    resetSwipe();
  };

  return (
    <li role="listitem" className="rc-agenda-listitem">
      <div className="rc-agenda-swipe-shell">
        {canAct && (
          <div className="rc-agenda-swipe-actions" aria-hidden={offsetX === 0}>
            <button
              type="button"
              className="rc-agenda-swipe-btn rc-agenda-swipe-btn--nudge"
              onClick={requestNudge}
              tabIndex={offsetX <= -SWIPE_THRESHOLD ? 0 : -1}
              aria-label={`Nudge owner for ${formatLong(report.date)}`}
            >
              <Bell size={16} aria-hidden="true" />
              Nudge
            </button>
            <button
              type="button"
              className="rc-agenda-swipe-btn rc-agenda-swipe-btn--close"
              onClick={requestClose}
              tabIndex={offsetX <= -SWIPE_THRESHOLD ? 0 : -1}
              aria-label={`Close period for ${formatLong(report.date)}`}
            >
              <XCircle size={16} aria-hidden="true" />
              Close
            </button>
          </div>
        )}

        <button
          type="button"
          className={`rc-agenda-row ${isSelected ? "rc-agenda-row--selected" : ""} rc-agenda-row--${effectiveStatus}`}
          style={canAct ? { transform: `translateX(${offsetX}px)` } : undefined}
          onClick={() => onSelect(report.date)}
          onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(report.date);
            }
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={resetSwipe}
          aria-label={rowLabel}
          aria-pressed={isSelected}
        >
          <div className="rc-agenda-row-date" aria-hidden="true">
            <span className="rc-agenda-row-weekday">
              {formatDate(report.date, locale as SupportedLocale, {
                weekday: "short",
              })}
            </span>
            <span className="rc-agenda-row-day">{parseISODate(report.date).day}</span>
          </div>
          <div className="rc-agenda-row-body">
            <div className="rc-agenda-row-header">
              <StatusPill status={effectiveStatus} />
              {report.dueDate && (
                <span className="rc-agenda-row-duedate">
                  <Clock size={12} aria-hidden="true" />
                  Due {formatDue(report.dueDate)}
                </span>
              )}
            </div>
            <div className="rc-agenda-row-issuer" title={issuer}>
              {issuer}
            </div>
            <div className="rc-agenda-row-meta">
              {report.grossRevenue !== undefined && (
                <span className="rc-agenda-row-revenue">
                  {formatCurrency(
                    report.grossRevenue,
                    report.currency || "USD",
                    locale as SupportedLocale,
                  )}
                </span>
              )}
              {report.submittedAt && (
                <span className="rc-agenda-row-submitted">
                  <CheckCircle2 size={12} aria-hidden="true" />
                  Submitted {formatLong(report.submittedAt)}
                </span>
              )}
              {report.acceptedAt && (
                <span className="rc-agenda-row-accepted">
                  <CheckCircle2 size={12} aria-hidden="true" />
                  Accepted {formatLong(report.acceptedAt)}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="rc-agenda-row-chevron" size={18} aria-hidden="true" />
        </button>
      </div>

      {confirmAction && (
        <div
          className="rc-agenda-confirm"
          role="alertdialog"
          aria-labelledby={`rc-agenda-confirm-title-${report.id}`}
          aria-describedby={`rc-agenda-confirm-desc-${report.id}`}
        >
          <p id={`rc-agenda-confirm-title-${report.id}`} className="rc-agenda-confirm-title">
            {confirmAction === "close" ? "Close this period?" : "Nudge the owner?"}
          </p>
          <p id={`rc-agenda-confirm-desc-${report.id}`} className="rc-agenda-confirm-desc">
            {confirmAction === "close"
              ? `Mark ${formatLong(report.date)} as closed. You can undo from the banner.`
              : `Send a reminder for ${formatLong(report.date)} to ${issuer}.`}
          </p>
          <div className="rc-agenda-confirm-actions">
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirm}>
              {confirmAction === "close" ? "Close period" : "Send nudge"}
            </Button>
          </div>
        </div>
      )}

      {canAct && onSubmitReport && (
        <div className="rc-agenda-row-cta">
          <Button
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              onSubmitReport(report.date);
            }}
            aria-label={`Submit ${effectiveStatus} report for ${formatLong(report.date)}`}
          >
            {effectiveStatus === "overdue" ? (
              <>
                <AlertTriangle size={14} aria-hidden="true" />
                Submit Now
              </>
            ) : (
              <>
                <Send size={14} aria-hidden="true" />
                Submit Report
              </>
            )}
          </Button>
        </div>
      )}
    </li>
  );
};

/* ─── Agenda View ──────────────────────────────────────────────────── */

export interface AgendaViewProps {
  reports: RevenueReport[];
  selectedDate: string | undefined;
  locale: string;
  onSelect: (date: string) => void;
  onSubmitReport?: (date: string) => void;
  viewMonth: string;
  /** When true, group by month across a wider window; otherwise current month by status */
  groupByMonth?: boolean;
  onSwipeClose?: (report: RevenueReport) => void;
  onSwipeNudge?: (report: RevenueReport) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  reports,
  selectedDate,
  locale,
  onSelect,
  onSubmitReport,
  viewMonth,
  groupByMonth = true,
  onSwipeClose,
  onSwipeNudge,
}) => {
  const [viewYear, viewMonthNum] = useMemo(() => {
    const [y, m] = viewMonth.split("-").map(Number);
    return [y, m - 1];
  }, [viewMonth]);

  const todayISO = toISODate(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  );

  type AgendaItem = { report: RevenueReport; effectiveStatus: ReportStatus };

  const monthGroups = useMemo(() => {
    // Include surrounding months so sticky headers are useful on mobile
    const windowReports = reports
      .filter((r) => {
        const d = parseISODate(r.date);
        const monthDiff = (d.year - viewYear) * 12 + (d.month - viewMonthNum);
        return monthDiff >= -1 && monthDiff <= 2;
      })
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));

    const byMonth = new Map<string, AgendaItem[]>();
    for (const r of windowReports) {
      const d = parseISODate(r.date);
      const key = `${d.year}-${String(d.month + 1).padStart(2, "0")}`;
      const effectiveStatus: ReportStatus = isOverdue(r) ? "overdue" : r.status;
      const list = byMonth.get(key) ?? [];
      list.push({ report: r, effectiveStatus });
      byMonth.set(key, list);
    }

    return Array.from(byMonth.entries()).map(([key, items]) => {
      const [y, m] = key.split("-").map(Number);
      const title = new Date(y, m - 1).toLocaleDateString(locale as SupportedLocale, {
        month: "long",
        year: "numeric",
      });
      return { key, title, items };
    });
  }, [reports, viewYear, viewMonthNum, locale]);

  const statusGroups = useMemo(() => {
    const monthReports = reports.filter((r) => {
      const d = parseISODate(r.date);
      return d.year === viewYear && d.month === viewMonthNum;
    });

    const buckets: Record<string, AgendaItem[]> = {
      overdue: [],
      due: [],
      submitted: [],
      accepted: [],
    };

    for (const r of monthReports) {
      const effectiveStatus: ReportStatus = isOverdue(r) ? "overdue" : r.status;
      if (effectiveStatus === "none") continue;
      buckets[effectiveStatus]?.push({ report: r, effectiveStatus });
    }

    buckets.overdue.sort((a, b) => a.report.date.localeCompare(b.report.date));
    buckets.due.sort((a, b) => a.report.date.localeCompare(b.report.date));
    buckets.submitted.sort((a, b) => b.report.date.localeCompare(a.report.date));
    buckets.accepted.sort((a, b) => b.report.date.localeCompare(a.report.date));

    const titles: Record<string, string> = {
      overdue: "Overdue",
      due: "Upcoming",
      submitted: "Submitted",
      accepted: "Accepted",
    };

    return (["overdue", "due", "submitted", "accepted"] as const)
      .filter((k) => buckets[k].length > 0)
      .map((k) => ({ key: k, title: titles[k], items: buckets[k] }));
  }, [reports, viewYear, viewMonthNum]);

  const agendaGroups = groupByMonth ? monthGroups : statusGroups;
  const totalReports = agendaGroups.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <div className="rc-agenda-view" role="list" aria-label="Revenue report agenda">
      {totalReports === 0 ? (
        <div className="rc-agenda-empty">
          <Calendar size={32} aria-hidden="true" />
          <p className="rc-agenda-empty-text">No reports scheduled for this month.</p>
          {onSubmitReport && (
            <Button variant="primary" onClick={() => onSubmitReport(todayISO)}>
              <Send size={14} aria-hidden="true" />
              Submit Report Today
            </Button>
          )}
        </div>
      ) : (
        agendaGroups.map((group) => (
          <section
            key={group.key}
            className={`rc-agenda-group rc-agenda-group--${group.key.startsWith("20") ? "month" : group.key}`}
            aria-labelledby={`rc-agenda-group-${group.key}`}
          >
            <h3
              id={`rc-agenda-group-${group.key}`}
              className="rc-agenda-group-title rc-agenda-group-title--sticky"
            >
              {group.title}
              <span className="rc-agenda-group-count">{group.items.length}</span>
            </h3>
            <ul className="rc-agenda-list" role="list">
              {group.items.map(({ report, effectiveStatus }) => (
                <AgendaRow
                  key={report.id}
                  report={report}
                  effectiveStatus={effectiveStatus}
                  isSelected={selectedDate === report.date}
                  locale={locale}
                  onSelect={onSelect}
                  onSubmitReport={onSubmitReport}
                  onSwipeClose={onSwipeClose}
                  onSwipeNudge={onSwipeNudge}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
};

export default AgendaView;
