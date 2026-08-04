/**
 * Revenue Calendar period views — Issues #424
 *
 * Month tiles (year overview) and quarter tiles with keyboard navigation
 * and drill-down back to month view. Used by RevenueReportingCalendar.
 */

import React, { useState, useMemo, useEffect, useRef, KeyboardEvent } from "react";
import {
  ReportStatus,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_COLORS,
  RevenueReport,
} from "./RevenueReportingCalendar.types";
import { SupportedLocale } from "../constants/i18n";

function parseISODate(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

/** Aggregate status for all reports in a given year+month */
export function getMonthStatus(
  reports: RevenueReport[],
  year: number,
  month: number,
): ReportStatus {
  const monthReports = reports.filter((r) => {
    const d = parseISODate(r.date);
    return d.year === year && d.month === month;
  });
  if (monthReports.length === 0) return "none";
  if (monthReports.some((r) => r.status === "overdue")) return "overdue";
  if (monthReports.some((r) => r.status === "due")) return "due";
  if (monthReports.some((r) => r.status === "submitted")) return "submitted";
  return "accepted";
}

function getQuarterStatus(
  reports: RevenueReport[],
  year: number,
  quarter: number,
): ReportStatus {
  const start = quarter * 3;
  const statuses = [0, 1, 2].map((i) => getMonthStatus(reports, year, start + i));
  if (statuses.some((s) => s === "overdue")) return "overdue";
  if (statuses.some((s) => s === "due")) return "due";
  if (statuses.some((s) => s === "submitted")) return "submitted";
  if (statuses.every((s) => s === "none")) return "none";
  return "accepted";
}

/* ─── Month Tile ───────────────────────────────────────────────────── */

interface MonthTileProps {
  year: number;
  month: number;
  status: ReportStatus;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isFocused: boolean;
  locale: string;
  onClick: (year: number, month: number) => void;
  onFocus: (month: number) => void;
  reportCount: number;
}

const MonthTile: React.FC<MonthTileProps> = ({
  year,
  month,
  status,
  isCurrentMonth,
  isSelected,
  isFocused,
  locale,
  onClick,
  onFocus,
  reportCount,
}) => {
  const monthName = new Date(year, month).toLocaleDateString(locale as SupportedLocale, {
    month: "short",
  });
  const fullMonthName = new Date(year, month).toLocaleDateString(locale as SupportedLocale, {
    month: "long",
    year: "numeric",
  });

  const statusColor = status !== "none" ? REPORT_STATUS_COLORS[status] : undefined;
  const statusLabel = REPORT_STATUS_LABELS[status];

  const ariaLabel = [
    fullMonthName,
    statusLabel !== "No report" ? `Status: ${statusLabel}.` : "No reports.",
    reportCount > 0 ? `${reportCount} report${reportCount !== 1 ? "s" : ""}.` : "",
    isCurrentMonth ? "Current month." : "",
    isSelected ? "Selected." : "",
  ]
    .filter(Boolean)
    .join(" ");

  const tileClass = [
    "rc-year-month-tile",
    isCurrentMonth && "rc-year-month-tile--current",
    isSelected && "rc-year-month-tile--selected",
    status !== "none" && `rc-year-month-tile--${status}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={tileClass}
      tabIndex={isFocused ? 0 : -1}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      data-month={month}
      onClick={() => onClick(year, month)}
      onFocus={() => onFocus(month)}
    >
      <span className="rc-year-month-name">{monthName}</span>
      {status !== "none" ? (
        <span
          className="rc-year-month-glyph"
          style={{ backgroundColor: statusColor }}
          aria-hidden="true"
          title={statusLabel}
        />
      ) : (
        <span className="rc-year-month-glyph rc-year-month-glyph--empty" aria-hidden="true" />
      )}
      {reportCount > 0 && (
        <span className="rc-year-month-count" aria-hidden="true">
          {reportCount}
        </span>
      )}
    </button>
  );
};

/* ─── Year Grid View ───────────────────────────────────────────────── */

export interface YearGridViewProps {
  year: number;
  reports: RevenueReport[];
  selectedDate: string | undefined;
  locale: string;
  onMonthSelect: (year: number, month: number) => void;
}

export const YearGridView: React.FC<YearGridViewProps> = ({
  year,
  reports,
  selectedDate,
  locale,
  onMonthSelect,
}) => {
  const today = new Date();
  const selectedMonth = selectedDate ? parseISODate(selectedDate).month : undefined;
  const selectedYear = selectedDate ? parseISODate(selectedDate).year : undefined;

  const [focusedMonth, setFocusedMonth] = useState<number>(() => {
    if (selectedYear === year && selectedMonth !== undefined) return selectedMonth;
    if (today.getFullYear() === year) return today.getMonth();
    return 0;
  });

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gridRef.current) {
      const tile = gridRef.current.querySelector(
        `[data-month="${focusedMonth}"]`,
      ) as HTMLElement | null;
      if (tile && document.activeElement !== tile) {
        tile.focus({ preventScroll: true });
      }
    }
  }, [focusedMonth]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const cols = 3;
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        setFocusedMonth((m) => Math.min(m + 1, 11));
        break;
      case "ArrowLeft":
        e.preventDefault();
        setFocusedMonth((m) => Math.max(m - 1, 0));
        break;
      case "ArrowDown":
        e.preventDefault();
        setFocusedMonth((m) => Math.min(m + cols, 11));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedMonth((m) => Math.max(m - cols, 0));
        break;
      case "Home":
        e.preventDefault();
        setFocusedMonth((m) => Math.floor(m / cols) * cols);
        break;
      case "End":
        e.preventDefault();
        setFocusedMonth((m) => Math.min(Math.floor(m / cols) * cols + cols - 1, 11));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        onMonthSelect(year, focusedMonth);
        break;
      default:
        break;
    }
  };

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const monthReports = reports.filter((r) => {
          const d = parseISODate(r.date);
          return d.year === year && d.month === i;
        });
        return {
          month: i,
          status: getMonthStatus(reports, year, i),
          reportCount: monthReports.length,
        };
      }),
    [reports, year],
  );

  return (
    <div
      ref={gridRef}
      className="rc-year-grid"
      role="grid"
      aria-label={`Year overview for ${year}. Use arrow keys to navigate months, Enter or Space to drill down.`}
      onKeyDown={handleKeyDown}
    >
      {[0, 1, 2, 3].map((rowIdx) => (
        <div key={rowIdx} className="rc-year-grid-row" role="row">
          {[0, 1, 2].map((colIdx) => {
            const m = rowIdx * 3 + colIdx;
            const item = months[m];
            const isCurrentMonth = today.getFullYear() === year && today.getMonth() === m;
            const isSelected = selectedYear === year && selectedMonth === m;
            return (
              <div key={m} role="gridcell">
                <MonthTile
                  year={year}
                  month={item.month}
                  status={item.status}
                  isCurrentMonth={isCurrentMonth}
                  isSelected={isSelected}
                  isFocused={focusedMonth === m}
                  locale={locale}
                  onClick={onMonthSelect}
                  onFocus={setFocusedMonth}
                  reportCount={item.reportCount}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/* ─── Quarter Grid View ────────────────────────────────────────────── */

interface QuarterTileProps {
  year: number;
  quarter: number;
  status: ReportStatus;
  isCurrent: boolean;
  isSelected: boolean;
  isFocused: boolean;
  locale: string;
  reportCount: number;
  monthStatuses: ReportStatus[];
  onClick: (year: number, quarter: number) => void;
  onFocus: (quarter: number) => void;
}

const QuarterTile: React.FC<QuarterTileProps> = ({
  year,
  quarter,
  status,
  isCurrent,
  isSelected,
  isFocused,
  locale,
  reportCount,
  monthStatuses,
  onClick,
  onFocus,
}) => {
  const label = `Q${quarter + 1} ${year}`;
  const monthNames = [0, 1, 2].map((i) =>
    new Date(year, quarter * 3 + i).toLocaleDateString(locale as SupportedLocale, {
      month: "short",
    }),
  );
  const statusLabel = REPORT_STATUS_LABELS[status];
  const ariaLabel = [
    label,
    statusLabel !== "No report" ? `Status: ${statusLabel}.` : "No reports.",
    reportCount > 0 ? `${reportCount} report${reportCount !== 1 ? "s" : ""}.` : "",
    isCurrent ? "Current quarter." : "",
    isSelected ? "Selected." : "",
  ]
    .filter(Boolean)
    .join(" ");

  const tileClass = [
    "rc-quarter-tile",
    isCurrent && "rc-quarter-tile--current",
    isSelected && "rc-quarter-tile--selected",
    status !== "none" && `rc-quarter-tile--${status}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={tileClass}
      tabIndex={isFocused ? 0 : -1}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      data-quarter={quarter}
      onClick={() => onClick(year, quarter)}
      onFocus={() => onFocus(quarter)}
    >
      <span className="rc-quarter-label">{label}</span>
      <span className="rc-quarter-months" aria-hidden="true">
        {monthNames.map((name, i) => (
          <span key={name} className="rc-quarter-month-chip">
            <span
              className={`rc-year-month-glyph${
                monthStatuses[i] === "none" ? " rc-year-month-glyph--empty" : ""
              }`}
              style={
                monthStatuses[i] !== "none"
                  ? { backgroundColor: REPORT_STATUS_COLORS[monthStatuses[i]] }
                  : undefined
              }
            />
            {name}
          </span>
        ))}
      </span>
      {reportCount > 0 && (
        <span className="rc-year-month-count" aria-hidden="true">
          {reportCount}
        </span>
      )}
    </button>
  );
};

export interface QuarterGridViewProps {
  year: number;
  reports: RevenueReport[];
  selectedDate: string | undefined;
  locale: string;
  /** Drill into the first month of the quarter (or current month if in that quarter) */
  onQuarterSelect: (year: number, month: number) => void;
}

export const QuarterGridView: React.FC<QuarterGridViewProps> = ({
  year,
  reports,
  selectedDate,
  locale,
  onQuarterSelect,
}) => {
  const today = new Date();
  const selectedParsed = selectedDate ? parseISODate(selectedDate) : undefined;
  const selectedQuarter =
    selectedParsed && selectedParsed.year === year
      ? Math.floor(selectedParsed.month / 3)
      : undefined;

  const [focusedQuarter, setFocusedQuarter] = useState<number>(() => {
    if (selectedQuarter !== undefined) return selectedQuarter;
    if (today.getFullYear() === year) return Math.floor(today.getMonth() / 3);
    return 0;
  });

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gridRef.current) {
      const tile = gridRef.current.querySelector(
        `[data-quarter="${focusedQuarter}"]`,
      ) as HTMLElement | null;
      if (tile && document.activeElement !== tile) {
        tile.focus({ preventScroll: true });
      }
    }
  }, [focusedQuarter]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        setFocusedQuarter((q) => Math.min(q + 1, 3));
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        setFocusedQuarter((q) => Math.max(q - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setFocusedQuarter(0);
        break;
      case "End":
        e.preventDefault();
        setFocusedQuarter(3);
        break;
      case "Enter":
      case " ": {
        e.preventDefault();
        const startMonth = focusedQuarter * 3;
        const drillMonth =
          today.getFullYear() === year &&
          Math.floor(today.getMonth() / 3) === focusedQuarter
            ? today.getMonth()
            : startMonth;
        onQuarterSelect(year, drillMonth);
        break;
      }
      default:
        break;
    }
  };

  const quarters = useMemo(
    () =>
      Array.from({ length: 4 }, (_, q) => {
        const start = q * 3;
        const monthStatuses = [0, 1, 2].map((i) =>
          getMonthStatus(reports, year, start + i),
        );
        const reportCount = reports.filter((r) => {
          const d = parseISODate(r.date);
          return d.year === year && d.month >= start && d.month < start + 3;
        }).length;
        return {
          quarter: q,
          status: getQuarterStatus(reports, year, q),
          reportCount,
          monthStatuses,
        };
      }),
    [reports, year],
  );

  return (
    <div
      ref={gridRef}
      className="rc-quarter-grid"
      role="grid"
      aria-label={`Quarter overview for ${year}. Use arrow keys to navigate quarters, Enter or Space to drill down.`}
      onKeyDown={handleKeyDown}
    >
      <div className="rc-quarter-grid-row" role="row">
        {quarters.map((item) => {
          const isCurrent =
            today.getFullYear() === year &&
            Math.floor(today.getMonth() / 3) === item.quarter;
          const isSelected = selectedQuarter === item.quarter;
          return (
            <div key={item.quarter} role="gridcell">
              <QuarterTile
                year={year}
                quarter={item.quarter}
                status={item.status}
                isCurrent={isCurrent}
                isSelected={isSelected}
                isFocused={focusedQuarter === item.quarter}
                locale={locale}
                reportCount={item.reportCount}
                monthStatuses={item.monthStatuses}
                onClick={(y, q) => {
                  const startMonth = q * 3;
                  const drillMonth =
                    today.getFullYear() === y && Math.floor(today.getMonth() / 3) === q
                      ? today.getMonth()
                      : startMonth;
                  onQuarterSelect(y, drillMonth);
                }}
                onFocus={setFocusedQuarter}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
