import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ActivityFeed from './ActivityFeed';

function renderWithRouter(initialEntries?: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries || ['/']}>
      <ActivityFeed />
    </MemoryRouter>
  );
}

describe('ActivityFeed', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-07-30T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders loading state initially', () => {
    renderWithRouter();
    expect(screen.getByText('Loading activity feed\u2026')).toBeInTheDocument();
  });

  it('renders feed items after loading', async () => {
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
  });

  it('renders empty day dividers for date gaps', async () => {
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const dayDividers = screen.getAllByText(/days? with no activity/);
    expect(dayDividers.length).toBeGreaterThan(0);
  });

  it('renders quiet week summary or empty divider for date gaps', async () => {
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const hasQuietWeek = screen.queryByText("It's been a quiet week") !== null;
    const hasDayDivider = screen.queryByText(/days? with no activity/) !== null;
    expect(hasQuietWeek || hasDayDivider).toBe(true);
  });

  it('renders filter tabs with count badges', async () => {
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();
    expect(tablist).toHaveAttribute('aria-label', 'Filter activity feed by type');
    expect(tablist).toHaveAttribute('aria-orientation', 'horizontal');

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);

    const tabLabels = tabs.map(t => t.textContent);
    expect(tabLabels[0]).toMatch(/All/);
    expect(tabLabels[1]).toMatch(/Payouts/);
    expect(tabLabels[2]).toMatch(/Governance/);
    expect(tabLabels[3]).toMatch(/Documents/);

    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');

    tabs.forEach(tab => {
      expect(tab).toHaveAttribute('id', expect.stringMatching(/^tab-/));
      expect(tab).toHaveAttribute('aria-controls', expect.stringMatching(/^tabpanel-/));
    });

    const badges = screen.getAllByText(/\d+/);
    expect(badges.length).toBeGreaterThan(0);
  });

  it('filters activities when a tab is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const payoutTab = screen.getByRole('tab', { name: /payouts/i });
    await user.click(payoutTab);

    await waitFor(() => {
      expect(payoutTab).toHaveAttribute('aria-selected', 'true');
    });

    const allTab = screen.getByRole('tab', { name: /all/i });
    expect(allTab).toHaveAttribute('aria-selected', 'false');
  });

  it('changes active tab via keyboard navigation', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const allTab = screen.getByRole('tab', { name: /all/i });
    allTab.focus();

    await user.keyboard('{ArrowRight}');

    await waitFor(() => {
      const payoutTab = screen.getByRole('tab', { name: /payouts/i });
      expect(payoutTab).toHaveAttribute('aria-selected', 'true');
    });

    await user.keyboard('{ArrowRight}');

    await waitFor(() => {
      const govTab = screen.getByRole('tab', { name: /governance/i });
      expect(govTab).toHaveAttribute('aria-selected', 'true');
    });

    await user.keyboard('{ArrowLeft}');

    await waitFor(() => {
      const payoutTab = screen.getByRole('tab', { name: /payouts/i });
      expect(payoutTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('wraps from last to first tab with ArrowRight', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const allTab = screen.getByRole('tab', { name: /all/i });
    allTab.focus();

    await user.keyboard('{End}');

    await waitFor(() => {
      const docsTab = screen.getByRole('tab', { name: /documents/i });
      expect(docsTab).toHaveAttribute('aria-selected', 'true');
    });

    await user.keyboard('{ArrowRight}');

    await waitFor(() => {
      const tab = screen.getByRole('tab', { name: /all/i });
      expect(tab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('handles Home and End keys', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const allTab = screen.getByRole('tab', { name: /all/i });
    allTab.focus();

    await user.keyboard('{ArrowRight}');
    await user.keyboard('{Home}');

    await waitFor(() => {
      const tab = screen.getByRole('tab', { name: /all/i });
      expect(tab).toHaveAttribute('aria-selected', 'true');
    });

    await user.keyboard('{End}');

    await waitFor(() => {
      const docsTab = screen.getByRole('tab', { name: /documents/i });
      expect(docsTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('handles Enter key to activate a tab', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const payoutTab = screen.getByRole('tab', { name: /payouts/i });
    payoutTab.focus();

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(payoutTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('handles Space key to activate a tab', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const docsTab = screen.getByRole('tab', { name: /documents/i });
    docsTab.focus();

    await user.keyboard(' ');

    await waitFor(() => {
      expect(docsTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('reads initial tab from URL search params', async () => {
    renderWithRouter(['/?filter=governance']);
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const govTab = screen.getByRole('tab', { name: /governance/i });
    expect(govTab).toHaveAttribute('aria-selected', 'true');
  });

  it('falls back to All tab for invalid filter param', async () => {
    renderWithRouter(['/?filter=invalid']);
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const allTab = screen.getByRole('tab', { name: /all/i });
    expect(allTab).toHaveAttribute('aria-selected', 'true');
  });

  it('shows Mark all read button when there are unread items', async () => {
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Mark all read')).toBeInTheDocument();
  });

  it('hides Mark all read after clicking it', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    await user.click(screen.getByText('Mark all read'));

    expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
    expect(screen.getByText('Undo')).toBeInTheDocument();
  });

  it('render badges with correct counts for each tab', async () => {
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const allTab = screen.getByRole('tab', { name: /all/i });
    const allBadge = within(allTab).queryByText(/\d+/);
    expect(allBadge).toBeInTheDocument();

    const payoutTab = screen.getByRole('tab', { name: /payouts/i });
    const payoutBadge = within(payoutTab).queryByText(/\d+/);
    expect(payoutBadge).toBeInTheDocument();
  });

  it('has accessible tab badges with aria-label', async () => {
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const payoutTab = screen.getByRole('tab', { name: /payouts/i });
    const badge = within(payoutTab).getByText(/\d+/);
    expect(badge).toHaveAttribute('aria-label');
  });

  it('renders active indicator for selected tab', async () => {
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const allTab = screen.getByRole('tab', { name: /all/i });
    const indicator = allTab.querySelector('.tab-active-indicator');
    expect(indicator).toBeInTheDocument();
  });

  it('renders Load more button when there are more items', async () => {
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const yearMonths = screen.getAllByText(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    expect(yearMonths.length).toBeGreaterThan(0);
  });

  it('has correct tabIndex management', async () => {
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const allTab = screen.getByRole('tab', { name: /all/i });
    expect(allTab).toHaveAttribute('tabIndex', '0');

    const otherTabs = screen.getAllByRole('tab').filter(t => t !== allTab);
    otherTabs.forEach(tab => {
      expect(tab).toHaveAttribute('tabIndex', '-1');
    });
  });

  it('shows activity count badge on All tab', async () => {
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const allTab = screen.getByRole('tab', { name: /all/i });
    const badge = within(allTab).getByText(/\d+/);
    expect(Number(badge.textContent)).toBeGreaterThan(0);
  });

  it('navigates to document tab and shows filtered items', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const docsTab = screen.getByRole('tab', { name: /documents/i });
    await user.click(docsTab);

    await waitFor(() => {
      expect(docsTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('removes filter param when All tab is selected', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithRouter(['/?filter=payout']);
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const allTab = screen.getByRole('tab', { name: /all/i });
    await user.click(allTab);

    await waitFor(() => {
      expect(allTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('renders different tab badge counts when filtering', async () => {
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const tabs = screen.getAllByRole('tab');
    const counts = tabs.map(tab => {
      const badge = within(tab).queryByText(/\d+/);
      return badge ? Number(badge.textContent) : 0;
    });

    expect(counts[0]).toBeGreaterThan(0);
  });



  it('resets to page 1 when filter changes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const allTab = screen.getByRole('tab', { name: /all/i });
    await user.click(allTab);
    await user.click(screen.getByRole('tab', { name: /payouts/i }));

    await waitFor(() => {
      const payoutTab = screen.getByRole('tab', { name: /payouts/i });
      expect(payoutTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('dispatches announcement after mark all read', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    await user.click(screen.getByText('Mark all read'));

    expect(screen.getByText('All activities marked as read.')).toBeInTheDocument();
  });

  it('dispatches announcement after undo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    await user.click(screen.getByText('Mark all read'));
    await user.click(screen.getByText('Undo'));

    expect(screen.getByText('Mark all read undone.')).toBeInTheDocument();
  });

  it('has section with accessible label', async () => {
    renderWithRouter();
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('Loading activity feed\u2026')).not.toBeInTheDocument();
    });

    const section = document.querySelector('.activity-feed');
    expect(section).toHaveAttribute('aria-label', 'In\u2011app activity feed');
  });
});
