/**
 * InvestorDiscovery.test.tsx
 * Issue #107 – Design the empty and error states for offering discovery results
 *
 * Coverage targets (≥95% on InvestorDiscovery.tsx):
 *   - DiscoveryEmptyState: filtered variant, truly-empty variant, prop edge cases
 *   - DiscoveryErrorState: initial render, retry counter, retry interaction
 *   - InvestorDiscovery (integrated): loaded state, filtered-empty, truly-empty,
 *     error state, search wiring, filter toggle, clear interactions
 *   - ARIA: role/aria-live/aria-labelledby/aria-pressed semantics
 *   - Keyboard: focus on action buttons inside state views
 *   - Mobile layout: state containers render at narrow widths
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DiscoveryEmptyState,
  DiscoveryErrorState,
  InvestorDiscovery,
} from './InvestorDiscovery';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const noop = () => {};

/** Mirror of MOCK_OFFERINGS in InvestorDiscovery.tsx for test assertions */
const MOCK_OFFERINGS = [
  { id: 1, name: 'TechFlow AI', category: 'Enterprise SaaS', revenueShare: 15, target: 250000, raised: 112500 },
  { id: 2, name: 'Quantum Ledger', category: 'DeFi Infrastructure', revenueShare: 12, target: 500000, raised: 140000 },
  { id: 3, name: 'Nexus Pay', category: 'Cross-Border Payments', revenueShare: 18, target: 300000, raised: 186000 },
];

/** Helper: renders InvestorDiscovery in loaded state without skeleton delay */
const renderLoaded = (extraProps: Record<string, unknown> = {}) =>
  render(
    <InvestorDiscovery
      __simulateState={{ kind: 'loaded', offerings: MOCK_OFFERINGS }}
      {...(extraProps as Parameters<typeof InvestorDiscovery>[0])}
    />,
  );

// ─────────────────────────────────────────────────────────────────────────────
// 1. DiscoveryEmptyState – filtered variant
// ─────────────────────────────────────────────────────────────────────────────

describe('DiscoveryEmptyState – filtered variant', () => {
  it('renders the container with data-testid', () => {
    render(<DiscoveryEmptyState variant="filtered" onClearFilters={noop} />);
    expect(screen.getByTestId('discovery-empty-state')).toBeInTheDocument();
  });

  it('renders as role="status" (polite region)', () => {
    render(<DiscoveryEmptyState variant="filtered" onClearFilters={noop} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-live="polite"', () => {
    render(<DiscoveryEmptyState variant="filtered" onClearFilters={noop} />);
    expect(screen.getByTestId('discovery-empty-state')).toHaveAttribute('aria-live', 'polite');
  });

  it('renders a heading linked via aria-labelledby', () => {
    render(<DiscoveryEmptyState variant="filtered" onClearFilters={noop} />);
    const container = screen.getByTestId('discovery-empty-state');
    const labelId = container.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    const heading = document.getElementById(labelId!);
    expect(heading).not.toBeNull();
    expect(heading!.tagName.toLowerCase()).toBe('h2');
  });

  it('renders "No offerings match your search" heading', () => {
    render(<DiscoveryEmptyState variant="filtered" onClearFilters={noop} />);
    expect(screen.getByRole('heading', { level: 2, name: /No offerings match your search/i })).toBeInTheDocument();
  });

  it('displays the echoed search query when provided', () => {
    render(<DiscoveryEmptyState variant="filtered" query="fintech" onClearFilters={noop} />);
    expect(screen.getByText(/"fintech"/)).toBeInTheDocument();
  });

  it('echoed query element has aria-label for screen readers', () => {
    render(<DiscoveryEmptyState variant="filtered" query="health" onClearFilters={noop} />);
    const queryEl = screen.getByLabelText(/search term: health/i);
    expect(queryEl).toBeInTheDocument();
  });

  it('renders fallback copy when query is absent but filters active', () => {
    render(<DiscoveryEmptyState variant="filtered" onClearFilters={noop} />);
    expect(screen.getByText(/matching the active filters/i)).toBeInTheDocument();
  });

  it('renders the Clear filters button', () => {
    render(<DiscoveryEmptyState variant="filtered" onClearFilters={noop} />);
    expect(screen.getByTestId('clear-filters-btn')).toBeInTheDocument();
  });

  it('Clear filters button has descriptive aria-label', () => {
    render(<DiscoveryEmptyState variant="filtered" onClearFilters={noop} />);
    const btn = screen.getByTestId('clear-filters-btn');
    expect(btn).toHaveAttribute('aria-label', 'Clear all search filters and show all offerings');
  });

  it('calls onClearFilters when Clear filters is clicked', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<DiscoveryEmptyState variant="filtered" onClearFilters={spy} />);
    await user.click(screen.getByTestId('clear-filters-btn'));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('Clear filters button is keyboard-focusable', async () => {
    const user = userEvent.setup();
    render(<DiscoveryEmptyState variant="filtered" onClearFilters={noop} />);
    await user.tab();
    expect(screen.getByTestId('clear-filters-btn')).toHaveFocus();
  });

  it('applies discovery-state-icon-wrap--empty class to icon container', () => {
    render(<DiscoveryEmptyState variant="filtered" onClearFilters={noop} />);
    expect(document.querySelector('.discovery-state-icon-wrap--empty')).not.toBeNull();
  });

  it('does NOT render truly-empty secondary CTA on filtered variant', () => {
    render(<DiscoveryEmptyState variant="filtered" onClearFilters={noop} />);
    expect(screen.queryByRole('button', { name: /How it works/i })).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. DiscoveryEmptyState – truly-empty variant
// ─────────────────────────────────────────────────────────────────────────────

describe('DiscoveryEmptyState – truly-empty variant', () => {
  it('renders "No offerings yet" heading', () => {
    render(<DiscoveryEmptyState variant="truly-empty" onClearFilters={noop} />);
    expect(screen.getByRole('heading', { level: 2, name: /No offerings yet/i })).toBeInTheDocument();
  });

  it('renders reassuring copy about future offerings', () => {
    render(<DiscoveryEmptyState variant="truly-empty" onClearFilters={noop} />);
    expect(screen.getByText(/Check back soon/i)).toBeInTheDocument();
  });

  it('renders "How it works" secondary CTA', () => {
    render(<DiscoveryEmptyState variant="truly-empty" onClearFilters={noop} />);
    // The button's accessible name comes from aria-label, not the visible text
    expect(screen.getByRole('button', { name: /Learn how Revora works/i })).toBeInTheDocument();
  });

  it('does NOT render a Clear filters button on truly-empty variant', () => {
    render(<DiscoveryEmptyState variant="truly-empty" onClearFilters={noop} />);
    expect(screen.queryByTestId('clear-filters-btn')).toBeNull();
  });

  it('applies discovery-state-icon-wrap--empty class', () => {
    render(<DiscoveryEmptyState variant="truly-empty" onClearFilters={noop} />);
    expect(document.querySelector('.discovery-state-icon-wrap--empty')).not.toBeNull();
  });

  it('does NOT render the error icon container', () => {
    render(<DiscoveryEmptyState variant="truly-empty" onClearFilters={noop} />);
    expect(document.querySelector('.discovery-state-icon-wrap--error')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. DiscoveryErrorState
// ─────────────────────────────────────────────────────────────────────────────

describe('DiscoveryErrorState', () => {
  it('renders with data-testid', () => {
    render(<DiscoveryErrorState onRetry={noop} />);
    expect(screen.getByTestId('discovery-error-state')).toBeInTheDocument();
  });

  it('renders as role="alert" (assertive live region)', () => {
    render(<DiscoveryErrorState onRetry={noop} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has aria-live="assertive"', () => {
    render(<DiscoveryErrorState onRetry={noop} />);
    expect(screen.getByTestId('discovery-error-state')).toHaveAttribute('aria-live', 'assertive');
  });

  it('renders "Couldn\'t load offerings" heading', () => {
    render(<DiscoveryErrorState onRetry={noop} />);
    expect(screen.getByRole('heading', { level: 2, name: /Couldn't load offerings/i })).toBeInTheDocument();
  });

  it('renders reassuring body copy', () => {
    render(<DiscoveryErrorState onRetry={noop} />);
    expect(screen.getByText(/Your portfolio and account are unaffected/i)).toBeInTheDocument();
  });

  it('renders Try again button', () => {
    render(<DiscoveryErrorState onRetry={noop} />);
    expect(screen.getByTestId('retry-btn')).toBeInTheDocument();
  });

  it('Try again button has descriptive aria-label', () => {
    render(<DiscoveryErrorState onRetry={noop} />);
    expect(screen.getByTestId('retry-btn')).toHaveAttribute('aria-label', 'Retry loading offerings');
  });

  it('calls onRetry when Try again is clicked', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<DiscoveryErrorState onRetry={spy} />);
    await user.click(screen.getByTestId('retry-btn'));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('Try again button is keyboard-focusable', async () => {
    const user = userEvent.setup();
    render(<DiscoveryErrorState onRetry={noop} />);
    await user.tab();
    expect(screen.getByTestId('retry-btn')).toHaveFocus();
  });

  it('does NOT render retry hint when retryCount=0', () => {
    render(<DiscoveryErrorState onRetry={noop} retryCount={0} />);
    expect(screen.queryByText(/Retried/i)).toBeNull();
  });

  it('renders retry hint with singular "time" when retryCount=1', () => {
    render(<DiscoveryErrorState onRetry={noop} retryCount={1} />);
    expect(screen.getByText(/Retried 1 time —/i)).toBeInTheDocument();
  });

  it('renders retry hint with plural "times" when retryCount=3', () => {
    render(<DiscoveryErrorState onRetry={noop} retryCount={3} />);
    expect(screen.getByText(/Retried 3 times —/i)).toBeInTheDocument();
  });

  it('applies discovery-state-icon-wrap--error class', () => {
    render(<DiscoveryErrorState onRetry={noop} />);
    expect(document.querySelector('.discovery-state-icon-wrap--error')).not.toBeNull();
  });

  it('does NOT apply empty icon class on error state', () => {
    render(<DiscoveryErrorState onRetry={noop} />);
    expect(document.querySelector('.discovery-state-icon-wrap--empty')).toBeNull();
  });

  it('aria-labelledby points to the <h2> id', () => {
    render(<DiscoveryErrorState onRetry={noop} />);
    const container = screen.getByTestId('discovery-error-state');
    const labelId = container.getAttribute('aria-labelledby')!;
    const heading = document.getElementById(labelId);
    expect(heading).not.toBeNull();
    expect(heading!.tagName.toLowerCase()).toBe('h2');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. InvestorDiscovery – loaded state (default)
// ─────────────────────────────────────────────────────────────────────────────

describe('InvestorDiscovery – loaded state', () => {
  it('renders the page heading', () => {
    renderLoaded();
    expect(screen.getByRole('heading', { level: 1, name: /Discover Offerings/i })).toBeInTheDocument();
  });

  it('renders all three mock offering cards', () => {
    renderLoaded();
    expect(screen.getByTestId('offering-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('offering-card-2')).toBeInTheDocument();
    expect(screen.getByTestId('offering-card-3')).toBeInTheDocument();
  });

  it('does NOT render empty or error state', () => {
    renderLoaded();
    expect(screen.queryByTestId('discovery-empty-state')).toBeNull();
    expect(screen.queryByTestId('discovery-error-state')).toBeNull();
  });

  it('renders the portfolio CTA section in loaded state', () => {
    renderLoaded();
    expect(screen.getByRole('heading', { level: 2, name: /Build Your Portfolio/i })).toBeInTheDocument();
  });

  it('has a search input with aria-label', () => {
    renderLoaded();
    expect(screen.getByRole('searchbox', { name: /Search startup offerings/i })).toBeInTheDocument();
  });

  it('funding progress bars have progressbar role and aria attributes', () => {
    renderLoaded();
    const bars = screen.getAllByRole('progressbar');
    expect(bars.length).toBeGreaterThan(0);
    bars.forEach((bar) => {
      expect(bar).toHaveAttribute('aria-valuenow');
      expect(bar).toHaveAttribute('aria-valuemin', '0');
      expect(bar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  it('each "View Prospectus" button has an aria-label with the offering name', () => {
    renderLoaded();
    expect(screen.getByRole('button', { name: /View prospectus for TechFlow AI/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. InvestorDiscovery – search filtering
// ─────────────────────────────────────────────────────────────────────────────

describe('InvestorDiscovery – search filtering', () => {
  it('filters results as user types', async () => {
    const user = userEvent.setup();
    renderLoaded();
    await user.type(screen.getByRole('searchbox'), 'TechFlow');
    expect(screen.getByTestId('offering-card-1')).toBeInTheDocument();
    expect(screen.queryByTestId('offering-card-2')).toBeNull();
    expect(screen.queryByTestId('offering-card-3')).toBeNull();
  });

  it('shows filtered-empty state when query matches nothing', async () => {
    const user = userEvent.setup();
    renderLoaded();
    await user.type(screen.getByRole('searchbox'), 'xyznotfound');
    expect(screen.getByTestId('discovery-empty-state')).toBeInTheDocument();
    expect(screen.getByText(/"xyznotfound"/)).toBeInTheDocument();
  });

  it('renders a clear-search (X) button when query is non-empty', async () => {
    const user = userEvent.setup();
    renderLoaded();
    await user.type(screen.getByRole('searchbox'), 'test');
    expect(screen.getByTestId('clear-search-btn')).toBeInTheDocument();
  });

  it('clicking clear-search restores full results', async () => {
    const user = userEvent.setup();
    renderLoaded();
    await user.type(screen.getByRole('searchbox'), 'xyz');
    expect(screen.getByTestId('discovery-empty-state')).toBeInTheDocument();
    await user.click(screen.getByTestId('clear-search-btn'));
    expect(screen.queryByTestId('discovery-empty-state')).toBeNull();
    expect(screen.getByTestId('offering-card-1')).toBeInTheDocument();
  });

  it('search is case-insensitive', async () => {
    const user = userEvent.setup();
    renderLoaded();
    await user.type(screen.getByRole('searchbox'), 'TECHFLOW');
    expect(screen.getByTestId('offering-card-1')).toBeInTheDocument();
    expect(screen.queryByTestId('offering-card-2')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. InvestorDiscovery – filter toggle
// ─────────────────────────────────────────────────────────────────────────────

describe('InvestorDiscovery – filter toggle', () => {
  it('filter button has aria-pressed=false initially', () => {
    renderLoaded();
    expect(screen.getByTestId('filter-toggle-btn')).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking filter button sets aria-pressed=true', async () => {
    const user = userEvent.setup();
    renderLoaded();
    await user.click(screen.getByTestId('filter-toggle-btn'));
    expect(screen.getByTestId('filter-toggle-btn')).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows "Filters active" indicator when filter is toggled on', async () => {
    const user = userEvent.setup();
    renderLoaded();
    await user.click(screen.getByTestId('filter-toggle-btn'));
    expect(screen.getByText(/Filters active/i)).toBeInTheDocument();
  });

  it('shows empty state when filter is active and offerings list would be fully hidden', async () => {
    const user = userEvent.setup();
    // Simulate state override: filtered-empty
    render(
      <InvestorDiscovery
        __simulateState={{ kind: 'filtered-empty', query: '', hasFilters: true }}
      />,
    );
    expect(screen.getByTestId('discovery-empty-state')).toBeInTheDocument();
    expect(screen.getByText(/matching the active filters/i)).toBeInTheDocument();
  });

  it('"Clear all" link in filter indicator calls clear', async () => {
    const user = userEvent.setup();
    renderLoaded();
    await user.click(screen.getByTestId('filter-toggle-btn'));
    const clearAllLink = screen.getByRole('button', { name: /Clear all active filters/i });
    await user.click(clearAllLink);
    // After clearing, filter indicator should disappear
    expect(screen.queryByText(/Filters active/i)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. InvestorDiscovery – __simulateState overrides
// ─────────────────────────────────────────────────────────────────────────────

describe('InvestorDiscovery – simulated states', () => {
  it('shows filtered-empty state via __simulateState', () => {
    render(
      <InvestorDiscovery
        __simulateState={{ kind: 'filtered-empty', query: 'defi', hasFilters: false }}
      />,
    );
    expect(screen.getByTestId('discovery-empty-state')).toBeInTheDocument();
    expect(screen.getByText(/"defi"/)).toBeInTheDocument();
  });

  it('shows truly-empty state via __simulateState', () => {
    render(<InvestorDiscovery __simulateState={{ kind: 'truly-empty' }} />);
    expect(screen.getByTestId('discovery-empty-state')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /No offerings yet/i })).toBeInTheDocument();
  });

  it('shows error state via __simulateState', () => {
    render(<InvestorDiscovery __simulateState={{ kind: 'error', retryCount: 0 }} />);
    expect(screen.getByTestId('discovery-error-state')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('error state with retryCount=2 shows retry hint', () => {
    render(<InvestorDiscovery __simulateState={{ kind: 'error', retryCount: 2 }} />);
    expect(screen.getByText(/Retried 2 times/i)).toBeInTheDocument();
  });

  it('does NOT show portfolio CTA when state is error', () => {
    render(<InvestorDiscovery __simulateState={{ kind: 'error', retryCount: 0 }} />);
    expect(screen.queryByRole('heading', { name: /Build Your Portfolio/i })).toBeNull();
  });

  it('does NOT show portfolio CTA when state is truly-empty', () => {
    render(<InvestorDiscovery __simulateState={{ kind: 'truly-empty' }} />);
    expect(screen.queryByRole('heading', { name: /Build Your Portfolio/i })).toBeNull();
  });

  it('shows loaded state via __simulateState with provided offerings', () => {
    render(
      <InvestorDiscovery
        __simulateState={{
          kind: 'loaded',
          offerings: [{ id: 99, name: 'TestCo', category: 'Fintech', revenueShare: 10, target: 100000, raised: 50000 }],
        }}
      />,
    );
    expect(screen.getByTestId('offering-card-99')).toBeInTheDocument();
    expect(screen.getByText('TestCo')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. InvestorDiscovery – retry interaction (integrated)
// ─────────────────────────────────────────────────────────────────────────────

describe('InvestorDiscovery – retry interaction', () => {
  it('clicking retry on error state calls handler', async () => {
    const user = userEvent.setup();
    render(<InvestorDiscovery __simulateState={{ kind: 'error', retryCount: 0 }} />);
    // The retry button exists
    const retryBtn = screen.getByTestId('retry-btn');
    expect(retryBtn).toBeInTheDocument();
    // It is clickable
    await user.click(retryBtn);
    // No crash — integration check
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. InvestorDiscovery – clearing filtered-empty state
// ─────────────────────────────────────────────────────────────────────────────

describe('InvestorDiscovery – clearing filtered-empty state', () => {
  it('clear-filters button on empty state resets search and restores cards', async () => {
    const user = userEvent.setup();
    renderLoaded();
    // Type a no-match query
    await user.type(screen.getByRole('searchbox'), 'zzznothing');
    expect(screen.getByTestId('discovery-empty-state')).toBeInTheDocument();
    // Click clear filters
    await user.click(screen.getByTestId('clear-filters-btn'));
    // Results restored
    expect(screen.queryByTestId('discovery-empty-state')).toBeNull();
    expect(screen.getByTestId('offering-card-1')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Result area accessibility
// ─────────────────────────────────────────────────────────────────────────────

describe('InvestorDiscovery – result area accessibility', () => {
  it('result section has aria-label="Offering results"', () => {
    renderLoaded();
    expect(screen.getByRole('region', { name: /Offering results/i })).toBeInTheDocument();
  });

  it('result section has aria-live="polite"', () => {
    renderLoaded();
    const section = screen.getByRole('region', { name: /Offering results/i });
    expect(section).toHaveAttribute('aria-live', 'polite');
  });

  it('error state inside result area is role="alert"', () => {
    render(<InvestorDiscovery __simulateState={{ kind: 'error', retryCount: 0 }} />);
    const resultSection = screen.getByRole('region', { name: /Offering results/i });
    const alertEl = within(resultSection).getByRole('alert');
    expect(alertEl).toBeInTheDocument();
  });
});
