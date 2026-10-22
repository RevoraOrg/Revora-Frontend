import { renderHook, act } from "@testing-library/react";
import { useCountdown, type Countdown } from "./useCountdown";

/**
 * Focused behavior coverage for the Countdown contract (issue #794).
 *
 * Determinism strategy:
 * - The wall clock is frozen with fake timers at `NOW`, so every
 *   `Date.now()` call inside the hook resolves to a known instant.
 * - Targets are expressed as offsets in seconds from `NOW`.
 * - Interval ticks are driven explicitly with `vi.advanceTimersByTime`
 *   wrapped in `act`, so no test relies on real elapsed time.
 */

const NOW = Date.parse("2026-07-29T08:00:00Z");

const secondsFromNow = (seconds: number) => new Date(NOW + seconds * 1000);

const renderAt = (targetDate: Date) =>
  renderHook((date: Date) => useCountdown(date), { initialProps: targetDate });

const matchMediaStub = (matches: boolean) =>
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );

describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Countdown contract", () => {
    it("exposes the documented fields with correct values", () => {
      const { result } = renderAt(secondsFromNow(3690)); // 1h 1m 30s

      const snapshot: Countdown = result.current;
      expect(snapshot).toEqual({
        days: 0,
        hours: 1,
        minutes: 1,
        seconds: 30,
        isExpired: false,
        totalSeconds: 3690,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    });

    it("reports the host timezone", () => {
      const { result } = renderAt(secondsFromNow(60));

      expect(typeof result.current.timezone).toBe("string");
      expect(result.current.timezone.length).toBeGreaterThan(0);
      expect(result.current.timezone).toBe(
        Intl.DateTimeFormat().resolvedOptions().timeZone
      );
    });
  });

  describe("initial computation (success paths)", () => {
    it("decomposes a multi-day target into days/hours/minutes/seconds", () => {
      const { result } = renderAt(
        secondsFromNow(3 * 86400 + 2 * 3600 + 5 * 60 + 7)
      );

      expect(result.current.days).toBe(3);
      expect(result.current.hours).toBe(2);
      expect(result.current.minutes).toBe(5);
      expect(result.current.seconds).toBe(7);
      expect(result.current.totalSeconds).toBe(266707);
      expect(result.current.isExpired).toBe(false);
    });

    it("handles very large remaining spans without wrapping", () => {
      const { result } = renderAt(secondsFromNow(400 * 86400 + 13 * 3600));

      expect(result.current.days).toBe(400);
      expect(result.current.hours).toBe(13);
      expect(result.current.minutes).toBe(0);
      expect(result.current.seconds).toBe(0);
      expect(result.current.totalSeconds).toBe(34606800);
    });

    it("stays active exactly one second before the target", () => {
      const { result } = renderAt(secondsFromNow(1));

      expect(result.current.totalSeconds).toBe(1);
      expect(result.current.seconds).toBe(1);
      expect(result.current.isExpired).toBe(false);
    });
  });

  describe("expiry and boundary behavior", () => {
    it.each([
      { label: "a date in the past", target: secondsFromNow(-5) },
      { label: "the current instant", target: new Date(NOW) },
      { label: "a sub-second future instant", target: new Date(NOW + 999) },
      { label: "the epoch", target: new Date(0) },
      { label: "a pre-epoch date", target: new Date(-1) },
    ])(
      "treats $label as expired and clamps at zero",
      ({ target }) => {
        const { result } = renderAt(target);

        expect(result.current.isExpired).toBe(true);
        expect(result.current.totalSeconds).toBe(0);
        expect(result.current.days).toBe(0);
        expect(result.current.hours).toBe(0);
        expect(result.current.minutes).toBe(0);
        expect(result.current.seconds).toBe(0);
      }
    );

    // Pins current behavior: `Math.max(0, NaN)` is NaN, so an Invalid Date
    // propagates NaN through the segments and `NaN <= 0` keeps the countdown
    // "active". Documented here so a future fix is a deliberate change.
    it("propagates NaN for an Invalid Date and reports it as not expired", () => {
      const { result } = renderAt(new Date(NaN));

      expect(result.current.totalSeconds).toBeNaN();
      expect(result.current.days).toBeNaN();
      expect(result.current.hours).toBeNaN();
      expect(result.current.minutes).toBeNaN();
      expect(result.current.seconds).toBeNaN();
      expect(result.current.isExpired).toBe(false);
    });
  });

  describe("interval ticking (1s default cadence)", () => {
    it("schedules updates every second", () => {
      const setIntervalSpy = vi.spyOn(window, "setInterval");

      renderAt(secondsFromNow(90));

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it("decrements on every tick", () => {
      const { result } = renderAt(secondsFromNow(65));

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.seconds).toBe(4);
      expect(result.current.totalSeconds).toBe(64);

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.seconds).toBe(3);
      expect(result.current.totalSeconds).toBe(63);
    });

    it("crosses minute boundaries correctly", () => {
      const { result } = renderAt(secondsFromNow(65)); // 1m 5s

      act(() => {
        vi.advanceTimersByTime(6000);
      });

      expect(result.current.days).toBe(0);
      expect(result.current.hours).toBe(0);
      expect(result.current.minutes).toBe(0);
      expect(result.current.seconds).toBe(59);
      expect(result.current.totalSeconds).toBe(59);
      expect(result.current.isExpired).toBe(false);
    });

    it("flips to expired and stays clamped at zero once the target passes", () => {
      const { result } = renderAt(secondsFromNow(2));

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(result.current.isExpired).toBe(true);
      expect(result.current.totalSeconds).toBe(0);

      act(() => {
        vi.advanceTimersByTime(10_000);
      });
      expect(result.current.isExpired).toBe(true);
      expect(result.current.days).toBe(0);
      expect(result.current.hours).toBe(0);
      expect(result.current.minutes).toBe(0);
      expect(result.current.seconds).toBe(0);
    });
  });

  describe("reduced motion (60s cadence)", () => {
    it("schedules updates every minute when reduced motion is requested", () => {
      matchMediaStub(true);
      const setIntervalSpy = vi.spyOn(window, "setInterval");

      renderAt(secondsFromNow(90));

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60_000);
    });

    it("does not tick per second but updates after a full minute", () => {
      matchMediaStub(true);
      const { result } = renderAt(secondsFromNow(90));

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.totalSeconds).toBe(90);

      act(() => {
        vi.advanceTimersByTime(59_000);
      });
      expect(result.current.totalSeconds).toBe(30);
      expect(result.current.minutes).toBe(0);
      expect(result.current.seconds).toBe(30);
    });
  });

  describe("target date changes", () => {
    it("recomputes immediately when the target changes", () => {
      const { result, rerender } = renderAt(secondsFromNow(120));
      expect(result.current.totalSeconds).toBe(120);

      rerender(secondsFromNow(30));
      expect(result.current.totalSeconds).toBe(30);
      expect(result.current.seconds).toBe(30);
    });

    it("transitions from active to expired when the target moves into the past", () => {
      const { result, rerender } = renderAt(secondsFromNow(120));
      expect(result.current.isExpired).toBe(false);

      rerender(secondsFromNow(-1));
      expect(result.current.isExpired).toBe(true);
      expect(result.current.totalSeconds).toBe(0);
    });
  });

  describe("cleanup", () => {
    it("clears the interval on unmount", () => {
      const setIntervalSpy = vi.spyOn(window, "setInterval");
      const clearIntervalSpy = vi.spyOn(window, "clearInterval");

      const { unmount } = renderAt(secondsFromNow(60));
      const intervalId = setIntervalSpy.mock.results[0]?.value;

      unmount();

      const clearedIds = clearIntervalSpy.mock.calls.map((call) => call[0]);
      expect(clearedIds).toContain(intervalId);
    });

    it("keeps advancing timers harmlessly after unmount", () => {
      const { unmount } = renderAt(secondsFromNow(60));

      unmount();

      expect(() =>
        act(() => {
          vi.advanceTimersByTime(120_000);
        })
      ).not.toThrow();
    });
  });
});
