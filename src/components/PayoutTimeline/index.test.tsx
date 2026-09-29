import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  PayoutTimeline,
  formatDisplayDate,
  getTodayMarkerPercent,
  sortPayoutEvents,
  statusLabel,
  type PayoutEvent,
} from './index';

const EVENTS: PayoutEvent[] = [
  { id: 'later', date: '2026-06-01', label: 'Later payout', status: 'scheduled' },
  { id: 'earlier', date: '2026-01-01', label: 'Earlier payout', status: 'paid' },
];

describe('PayoutTimeline public index', () => {
  it('re-exports deterministic helper behavior for sorting and marker boundaries', () => {
    expect(sortPayoutEvents(EVENTS).map((event) => event.id)).toEqual([
      'earlier',
      'later',
    ]);
    expect(getTodayMarkerPercent(sortPayoutEvents(EVENTS), '2025-12-01')).toBe(0);
    expect(getTodayMarkerPercent(sortPayoutEvents(EVENTS), '2026-07-01')).toBe(100);
    expect(getTodayMarkerPercent([], '2026-01-01')).toBeNull();
  });

  it('preserves safe fallback behavior for invalid public values', () => {
    expect(formatDisplayDate('not-a-date')).toBeTruthy();
    expect(statusLabel('unknown' as PayoutEvent['status'])).toBe('unknown');
  });

  it('renders the empty state as no timeline and transitions to sorted events', () => {
    const { rerender } = render(<PayoutTimeline events={[]} autoScrollToToday={false} />);
    expect(screen.queryByTestId('payout-timeline')).not.toBeInTheDocument();

    rerender(
      <PayoutTimeline events={EVENTS} today="2026-01-01" autoScrollToToday={false} />,
    );
    expect(screen.getByTestId('payout-timeline')).toBeInTheDocument();
    expect(screen.getAllByRole('button')[0]).toHaveAccessibleName(/earlier payout.*paid/i);
    expect(screen.getAllByRole('button')[1]).toHaveAccessibleName(/later payout.*scheduled/i);
  });

  it('renders the public aria label and today marker at an event boundary', () => {
    render(
      <PayoutTimeline
        events={EVENTS}
        today="2026-06-01"
        ariaLabel="Investor payouts"
        autoScrollToToday={false}
      />,
    );

    expect(
      screen.getByRole('region', { name: 'Investor payouts scroll area' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('payout-timeline-today')).toHaveStyle({
      '--pt-today': '100%',
    });
  });
});
