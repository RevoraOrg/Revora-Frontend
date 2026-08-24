/**
 * KpiHeader.test.tsx
 * Issue #163 – Investor Portfolio Summary: KPI header strip
 * Issue #492 – Reduced-motion variant for KPI counter animations
 * Coverage target ≥95% on KpiHeader.tsx
 */

import { render, screen, within, act } from "@testing-library/react";
import { KpiHeader } from "./KpiHeader";

// ---------------------------------------------------------------------------
// useReducedMotion is mocked so tests can flip the OS-level accessibility
// toggle deterministically without depending on window.matchMedia state.
// ---------------------------------------------------------------------------
const reducedMotion = vi.hoisted(() => ({ value: false }));
vi.mock("../hooks/useReducedMotion", () => ({
  useReducedMotion: () => reducedMotion.value,
}));

const defaultProps = {
  totalInvested: "$100,000",
  currentValue: "$103,000",
  totalReturn: 3.0,
  activeHoldings: 3,
};

function renderHeader(props: Partial<typeof defaultProps> = {}) {
  return render(<KpiHeader {...defaultProps} {...props} />);
}

// ---------------------------------------------------------------------------
// requestAnimationFrame control — lets us drive the counter tick-by-tick
// ---------------------------------------------------------------------------
let rafQueue: Array<{ id: number; cb: FrameRequestCallback }>;
let nextRafId: number;
let clockNow: number;

function flushFrames(elapsedMs = 16) {
  const queued = rafQueue;
  rafQueue = [];
  clockNow += elapsedMs;
  act(() => {
    queued.forEach(({ cb }) => cb(clockNow));
  });
}

function pendingFrameCount() {
  return rafQueue.length;
}

beforeEach(() => {
  reducedMotion.value = false;
  rafQueue = [];
  nextRafId = 1;
  clockNow = 1000;
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((cb: FrameRequestCallback) => {
      const id = nextRafId++;
      rafQueue.push({ id, cb });
      return id;
    }),
  );
  vi.stubGlobal(
    "cancelAnimationFrame",
    vi.fn((id: number) => {
      rafQueue = rafQueue.filter((frame) => frame.id !== id);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("KpiHeader", () => {
  it("renders with data-testid kpi-header", () => {
    renderHeader();
    expect(screen.getByTestId("kpi-header")).toBeInTheDocument();
  });

  it("renders section with accessible heading (sr-only)", () => {
    renderHeader();
    expect(screen.getByRole("heading", { name: /Portfolio Key Metrics/i })).toBeInTheDocument();
  });

  it("renders 4 kpi-card elements", () => {
    renderHeader();
    expect(screen.getAllByTestId("kpi-card")).toHaveLength(4);
  });

  it("renders aria-label on list", () => {
    renderHeader();
    expect(screen.getByRole("list", { name: /Portfolio key metrics/i })).toBeInTheDocument();
  });

  it("displays totalInvested value", () => {
    renderHeader();
    expect(screen.getByText("$100,000")).toBeInTheDocument();
  });

  it("displays currentValue value", () => {
    renderHeader();
    expect(screen.getByText("$103,000")).toBeInTheDocument();
  });

  it("displays formatted positive totalReturn", () => {
    renderHeader();
    expect(screen.getAllByText("+3.0%").length).toBeGreaterThan(0);
  });

  it("displays formatted negative totalReturn with minus sign", () => {
    renderHeader({ totalReturn: -5.2 });
    expect(screen.getAllByText("-5.2%").length).toBeGreaterThan(0);
  });

  it("displays activeHoldings count", () => {
    renderHeader();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows TrendingUp icon for positive return (aria-label)", () => {
    renderHeader();
    // The change label on Current Value card contains aria-label with Increase
    const cards = screen.getAllByTestId("kpi-card");
    // Current Value card (index 1) has a change indicator
    const currentValueCard = cards[1];
    const changeEl = within(currentValueCard).getByText(/\+3\.0%/);
    expect(changeEl).toBeInTheDocument();
  });

  it("shows TrendingDown for negative return", () => {
    renderHeader({ totalReturn: -2.5 });
    // The aria-label on the change span references Decrease
    const changeEls = screen.getAllByLabelText(/Decrease of 2.5%/i);
    expect(changeEls.length).toBeGreaterThan(0);
  });

  it("renders with zero total return", () => {
    renderHeader({ totalReturn: 0 });
    expect(screen.getAllByText("+0.0%").length).toBeGreaterThan(0);
  });

  it("renders with zero active holdings", () => {
    renderHeader({ activeHoldings: 0 });
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders with single holding", () => {
    renderHeader({ activeHoldings: 1 });
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  // ── AnimatedValue: default (full-motion) counting behaviour ────────────────

  describe("counter animation (default motion)", () => {
    it("ticks from a low value up to the exact final value, then stops scheduling frames", () => {
      renderHeader({ currentValue: "$1,234.50" });

      // Animation is scheduled on mount
      expect(pendingFrameCount()).toBeGreaterThan(0);

      // First tick establishes the animation clock at zero — counting starts at 0
      flushFrames(16);
      const headerText = () => screen.getByTestId("kpi-header").textContent ?? "";
      expect(headerText()).toContain("$0.00");

      // Mid-animation — thousands separator formatting kicks in
      flushFrames(600);
      expect(headerText()).toContain("1,");

      // Run past the 1500ms duration — exact prop value restored
      flushFrames(900);
      expect(screen.getByText("$1,234.50")).toBeInTheDocument();

      // Loop has ended: no further frames are scheduled and value stays put
      flushFrames(100);
      expect(pendingFrameCount()).toBe(0);
      expect(screen.getByText("$1,234.50")).toBeInTheDocument();
    });

    it("preserves prefix and suffix while ticking (e.g. +3.0%)", () => {
      renderHeader({ totalReturn: 12.5 });

      flushFrames(200);
      // The Total Return card ticks with its leading "+" and trailing "%"
      const header = screen.getByTestId("kpi-header");
      expect(header.textContent).toMatch(/\+\d+(\.\d+)?%/);
    });

    it("renders negative values with a minus sign during ticks", () => {
      renderHeader({ totalReturn: -40, currentValue: "-$800" });

      flushFrames(100);
      const text = screen.getByTestId("kpi-header").textContent ?? "";
      expect(text).toContain("-$");
    });

    it("restarts the animation when the value prop changes mid-flight", () => {
      const { rerender } = render(<KpiHeader {...defaultProps} currentValue="$500" />);

      flushFrames(300); // partially through $500 animation
      rerender(<KpiHeader {...defaultProps} currentValue="$9,000" />);

      // Drive the restarted animation to completion
      for (let i = 0; i < 20; i++) flushFrames(150);
      expect(screen.getByText("$9,000")).toBeInTheDocument();
    });
  });

  // ── AnimatedValue: reduced-motion variant (issue #492) ────────────────────

  describe("reduced-motion variant", () => {
    it("presents the final value immediately with no numeric ticking", () => {
      reducedMotion.value = true;
      renderHeader({ currentValue: "$103,000" });

      // Final value is present on first paint…
      expect(screen.getByText("$103,000")).toBeInTheDocument();

      // …and rAF-driven ticking never starts
      flushFrames(2000);
      expect(screen.getByText("$103,000")).toBeInTheDocument();
    });

    it("wraps the value in the subtle fade-in affordance using the transition-base token", () => {
      reducedMotion.value = true;
      renderHeader();

      const animated = screen.getByText("$103,000");
      expect(animated).toHaveClass("animate-fade-in");
      expect(animated).toHaveStyle({
        "animation-duration": "var(--transition-base, 0.4s)",
      });
    });

    it("updates immediately when the value prop changes under reduced motion", () => {
      reducedMotion.value = true;
      const { rerender } = renderHeader({ currentValue: "$103,000" });
      expect(screen.getByText("$103,000")).toBeInTheDocument();

      rerender(<KpiHeader {...defaultProps} currentValue="$105,250" />);
      expect(screen.getByText("$105,250")).toBeInTheDocument();
    });

    it("snaps to the final value when reduce-motion is enabled mid-animation (no residual ticking)", () => {
      const { rerender } = renderHeader({ currentValue: "$1,234.50" });
      flushFrames(400); // mid-animation
      expect(screen.getByTestId("kpi-header").textContent).not.toContain("$1,234.50");

      // System-level accessibility toggle flips on
      reducedMotion.value = true;
      rerender(<KpiHeader {...defaultProps} currentValue="$1,234.50" />);

      expect(screen.getByText("$1,234.50")).toBeInTheDocument();
      const scheduledAfterToggle = pendingFrameCount();
      flushFrames(2000);
      expect(screen.getByText("$1,234.50")).toBeInTheDocument();
      expect(cancelAnimationFrame).toHaveBeenCalled();
      expect(pendingFrameCount()).toBeLessThanOrEqual(scheduledAfterToggle);
    });

    it("resumes animating when reduce-motion is turned back off mid-display", () => {
      reducedMotion.value = true;
      const { rerender } = renderHeader({ currentValue: "$1,234.50" });
      expect(screen.getByText("$1,234.50")).toBeInTheDocument();

      // Toggle off — counter re-runs and lands on the exact final value
      reducedMotion.value = false;
      rerender(<KpiHeader {...defaultProps} currentValue="$1,234.50" />);
      expect(requestAnimationFrame).toHaveBeenCalled();

      for (let i = 0; i < 15; i++) flushFrames(150);
      expect(screen.getByText("$1,234.50")).toBeInTheDocument();
    });
  });

  // ── AnimatedValue: non-numeric fallback ────────────────────────────────────

  describe("non-numeric values", () => {
    it("renders unparseable values verbatim without scheduling animation for them", () => {
      renderHeader({ totalInvested: "N/A" });

      expect(screen.getByText("N/A")).toBeInTheDocument();

      // Only the three numeric cards schedule counters — the N/A card does not
      expect(requestAnimationFrame).toHaveBeenCalledTimes(3);

      flushFrames(2000);
      expect(screen.getByText("N/A")).toBeInTheDocument();
    });
  });
});
