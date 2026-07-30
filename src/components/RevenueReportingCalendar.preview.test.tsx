import { act, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RevenueReportingCalendar } from './RevenueReportingCalendar';
import type { RevenueReport } from './RevenueReportingCalendar.types';

const previewReports: RevenueReport[] = [
  {
    id: 'march-period',
    date: '2026-03-08',
    dueDate: '2026-03-08',
    status: 'accepted',
    grossRevenue: 1000,
    currency: 'USD',
    payoutStatus: 'confirmed',
  },
  {
    id: 'april-period',
    date: '2026-04-08',
    dueDate: '2026-04-08',
    status: 'accepted',
    grossRevenue: 1250,
    currency: 'USD',
    payoutStatus: 'confirmed',
  },
];

const renderCalendar = () => render(
  <RevenueReportingCalendar
    reports={previewReports}
    viewMonth="2026-04"
    locale="en-US"
  />,
);

const getAprilCell = () => screen.getByLabelText(/April 8, 2026.*Accepted/i);

function setMatchMedia(reducedMotion = false) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reducedMotion && query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('RevenueReportingCalendar hover/focus preview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setMatchMedia();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows reported revenue, payout status, variance, and a trend after the hover delay', () => {
    renderCalendar();
    const cell = getAprilCell();

    fireEvent.mouseEnter(cell);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(299));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    const preview = screen.getByRole('tooltip');
    expect(preview).toHaveTextContent('Reported revenue');
    expect(preview).toHaveTextContent('$1,250');
    expect(preview).toHaveTextContent('Payout status');
    expect(preview).toHaveTextContent('Confirmed');
    expect(preview).toHaveTextContent('vs prior period');
    expect(preview).toHaveTextContent('+25.0%');
    expect(preview).toHaveTextContent('Revenue trend');
    expect(cell).toHaveAttribute('aria-describedby', preview.id);
  });

  it('opens immediately on keyboard focus, dismisses with Escape, and closes after the blur grace period', () => {
    renderCalendar();
    const cell = getAprilCell();

    fireEvent.focus(cell);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.keyDown(cell, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // Escape suppresses only the current focus/hover session.
    fireEvent.blur(cell);
    fireEvent.focus(cell);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.blur(cell);
    act(() => vi.advanceTimersByTime(149));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('uses an edge-safe bottom-start placement near the upper-left viewport edge', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 300 });
    renderCalendar();
    const cell = getAprilCell();
    vi.spyOn(cell, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 8,
      width: 44,
      height: 44,
      top: 8,
      right: 44,
      bottom: 52,
      left: 0,
      toJSON: () => ({}),
    });

    fireEvent.focus(cell);
    expect(screen.getByRole('tooltip')).toHaveClass('rc-day-preview--bottom-start');
  });

  it('bypasses the hover delay when reduced motion is requested', () => {
    setMatchMedia(true);
    renderCalendar();

    fireEvent.mouseEnter(getAprilCell());
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('has no axe violations while the focus-triggered preview is described by its cell', async () => {
    vi.useRealTimers();
    const { container } = renderCalendar();
    const cell = getAprilCell();
    fireEvent.focus(cell);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
