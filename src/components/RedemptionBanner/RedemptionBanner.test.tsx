import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RedemptionBanner, type RedemptionStatus } from './RedemptionBanner';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Fixed clock — day/hour/minute rollovers in the countdown must be
 * reproducible, so every test starts from the same instant.
 */
const NOW = new Date('2026-01-01T00:00:00.000Z');
const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs);

const dismiss = () => fireEvent.click(screen.getByLabelText('Dismiss banner'));

describe('RedemptionBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('normal path', () => {
    const variants: Array<[RedemptionStatus, string, string]> = [
      ['upcoming', '📅 Upcoming', 'redemption-banner--upcoming'],
      ['active', '🟢 Active', 'redemption-banner--active'],
      ['closing-soon', '⏳ Closing Soon', 'redemption-banner--closing-soon'],
    ];

    it.each(variants)('renders the %s variant', (status, label, className) => {
      render(<RedemptionBanner windowId={`variant-${status}`} status={status} endDate={at(2 * DAY)} />);

      expect(screen.getByText(label)).toBeInTheDocument();
      const region = screen.getByRole('region');
      expect(region).toHaveClass(className);
      expect(region).toHaveAttribute('aria-live', 'polite');
    });

    it('renders the eligibility hint only when one is supplied', () => {
      const { unmount } = render(
        <RedemptionBanner
          windowId="hint-with"
          status="active"
          endDate={at(2 * DAY)}
          eligibilityHint="Accredited investors only"
        />
      );
      expect(screen.getByText('(Accredited investors only)')).toBeInTheDocument();
      unmount();

      render(<RedemptionBanner windowId="hint-without" status="active" endDate={at(2 * DAY)} />);
      expect(screen.queryByText(/\(/)).not.toBeInTheDocument();
    });

    it('invokes onCtaClick and honours a custom CTA label', () => {
      const onCtaClick = vi.fn();
      render(
        <RedemptionBanner
          windowId="cta"
          status="active"
          endDate={at(2 * DAY)}
          ctaText="Confirm redemption"
          onCtaClick={onCtaClick}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Confirm redemption' }));
      expect(onCtaClick).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * Issue #768 — regression suite for the `if (!isVisible) return null;`
   * branch (RedemptionBanner.tsx). The empty-result contract must stay
   * observable: a suppressed banner renders nothing at all, never a partial
   * shell, and dismissal must survive a remount for the same window id.
   */
  describe('regression #768 — `!isVisible` empty-result contract', () => {
    it('returns null when the window was dismissed in a previous session', () => {
      localStorage.setItem('redemption_banner_dismissed_remount-a', 'true');

      const { container } = render(
        <RedemptionBanner windowId="remount-a" status="active" endDate={at(2 * DAY)} />
      );

      expect(container.firstChild).toBeNull();
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
    });

    it('returns null immediately after the dismiss action and persists the flag', () => {
      const { container } = render(
        <RedemptionBanner windowId="dismiss-now" status="closing-soon" endDate={at(2 * DAY)} />
      );
      expect(screen.getByRole('region')).toBeInTheDocument();

      act(() => dismiss());

      expect(localStorage.getItem('redemption_banner_dismissed_dismiss-now')).toBe('true');
      expect(container.firstChild).toBeNull();
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
    });

    it('keeps returning null on remount of the same window id', () => {
      const { unmount } = render(
        <RedemptionBanner windowId="dismiss-then-remount" status="active" endDate={at(2 * DAY)} />
      );
      act(() => dismiss());
      unmount();

      const { container } = render(
        <RedemptionBanner windowId="dismiss-then-remount" status="active" endDate={at(2 * DAY)} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('scopes dismissal to a single window id (boundary)', () => {
      localStorage.setItem('redemption_banner_dismissed_scoped-a', 'true');

      render(
        <>
          <RedemptionBanner windowId="scoped-a" status="active" endDate={at(2 * DAY)} />
          <RedemptionBanner windowId="scoped-b" status="active" endDate={at(2 * DAY)} />
        </>
      );

      expect(screen.getAllByRole('region')).toHaveLength(1);
    });

    it('becomes visible again when the window id rotates after dismissal', () => {
      const { container, rerender } = render(
        <RedemptionBanner windowId="rotate-old" status="active" endDate={at(2 * DAY)} />
      );
      act(() => dismiss());
      expect(container.firstChild).toBeNull();

      rerender(<RedemptionBanner windowId="rotate-new" status="active" endDate={at(2 * DAY)} />);

      expect(screen.getByRole('region')).toBeInTheDocument();
    });
  });

  describe('boundary and error handling', () => {
    it('renders "Ended" once the window has elapsed', () => {
      render(<RedemptionBanner windowId="elapsed" status="closing-soon" endDate={at(-1)} />);
      expect(screen.getByText('Closes in: Ended')).toBeInTheDocument();
    });

    it('renders "Ended" for an unparseable end date instead of NaN values', () => {
      render(
        <RedemptionBanner windowId="invalid-date" status="active" endDate={new Date('not-a-date')} />
      );

      const countdown = screen.getByText(/Closes in:/);
      expect(countdown).toHaveTextContent('Closes in: Ended');
      expect(countdown.textContent).not.toMatch(/NaN/);
    });

    it('formats a multi-day window as days and hours', () => {
      render(<RedemptionBanner windowId="multi-day" status="upcoming" endDate={at(2 * DAY + 3 * HOUR)} />);
      expect(screen.getByText('Closes in: 2d 3h')).toBeInTheDocument();
    });

    it('formats a sub-day window as hours and minutes', () => {
      render(<RedemptionBanner windowId="sub-day" status="closing-soon" endDate={at(5 * HOUR + 30 * MINUTE)} />);
      expect(screen.getByText('Closes in: 5h 30m')).toBeInTheDocument();
    });

    it('recomputes the countdown on each interval tick', () => {
      render(<RedemptionBanner windowId="ticking" status="active" endDate={at(10 * HOUR)} />);
      expect(screen.getByText('Closes in: 10h 0m')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(MINUTE);
      });

      expect(screen.getByText('Closes in: 9h 59m')).toBeInTheDocument();
    });

    it('tears the interval down on unmount', () => {
      const { unmount } = render(
        <RedemptionBanner windowId="teardown" status="active" endDate={at(10 * HOUR)} />
      );

      unmount();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('does not schedule a countdown interval when the banner is not visible', () => {
      localStorage.setItem('redemption_banner_dismissed_no-timer', 'true');
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

      render(<RedemptionBanner windowId="no-timer" status="active" endDate={at(10 * HOUR)} />);

      expect(screen.queryByRole('region')).not.toBeInTheDocument();
      expect(setIntervalSpy).not.toHaveBeenCalled();
    });
  });
});
