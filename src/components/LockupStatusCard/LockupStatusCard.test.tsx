import React from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { axe, toHaveNoViolations } from "jest-axe";
import {
  LockupStatusCard,
  type LockupPhase,
  type LockupSchedule,
} from "./LockupStatusCard";

expect.extend(toHaveNoViolations);

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches,
    media: q,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function isoOffset(days: number, hours = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  if (hours) date.setHours(date.getHours() + hours);
  return date.toISOString();
}

function phase(
  id: string,
  kind: LockupPhase["kind"],
  startDays: number,
  endDays: number,
  amount: number,
  label = id,
): LockupPhase {
  return {
    id,
    kind,
    label,
    description: `${label} phase: detailed explanation for ${label.toLowerCase()}.`,
    startAt: isoOffset(startDays),
    endAt: isoOffset(endDays),
    amount,
  };
}

const LOCKED: LockupSchedule = {
  totalLocked: 150000,
  unlockedAmount: 0,
  cliffEndAt: isoOffset(40),
  vestingEndAt: isoOffset(100),
  phases: [
    phase("cliff", "cliff", 10, 40, 60000),
    phase("vesting", "vesting", 40, 100, 90000, "Linear vesting"),
  ],
};

const CLIFF_ACTIVE: LockupSchedule = {
  totalLocked: 150000,
  unlockedAmount: 0,
  cliffEndAt: isoOffset(30),
  vestingEndAt: isoOffset(90),
  phases: [
    phase("cliff", "cliff", -5, 30, 60000),
    phase("vesting", "vesting", 30, 90, 90000, "Linear vesting"),
  ],
};

const VESTING_ACTIVE: LockupSchedule = {
  totalLocked: 150000,
  unlockedAmount: 60000,
  cliffEndAt: isoOffset(-30),
  vestingEndAt: isoOffset(30),
  phases: [
    phase("cliff", "cliff", -40, -30, 60000),
    phase("vesting", "vesting", -30, 30, 90000, "Linear vesting"),
  ],
};

const FULLY_VESTED: LockupSchedule = {
  totalLocked: 150000,
  unlockedAmount: 150000,
  cliffEndAt: isoOffset(-30),
  vestingEndAt: isoOffset(-10),
  phases: [
    phase("cliff", "cliff", -40, -30, 60000),
    phase("vesting", "vesting", -30, -10, 90000, "Linear vesting"),
  ],
};

const NO_LOCKUP: LockupSchedule = {
  totalLocked: 0,
  unlockedAmount: 0,
  phases: [],
};

beforeEach(() => {
  mockMatchMedia(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("LockupStatusCard", () => {
  it("renders a status pill, title and locked metrics", () => {
    render(<LockupStatusCard schedule={CLIFF_ACTIVE} />);

    expect(screen.getByTestId("lockup-status-card")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Investor lockup schedule" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("lockup-status-label")).toHaveTextContent(
      "Cliff in progress",
    );
    expect(screen.getByTestId("lockup-total-locked")).toHaveTextContent("$150,000");
    expect(screen.getByTestId("lockup-unlocked")).toHaveTextContent("$0");
  });

  it("reports Locked status when every phase is in the future", () => {
    render(<LockupStatusCard schedule={LOCKED} />);

    expect(screen.getByTestId("lockup-status-label")).toHaveTextContent("Locked");
    expect(screen.getByTestId("lockup-countdown")).toBeInTheDocument();
  });

  it("reports Cliff in progress while the cliff phase is active", () => {
    render(<LockupStatusCard schedule={CLIFF_ACTIVE} />);

    expect(screen.getByTestId("lockup-status-label")).toHaveTextContent(
      "Cliff in progress",
    );
    expect(screen.getByTestId("lockup-countdown-milestone")).toHaveTextContent(
      "cliff",
    );
  });

  it("reports Vesting once the cliff completes and vesting is active", () => {
    render(<LockupStatusCard schedule={VESTING_ACTIVE} />);

    expect(screen.getByTestId("lockup-status-label")).toHaveTextContent("Vesting");
    expect(screen.getByTestId("lockup-countdown-milestone")).toHaveTextContent(
      "Linear vesting",
    );
  });

  it("reports Fully unlocked and hides the countdown when everything vested", () => {
    render(<LockupStatusCard schedule={FULLY_VESTED} />);

    expect(screen.getByTestId("lockup-status-label")).toHaveTextContent(
      "Fully unlocked",
    );
    expect(screen.queryByTestId("lockup-countdown")).not.toBeInTheDocument();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });

  it("renders a No lockup state without a timeline or countdown", () => {
    render(<LockupStatusCard schedule={NO_LOCKUP} />);

    expect(screen.getByTestId("lockup-status-label")).toHaveTextContent(
      "No lockup",
    );
    expect(screen.queryByTestId("lockup-countdown")).not.toBeInTheDocument();
    expect(screen.queryByTestId("lockup-timeline")).toBeInTheDocument();
    expect(screen.queryAllByRole("tooltip")).toHaveLength(0);
  });

  it("renders the unlock timeline with per-phase segments and tooltips", () => {
    render(<LockupStatusCard schedule={CLIFF_ACTIVE} />);

    const timeline = screen.getByTestId("lockup-timeline");
    expect(timeline).toHaveAttribute("role", "progressbar");
    expect(screen.getByTestId("lockup-phase-cliff")).toBeInTheDocument();
    expect(screen.getByTestId("lockup-phase-vesting")).toBeInTheDocument();

    const tooltips = screen.getAllByRole("tooltip");
    expect(tooltips).toHaveLength(2);
    expect(screen.getByRole("button", { name: /cliff/i })).toHaveAttribute(
      "aria-describedby",
      "lockup-tooltip-cliff",
    );
  });

  it("sizes zero-amount phases to a zero-width segment", () => {
    const zeroAmount: LockupSchedule = {
      totalLocked: 50000,
      unlockedAmount: 0,
      phases: [phase("cliff", "cliff", -5, 30, 0)],
    };

    render(<LockupStatusCard schedule={zeroAmount} />);

    const segment = screen.getByTestId("lockup-phase-cliff");
    expect(segment).toHaveStyle("width: 0%");
  });

  it("exposes the unlocked share as an aria progress value", () => {
    render(<LockupStatusCard schedule={VESTING_ACTIVE} />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
  });

  it("marks completed, active and pending phase segments", () => {
    render(<LockupStatusCard schedule={VESTING_ACTIVE} />);

    expect(screen.getByTestId("lockup-phase-cliff")).toHaveClass(
      "lockup-phase--completed",
    );
    expect(screen.getByTestId("lockup-phase-vesting")).toHaveClass(
      "lockup-phase--active",
    );
  });

  it("marks pending segments for future phases", () => {
    render(<LockupStatusCard schedule={LOCKED} />);

    expect(screen.getByTestId("lockup-phase-cliff")).toHaveClass(
      "lockup-phase--pending",
    );
  });

  it("renders a compact variant when compact is set", () => {
    const { container } = render(
      <LockupStatusCard schedule={CLIFF_ACTIVE} compact />,
    );

    expect(container.firstChild).toHaveClass("lockup-card--compact");
  });

  it("adds a reduced-motion marker and a polite live status region", () => {
    mockMatchMedia(true);

    const { container } = render(<LockupStatusCard schedule={CLIFF_ACTIVE} />);

    expect(container.querySelector('[data-reduced-motion="true"]')).not.toBeNull();
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("ticks the countdown toward the next unlock milestone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T08:00:00Z"));

    const target = new Date("2026-07-29T09:00:00Z");
    const schedule: LockupSchedule = {
      totalLocked: 50000,
      unlockedAmount: 0,
      phases: [
        {
          id: "cliff",
          kind: "cliff",
          label: "Cliff",
          description: "Locked until the cliff date.",
          startAt: "2026-07-28T08:00:00Z",
          endAt: target.toISOString(),
          amount: 50000,
        },
      ],
    };

    render(<LockupStatusCard schedule={schedule} />);

    const timer = screen.getByRole("timer");
    expect(timer).toHaveAttribute(
      "aria-label",
      "0 days, 1 hours, 0 minutes until cliff",
    );
    expect(screen.getByTestId("lockup-countdown-timer")).toHaveTextContent(
      "0d 1h 0m 0s",
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId("lockup-countdown-timer")).toHaveTextContent(
      "0d 0h 59m 59s",
    );
  });

  it("has no axe-detectable accessibility violations", async () => {
    const { container } = render(<LockupStatusCard schedule={CLIFF_ACTIVE} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
