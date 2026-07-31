/**
 * InvestorPortfolioSummary.test.tsx
 * Investor Portfolio Summary page — hero-focused coverage
 *
 * Covers:
 *  • Hero section wiring (heading, CTA, KPI tiles, sparkline)
 *  • New investor (no positions) empty states
 *  • Negative return trend rendering
 *  • KPI error + loading states driven through __kpiStatus
 *  • Responsive layout classes
 *  • Dark mode rendering
 *  • Accessibility (jest-axe on the hero)
 *  • Widgets still render alongside the hero
 */

import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { axe, toHaveNoViolations } from "jest-axe";
import { InvestorPortfolioSummary } from "./InvestorPortfolioSummary";
import type { AllocationSlice } from "../components/AllocationWidget";
import type { PerformanceDataPoint } from "../components/PerformanceTrendWidget";

expect.extend(toHaveNoViolations);

const ALLOCS: AllocationSlice[] = [
  { id: "1", label: "TechFlow AI", value: 45000, percentage: 45 },
  { id: "2", label: "Quantum Ledger", value: 30000, percentage: 30 },
  { id: "3", label: "Nexus Pay", value: 25000, percentage: 25 },
];

const PERF: PerformanceDataPoint[] = [
  { month: "Jan", value: 90000 },
  { month: "Feb", value: 95000 },
  { month: "Mar", value: 103000 },
];

const renderPage = (overrides: Record<string, unknown> = {}) =>
  render(
    <MemoryRouter>
      <InvestorPortfolioSummary __allocations={ALLOCS} __performance={PERF} {...overrides} />
    </MemoryRouter>
  );

const hero = () => screen.getByTestId("investor-hero");

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
});

describe("InvestorPortfolioSummary – hero", () => {
  it("renders the hero section and page shell", () => {
    renderPage();
    expect(hero()).toBeInTheDocument();
    expect(screen.getByTestId("portfolio-summary")).toBeInTheDocument();
  });

  it("renders Portfolio Overview heading for an existing investor", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: /Portfolio Overview/i })).toBeInTheDocument();
  });

  it("renders Welcome to Revora heading for a new investor", () => {
    renderPage({ __allocations: [], __performance: [] });
    expect(screen.getByRole("heading", { level: 1, name: /Welcome to Revora/i })).toBeInTheDocument();
  });

  it("renders the primary and secondary CTAs with the right routes", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /Explore Offerings/i })).toHaveAttribute("href", "/investor/portal");
    expect(screen.getByRole("link", { name: /Account Settings/i })).toHaveAttribute("href", "/investor/settings");
  });

  it("renders the four KPI tiles", () => {
    renderPage();
    expect(screen.getByTestId("kpi-tile-total-value")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-tile-realized-gains")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-tile-upcoming-payouts")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-tile-pending-actions")).toBeInTheDocument();
  });

  it("shows the current portfolio value from the last performance point", () => {
    renderPage();
    expect(within(hero()).getByText("$103,000")).toBeInTheDocument();
  });

  it("falls back to totalInvested when performance is empty", () => {
    renderPage({ __performance: [] });
    expect(within(hero()).getByText("$100,000")).toBeInTheDocument();
  });

  it("renders the sparkline for an existing investor", () => {
    renderPage();
    expect(within(hero()).getByTestId("portfolio-sparkline")).toBeInTheDocument();
  });

  it("renders back navigation link to /investor/portal", () => {
    renderPage();
    const link = screen.getByRole("link", { name: /Back to Investor Discovery/i });
    expect(link).toHaveAttribute("href", "/investor/portal");
  });

  it("renders the allocation and performance widgets alongside the hero", () => {
    renderPage();
    expect(screen.getByTestId("allocation-widget")).toBeInTheDocument();
    expect(screen.getByTestId("performance-widget")).toBeInTheDocument();
  });
});

describe("InvestorPortfolioSummary – new investor (no positions)", () => {
  it("shows contextual empty states on each KPI tile", () => {
    renderPage({ __allocations: [], __performance: [] });
    expect(screen.getAllByText("No investments yet").length).toBeGreaterThan(0);
    expect(screen.getByText("No payouts scheduled")).toBeInTheDocument();
    expect(screen.getByText("No pending actions")).toBeInTheDocument();
  });

  it("does not render a sparkline for a new investor", () => {
    renderPage({ __allocations: [], __performance: [] });
    expect(within(hero()).queryByTestId("portfolio-sparkline")).not.toBeInTheDocument();
  });
});

describe("InvestorPortfolioSummary – negative returns", () => {
  it("renders a negative trend in red in the hero", () => {
    const NEGATIVE_PERF: PerformanceDataPoint[] = [
      { month: "Jan", value: 110000 },
      { month: "Feb", value: 100000 },
      { month: "Mar", value: 95000 },
    ];
    renderPage({ __performance: NEGATIVE_PERF });
    // totalInvested = $100,000, current = $95,000 → -5.0%
    const trend = within(hero()).getByText("5.0%");
    expect(trend.parentElement).toHaveClass("text-red-400");
  });

  it("renders a down-trending sparkline label", () => {
    const NEGATIVE_PERF: PerformanceDataPoint[] = [
      { month: "Jan", value: 110000 },
      { month: "Feb", value: 100000 },
      { month: "Mar", value: 95000 },
    ];
    renderPage({ __performance: NEGATIVE_PERF });
    expect(within(hero()).getByRole("img", { name: /sparkline trending down/i })).toBeInTheDocument();
  });
});

describe("InvestorPortfolioSummary – KPI error and loading states", () => {
  it("renders friendly retry messaging on every tile when errored", () => {
    renderPage({ __kpiStatus: "error" });
    expect(screen.getAllByText(/load this data/i).length).toBe(4);
    // Retry buttons are wired by the data layer via DashboardHero's onRetry —
    // the page (mock data) does not provide a handler.
    expect(screen.queryByRole("button", { name: /Retry loading/i })).not.toBeInTheDocument();
  });

  it("renders loading skeletons with role=status and aria-busy", () => {
    renderPage({ __kpiStatus: "loading" });
    const statuses = screen.getAllByRole("status");
    expect(statuses.length).toBe(4);
    statuses.forEach((node) => expect(node).toHaveAttribute("aria-busy", "true"));
  });
});

describe("InvestorPortfolioSummary – responsive layout", () => {
  it("uses a 1→2→4 column KPI grid", () => {
    renderPage();
    const grid = screen.getByTestId("kpi-grid");
    expect(grid).toHaveClass("grid-cols-1", "sm:grid-cols-2", "lg:grid-cols-4");
  });

  it("keeps the sparkline responsive and mobile-visible", () => {
    renderPage();
    const sparkline = within(hero()).getByTestId("portfolio-sparkline");
    expect(sparkline).toHaveClass("w-full", "sm:w-40");
  });
});

describe("InvestorPortfolioSummary – dark mode", () => {
  it("renders the hero with token-based dark surfaces and passes axe", async () => {
    document.documentElement.setAttribute("data-theme", "dark");
    renderPage();
    expect(screen.getByTestId("kpi-tile-total-value")).toHaveClass("glass-card");
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("text-main");
    const results = await axe(hero());
    expect(results).toHaveNoViolations();
  });
});

describe("InvestorPortfolioSummary – accessibility", () => {
  it("has no axe violations on the hero in nominal state", async () => {
    renderPage();
    const results = await axe(hero());
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations on the hero in empty state", async () => {
    renderPage({ __allocations: [], __performance: [] });
    const results = await axe(hero());
    expect(results).toHaveNoViolations();
  });
});
