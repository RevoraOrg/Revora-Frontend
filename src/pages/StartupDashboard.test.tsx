/**
 * StartupDashboard.test.tsx
 * Issue #1040 — Cover rendering of the hero, sections and links.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { StartupDashboard } from './StartupDashboard';

expect.extend(toHaveNoViolations);

/* ─── Helpers ───────────────────────────────────────────────────────── */

function renderPage() {
  return render(
    <MemoryRouter>
      <StartupDashboard />
    </MemoryRouter>,
  );
}

/* ─── Rendering ─────────────────────────────────────────────────────── */

describe('StartupDashboard – rendering', () => {
  it('renders without crashing', () => {
    renderPage();
    // The outer container is always present
    expect(document.body).not.toBeEmptyDOMElement();
  });

  it('renders the Issuer Dashboard Hero section', () => {
    renderPage();
    expect(screen.getByTestId('issuer-dashboard-hero')).toBeInTheDocument();
  });

  it('renders the company-specific hero heading', () => {
    renderPage();
    // companyName is 'Acme Corp' in the page's mock data
    expect(
      screen.getByRole('heading', { level: 1, name: /acme corp dashboard/i }),
    ).toBeInTheDocument();
  });

  it('renders the Revenue Reporting Calendar section heading', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 2, name: /revenue reporting calendar/i }),
    ).toBeInTheDocument();
  });

  it('renders the Demo scenarios switcher region', () => {
    renderPage();
    expect(screen.getByRole('region', { name: /demo scenario/i })).toBeInTheDocument();
  });
});

/* ─── Navigation links ──────────────────────────────────────────────── */

describe('StartupDashboard – navigation links', () => {
  it('renders the Submit Revenue Report link pointing to /startup/report-revenue', () => {
    renderPage();
    const nav = screen.getByRole('navigation', { name: /startup navigation/i });
    const link = within(nav).getByRole('link', { name: /submit revenue report/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/startup/report-revenue');
  });

  it('renders the Back to Home link pointing to /', () => {
    renderPage();
    const nav = screen.getByRole('navigation', { name: /startup navigation/i });
    const link = within(nav).getByRole('link', { name: /back to home/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
  });
});

/* ─── Hero KPI tiles ────────────────────────────────────────────────── */

describe('StartupDashboard – hero KPI tiles', () => {
  it('renders the MRR KPI tile with mock value', () => {
    renderPage();
    expect(screen.getByText('$42,000')).toBeInTheDocument();
  });

  it('renders the ARR KPI tile with mock value', () => {
    renderPage();
    expect(screen.getByText('$504,000')).toBeInTheDocument();
  });

  it('renders the DAU KPI tile with mock value', () => {
    renderPage();
    expect(screen.getByText('1,240')).toBeInTheDocument();
  });

  it('renders the KPI metrics list', () => {
    renderPage();
    expect(
      screen.getByRole('list', { name: /issuer key metrics/i }),
    ).toBeInTheDocument();
  });
});

/* ─── Reminder banner (default scenario is due-soon) ───────────────── */

describe('StartupDashboard – reminder banner', () => {
  it('shows the reminder banner in the default due-soon scenario', () => {
    renderPage();
    // Default activeScenario is 'due-soon' → report due in 4 days → banner visible
    expect(screen.getByTestId('reminder-banner')).toBeInTheDocument();
  });

  it('banner contains a Submit now link', () => {
    renderPage();
    expect(
      screen.getByRole('link', { name: /submit revenue report now/i }),
    ).toBeInTheDocument();
  });
});

/* ─── Scenario switcher ─────────────────────────────────────────────── */

describe('StartupDashboard – scenario switcher', () => {
  it('renders a button for every scenario', () => {
    renderPage();
    // There are 11 named scenarios
    const buttons = screen
      .getAllByRole('button')
      .filter((btn) => btn.hasAttribute('aria-pressed'));
    expect(buttons.length).toBeGreaterThanOrEqual(11);
  });

  it('marks the active scenario button as pressed', () => {
    renderPage();
    // Default is 'due-soon' — its label is "Report due in 4 days"
    const active = screen.getByRole('button', { name: /report due in 4 days/i });
    expect(active).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches to the nominal scenario when its button is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole('button', { name: /nominal \(no report due\)/i }),
    );

    // Banner should disappear in nominal mode (no reportStatus → no banner)
    expect(screen.queryByTestId('reminder-banner')).not.toBeInTheDocument();

    // Nominal button should now be pressed
    expect(
      screen.getByRole('button', { name: /nominal \(no report due\)/i }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches to the loading scenario and shows loading skeletons', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /all kpis loading/i }));

    // Loading state renders role="status" skeletons for each KPI
    const statusEls = screen.getAllByRole('status');
    expect(statusEls.length).toBeGreaterThanOrEqual(3);
  });

  it('switches to the error scenario and shows error tiles', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /all kpis errored/i }));

    expect(screen.getAllByText('Failed to load').length).toBe(3);
  });

  it('switches to the empty-metrics scenario and shows no-data tiles', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /empty metrics/i }));

    expect(screen.getAllByText('No data yet').length).toBeGreaterThanOrEqual(3);
  });

  it('switches to the overdue-critical scenario and shows a critical overdue banner', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole('button', { name: /overdue — critical/i }),
    );

    const banner = screen.getByTestId('reminder-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute('data-status', 'overdue');
    expect(banner).toHaveTextContent(/submit immediately/i);
  });

  it('switches to the submitted scenario and hides the banner', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /report submitted/i }));

    expect(screen.queryByTestId('reminder-banner')).not.toBeInTheDocument();
  });
});

/* ─── Next payout tile ──────────────────────────────────────────────── */

describe('StartupDashboard – next payout tile', () => {
  it('renders the next-payout tile', () => {
    renderPage();
    expect(screen.getByTestId('next-payout-tile')).toBeInTheDocument();
  });

  it('renders the estimated payout amount from mock data', () => {
    renderPage();
    // mockNextPayout.estimatedAmount = 8750
    expect(screen.getByTestId('next-payout-tile')).toHaveTextContent('$8,750');
  });
});

/* ─── Accessibility ─────────────────────────────────────────────────── */

describe('StartupDashboard – accessibility', () => {
  it('has no axe violations in the hero (default due-soon scenario)', async () => {
    renderPage();
    // Scope axe to the hero section — the RevenueReportingCalendar has pre-existing
    // a11y issues in its rc-grid-header and landmark nesting that are tracked
    // separately and not part of this issue's scope.
    const hero = await screen.findByTestId('issuer-dashboard-hero');
    const results = await axe(hero);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in the hero (nominal / no-banner scenario)', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(
      screen.getByRole('button', { name: /nominal \(no report due\)/i }),
    );
    const hero = screen.getByTestId('issuer-dashboard-hero');
    const results = await axe(hero);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in the scenario switcher', async () => {
    renderPage();
    const switcher = screen.getByRole('region', { name: /demo scenario/i });
    const results = await axe(switcher);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in the startup navigation', async () => {
    renderPage();
    const nav = screen.getByRole('navigation', { name: /startup navigation/i });
    const results = await axe(nav);
    expect(results).toHaveNoViolations();
  });
});
