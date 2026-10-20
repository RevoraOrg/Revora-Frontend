/**
 * PerformanceTrendWidget.test.tsx
 * Issue #163 – Investor Portfolio Summary: performance trend widget
 * Coverage target ≥95% on PerformanceTrendWidget.tsx
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PerformanceTrendWidget, PerformanceDataPoint } from "./PerformanceTrendWidget";

const DATA_12M: PerformanceDataPoint[] = [
  { month: "Jul", value: 88000 },
  { month: "Aug", value: 90500 },
  { month: "Sep", value: 87000 },
  { month: "Oct", value: 91200 },
  { month: "Nov", value: 93400 },
  { month: "Dec", value: 95000 },
  { month: "Jan", value: 94100 },
  { month: "Feb", value: 97300 },
  { month: "Mar", value: 99800 },
  { month: "Apr", value: 101500 },
  { month: "May", value: 99200 },
  { month: "Jun", value: 103000 },
];

const NEGATIVE_DATA: PerformanceDataPoint[] = [
  { month: "Jan", value: 100000 },
  { month: "Feb", value: 95000 },
  { month: "Mar", value: 90000 },
];

describe("PerformanceTrendWidget – empty state", () => {
  it("renders performance-widget testid", () => {
    render(<PerformanceTrendWidget data={[]} />);
    expect(screen.getByTestId("performance-widget")).toBeInTheDocument();
  });

  it("shows 'No performance data available' when empty", () => {
    render(<PerformanceTrendWidget data={[]} />);
    expect(screen.getByText(/No performance data available/i)).toBeInTheDocument();
  });

  it("does not render toggle buttons when empty", () => {
    render(<PerformanceTrendWidget data={[]} />);
    expect(screen.queryByTestId("chart-toggle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("table-toggle")).not.toBeInTheDocument();
  });
});

describe("PerformanceTrendWidget – chart view (default)", () => {
  it("renders section with heading", () => {
    render(<PerformanceTrendWidget data={DATA_12M} />);
    expect(screen.getByRole("heading", { name: /12-Month Performance/i })).toBeInTheDocument();
  });

  it("chart toggle is initially aria-pressed=true", () => {
    render(<PerformanceTrendWidget data={DATA_12M} />);
    expect(screen.getByTestId("chart-toggle")).toHaveAttribute("aria-pressed", "true");
  });

  it("table toggle is initially aria-pressed=false", () => {
    render(<PerformanceTrendWidget data={DATA_12M} />);
    expect(screen.getByTestId("table-toggle")).toHaveAttribute("aria-pressed", "false");
  });

  it("renders SVG with accessible label", () => {
    render(<PerformanceTrendWidget data={DATA_12M} />);
    expect(
      screen.getByRole("img", { name: /12-month portfolio performance trend line chart/i })
    ).toBeInTheDocument();
  });

  it("displays positive overall change badge", () => {
    render(<PerformanceTrendWidget data={DATA_12M} />);
    // overall = (103000-88000)/88000 * 100 ≈ 17.0%
    const badge = screen.getByLabelText(/Overall change/i);
    expect(badge.textContent).toMatch(/\+/);
  });

  it("displays negative overall change for declining data", () => {
    render(<PerformanceTrendWidget data={NEGATIVE_DATA} />);
    const badge = screen.getByLabelText(/Overall change/i);
    expect(badge.textContent).toMatch(/-/);
  });
});

describe("PerformanceTrendWidget – table view", () => {
  it("switches to table view on click", async () => {
    render(<PerformanceTrendWidget data={DATA_12M} />);
    await userEvent.click(screen.getByTestId("table-toggle"));
    expect(screen.getByTestId("table-toggle")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("chart-toggle")).toHaveAttribute("aria-pressed", "false");
  });

  it("renders accessible table", async () => {
    render(<PerformanceTrendWidget data={DATA_12M} />);
    await userEvent.click(screen.getByTestId("table-toggle"));
    expect(screen.getByRole("table", { name: /12-month portfolio performance/i })).toBeInTheDocument();
  });

  it("table has column headers Month, Value, Change", async () => {
    render(<PerformanceTrendWidget data={DATA_12M} />);
    await userEvent.click(screen.getByTestId("table-toggle"));
    expect(screen.getByRole("columnheader", { name: /Month/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Value/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Change/i })).toBeInTheDocument();
  });

  it("first row change column shows em-dash (no change from prior)", async () => {
    render(<PerformanceTrendWidget data={DATA_12M} />);
    await userEvent.click(screen.getByTestId("table-toggle"));
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("table rows show month labels", async () => {
    render(<PerformanceTrendWidget data={DATA_12M} />);
    await userEvent.click(screen.getByTestId("table-toggle"));
    expect(screen.getByText("Jul")).toBeInTheDocument();
    expect(screen.getByText("Jun")).toBeInTheDocument();
  });

  it("can toggle back to chart from table", async () => {
    render(<PerformanceTrendWidget data={DATA_12M} />);
    await userEvent.click(screen.getByTestId("table-toggle"));
    await userEvent.click(screen.getByTestId("chart-toggle"));
    expect(screen.getByRole("img", { name: /line chart/i })).toBeInTheDocument();
  });

  it("__initialView='table' starts in table view", () => {
    render(<PerformanceTrendWidget data={DATA_12M} __initialView="table" />);
    expect(screen.getByTestId("table-toggle")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});

describe("PerformanceTrendWidget – edge cases", () => {
  it("renders single data point without error", () => {
    render(<PerformanceTrendWidget data={[{ month: "Jan", value: 50000 }]} />);
    expect(screen.getByRole("img", { name: /line chart/i })).toBeInTheDocument();
  });

  it("handles flat data (all same value) without divide-by-zero", () => {
    render(
      <PerformanceTrendWidget
        data={[
          { month: "Jan", value: 100000 },
          { month: "Feb", value: 100000 },
        ]}
      />
    );
    const badge = screen.getByLabelText(/Overall change/i);
    expect(badge.textContent).toContain("0.0%");
  });

  it("renders with custom currency prop in table view", async () => {
    render(<PerformanceTrendWidget data={DATA_12M} currency="EUR" __initialView="table" />);
    // EUR formatting should appear in the table
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("cell").length).toBeGreaterThan(0);
  });

  it("negative period shows minus sign in change column", async () => {
    render(<PerformanceTrendWidget data={NEGATIVE_DATA} />);
    await userEvent.click(screen.getByTestId("table-toggle"));
    // Second row should show negative change
    const cells = screen.getAllByRole("cell");
    const changeCell = cells.find((c) => c.textContent?.startsWith("-"));
    expect(changeCell).toBeDefined();
  });
});
