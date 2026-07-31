/**
 * Tests for PayoutSchedule Gantt-style timeline view (Issue #442).
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';

import {
  PayoutSchedule,
  DEMO_PAYOUTS,
  parseDate,
  toIsoDate,
  daysBetween,
  addDays,
  getRange,
  buildTicks,
  formatRangeLabel,
} from './PayoutSchedule';

expect.extend(toHaveNoViolations);

function renderPage(props: React.ComponentProps<typeof PayoutSchedule> = {}) {
  return render(
    <MemoryRouter>
      <PayoutSchedule {...props} />
    </MemoryRouter>
  );
}

// ─── Utility tests ────────────────────────────────────────────────────────

describe('PayoutSchedule date utilities', () => {
  it('parseDate parses ISO date correctly', () => {
    const d = parseDate('2026-07-15');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // July = 6
    expect(d.getDate()).toBe(15);
  });

  it('toIsoDate returns YYYY-MM-DD string', () => {
    expect(toIsoDate(new Date(2026, 6, 15))).toBe('2026-07-15');
  });

  it('daysBetween returns correct day count', () => {
    const a = new Date(2026, 6, 1);
    const b = new Date(2026, 6, 15);
    expect(daysBetween(a, b)).toBe(14);
  });

  it('daysBetween returns 0 for same date', () => {
    const d = new Date(2026, 6, 1);
    expect(daysBetween(d, d)).toBe(0);
  });

  it('addDays adds positive days', () => {
    const d = new Date(2026, 6, 1);
    expect(toIsoDate(addDays(d, 10))).toBe('2026-07-11');
  });

  it('addDays subtracts when negative', () => {
    const d = new Date(2026, 6, 15);
    expect(toIsoDate(addDays(d, -5))).toBe('2026-07-10');
  });

  it('formatRangeLabel returns dash-separated label', () => {
    const label = formatRangeLabel(new Date(2026, 6, 1), new Date(2026, 7, 31));
    expect(label).toMatch(/2026/);
    expect(label).toMatch(/–/);
  });
});

describe('getRange', () => {
  it('returns a fallback range when items is empty', () => {
    const today = new Date(2026, 6, 15);
    const range = getRange([], 'month', today);
    expect(range.start).toBeDefined();
    expect(range.end).toBeDefined();
    expect(daysBetween(range.start, range.end)).toBeGreaterThan(0);
  });

  it('returns a range that includes all item dates', () => {
    const today = new Date(2026, 6, 15);
    const range = getRange(DEMO_PAYOUTS, 'month', today);
    for (const p of DEMO_PAYOUTS) {
      const d = parseDate(p.scheduledFor);
      expect(d >= range.start || daysBetween(range.start, d) >= -1).toBe(true);
    }
  });

  it('enforces minimum 7 days for week zoom', () => {
    const today = new Date(2026, 6, 15);
    const items = [{ ...DEMO_PAYOUTS[0], scheduledFor: '2026-07-15' }];
    const range = getRange(items, 'week', today);
    expect(daysBetween(range.start, range.end)).toBeGreaterThanOrEqual(7);
  });

  it('enforces minimum 28 days for month zoom', () => {
    const today = new Date(2026, 6, 15);
    const items = [{ ...DEMO_PAYOUTS[0], scheduledFor: '2026-07-15' }];
    const range = getRange(items, 'month', today);
    expect(daysBetween(range.start, range.end)).toBeGreaterThanOrEqual(28);
  });

  it('enforces minimum 84 days for quarter zoom', () => {
    const today = new Date(2026, 6, 15);
    const items = [{ ...DEMO_PAYOUTS[0], scheduledFor: '2026-07-15' }];
    const range = getRange(items, 'quarter', today);
    expect(daysBetween(range.start, range.end)).toBeGreaterThanOrEqual(84);
  });
});

describe('buildTicks', () => {
  it('returns ticks for week zoom', () => {
    const start = new Date(2026, 6, 1);
    const end = new Date(2026, 6, 7);
    const ticks = buildTicks(start, end, 'week');
    expect(ticks.length).toBeGreaterThan(0);
    ticks.forEach((t) => {
      expect(t.pct).toBeGreaterThanOrEqual(0);
      expect(t.pct).toBeLessThanOrEqual(100);
    });
  });

  it('returns monthly ticks for month zoom', () => {
    const start = new Date(2026, 5, 1);
    const end = new Date(2026, 8, 30);
    const ticks = buildTicks(start, end, 'month');
    expect(ticks.length).toBeGreaterThanOrEqual(3);
  });

  it('returns monthly ticks for quarter zoom', () => {
    const start = new Date(2026, 3, 1);
    const end = new Date(2026, 8, 30);
    const ticks = buildTicks(start, end, 'quarter');
    expect(ticks.length).toBeGreaterThanOrEqual(5);
  });
});

// ─── Component tests ──────────────────────────────────────────────────────

describe('PayoutSchedule Gantt View', () => {
  it('renders view toggle buttons (Gantt and Table)', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /gantt/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /table/i })).toBeInTheDocument();
  });

  it('defaults to Table view (table tab is selected)', () => {
    renderPage();
    const tableTab = screen.getByRole('tab', { name: /table/i });
    expect(tableTab).toHaveAttribute('aria-selected', 'true');
  });

  it('switches to Gantt view when Gantt tab is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: /gantt/i }));

    expect(screen.getByText('Issuer A')).toBeInTheDocument();
    expect(screen.getByText('Issuer B')).toBeInTheDocument();
    expect(screen.getByText('Issuer C')).toBeInTheDocument();
    expect(screen.getByText('Issuer D')).toBeInTheDocument();

    expect(screen.getByRole('group', { name: /zoom controls/i })).toBeInTheDocument();
  });

  it('shows the range label with dates in Gantt view', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: /gantt/i }));

    // Range label and tick labels all contain "2026"
    const rangeLabels = screen.getAllByText(/2026/);
    expect(rangeLabels.length).toBeGreaterThan(0);
  });

  it('renders zoom level buttons', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: /gantt/i }));

    expect(screen.getByRole('button', { name: /week/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /month/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quarter/i })).toBeInTheDocument();
  });

  it('switches zoom level when a zoom button is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: /gantt/i }));

    const weekBtn = screen.getByRole('button', { name: /week/i });
    await user.click(weekBtn);
    expect(weekBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('month zoom button is pressed by default in gantt view', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: /gantt/i }));

    const monthBtn = screen.getByRole('button', { name: /month/i });
    expect(monthBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows title attribute on gantt bars matching issuer/amount/date', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: /gantt/i }));

    const bar = screen.getByTitle(/Issuer A.*USDC 12,500.*2026-07-15/);
    expect(bar).toBeInTheDocument();
  });

  it('shows pattern key legend in Gantt view', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: /gantt/i }));

    expect(screen.getByText(/Pattern key/i)).toBeInTheDocument();
    expect(screen.getByText(/Failed \/ Canceled/i)).toBeInTheDocument();
    expect(screen.getByText(/Today marker/i)).toBeInTheDocument();
  });

  it('clicking a gantt bar opens the drill-down panel', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: /gantt/i }));

    const bar = screen.getByTitle(/Issuer A.*USDC 12,500.*2026-07-15/);
    await user.click(bar);

    // Panel should open — look for close button or panel aria role
    const panel = document.querySelector('[class*="payout-drill"]') ||
      screen.queryByRole('dialog') ||
      screen.queryByRole('complementary');
    expect(panel || screen.queryByText(/overview/i)).toBeTruthy();
  });

  it('clicking a table row status button opens the drill-down panel', async () => {
    const user = userEvent.setup();
    renderPage();

    // Table is the default view
    const firstRow = screen.getByTestId('payout-row-1');
    const btn = within(firstRow).getByRole('button');
    await user.click(btn);

    // Panel or dialog should be opened
    expect(
      screen.queryByRole('dialog') ||
      screen.queryByRole('complementary') ||
      document.querySelector('[class*="drill"]'),
    ).toBeTruthy();
  });

  it('Gantt bars are keyboard-focusable', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: /gantt/i }));

    const bars = screen.getAllByRole('button', { name: /Issuer/ });
    expect(bars.length).toBeGreaterThan(0);
    bars.forEach((b) => {
      expect(b).toHaveAttribute('tabindex', '0');
    });
  });

  it('has no axe violations in table mode (default)', async () => {
    const { container } = renderPage();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations when switching to Gantt view', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.click(screen.getByRole('tab', { name: /gantt/i }));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations in week zoom', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.click(screen.getByRole('tab', { name: /gantt/i }));
    await user.click(screen.getByRole('button', { name: /week/i }));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations in quarter zoom', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.click(screen.getByRole('tab', { name: /gantt/i }));
    await user.click(screen.getByRole('button', { name: /quarter/i }));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('switches back to table view from Gantt', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: /gantt/i }));
    expect(screen.getByText('Issuer A')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /table/i }));
    expect(screen.getByTestId('payout-schedule-table')).toBeInTheDocument();
  });

  it('shows empty state correctly', () => {
    renderPage({ empty: true });
    expect(screen.getByText(/no payouts scheduled/i)).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /gantt/i })).not.toBeInTheDocument();
  });

  it('renders the status legend in both views', async () => {
    const user = userEvent.setup();
    renderPage();

    // Table view
    expect(screen.getByTestId('payout-status-legend')).toBeInTheDocument();

    // Gantt view
    await user.click(screen.getByRole('tab', { name: /gantt/i }));
    expect(screen.getByTestId('payout-status-legend')).toBeInTheDocument();
  });

  it('renders with custom payouts data', () => {
    const custom = [
      { id: 'x1', issuer: 'Custom Co', recipient: '0xabcd', amount: 'USDC 999', scheduledFor: '2026-09-01', status: 'scheduled' },
    ];
    renderPage({ payouts: custom });
    expect(screen.getByTestId('payout-row-x1')).toBeInTheDocument();
  });
});
