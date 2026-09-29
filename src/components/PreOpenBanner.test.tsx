import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, afterEach } from "vitest";
import { PreOpenBanner } from "./PreOpenBanner";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a Date that is `ms` milliseconds from now. */
const future = (ms: number) => new Date(Date.now() + ms);

/** Returns a Date that is `ms` milliseconds in the past (already expired). */
const past = (ms: number) => new Date(Date.now() - ms);

// ---------------------------------------------------------------------------
// Global stubs
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });

  // matchMedia stub — jsdom doesn't ship one; return desktop (matches=false).
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Failure / empty-result path  (line 46: if (countdown.isExpired) return null)
// ---------------------------------------------------------------------------

describe("PreOpenBanner – failure / expired path", () => {
  it("returns null (renders nothing) when targetDate is in the past", () => {
    const { container } = render(
      <PreOpenBanner targetDate={past(1000)} onOptIn={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("returns null when targetDate equals exactly now (boundary: 0 ms left)", () => {
    // Date.now() - 0 === Date.now() → totalSeconds = 0 → isExpired = true
    const { container } = render(
      <PreOpenBanner targetDate={new Date(Date.now())} onOptIn={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("removes the banner from the DOM when the countdown reaches zero mid-session", async () => {
    // Start with 1 second left so the banner is initially visible.
    const target = future(1_000);
    const { container } = render(
      <PreOpenBanner targetDate={target} onOptIn={vi.fn()} />
    );

    // Banner should be in the DOM now.
    expect(screen.getByTestId("preopen-banner")).toBeInTheDocument();

    // Advance past the target so the countdown expires.
    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    // The component should have switched to the null branch.
    expect(container).toBeEmptyDOMElement();
  });
});

// ---------------------------------------------------------------------------
// Normal (success) path
// ---------------------------------------------------------------------------

describe("PreOpenBanner – normal render path", () => {
  it("renders the banner section when targetDate is in the future", () => {
    render(
      <PreOpenBanner targetDate={future(86_400_000)} onOptIn={vi.fn()} />
    );
    expect(screen.getByTestId("preopen-banner")).toBeInTheDocument();
  });

  it("displays countdown segments for days, hours, and minutes", () => {
    render(
      <PreOpenBanner targetDate={future(86_400_000)} onOptIn={vi.fn()} />
    );
    expect(screen.getByTestId("countdown-days")).toBeInTheDocument();
    expect(screen.getByTestId("countdown-hours")).toBeInTheDocument();
    expect(screen.getByTestId("countdown-min")).toBeInTheDocument();
  });

  it("shows the opt-in button before user interaction", () => {
    render(
      <PreOpenBanner targetDate={future(3_600_000)} onOptIn={vi.fn()} />
    );
    expect(screen.getByTestId("preopen-optin-btn")).toBeInTheDocument();
  });

  it("calls onOptIn and swaps button for badge when opt-in is clicked", async () => {
    const onOptIn = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <PreOpenBanner targetDate={future(3_600_000)} onOptIn={onOptIn} />
    );

    await user.click(screen.getByTestId("preopen-optin-btn"));

    expect(onOptIn).toHaveBeenCalledOnce();
    expect(screen.getByTestId("preopen-optedin-badge")).toBeInTheDocument();
    expect(
      screen.queryByTestId("preopen-optin-btn")
    ).not.toBeInTheDocument();
  });

  it("shows a toast after opt-in and hides it after 4 s", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <PreOpenBanner targetDate={future(3_600_000)} onOptIn={vi.fn()} />
    );

    await user.click(screen.getByTestId("preopen-optin-btn"));

    expect(screen.getByTestId("preopen-toast")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4_000);
    });

    expect(screen.queryByTestId("preopen-toast")).not.toBeInTheDocument();
  });

  it("renders a dismiss button and calls onDismiss when provided", async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <PreOpenBanner
        targetDate={future(3_600_000)}
        onOptIn={vi.fn()}
        onDismiss={onDismiss}
      />
    );

    const dismissBtn = screen.getByTestId("preopen-dismiss-btn");
    expect(dismissBtn).toBeInTheDocument();

    await user.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("does not render a dismiss button when onDismiss is omitted", () => {
    render(
      <PreOpenBanner targetDate={future(3_600_000)} onOptIn={vi.fn()} />
    );
    expect(
      screen.queryByTestId("preopen-dismiss-btn")
    ).not.toBeInTheDocument();
  });

  it("applies a custom id and className to the section element", () => {
    render(
      <PreOpenBanner
        targetDate={future(3_600_000)}
        onOptIn={vi.fn()}
        id="my-banner"
        className="extra-class"
      />
    );
    const section = screen.getByTestId("preopen-banner");
    expect(section).toHaveAttribute("id", "my-banner");
    expect(section.className).toContain("extra-class");
  });

  it("has a timer role with an accessible label on the countdown", () => {
    render(
      <PreOpenBanner targetDate={future(3_600_000)} onOptIn={vi.fn()} />
    );
    const timer = screen.getByRole("timer");
    expect(timer).toBeInTheDocument();
    expect(timer).toHaveAttribute("aria-label");
  });
});

// ---------------------------------------------------------------------------
// Boundary inputs
// ---------------------------------------------------------------------------

describe("PreOpenBanner – boundary inputs", () => {
  it("pads single-digit countdown values to two characters", () => {
    // Craft a target exactly 1 h 5 min 9 s away → days=0, hours=1, minutes=5
    const ms = 1 * 3_600_000 + 5 * 60_000 + 9_000;
    render(
      <PreOpenBanner targetDate={future(ms)} onOptIn={vi.fn()} />
    );
    // hours = 01, minutes = 05
    expect(screen.getByTestId("countdown-hours").textContent).toBe("01");
    expect(screen.getByTestId("countdown-min").textContent).toBe("05");
    expect(screen.getByTestId("countdown-days").textContent).toBe("00");
  });

  it("handles a very large future date without throwing", () => {
    const farFuture = new Date(Date.now() + 365 * 86_400_000 * 10); // 10 years
    expect(() =>
      render(<PreOpenBanner targetDate={farFuture} onOptIn={vi.fn()} />)
    ).not.toThrow();
    expect(screen.getByTestId("preopen-banner")).toBeInTheDocument();
  });

  it("treats an Invalid Date target as expired (returns null)", () => {
    const { container } = render(
      <PreOpenBanner targetDate={new Date(NaN)} onOptIn={vi.fn()} />
    );
    // NaN - now = NaN → Math.max(0, NaN) = 0 → totalSeconds = 0 → isExpired
    expect(container).toBeEmptyDOMElement();
  });
});
