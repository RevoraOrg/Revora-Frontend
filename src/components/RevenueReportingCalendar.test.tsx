/**
 * Revenue Reporting Calendar — Issue #153
 *
 * Comprehensive test suite covering:
 * - Rendering (loading, error, empty, populated)
 * - Month navigation
 * - Date selection
 * - Keyboard navigation (WAI-ARIA Grid)
 * - Status indicators
 * - Details panel
 * - Submit Report CTA
 * - Responsive behavior
 * - Accessibility (ARIA attributes, focus management)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { RevenueReportingCalendar } from './RevenueReportingCalendar';
import { RevenueReport, ReportStatus } from './RevenueReportingCalendar.types';

const noop = () => {};

const baseReports: RevenueReport[] = [
  {
    id: 'rpt-1',
    date: '2026-06-05',
    dueDate: '2026-06-05',
    status: 'accepted',
    grossRevenue: 125000,
    currency: 'USD',
    locale: 'en-US',
    acceptedAt: '2026-06-08',
  },
  {
    id: 'rpt-2',
    date: '2026-06-12',
    dueDate: '2026-06-12',
    status: 'submitted',
    grossRevenue: 98000,
    currency: 'USD',
    locale: 'en-US',
    submittedAt: '2026-06-10',
  },
  {
    id: 'rpt-3',
    date: '2026-06-20',
    dueDate: '2026-06-20',
    status: 'due',
    grossRevenue: undefined,
    currency: 'USD',
    locale: 'en-US',
  },
  {
    id: 'rpt-4',
    date: '2026-06-25',
    dueDate: '2026-06-25',
    status: 'overdue',
    grossRevenue: undefined,
    currency: 'USD',
    locale: 'en-US',
  },
  {
    id: 'rpt-5',
    date: '2026-06-28',
    dueDate: '2026-06-28',
    status: 'due',
    grossRevenue: undefined,
    currency: 'USD',
    locale: 'en-US',
  },
  {
    id: 'rpt-6',
    date: '2026-06-28',
    dueDate: '2026-06-28',
    status: 'submitted',
    grossRevenue: 50000,
    currency: 'USD',
    locale: 'en-US',
    submittedAt: '2026-06-27',
  },
];

describe('RevenueReportingCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ─── Loading State ─────────────────────────────────────────────── */

  describe('Loading state', () => {
    it('renders loading spinner and text when isLoading is true', () => {
      render(
        <RevenueReportingCalendar
          reports={[]}
          isLoading
          locale="en-US"
        />,
      );
      expect(screen.getByText('Loading reports…')).toBeInTheDocument();
      expect(screen.getByLabelText('Loading calendar')).toBeInTheDocument();
      expect(screen.getByLabelText('Loading calendar')).toHaveAttribute('aria-busy', 'true');
    });
  });

  /* ─── Error State ───────────────────────────────────────────────── */

  describe('Error state', () => {
    it('renders error message and retry button when error is set', () => {
      render(
        <RevenueReportingCalendar
          reports={[]}
          error="Failed to load reports"
          locale="en-US"
        />,
      );
      expect(screen.getByText('Failed to load reports')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  /* ─── Empty State ──────────────────────────────────────────────── */

  describe('Empty state (no reports)', () => {
    it('renders calendar grid with no status dots when reports array is empty', () => {
      render(
        <RevenueReportingCalendar
          reports={[]}
          locale="en-US"
          weekStartsOn={0}
        />,
      );
      // Calendar grid should be present
      expect(screen.getByRole('grid')).toBeInTheDocument();
      // No status dots should be rendered
      const dots = document.querySelectorAll('.rc-status-dot');
      expect(dots.length).toBe(0);
    });
  });

  /* ─── Populated Calendar ───────────────────────────────────────── */

  describe('Populated calendar', () => {
    it('renders the calendar grid with correct structure', () => {
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();
      // Should have header row + 6 week rows = 7 rows
      const rows = within(grid).getAllByRole('row');
      expect(rows.length).toBeGreaterThanOrEqual(6);
    });

    it('renders day name headers', () => {
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      // Sunday start: Sun, Mon, Tue, Wed, Thu, Fri, Sat
      expect(screen.getByText('Sun')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
    });

    it('renders status dots for days with reports', () => {
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      const dots = document.querySelectorAll('.rc-status-dot');
      // 5 unique dates with reports (rpt-1 through rpt-6, but rpt-5 and rpt-6 share date)
      // Actually 5 unique dates: 5, 12, 20, 25, 28
      expect(dots.length).toBe(5);
    });

    it('renders count badge for days with multiple reports', () => {
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      // June 28 has 2 reports
      const countBadges = document.querySelectorAll('.rc-day-count');
      expect(countBadges.length).toBeGreaterThanOrEqual(1);
      expect(countBadges[0]).toHaveTextContent('2');
    });

    it('renders the legend with all status types', () => {
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      const legend = screen.getByLabelText('Status legend');
      expect(legend).toHaveTextContent('Due');
      expect(legend).toHaveTextContent('Submitted');
      expect(legend).toHaveTextContent('Accepted');
      expect(legend).toHaveTextContent('Overdue');
    });
  });

  /* ─── Month Navigation ─────────────────────────────────────────── */

  describe('Month navigation', () => {
    function NavHarness({ onMonthChange }: { onMonthChange?: (m: string) => void }) {
      const [month, setMonth] = React.useState('2026-06');
      return (
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth={month}
          onMonthChange={(m) => {
            setMonth(m);
            onMonthChange?.(m);
          }}
        />
      );
    }

    it('navigates to previous month when left arrow is clicked', async () => {
      const user = userEvent.setup();
      render(<NavHarness />);
      const prevBtn = screen.getByLabelText(/previous month/i);
      await user.click(prevBtn);
      // Should now show May 2026
      expect(document.querySelector('.rc-month-title')).toHaveTextContent('May 2026');
    });

    it('navigates to next month when right arrow is clicked', async () => {
      const user = userEvent.setup();
      render(<NavHarness />);
      const nextBtn = screen.getByLabelText(/next month/i);
      await user.click(nextBtn);
      // Should now show July 2026
      expect(document.querySelector('.rc-month-title')).toHaveTextContent('July 2026');
    });

    it('calls onMonthChange when month changes', async () => {
      const onMonthChange = vi.fn();
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          onMonthChange={onMonthChange}
          viewMonth="2026-06"
        />,
      );
      const nextBtn = screen.getByLabelText(/next month/i);
      await user.click(nextBtn);
      expect(onMonthChange).toHaveBeenCalledWith('2026-07');
    });
  });

  /* ─── Date Selection ───────────────────────────────────────────── */

  describe('Date selection', () => {
    it('selects a date when clicked', async () => {
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      // Find the day cell for June 5
      const day5 = screen.getByLabelText(/June 5, 2026.*Accepted/);
      await user.click(day5);
      expect(day5).toHaveAttribute('aria-selected', 'true');
    });

    it('calls onDateSelect when a date is clicked', async () => {
      const onDateSelect = vi.fn();
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          onDateSelect={onDateSelect}
          viewMonth="2026-06"
        />,
      );
      const day5 = screen.getByLabelText(/June 5, 2026.*Accepted/);
      await user.click(day5);
      expect(onDateSelect).toHaveBeenCalledWith('2026-06-05');
    });

    it('opens the details panel when a date is selected on mobile', async () => {
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      const day5 = screen.getByLabelText(/June 5, 2026.*Accepted/);
      await user.click(day5);
      // Details panel should be open
      const panel = document.getElementById('rc-details-panel');
      expect(panel).toBeInTheDocument();
    });
  });

  /* ─── Keyboard Navigation ──────────────────────────────────────── */

  describe('Keyboard navigation (WAI-ARIA Grid)', () => {
    it('supports arrow key navigation', async () => {
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      const day1 = screen.getByLabelText(/June 1, 2026/);
      expect(day1).toHaveAttribute('tabIndex', '0');
      day1.focus();

      // Press ArrowRight — June 1 2026 is Monday, so next is June 2
      await user.keyboard('{ArrowRight}');
      const secondCell = screen.getByLabelText(/June 2, 2026/);
      expect(secondCell).toHaveAttribute('tabIndex', '0');
    });

    it('supports Home key to go to start of row', async () => {
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      // June 1 2026 is Monday — its row starts on Sunday May 31
      const day1 = screen.getByLabelText(/June 1, 2026/);
      day1.focus();
      await user.keyboard('{ArrowRight}{ArrowRight}');
      await user.keyboard('{Home}');
      const rowStart = screen.getByLabelText(/May 31, 2026/);
      expect(rowStart).toHaveAttribute('tabIndex', '0');
    });

    it('supports End key to go to end of row', async () => {
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      const day1 = screen.getByLabelText(/June 1, 2026/);
      day1.focus();
      await user.keyboard('{Home}');
      await user.keyboard('{End}');
      // Row ending Saturday June 6, 2026
      const lastCell = screen.getByLabelText(/June 6, 2026/);
      expect(lastCell).toHaveAttribute('tabIndex', '0');
    });

    it('supports Enter/Space to select a date', async () => {
      const onDateSelect = vi.fn();
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          onDateSelect={onDateSelect}
          viewMonth="2026-06"
        />,
      );
      const grid = screen.getByRole('grid');
      grid.focus();

      // Focus on June 1
      const day1 = screen.getByLabelText(/June 1, 2026/);
      day1.focus();

      // Press Enter
      await user.keyboard('{Enter}');
      expect(onDateSelect).toHaveBeenCalledWith('2026-06-01');
    });

    it('supports Page Up for previous month navigation', async () => {
      const onMonthChange = vi.fn();
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          onMonthChange={onMonthChange}
          viewMonth="2026-06"
        />,
      );
      const grid = screen.getByRole('grid');
      grid.focus();

      // Press PageUp
      await user.keyboard('{PageUp}');
      expect(onMonthChange).toHaveBeenCalledWith('2026-05');
    });

    it('supports Page Down for next month navigation', async () => {
      const onMonthChange = vi.fn();
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          onMonthChange={onMonthChange}
          viewMonth="2026-06"
        />,
      );
      const grid = screen.getByRole('grid');
      grid.focus();

      // Press PageDown
      await user.keyboard('{PageDown}');
      expect(onMonthChange).toHaveBeenCalledWith('2026-07');
    });

    it('supports T key to jump to today', async () => {
      const onDateSelect = vi.fn();
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          onDateSelect={onDateSelect}
          viewMonth="2026-06"
        />,
      );
      const grid = screen.getByRole('grid');
      grid.focus();

      // Press T to jump to today
      await user.keyboard('t');

      // Should have selected today's date
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      expect(onDateSelect).toHaveBeenCalledWith(todayStr);
    });

    it('renders the keyboard shortcuts hint', () => {
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      const hint = screen.getByLabelText('Keyboard shortcuts hint');
      expect(hint).toHaveTextContent('T');
      expect(hint).toHaveTextContent('?');
    });

    it('renders the shortcuts button when onOpenShortcuts is provided', () => {
      const onOpenShortcuts = vi.fn();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          onOpenShortcuts={onOpenShortcuts}
          viewMonth="2026-06"
        />,
      );
      expect(screen.getByLabelText('Keyboard shortcuts')).toBeInTheDocument();
    });
  });

  /* ─── Details Panel ────────────────────────────────────────────── */

  describe('Details panel', () => {
    it('renders the details panel with month summary', async () => {
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      const panel = screen.getByLabelText('Report details panel');
      await user.click(within(panel).getByRole('tab', { name: 'Month' }));
      expect(within(panel).getByText('Due / Overdue')).toBeInTheDocument();
      expect(within(panel).getByText('3')).toBeInTheDocument();
      expect(within(panel).getByText('2')).toBeInTheDocument();
      expect(within(panel).getByText('1')).toBeInTheDocument();
    });

    it('shows day details when a date is selected', async () => {
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      const day5 = screen.getByLabelText(/June 5, 2026.*Accepted/);
      await user.click(day5);

      const panel = screen.getByLabelText('Report details panel');
      expect(panel).toHaveTextContent(/125/)
      expect(within(panel).getByText('Accepted')).toBeInTheDocument();
    });

    it('shows Submit Report CTA for due reports', () => {
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
          selectedDate="2026-06-20"
        />,
      );
      const panel = screen.getByLabelText('Report details panel');
      // Past due dates render as overdue with Submit Now
      expect(within(panel).getByRole('button', { name: /submit (now|overdue|report)/i })).toBeInTheDocument();
    });

    it('shows Submit Now CTA for overdue reports', () => {
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
          selectedDate="2026-06-25"
        />,
      );
      const panel = screen.getByLabelText('Report details panel');
      expect(within(panel).getByRole('button', { name: /submit (now|overdue|report)/i })).toBeInTheDocument();
    });

    it('calls onSubmitReport when Submit Report is clicked', async () => {
      const onSubmitReport = vi.fn();
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          onSubmitReport={onSubmitReport}
          viewMonth="2026-06"
          selectedDate="2026-06-20"
        />,
      );
      const panel = screen.getByLabelText('Report details panel');
      const submitBtn = within(panel).getByRole('button', { name: /submit (now|overdue|report)/i });
      await user.click(submitBtn);
      expect(onSubmitReport).toHaveBeenCalledWith('2026-06-20');
    });

    it('shows empty state when no reports for selected date', async () => {
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      // Click a date with no reports (e.g., June 15)
      const day15 = screen.getByLabelText(/June 15, 2026.*No report/);
      await user.click(day15);

      expect(screen.getByText('No reports for this date.')).toBeInTheDocument();
    });

    it('shows Submit Report CTA in empty day state', async () => {
      const onSubmitReport = vi.fn();
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          onSubmitReport={onSubmitReport}
          viewMonth="2026-06"
        />,
      );
      const day15 = screen.getByLabelText(/June 15, 2026.*No report/);
      await user.click(day15);

      const submitBtn = screen.getByRole('button', { name: /submit report/i });
      expect(submitBtn).toBeInTheDocument();
      await user.click(submitBtn);
      expect(onSubmitReport).toHaveBeenCalledWith('2026-06-15');
    });
  });

  /* ─── Month View in Panel ──────────────────────────────────────── */

  describe('Month view in panel', () => {
    it('switches to month view when Month tab is clicked', async () => {
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      const panel = screen.getByLabelText('Report details panel');
      const monthTab = within(panel).getByRole('tab', { name: 'Month' });
      await user.click(monthTab);

      // Should show month summary
      expect(within(panel).getByText('Due / Overdue')).toBeInTheDocument();
      expect(within(panel).getByText('Submitted', { selector: '.rc-month-stat-label' })).toBeInTheDocument();
      expect(within(panel).getByText('Accepted', { selector: '.rc-month-stat-label' })).toBeInTheDocument();
    });

    it('shows quick submit CTA for pending reports in month view', async () => {
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      const monthTab = screen.getByRole('tab', { name: 'Month' });
      await user.click(monthTab);

      // Should show "Submit 3 Pending Reports" (due + overdue = 3)
      expect(screen.getByText(/Submit 3 Pending Report/)).toBeInTheDocument();
    });
  });

  /* ─── Accessibility ────────────────────────────────────────────── */

  describe('Accessibility', () => {
    it('has correct ARIA roles on the grid', () => {
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();

      const rows = within(grid).getAllByRole('row');
      expect(rows.length).toBeGreaterThanOrEqual(6);

      const cells = within(grid).getAllByRole('gridcell');
      expect(cells.length).toBe(42); // 6 rows × 7 days
    });

    it('has aria-label on day cells with date and status', () => {
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      const day5 = screen.getByLabelText(/June 5, 2026.*Accepted/);
      expect(day5).toBeInTheDocument();
    });

    it('has aria-selected on the selected date', async () => {
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      const day5 = screen.getByLabelText(/June 5, 2026.*Accepted/);
      await user.click(day5);
      expect(day5).toHaveAttribute('aria-selected', 'true');
    });

    it('has aria-label on navigation buttons', () => {
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      expect(screen.getByLabelText(/previous month/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/next month/i)).toBeInTheDocument();
    });

    it('has aria-label on the details panel', () => {
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      expect(screen.getByLabelText('Report details panel')).toBeInTheDocument();
    });

    it('has role="tablist" on the view mode toggle', () => {
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      expect(screen.getByRole('tablist', { name: /calendar view mode/i })).toBeInTheDocument();
      expect(screen.getByRole('tablist', { name: /calendar period scale/i })).toBeInTheDocument();
    });

    it('has correct aria-selected on tabs', async () => {
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      const dayTab = screen.getByRole('tab', { name: 'Day' });
      const monthTab = screen.getByRole('tab', { name: 'Month' });

      expect(dayTab).toHaveAttribute('aria-selected', 'true');
      expect(monthTab).toHaveAttribute('aria-selected', 'false');

      await user.click(monthTab);
      expect(dayTab).toHaveAttribute('aria-selected', 'false');
      expect(monthTab).toHaveAttribute('aria-selected', 'true');
    });

    it('has aria-expanded on mobile toggle', () => {
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      const toggle = screen.getByLabelText(/hide details panel/i);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });
  });

  /* ─── Week Start Settings ──────────────────────────────────────── */

  describe('Week start settings', () => {
    it('renders Monday as first day when weekStartsOn is 1', () => {
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={1}
          viewMonth="2026-06"
        />,
      );
      // Monday start: Mon, Tue, Wed, Thu, Fri, Sat, Sun
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Sun')).toBeInTheDocument();
    });
  });

  /* ─── Today Highlighting ───────────────────────────────────────── */

  describe('Today highlighting', () => {
    it('highlights today with special styling', () => {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      render(
        <RevenueReportingCalendar
          reports={[]}
          locale="en-US"
          weekStartsOn={0}
          viewMonth={month}
        />,
      );
      const todayCell = document.querySelector('.rc-day-cell--today');
      expect(todayCell).toBeTruthy();
      expect(todayCell?.getAttribute('aria-label') ?? '').toMatch(/today/i);
    });
  });

  /* ─── Multiple Reports on Same Day ─────────────────────────────── */

  describe('Multiple reports on same day', () => {
    it('shows count badge for days with multiple reports', () => {
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      // June 28 has 2 reports
      const day28 = screen.getByLabelText(/June 28, 2026.*2 reports/);
      expect(day28).toBeInTheDocument();
    });
  });

  /* ─── Controlled Props ─────────────────────────────────────────── */

  describe('Controlled props', () => {
    it('respects controlled selectedDate', async () => {
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          selectedDate="2026-06-12"
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      const day12 = screen.getByLabelText(/June 12, 2026.*Submitted.*selected/i);
      expect(day12).toHaveAttribute('aria-selected', 'true');
    });

    it('respects controlled viewMonth', () => {
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          viewMonth="2026-05"
          locale="en-US"
          weekStartsOn={0}
        />,
      );
      expect(document.querySelector('.rc-month-title')).toHaveTextContent('May 2026');
    });
  });

  /* ─── Custom className ─────────────────────────────────────────── */

  describe('Custom className', () => {
    it('applies custom className to root element', () => {
      const { container } = render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          className="my-custom-class"
          viewMonth="2026-06"
        />,
      );
      expect(container.firstChild).toHaveClass('my-custom-class');
    });
  });

  /* ─── Year / Quarter period views (#424) ─────────────────────────── */

  describe('Period scale switcher (year / quarter view)', () => {
    it('switches to year overview with 12 month tiles', async () => {
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      await user.click(screen.getByRole('tab', { name: 'Year view' }));
      expect(screen.getByRole('grid', { name: /year overview for 2026/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/June 2026/i)).toBeInTheDocument();
      expect(document.querySelector('.rc-month-title')).toHaveTextContent('2026');
    });

    it('drills from year tile back to month view', async () => {
      const user = userEvent.setup();
      const onMonthChange = vi.fn();
      function Harness() {
        const [month, setMonth] = React.useState('2026-06');
        return (
          <RevenueReportingCalendar
            reports={baseReports}
            locale="en-US"
            weekStartsOn={0}
            viewMonth={month}
            onMonthChange={(m) => {
              setMonth(m);
              onMonthChange(m);
            }}
          />
        );
      }
      render(<Harness />);
      await user.click(screen.getByRole('tab', { name: 'Year view' }));
      await user.click(screen.getByLabelText(/March 2026/i));
      expect(onMonthChange).toHaveBeenCalledWith('2026-03');
      expect(document.querySelector('.rc-month-title')).toHaveTextContent('March 2026');
    });

    it('switches to quarter overview', async () => {
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      await user.click(screen.getByRole('tab', { name: 'Quarter view' }));
      expect(screen.getByRole('grid', { name: /quarter overview for 2026/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Q2 2026/i)).toBeInTheDocument();
    });
  });

  /* ─── Bulk select (#426) ────────────────────────────────────────── */

  describe('Bulk select and close', () => {
    it('shows floating action bar after multi-select via meta+click', async () => {
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      const day5 = screen.getByLabelText(/June 5, 2026/i);
      const day12 = screen.getByLabelText(/June 12, 2026/i);
      await user.click(day5);
      await user.keyboard('{Meta>}');
      await user.click(day12);
      await user.keyboard('{/Meta}');
      expect(screen.getByRole('toolbar', { name: /bulk actions/i })).toBeInTheDocument();
      expect(screen.getByText(/2 periods selected/i)).toBeInTheDocument();
    });

    it('confirms bulk close and registers undo', async () => {
      const onBulkClose = vi.fn();
      const onBulkCloseUndo = vi.fn();
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
          selectedDates={['2026-06-20', '2026-06-25']}
          onBulkClose={onBulkClose}
          onBulkCloseUndo={onBulkCloseUndo}
        />,
      );
      expect(screen.getByRole('toolbar', { name: /bulk actions/i })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /close selected periods/i }));
      expect(screen.getByRole('alertdialog')).toHaveTextContent(/close 2 selected periods/i);
      await user.click(screen.getByRole('button', { name: /confirm close selected periods/i }));
      expect(onBulkClose).toHaveBeenCalledWith(['2026-06-20', '2026-06-25']);
      expect(screen.getByText(/closed 2 periods/i)).toBeInTheDocument();
    });
  });

  /* ─── Mobile agenda (#428) ──────────────────────────────────────── */

  describe('Mobile agenda view', () => {
    it('renders agenda with sticky month headers and issuer labels', () => {
      const reportsWithIssuer = baseReports.map((r, i) => ({
        ...r,
        issuer: i % 2 === 0 ? 'Acme Holdings' : 'Very Long Issuer Name That Should Truncate Gracefully LLC',
      }));
      render(
        <RevenueReportingCalendar
          reports={reportsWithIssuer}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      expect(screen.getByRole('tab', { name: 'Agenda view' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('list', { name: /revenue report agenda/i })).toBeInTheDocument();
      expect(document.querySelector('.rc-agenda-group-title--sticky')).toBeTruthy();
      expect(screen.getAllByText('Acme Holdings').length).toBeGreaterThan(0);
    });

    it('can toggle to calendar view on the mobile toggle', async () => {
      const user = userEvent.setup();
      render(
        <RevenueReportingCalendar
          reports={baseReports}
          locale="en-US"
          weekStartsOn={0}
          viewMonth="2026-06"
        />,
      );
      await user.click(screen.getByRole('tab', { name: 'Calendar view' }));
      expect(screen.getByRole('tab', { name: 'Calendar view' })).toHaveAttribute('aria-selected', 'true');
    });
  });
});
