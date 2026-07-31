/**
 * DashboardHero — Investor Portfolio Hero tests
 *
 * Covers:
 *  • Nominal render (existing + new investor)
 *  • KPI tile states: success / empty / error / loading
 *  • Contextual empty messages ("No investments yet", "No payouts scheduled")
 *  • Friendly error retry messaging (hero + per-tile handlers)
 *  • Negative trend styling
 *  • Responsive layout classes + mobile-visible sparkline
 *  • Dark mode rendering
 *  • Accessibility (jest-axe, landmarks, focus-ring)
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { BrowserRouter } from 'react-router-dom';
import { DashboardHero, KPIData } from './DashboardHero';

expect.extend(toHaveNoViolations);

const defaultKPIs = {
  totalValue: { label: 'Total Value', value: 100000, type: 'currency', status: 'success', trend: 5 } as KPIData,
  realizedGains: { label: 'Realized Gains', value: 5000, type: 'currency', status: 'success' } as KPIData,
  upcomingPayouts: { label: 'Upcoming Payouts', value: 2, type: 'number', status: 'success' } as KPIData,
  pendingActions: { label: 'Pending Actions', value: 1, type: 'number', status: 'success' } as KPIData,
};

function renderHero(overrides: Partial<Parameters<typeof DashboardHero>[0]> = {}) {
  return render(
    <BrowserRouter>
      <DashboardHero {...defaultKPIs} sparklineData={[100, 200, 300]} {...overrides} />
    </BrowserRouter>
  );
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('DashboardHero – nominal render', () => {
  it('renders heading, KPI values and CTAs for an existing investor', () => {
    renderHero();
    expect(screen.getByRole('heading', { level: 1, name: /Portfolio Overview/i })).toBeInTheDocument();
    expect(screen.getByText('Total Value')).toBeInTheDocument();
    expect(screen.getByText('$100,000')).toBeInTheDocument();
    expect(screen.getByText('5.0%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Explore Offerings/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Account Settings/i })).toBeInTheDocument();
  });

  it('renders a welcome heading for a new investor', () => {
    renderHero({ isNewInvestor: true, sparklineData: [] });
    expect(screen.getByRole('heading', { level: 1, name: /Welcome to Revora/i })).toBeInTheDocument();
  });

  it('renders a region landmark labelled by the heading', () => {
    renderHero();
    const heading = screen.getByRole('heading', { level: 1 });
    const region = screen.getByRole('region', { name: /Portfolio Overview/i });
    expect(region.getAttribute('aria-labelledby')).toBe(heading.id);
  });

  it('renders the four KPI tiles with stable test ids', () => {
    renderHero();
    expect(screen.getByTestId('kpi-tile-total-value')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-tile-realized-gains')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-tile-upcoming-payouts')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-tile-pending-actions')).toBeInTheDocument();
  });

  it('links primary CTA to /investor/portal and secondary to /investor/settings', () => {
    renderHero();
    expect(screen.getByRole('link', { name: /Explore Offerings/i })).toHaveAttribute('href', '/investor/portal');
    expect(screen.getByRole('link', { name: /Account Settings/i })).toHaveAttribute('href', '/investor/settings');
  });

  it('renders tile action links when provided', () => {
    const kpis = {
      ...defaultKPIs,
      upcomingPayouts: {
        label: 'Upcoming Payouts',
        value: 3,
        type: 'number',
        status: 'success',
        actionText: 'View calendar',
        actionLink: '/investor/calendar',
      } as KPIData,
    };
    renderHero(kpis);
    expect(screen.getByRole('link', { name: /View calendar/i })).toHaveAttribute('href', '/investor/calendar');
  });
});

describe('DashboardHero – KPI tile states', () => {
  it('shows contextual empty messages for a new investor', () => {
    const emptyKPIs = {
      totalValue: { label: 'Total Value', value: 0, type: 'currency', status: 'empty', emptyText: 'No investments yet' } as KPIData,
      realizedGains: { label: 'Realized Gains', value: 0, type: 'currency', status: 'empty', emptyText: 'No investments yet' } as KPIData,
      upcomingPayouts: { label: 'Upcoming Payouts', value: 0, type: 'number', status: 'empty', emptyText: 'No payouts scheduled' } as KPIData,
      pendingActions: { label: 'Pending Actions', value: 0, type: 'number', status: 'empty', emptyText: 'No pending actions' } as KPIData,
    };
    renderHero(emptyKPIs);
    expect(screen.getAllByText('No investments yet').length).toBeGreaterThan(0);
    expect(screen.getByText('No payouts scheduled')).toBeInTheDocument();
    expect(screen.getByText('No pending actions')).toBeInTheDocument();
  });

  it('falls back to "No data yet" when emptyText is not provided', () => {
    const emptyKPIs = {
      ...defaultKPIs,
      totalValue: { label: 'Total Value', value: 0, type: 'currency', status: 'empty' } as KPIData,
    };
    renderHero(emptyKPIs);
    expect(screen.getAllByText('No data yet').length).toBeGreaterThan(0);
  });

  it('treats a null value as empty', () => {
    const kpis = {
      ...defaultKPIs,
      totalValue: { label: 'Total Value', value: null, type: 'currency', status: 'success' } as KPIData,
    };
    renderHero(kpis);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('renders error state with friendly retry messaging', () => {
    renderHero({
      totalValue: { ...defaultKPIs.totalValue, status: 'error' } as KPIData,
      onRetry: vi.fn(),
    });
    expect(screen.getByText(/load this data/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry loading Total Value/i })).toBeInTheDocument();
  });

  it('invokes hero-level onRetry when the retry button is clicked', async () => {
    const onRetry = vi.fn();
    renderHero({
      totalValue: { ...defaultKPIs.totalValue, status: 'error' } as KPIData,
      onRetry,
    });
    await userEvent.click(screen.getByRole('button', { name: /Retry loading Total Value/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('prefers a per-tile onRetry over the hero-level handler', async () => {
    const tileRetry = vi.fn();
    const heroRetry = vi.fn();
    renderHero({
      totalValue: { ...defaultKPIs.totalValue, status: 'error', onRetry: tileRetry } as KPIData,
      onRetry: heroRetry,
    });
    await userEvent.click(screen.getByRole('button', { name: /Retry loading Total Value/i }));
    expect(tileRetry).toHaveBeenCalledTimes(1);
    expect(heroRetry).not.toHaveBeenCalled();
  });

  it('renders loading state with role=status and aria-busy', () => {
    renderHero({ totalValue: { ...defaultKPIs.totalValue, status: 'loading' } as KPIData });
    const loading = screen.getByTestId('kpi-tile-total-value');
    expect(loading).toHaveAttribute('role', 'status');
    expect(loading).toHaveAttribute('aria-busy', 'true');
    expect(loading).toHaveAttribute('aria-label', 'Total Value loading');
    expect(screen.queryByText('Total Value')).not.toBeInTheDocument();
  });

  it('renders negative trend in red with a down arrow', () => {
    renderHero({ totalValue: { ...defaultKPIs.totalValue, trend: -3.5 } as KPIData });
    const trend = screen.getByText('3.5%');
    expect(trend.parentElement).toHaveClass('text-red-400');
    expect(trend.parentElement).toHaveAttribute('aria-label', 'Total Value change: -3.5%');
  });

  it('renders positive trend in green', () => {
    renderHero();
    const trend = screen.getByText('5.0%');
    expect(trend.parentElement).toHaveClass('text-green-400');
  });
});

describe('DashboardHero – sparkline', () => {
  it('renders an accessible sparkline for an existing investor', () => {
    renderHero();
    expect(screen.getByTestId('portfolio-sparkline')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Portfolio performance sparkline/i })).toBeInTheDocument();
  });

  it('does not render a sparkline for a new investor', () => {
    renderHero({ isNewInvestor: true, sparklineData: [] });
    expect(screen.queryByTestId('portfolio-sparkline')).not.toBeInTheDocument();
  });

  it('does not render a sparkline with fewer than two data points', () => {
    renderHero({ sparklineData: [42] });
    expect(screen.queryByTestId('portfolio-sparkline')).not.toBeInTheDocument();
  });

  it('renders a down-trending sparkline label when the series ends lower', () => {
    renderHero({ sparklineData: [300, 200, 100] });
    expect(screen.getByRole('img', { name: /sparkline trending down/i })).toBeInTheDocument();
  });
});

describe('DashboardHero – responsive layout', () => {
  it('uses a 1→2→4 column KPI grid', () => {
    renderHero();
    const grid = screen.getByTestId('kpi-grid');
    expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-4');
  });

  it('keeps the sparkline visible on mobile (full width) and fixed on sm+', () => {
    renderHero();
    const sparkline = screen.getByTestId('portfolio-sparkline');
    expect(sparkline).toHaveClass('w-full', 'sm:w-40');
    expect(sparkline.className).not.toContain('hidden');
  });

  it('stacks header content on mobile via flex-col', () => {
    renderHero();
    const header = screen.getByTestId('hero-header');
    expect(header).toHaveClass('flex-col', 'md:flex-row');
  });
});

describe('DashboardHero – dark mode', () => {
  it('renders with token-based dark surfaces and passes axe', async () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const { container } = renderHero();
    const tile = screen.getByTestId('kpi-tile-total-value');
    expect(tile).toHaveClass('glass-card');
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('text-main');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('keeps empty tiles legible with a light-enough slate text', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    renderHero({
      totalValue: { label: 'Total Value', value: 0, type: 'currency', status: 'empty', emptyText: 'No investments yet' } as KPIData,
    });
    const emptyText = screen.getByText('No investments yet');
    expect(emptyText.parentElement).toHaveClass('text-slate-400');
  });
});

describe('DashboardHero – accessibility', () => {
  it('has no axe violations in nominal state', async () => {
    const { container } = renderHero();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in loading state', async () => {
    const { container } = renderHero({
      totalValue: { ...defaultKPIs.totalValue, status: 'loading' } as KPIData,
      realizedGains: { ...defaultKPIs.realizedGains, status: 'loading' } as KPIData,
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in error state', async () => {
    const { container } = renderHero({
      totalValue: { ...defaultKPIs.totalValue, status: 'error' } as KPIData,
      onRetry: vi.fn(),
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in empty state', async () => {
    const { container } = renderHero({
      totalValue: { ...defaultKPIs.totalValue, status: 'empty', emptyText: 'No investments yet' } as KPIData,
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('exposes visible focus treatment on interactive elements', () => {
    renderHero();
    expect(screen.getByRole('link', { name: /Explore Offerings/i })).toHaveClass('btn-primary');
    expect(screen.getByRole('link', { name: /Account Settings/i })).toHaveClass('focus-ring');
  });
});
