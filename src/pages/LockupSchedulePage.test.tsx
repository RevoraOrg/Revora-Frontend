import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { LockupSchedulePage } from './LockupSchedulePage';

// Wrap in router because components may use Link or expect router context
const renderPage = () => {
  return render(
    <BrowserRouter>
      <LockupSchedulePage />
    </BrowserRouter>
  );
};

describe('LockupSchedulePage Component & Integration Tests', () => {
  it('renders page titles and scenario selector correctly', () => {
    renderPage();
    expect(screen.getByText('Token Lockup & Vesting')).toBeInTheDocument();
    expect(
      screen.getByText(/Monitor your cumulative unlocked token progress/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Demo Schedule Scenarios')).toBeInTheDocument();
  });

  it('renders standard quarterly vesting progress metrics', () => {
    renderPage();
    // Verify standard cards
    const totalAllocated = screen.getByTestId('stat-total-allocated');
    expect(within(totalAllocated).getByText('1,000,000 REV')).toBeInTheDocument();

    const totalUnlocked = screen.getByTestId('stat-unlocked');
    expect(within(totalUnlocked).getByText('375,000 REV')).toBeInTheDocument(); // Cliff unlock (250,000) + Quarterly Unlock #1 (125,000) completed by simulated today '2026-10-15'

    const remaining = screen.getByTestId('stat-remaining');
    expect(within(remaining).getByText('625,000 REV')).toBeInTheDocument();

    const progress = screen.getByTestId('stat-progress-percentage');
    expect(within(progress).getByText('37.5%')).toBeInTheDocument(); // 25% + 12.5% = 37.5% as of '2026-10-15'
  });

  it('differentiates completed and upcoming ticks on the timeline', () => {
    renderPage();
    // 7 unlocks are present in standard quarterly
    // Ticks matching completed and upcoming classes should be found
    const ticks = screen.getAllByRole('button', { name: /Unlock on/i });
    expect(ticks).toHaveLength(7);

    // Completed: cliff ('2026-07-01') and quarterly #1 ('2026-10-01')
    const completedTicks = ticks.filter((tick) =>
      tick.className.includes('lsp-tick-target--completed')
    );
    expect(completedTicks).toHaveLength(2);

    const upcomingTicks = ticks.filter((tick) =>
      tick.className.includes('lsp-tick-target--upcoming')
    );
    expect(upcomingTicks).toHaveLength(5);
  });

  it('displays tooltip popover on hover of a timeline tick mark', () => {
    renderPage();

    // Select the cliff unlock tick
    const cliffTick = screen.getByTestId('lockup-tick-q-cliff');
    expect(cliffTick).toBeInTheDocument();

    // Tooltip popover should not be visible initially
    expect(screen.queryByTestId('lockup-popover-q-cliff')).not.toBeInTheDocument();

    // Hover to trigger popover
    fireEvent.mouseEnter(cliffTick);

    const popover = screen.getByTestId('lockup-popover-q-cliff');
    expect(popover).toBeInTheDocument();
    expect(within(popover).getByText('Cliff Unlock (25%)')).toBeInTheDocument();
    expect(within(popover).getByText('Jul 1, 2026')).toBeInTheDocument();
    expect(within(popover).getByText('250,000 REV')).toBeInTheDocument();
    // 25% appears twice: unlock % and cumulative unlocked %
    expect(within(popover).getAllByText('25%')).toHaveLength(2);

    // Mouse leave to hide
    fireEvent.mouseLeave(cliffTick);
    expect(screen.queryByTestId('lockup-popover-q-cliff')).not.toBeInTheDocument();
  });

  it('displays tooltip popover on keyboard focus of a timeline tick mark', () => {
    renderPage();

    const cliffTick = screen.getByTestId('lockup-tick-q-cliff');

    // Focus using fireEvent
    fireEvent.focus(cliffTick);

    const popover = screen.getByTestId('lockup-popover-q-cliff');
    expect(popover).toBeInTheDocument();

    // Blur focus
    fireEvent.blur(cliffTick);
    expect(screen.queryByTestId('lockup-popover-q-cliff')).not.toBeInTheDocument();
  });

  it('renders the accessible alternative table and supports sorting by Date and Amount', () => {
    renderPage();
    const table = screen.getByRole('table', { name: /Token lockup schedule details/i });
    expect(table).toBeInTheDocument();

    const rows = screen.getAllByTestId(/table-row-/i);
    expect(rows).toHaveLength(7); // 7 items in nominal schedule

    // Click sorting by tokens unlocked (amount)
    const amountHeader = screen.getByRole('columnheader', { name: /Tokens Unlocked/i });
    fireEvent.click(amountHeader);

    // Verify lowest amount is first: 12.5% (125,000) vs 25% (250,000)
    const sortedRows = screen.getAllByTestId(/table-row-/i);
    expect(within(sortedRows[0]).getByText('125,000 REV')).toBeInTheDocument();
    expect(within(sortedRows[6]).getByText('250,000 REV')).toBeInTheDocument();
  });

  it('switches scenarios and updates state accordingly', () => {
    renderPage();

    // Click "Pre-Vesting Schedule"
    const preVestingBtn = screen.getByRole('button', { name: 'Pre-Vesting Schedule' });
    fireEvent.click(preVestingBtn);

    // Progress percentage should be 0% since today '2026-10-15' is before '2027-01-01'
    const progressCard = screen.getByTestId('stat-progress-percentage');
    expect(within(progressCard).getByText('0%')).toBeInTheDocument();

    // All ticks should be upcoming
    const ticks = screen.getAllByRole('button', { name: /Unlock on/i });
    const upcomingTicks = ticks.filter((tick) =>
      tick.className.includes('lsp-tick-target--upcoming')
    );
    expect(upcomingTicks).toHaveLength(ticks.length);
  });

  it('handles fully vested scenario gracefully', () => {
    renderPage();

    // Click "Already Fully Vested"
    const fullyVestedBtn = screen.getByRole('button', { name: 'Already Fully Vested' });
    fireEvent.click(fullyVestedBtn);

    // Progress percentage should be 100%
    const progressCard = screen.getByTestId('stat-progress-percentage');
    expect(within(progressCard).getByText('100%')).toBeInTheDocument();

    // Next unlock should display fully vested text
    const nextUnlockCard = screen.getByTestId('stat-next-unlock');
    expect(within(nextUnlockCard).getByText('Fully Vested')).toBeInTheDocument();
    expect(within(nextUnlockCard).getByText('No upcoming unlocks')).toBeInTheDocument();
  });

  it('renders error state correctly when error scenario is active', () => {
    renderPage();

    // Click "Error Loading Schedule"
    const errorBtn = screen.getByRole('button', { name: 'Error Loading Schedule' });
    fireEvent.click(errorBtn);

    expect(screen.getByTestId('lockup-error-state')).toBeInTheDocument();
    expect(screen.getByText('Failed to load schedule')).toBeInTheDocument();

    // Click reset to nominal
    const resetBtn = screen.getByRole('button', { name: 'Reset to Standard Schedule' });
    fireEvent.click(resetBtn);

    expect(screen.getByTestId('stat-total-allocated')).toBeInTheDocument();
  });

  it('renders empty state when empty scenario is active', () => {
    renderPage();

    // Click "No Lockup Schedule"
    const emptyBtn = screen.getByRole('button', { name: 'No Lockup Schedule' });
    fireEvent.click(emptyBtn);

    expect(screen.getByTestId('lockup-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No active lockup schedules')).toBeInTheDocument();

    // Click View Demo Schedule to reset scenario
    const viewDemoBtn = screen.getByRole('button', { name: 'View Demo Schedule' });
    fireEvent.click(viewDemoBtn);

    expect(screen.getByTestId('stat-total-allocated')).toBeInTheDocument();
  });

  it('renders loading states and skeletons correctly when loading-state is active', () => {
    renderPage();

    // Click "Schedule Loading"
    const loadingBtn = screen.getByRole('button', { name: 'Schedule Loading' });
    fireEvent.click(loadingBtn);

    // Verify skeleton loading wrappers are present
    expect(screen.getByTestId('lockup-loading-skeletons')).toBeInTheDocument();
  });
});
