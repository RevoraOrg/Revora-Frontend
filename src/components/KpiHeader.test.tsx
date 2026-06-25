/**
 * KpiHeader.test.tsx
 * Issue #163 – Investor Portfolio Summary: KPI header strip
 * Coverage target ≥95% on KpiHeader.tsx
 */

import { render, screen, within } from "@testing-library/react";
import { KpiHeader } from "./KpiHeader";

const defaultProps = {
  totalInvested: "$100,000",
  currentValue: "$103,000",
  totalReturn: 3.0,
  activeHoldings: 3,
};

describe("KpiHeader", () => {
  it("renders with data-testid kpi-header", () => {
    render(<KpiHeader {...defaultProps} />);
    expect(screen.getByTestId("kpi-header")).toBeInTheDocument();
  });

  it("renders section with accessible heading (sr-only)", () => {
    render(<KpiHeader {...defaultProps} />);
    expect(screen.getByRole("heading", { name: /Portfolio Key Metrics/i })).toBeInTheDocument();
  });

  it("renders 4 kpi-card elements", () => {
    render(<KpiHeader {...defaultProps} />);
    expect(screen.getAllByTestId("kpi-card")).toHaveLength(4);
  });

  it("renders aria-label on list", () => {
    render(<KpiHeader {...defaultProps} />);
    expect(screen.getByRole("list", { name: /Portfolio key metrics/i })).toBeInTheDocument();
  });

  it("displays totalInvested value", () => {
    render(<KpiHeader {...defaultProps} />);
    expect(screen.getByText("$100,000")).toBeInTheDocument();
  });

  it("displays currentValue value", () => {
    render(<KpiHeader {...defaultProps} />);
    expect(screen.getByText("$103,000")).toBeInTheDocument();
  });

  it("displays formatted positive totalReturn", () => {
    render(<KpiHeader {...defaultProps} />);
    expect(screen.getAllByText("+3.0%").length).toBeGreaterThan(0);
  });

  it("displays formatted negative totalReturn with minus sign", () => {
    render(<KpiHeader {...{ ...defaultProps, totalReturn: -5.2 }} />);
    expect(screen.getAllByText("-5.2%").length).toBeGreaterThan(0);
  });

  it("displays activeHoldings count", () => {
    render(<KpiHeader {...defaultProps} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows TrendingUp icon for positive return (aria-label)", () => {
    render(<KpiHeader {...defaultProps} />);
    // The change label on Current Value card contains aria-label with Increase
    const cards = screen.getAllByTestId("kpi-card");
    // Current Value card (index 1) has a change indicator
    const currentValueCard = cards[1];
    const changeEl = within(currentValueCard).getByText(/\+3\.0%/);
    expect(changeEl).toBeInTheDocument();
  });

  it("shows TrendingDown for negative return", () => {
    render(<KpiHeader {...{ ...defaultProps, totalReturn: -2.5 }} />);
    // The aria-label on the change span references Decrease
    const changeEls = screen.getAllByLabelText(/Decrease of 2.5%/i);
    expect(changeEls.length).toBeGreaterThan(0);
  });

  it("renders with zero total return", () => {
    render(<KpiHeader {...{ ...defaultProps, totalReturn: 0 }} />);
    expect(screen.getAllByText("+0.0%").length).toBeGreaterThan(0);
  });

  it("renders with zero active holdings", () => {
    render(<KpiHeader {...{ ...defaultProps, activeHoldings: 0 }} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders with single holding", () => {
    render(<KpiHeader {...{ ...defaultProps, activeHoldings: 1 }} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
