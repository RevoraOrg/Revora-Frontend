/**
 * InvestorStatement.test.tsx
 * PDF/UA Investor Statement component tests
 *
 * Tests cover:
 * - Basic rendering with all sections
 * - Semantic HTML structure (headings, landmarks, tables)
 * - Accessibility attributes (ARIA, roles, labels, lang)
 * - Edge cases: empty allocations, empty performance, long content
 * - Print overlay behavior (cover page, signature, break classes)
 * - Monochrome-safe indicators
 * - Multi-page table header repetition (structural check)
 */

import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { InvestorStatement } from "./InvestorStatement";
import type { InvestorStatementProps } from "./InvestorStatement";
import type { AllocationSlice } from "../AllocationWidget";
import type { PerformanceDataPoint } from "../PerformanceTrendWidget";

expect.extend(toHaveNoViolations);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ALLOCATIONS: AllocationSlice[] = [
  { id: "1", label: "TechFlow AI", value: 45000, percentage: 45 },
  { id: "2", label: "Quantum Ledger", value: 30000, percentage: 30 },
  { id: "3", label: "Nexus Pay", value: 25000, percentage: 25 },
];

const PERFORMANCE: PerformanceDataPoint[] = [
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

const DEFAULT_PROPS: InvestorStatementProps = {
  investorName: "John Doe",
  statementPeriod: "July 2024 \u2013 June 2025",
  totalInvested: "$100,000",
  currentValue: "$103,000",
  totalReturn: 3.0,
  activeHoldings: 3,
  allocations: ALLOCATIONS,
  performance: PERFORMANCE,
  accountId: "REV-ACC-001",
};

const renderStatement = (overrides: Partial<InvestorStatementProps> = {}) =>
  render(<InvestorStatement {...DEFAULT_PROPS} {...overrides} />);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("InvestorStatement \u2014 PDF/UA Compliance", () => {
  // ─── Basic Rendering ────────────────────────────────────────────────────

  it("renders the statement container with testid", () => {
    renderStatement();
    expect(screen.getByTestId("investor-statement")).toBeInTheDocument();
  });

  it("renders the document title", () => {
    renderStatement();
    const headings = screen.getAllByRole("heading", {
      level: 1,
      name: /Investor Statement/i,
    });
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it("renders investor name in both cover page and header", () => {
    renderStatement();
    expect(screen.getAllByText("John Doe").length).toBeGreaterThanOrEqual(2);
  });

  it("renders account ID when provided", () => {
    renderStatement();
    expect(screen.getAllByText("REV-ACC-001").length).toBeGreaterThanOrEqual(2);
  });

  it("renders statement period", () => {
    renderStatement();
    expect(
      screen.getAllByText("July 2024 \u2013 June 2025").length
    ).toBeGreaterThanOrEqual(2);
  });

  it("renders date generated", () => {
    renderStatement();
    const datePattern = /\w+ \d{1,2}, \d{4}/;
    expect(screen.getAllByText(datePattern).length).toBeGreaterThanOrEqual(2);
  });

  // ─── Semantic HTML Structure ────────────────────────────────────────────

  it("uses <article> as root element", () => {
    renderStatement();
    const article = screen.getByTestId("investor-statement");
    expect(article.tagName).toBe("ARTICLE");
  });

  it("has <header> for document metadata", () => {
    renderStatement();
    const header = document.querySelector(".statement-header");
    expect(header?.tagName).toBe("HEADER");
  });

  it("has three content <section> elements", () => {
    renderStatement();
    const sections = document.querySelectorAll(
      ".investor-statement section.statement-section"
    );
    expect(sections.length).toBeGreaterThanOrEqual(3);
  });

  it("has <footer> for disclaimers", () => {
    renderStatement();
    const footer = document.querySelector(".statement-footer");
    expect(footer?.tagName).toBe("FOOTER");
  });

  it("renders section headings with correct hierarchy (h2)", () => {
    renderStatement();
    const h2Elements = document.querySelectorAll(
      ".investor-statement section.statement-section h2"
    );
    expect(h2Elements.length).toBeGreaterThanOrEqual(3);
    expect(h2Elements[0]).toHaveTextContent("Portfolio Summary");
    expect(h2Elements[1]).toHaveTextContent("Portfolio Allocation");
    expect(h2Elements[2]).toHaveTextContent("Performance History");
  });

  // ─── Tables & Data ──────────────────────────────────────────────────────

  it("renders KPI summary table with proper structure", () => {
    renderStatement();
    const kpiTable = document.querySelector(".statement-kpi-table");
    expect(kpiTable).toBeInTheDocument();
    expect(kpiTable?.querySelector("thead")).toBeInTheDocument();
    expect(kpiTable?.querySelector("tbody")).toBeInTheDocument();
  });

  it("renders allocation data table with headers", () => {
    renderStatement();
    const tables = document.querySelectorAll(".statement-data-table");
    expect(tables.length).toBeGreaterThanOrEqual(1);
    const allocationTable = tables[0];
    expect(allocationTable.querySelector("thead")).toBeInTheDocument();
    expect(
      allocationTable.querySelector('th[scope="col"]')
    ).toBeInTheDocument();
  });

  it("renders performance data table with headers and footer", () => {
    renderStatement();
    const tables = document.querySelectorAll(".statement-data-table");
    expect(tables.length).toBeGreaterThanOrEqual(1);
    const perfTable = tables[tables.length - 1];
    expect(perfTable.querySelector("thead")).toBeInTheDocument();
    expect(perfTable.querySelector("tfoot")).toBeInTheDocument();
  });

  it("renders allocation bar chart items", () => {
    renderStatement();
    const barItems = document.querySelectorAll(
      ".statement-allocation-item"
    );
    expect(barItems.length).toBe(3);
    expect(barItems[0]).toHaveTextContent("TechFlow AI");
    expect(barItems[1]).toHaveTextContent("Quantum Ledger");
    expect(barItems[2]).toHaveTextContent("Nexus Pay");
  });

  it("shows total row in allocation table", () => {
    renderStatement();
    const totalRow = document.querySelector(".statement-total-row");
    expect(totalRow).toBeInTheDocument();
    expect(totalRow).toHaveTextContent("Total");
  });

  // ─── Accessibility Attributes ───────────────────────────────────────────

  it("has lang='en' attribute on the article", () => {
    renderStatement();
    const article = screen.getByTestId("investor-statement");
    expect(article).toHaveAttribute("lang", "en");
  });

  it("has role='document' on the article", () => {
    renderStatement();
    const article = screen.getByTestId("investor-statement");
    expect(article).toHaveAttribute("role", "document");
  });

  it("has aria-label on the article describing the statement", () => {
    renderStatement();
    const article = screen.getByTestId("investor-statement");
    expect(article).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Investor Statement")
    );
  });

  it("has aria-labelledby on content sections", () => {
    renderStatement();
    const sections = document.querySelectorAll(
      ".investor-statement section.statement-section"
    );
    sections.forEach((section) => {
      expect(section).toHaveAttribute("aria-labelledby");
    });
  });

  it("disclaimers have accessible labels", () => {
    renderStatement();
    const disclaimers = document.querySelectorAll(".statement-disclaimer");
    expect(disclaimers.length).toBeGreaterThanOrEqual(1);
    const labels = Array.from(disclaimers).map(
      (d) => d.getAttribute("aria-label") || ""
    );
    expect(labels.some((l) => l.includes("disclaimer"))).toBe(true);
  });

  it("footer has accessible label", () => {
    renderStatement();
    const footer = document.querySelector(".statement-footer");
    expect(footer).toHaveAttribute(
      "aria-label",
      "Important information and disclaimers"
    );
  });

  it("has aria-label on data tables", () => {
    renderStatement();
    const tables = document.querySelectorAll(".statement-data-table");
    tables.forEach((table) => {
      expect(table).toHaveAttribute("aria-label");
    });
  });

  it("has role='progressbar' on allocation bar fills", () => {
    renderStatement();
    const progressBars = document.querySelectorAll(
      '[role="progressbar"]'
    );
    expect(progressBars.length).toBeGreaterThanOrEqual(3);
  });

  it("uses sr-only caption on data tables", () => {
    renderStatement();
    const captions = document.querySelectorAll(
      ".statement-data-table caption.sr-only"
    );
    expect(captions.length).toBeGreaterThanOrEqual(1);
  });

  it("has aria-live='polite' on performance summary", () => {
    renderStatement();
    const summary = document.querySelector(
      ".statement-performance-summary"
    );
    expect(summary).toHaveAttribute("aria-live", "polite");
  });

  // ─── Print-Only Elements ────────────────────────────────────────────────

  it("renders cover page with print-only class", () => {
    renderStatement();
    const coverPage = document.querySelector(".cover-page");
    expect(coverPage).toBeInTheDocument();
    expect(coverPage).toHaveClass("print-only");
  });

  it("cover page contains statement title and metadata", () => {
    renderStatement();
    const coverPage = document.querySelector(".cover-page");
    expect(coverPage).toBeInTheDocument();
    expect(
      coverPage!.querySelectorAll("dt").length
    ).toBeGreaterThanOrEqual(3);
  });

  it("renders signature section with print-only class", () => {
    renderStatement();
    const sigSection = document.querySelector(".signature-section");
    expect(sigSection).toBeInTheDocument();
    expect(sigSection).toHaveClass("print-only");
  });

  it("signature section contains Authorization heading", () => {
    renderStatement();
    const sigSection = document.querySelector(".signature-section");
    expect(
      sigSection!.querySelector("h2")
    ).toHaveTextContent("Authorization");
  });

  it("signature section contains two signature lines", () => {
    renderStatement();
    const sigLines = document.querySelectorAll(".signature-line");
    expect(sigLines.length).toBe(2);
  });

  it("signature lines have label, date, and spacer", () => {
    renderStatement();
    const sigLabels = document.querySelectorAll(".signature-label");
    const sigDates = document.querySelectorAll(".signature-date");
    const sigSpacers = document.querySelectorAll(".signature-spacer");
    expect(sigLabels.length).toBe(2);
    expect(sigDates.length).toBe(2);
    expect(sigSpacers.length).toBe(2);
  });

  // ─── Table Header Repetition (structural) ───────────────────────────────

  it("all data tables have thead elements for print header repetition", () => {
    renderStatement();
    const dataTables = document.querySelectorAll(".statement-data-table");
    dataTables.forEach((table) => {
      const thead = table.querySelector("thead");
      expect(thead).toBeInTheDocument();
      const thElements = thead!.querySelectorAll("th");
      expect(thElements.length).toBeGreaterThan(0);
    });
  });

  it("KPI table has thead for print header repetition", () => {
    renderStatement();
    const kpiTable = document.querySelector(".statement-kpi-table");
    expect(kpiTable?.querySelector("thead")).toBeInTheDocument();
    const thElements = kpiTable!.querySelectorAll("thead th");
    expect(thElements.length).toBe(3);
  });

  // ─── Edge Cases ─────────────────────────────────────────────────────────

  it("shows empty state when no allocations provided", () => {
    renderStatement({ allocations: [] });
    expect(
      screen.getByText("No holdings to display.")
    ).toBeInTheDocument();
  });

  it("shows empty state when no performance data provided", () => {
    renderStatement({ performance: [] });
    expect(
      screen.getByText("No performance data available.")
    ).toBeInTheDocument();
  });

  it("renders without accountId gracefully", () => {
    renderStatement({ accountId: undefined });
    expect(screen.getByTestId("investor-statement")).toBeInTheDocument();
    expect(screen.queryByText("REV-ACC-001")).not.toBeInTheDocument();
  });

  it("handles a single allocation", () => {
    const singleAlloc: AllocationSlice[] = [
      { id: "1", label: "Solo Fund", value: 10000, percentage: 100 },
    ];
    renderStatement({ allocations: singleAlloc });
    expect(screen.getByText("Solo Fund")).toBeInTheDocument();
    expect(
      screen.getAllByText("100.0%").length
    ).toBeGreaterThanOrEqual(1);
  });

  it("handles single month performance", () => {
    const singlePerf: PerformanceDataPoint[] = [
      { month: "Jan", value: 50000 },
    ];
    renderStatement({ performance: singlePerf });
    expect(screen.getByText("Jan")).toBeInTheDocument();
  });

  it("renders performance summary with change text", () => {
    renderStatement();
    expect(
      screen.getByText(/Portfolio value changed from/i)
    ).toBeInTheDocument();
  });

  it("displays total return with correct sign", () => {
    renderStatement({ totalReturn: 5.5 });
    expect(screen.getByText("+5.50%")).toBeInTheDocument();
  });

  it("displays negative total return correctly", () => {
    renderStatement({ totalReturn: -2.3 });
    expect(screen.getByText("-2.30%")).toBeInTheDocument();
  });

  // ─── Disclaimer List ────────────────────────────────────────────────────

  it("renders disclaimer list items", () => {
    renderStatement();
    const disclaimers = document.querySelectorAll(
      ".statement-disclaimer-list li"
    );
    expect(disclaimers.length).toBeGreaterThanOrEqual(4);
  });

  it("renders copyright notice", () => {
    renderStatement();
    const copyright = document.querySelector(".statement-copyright");
    expect(copyright).toBeInTheDocument();
    expect(copyright).toHaveTextContent("Revora Platform");
  });

  // ─── Monochrome / Colour-Blind Safety ───────────────────────────────────

  it("positive return uses (+) indicator text instead of colour alone", () => {
    renderStatement({ totalReturn: 5.5 });
    const cell = screen.getByText("+5.50%");
    expect(cell).toHaveClass("text-success");
  });

  it("negative return uses (-) indicator text instead of colour alone", () => {
    renderStatement({ totalReturn: -2.3 });
    const cell = screen.getByText("-2.30%");
    expect(cell).toHaveClass("text-error");
  });

  // ─── Long Content / Multi-Page Edge Cases ───────────────────────────────

  it("handles many allocations without crashing", () => {
    const manyAllocations: AllocationSlice[] = Array.from(
      { length: 20 },
      (_, i) => ({
        id: String(i),
        label: `Fund ${i + 1}`,
        value: 5000 * (i + 1),
        percentage: 5,
      })
    );
    renderStatement({ allocations: manyAllocations });
    const items = document.querySelectorAll(".statement-allocation-item");
    expect(items.length).toBe(20);
  });

  it("handles long investor name without overflow", () => {
    const longName =
      "Bartholomew Maximilian Fitzwilliam-Steinberg von Hohenstaufen III";
    renderStatement({ investorName: longName });
    expect(screen.getAllByText(longName).length).toBeGreaterThanOrEqual(2);
  });

  it("handles long statement period", () => {
    const longPeriod =
      "January 1, 2024 through December 31, 2025 (18 months)";
    renderStatement({ statementPeriod: longPeriod });
    expect(screen.getAllByText(longPeriod).length).toBeGreaterThanOrEqual(2);
  });

  it("handles zero total invested gracefully", () => {
    renderStatement({ totalInvested: "$0" });
    expect(screen.getByText("$0")).toBeInTheDocument();
  });

  it("handles zero total return", () => {
    renderStatement({ totalReturn: 0 });
    expect(screen.getByText("+0.00%")).toBeInTheDocument();
  });

  it("handles very large portfolio values", () => {
    renderStatement({
      totalInvested: "$999,999,999",
      currentValue: "$1,234,567,890",
    });
    expect(screen.getByText("$999,999,999")).toBeInTheDocument();
    expect(screen.getByText("$1,234,567,890")).toBeInTheDocument();
  });

  // ─── Currency Prop ──────────────────────────────────────────────────────

  it("displays EUR when currency prop is set", () => {
    renderStatement({ currency: "EUR" });
    expect(
      screen.getAllByText(/denominated in EUR/).length
    ).toBeGreaterThanOrEqual(2);
  });

  // ─── Accessibility (axe) ────────────────────────────────────────────────

  it("has no axe violations with default props", async () => {
    const { container } = renderStatement();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations with empty allocations", async () => {
    const { container } = renderStatement({ allocations: [] });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations with empty performance", async () => {
    const { container } = renderStatement({ performance: [] });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations with negative return", async () => {
    const { container } = renderStatement({ totalReturn: -15.5 });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // ─── Aria-labelledby reference integrity ────────────────────────────────

  it("all aria-labelledby values reference existing element IDs", () => {
    renderStatement();
    const sections = document.querySelectorAll(
      ".investor-statement section.statement-section[aria-labelledby]"
    );
    sections.forEach((section) => {
      const labelledBy = section.getAttribute("aria-labelledby");
      expect(document.getElementById(labelledBy!)).toBeInTheDocument();
    });
  });
});
