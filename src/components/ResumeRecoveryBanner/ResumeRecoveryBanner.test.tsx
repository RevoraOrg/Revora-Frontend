import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { axe, toHaveNoViolations } from "jest-axe";
import {
  ResumeRecoveryBanner,
  readRecoveryFrame,
  saveRecoveryFrame,
  clearRecoveryFrame,
  dismissRecoveryForever,
  isDismissedForever,
  resetDismissedForever,
  variantFromPage,
  formatRelativeAge,
} from "./ResumeRecoveryBanner";
import type { RecoveryFrame } from "./ResumeRecoveryBanner";

expect.extend(toHaveNoViolations);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

function makeFrame(overrides: Partial<RecoveryFrame> = {}): RecoveryFrame {
  return {
    page: "/startup/report-revenue",
    timestamp: Date.now(),
    payload: { step: 2, formData: { amount: "1000" } },
    ...overrides,
  };
}

function renderBanner(
  initialEntries: string[] = ["/startup/report-revenue"],
  overrides: Record<string, unknown> = {},
) {
  const onResume = vi.fn();
  const result = render(
    <MemoryRouter initialEntries={initialEntries}>
      <ResumeRecoveryBanner onResume={onResume} {...overrides} />
    </MemoryRouter>,
  );
  return { ...result, onResume };
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("localStorage helpers", () => {
  it("saves and reads a recovery frame", () => {
    const frame = makeFrame();
    saveRecoveryFrame(frame);
    const result = readRecoveryFrame(frame.page, 7);
    expect(result).toEqual(frame);
  });

  it("returns null for non-existent page", () => {
    expect(readRecoveryFrame("/nonexistent", 7)).toBeNull();
  });

  it("returns null when expired and cleans up the slot", () => {
    const frame = makeFrame({ timestamp: Date.now() - 8 * MS_PER_DAY });
    saveRecoveryFrame(frame);
    expect(readRecoveryFrame(frame.page, 7)).toBeNull();
    expect(localStorage.getItem(`recovery_state_${frame.page}`)).toBeNull();
  });

  it("returns null when dismissed forever", () => {
    const frame = makeFrame();
    saveRecoveryFrame(frame);
    dismissRecoveryForever(frame.page);
    expect(readRecoveryFrame(frame.page, 7)).toBeNull();
    expect(localStorage.getItem(`recovery_state_${frame.page}`)).toBeNull();
    expect(isDismissedForever(frame.page)).toBe(true);
  });

  it("clearRecoveryFrame removes only the frame, not the dismissal flag", () => {
    const frame = makeFrame();
    saveRecoveryFrame(frame);
    clearRecoveryFrame(frame.page);
    expect(readRecoveryFrame(frame.page, 7)).toBeNull();
    expect(isDismissedForever(frame.page)).toBe(false);
  });

  it("resetDismissedForever re-enables recovery after a permanent dismissal", () => {
    const frame = makeFrame();
    saveRecoveryFrame(frame);
    dismissRecoveryForever(frame.page);
    expect(isDismissedForever(frame.page)).toBe(true);

    resetDismissedForever(frame.page);
    expect(isDismissedForever(frame.page)).toBe(false);
    // Frame was removed by dismissRecoveryForever; saving again works.
    saveRecoveryFrame(frame);
    expect(readRecoveryFrame(frame.page, 7)).toEqual(frame);
  });

  it("handles corrupt JSON gracefully", () => {
    localStorage.setItem("recovery_state_/bad", "{not json!!!");
    expect(readRecoveryFrame("/bad", 7)).toBeNull();
    expect(localStorage.getItem("recovery_state_/bad")).toBeNull();
  });

  it("handles missing timestamp field", () => {
    localStorage.setItem(
      "recovery_state_/no-ts",
      JSON.stringify({ page: "/no-ts", payload: {} }),
    );
    expect(readRecoveryFrame("/no-ts", 7)).toBeNull();
  });

  it("returns null when localStorage throws", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(
      () => {
        throw new Error("quota exceeded");
      },
    );
    expect(readRecoveryFrame("/err", 7)).toBeNull();
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// variantFromPage / formatRelativeAge
// ---------------------------------------------------------------------------

describe("variantFromPage", () => {
  it("returns 'upload' for upload-related pages", () => {
    expect(variantFromPage("/startup/offering-registration/upload")).toBe(
      "upload",
    );
  });

  it("returns 'payout' for payout-related pages", () => {
    expect(variantFromPage("/investor/payouts")).toBe("payout");
  });

  it("returns 'form' by default", () => {
    expect(variantFromPage("/startup/report-revenue")).toBe("form");
    expect(variantFromPage("/anything")).toBe("form");
  });
});

describe("formatRelativeAge", () => {
  it("formats minutes ago", () => {
    const now = Date.now();
    expect(formatRelativeAge(now - 5 * 60_000, now)).toMatch(/5 minutes ago/);
  });

  it("formats hours ago", () => {
    const now = Date.now();
    expect(formatRelativeAge(now - 2 * 3_600_000, now)).toMatch(/2 hours ago/);
  });

  it("formats days ago", () => {
    const now = Date.now();
    expect(formatRelativeAge(now - 3 * MS_PER_DAY, now)).toMatch(/3 days ago/);
  });

  it("uses a present-tense phrase for very recent timestamps", () => {
    const now = Date.now();
    expect(formatRelativeAge(now, now)).toMatch(/(now|this minute)/i);
  });
});

// ---------------------------------------------------------------------------
// Component rendering
// ---------------------------------------------------------------------------

describe("ResumeRecoveryBanner", () => {
  it("renders nothing when no recovery frame exists", () => {
    const { container } = renderBanner();
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when dismissed forever", () => {
    const frame = makeFrame();
    saveRecoveryFrame(frame);
    dismissRecoveryForever(frame.page);

    const { container } = renderBanner();
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when frame is expired", () => {
    const frame = makeFrame({ timestamp: Date.now() - 8 * MS_PER_DAY });
    saveRecoveryFrame(frame);

    const { container } = renderBanner();
    expect(container.firstChild).toBeNull();
  });

  it("renders recovery banner with correct form variant copy", () => {
    saveRecoveryFrame(makeFrame({ page: "/startup/report-revenue" }));

    renderBanner(["/startup/report-revenue"]);
    expect(
      screen.getByText("Your form draft was saved"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/We detected an incomplete form submission/),
    ).toBeInTheDocument();
  });

  it("renders upload variant copy and CTA when page matches", () => {
    saveRecoveryFrame(
      makeFrame({ page: "/startup/offering-registration/upload" }),
    );

    renderBanner(["/startup/offering-registration/upload"]);
    expect(
      screen.getByText("Your upload was interrupted"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resume upload/i })).toBeInTheDocument();
  });

  it("renders payout variant copy and CTA when page matches", () => {
    saveRecoveryFrame(makeFrame({ page: "/investor/payouts" }));

    renderBanner(["/investor/payouts"]);
    expect(
      screen.getByText("Your payout setup was interrupted"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resume setup/i })).toBeInTheDocument();
  });

  it("prefers a frame-declared variant over URL inference", () => {
    // Page path would infer "form", but the frame declares an upload context.
    saveRecoveryFrame(
      makeFrame({ page: "/startup/offering-registration", variant: "upload" }),
    );

    renderBanner(["/startup/offering-registration"]);
    expect(
      screen.getByText("Your upload was interrupted"),
    ).toBeInTheDocument();
  });

  it("falls back to URL inference when the declared variant is invalid", () => {
    saveRecoveryFrame(
      makeFrame({
        page: "/startup/report-revenue",
        variant: "nonsense" as unknown as RecoveryFrame["variant"],
      }),
    );

    renderBanner(["/startup/report-revenue"]);
    expect(
      screen.getByText("Your form draft was saved"),
    ).toBeInTheDocument();
  });

  it("does not show banner for a non-matching route", () => {
    saveRecoveryFrame(makeFrame({ page: "/startup/report-revenue" }));

    const { container } = renderBanner(["/investor/ledger"]);
    expect(container.firstChild).toBeNull();
  });

  it("calls onResume with page and payload, then consumes the frame", () => {
    const payload = { step: 3, formData: { name: "Acme" } };
    saveRecoveryFrame(
      makeFrame({ page: "/startup/report-revenue", payload }),
    );

    const { onResume } = renderBanner(["/startup/report-revenue"]);
    fireEvent.click(screen.getByTestId("resume-recovery-resume"));

    expect(onResume).toHaveBeenCalledWith("/startup/report-revenue", payload);
    // Resuming consumes the recovery point.
    expect(
      localStorage.getItem("recovery_state_/startup/report-revenue"),
    ).toBeNull();
    expect(screen.queryByTestId("resume-recovery-banner")).not.toBeInTheDocument();
  });

  it("soft-dismiss (✕) removes the current frame without opting out forever", () => {
    saveRecoveryFrame(makeFrame({ page: "/startup/report-revenue" }));

    const { container } = renderBanner(["/startup/report-revenue"]);
    fireEvent.click(screen.getByTestId("resume-recovery-dismiss"));

    expect(container.firstChild).toBeNull();
    expect(isDismissedForever("/startup/report-revenue")).toBe(false);
    expect(
      localStorage.getItem("recovery_state_/startup/report-revenue"),
    ).toBeNull();
  });

  it("'Don't show again' permanently opts out of recovery prompts", () => {
    saveRecoveryFrame(makeFrame({ page: "/startup/report-revenue" }));

    const { container } = renderBanner(["/startup/report-revenue"]);
    fireEvent.click(screen.getByTestId("resume-recovery-dismiss-forever"));

    expect(container.firstChild).toBeNull();
    expect(isDismissedForever("/startup/report-revenue")).toBe(true);
    expect(
      localStorage.getItem("recovery_dismissed_/startup/report-revenue"),
    ).toBe("true");
    expect(
      localStorage.getItem("recovery_state_/startup/report-revenue"),
    ).toBeNull();

    // A brand-new frame will still not be shown.
    saveRecoveryFrame(makeFrame({ page: "/startup/report-revenue" }));
    renderBanner(["/startup/report-revenue"]);
    expect(screen.queryByTestId("resume-recovery-banner")).not.toBeInTheDocument();
  });

  it("shows relative saved time in the context line", () => {
    const frame = makeFrame({
      timestamp: Date.now() - 2 * 3_600_000,
      page: "/startup/report-revenue",
    });
    saveRecoveryFrame(frame);

    renderBanner(["/startup/report-revenue"]);
    expect(screen.getByText(/Saved 2 hours ago/)).toBeInTheDocument();
  });

  it("shows remaining days when frame is within expiration", () => {
    const frame = makeFrame({
      timestamp: Date.now() - 3 * MS_PER_DAY,
      page: "/startup/report-revenue",
    });
    saveRecoveryFrame(frame);

    renderBanner(["/startup/report-revenue"]);
    expect(screen.getByText(/Available for 4 more days/)).toBeInTheDocument();
  });

  it("shows 1 day remaining (singular)", () => {
    const frame = makeFrame({
      timestamp: Date.now() - 6 * MS_PER_DAY,
      page: "/startup/report-revenue",
    });
    saveRecoveryFrame(frame);

    renderBanner(["/startup/report-revenue"]);
    expect(screen.getByText(/Available for 1 more day\b/)).toBeInTheDocument();
  });

  it("supports custom expirationDays", () => {
    const frame = makeFrame({
      timestamp: Date.now() - 2 * MS_PER_DAY,
      page: "/startup/report-revenue",
    });
    saveRecoveryFrame(frame);

    // With 1-day expiration, a 2-day-old frame should be expired.
    const { container } = renderBanner(
      ["/startup/report-revenue"],
      { expirationDays: 1 },
    );
    expect(container.firstChild).toBeNull();
  });

  it("applies custom className", () => {
    saveRecoveryFrame(makeFrame());

    const { container } = renderBanner(["/startup/report-revenue"], {
      className: "my-custom-class",
    });
    expect(container.firstChild).toHaveClass("my-custom-class");
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe("Accessibility", () => {
  it("uses role=status with polite live region (consistent with UndoBanner)", () => {
    saveRecoveryFrame(makeFrame());
    renderBanner();

    const banner = screen.getByTestId("resume-recovery-banner");
    expect(banner).toHaveAttribute("role", "status");
    expect(banner).toHaveAttribute("aria-live", "polite");
    expect(banner).toHaveAttribute("aria-atomic", "true");
  });

  it("has aria-label on the banner container", () => {
    saveRecoveryFrame(makeFrame());
    renderBanner();

    const banner = screen.getByTestId("resume-recovery-banner");
    expect(banner).toHaveAttribute(
      "aria-label",
      "Recovery available: Your form draft was saved",
    );
  });

  it("primary CTA has an explicit contextual accessible name", () => {
    saveRecoveryFrame(makeFrame());
    renderBanner();

    expect(
      screen.getByRole("button", {
        name: /resume form: your form draft was saved/i,
      }),
    ).toBeInTheDocument();
  });

  it("'Don't show again' has an explicit accessible name", () => {
    saveRecoveryFrame(makeFrame());
    renderBanner();

    expect(
      screen.getByRole("button", {
        name: /don't show recovery suggestions for this page again/i,
      }),
    ).toBeInTheDocument();
  });

  it("soft-dismiss button has an explicit accessible name", () => {
    saveRecoveryFrame(makeFrame());
    renderBanner();

    expect(
      screen.getByRole("button", {
        name: /dismiss for now: your form draft was saved/i,
      }),
    ).toBeInTheDocument();
  });

  it("status icon is decorative (aria-hidden)", () => {
    saveRecoveryFrame(makeFrame());
    renderBanner();

    const icons = screen
      .getByTestId("resume-recovery-banner")
      .querySelectorAll("svg[aria-hidden='true']");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("has no axe-detectable accessibility violations", async () => {
    saveRecoveryFrame(makeFrame());

    const { container } = renderBanner();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ---------------------------------------------------------------------------
// Multi-key / concurrent router gate
// ---------------------------------------------------------------------------

describe("Concurrent recovery router gate", () => {
  it("only shows the frame matching the active route when multiple are cached", () => {
    saveRecoveryFrame(
      makeFrame({ page: "/startup/report-revenue", payload: { a: 1 } }),
    );
    saveRecoveryFrame(
      makeFrame({ page: "/investor/payouts", payload: { b: 2 } }),
    );

    renderBanner(["/startup/report-revenue"]);
    expect(
      screen.getByText("Your form draft was saved"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Your payout setup was interrupted"),
    ).not.toBeInTheDocument();
  });

  it("shows the payout frame when navigated to payout route", () => {
    saveRecoveryFrame(
      makeFrame({ page: "/startup/report-revenue" }),
    );
    saveRecoveryFrame(
      makeFrame({ page: "/investor/payouts" }),
    );

    renderBanner(["/investor/payouts"]);
    expect(
      screen.getByText("Your payout setup was interrupted"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Your form draft was saved"),
    ).not.toBeInTheDocument();
  });

  it("shows no banner when active route has no cached frame", () => {
    saveRecoveryFrame(
      makeFrame({ page: "/startup/report-revenue" }),
    );
    saveRecoveryFrame(
      makeFrame({ page: "/investor/payouts" }),
    );

    const { container } = renderBanner(["/investor/ledger"]);
    expect(container.firstChild).toBeNull();
  });

  it("respects activePage override over route", () => {
    saveRecoveryFrame(
      makeFrame({ page: "/investor/payouts", payload: { x: 1 } }),
    );

    renderBanner(["/anything"], { activePage: "/investor/payouts" });
    expect(
      screen.getByText("Your payout setup was interrupted"),
    ).toBeInTheDocument();
  });
});
