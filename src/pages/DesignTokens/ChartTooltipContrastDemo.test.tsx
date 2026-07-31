import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { ChartTooltipContrastDemo } from "./ChartTooltipContrastDemo";
import { contrastRatio } from "./contrast";

const DARK_TOOLTIP_BG = "#0f172a";
const DARK_CHART_SURFACE = "#020617";
const LIGHT_TOOLTIP_BG = "#ffffff";
const LIGHT_CHART_SURFACE = "#ffffff";

describe("ChartTooltipContrastDemo", () => {
  it("renders the section heading and description", () => {
    render(<ChartTooltipContrastDemo surface="dark" />);
    expect(
      screen.getByRole("heading", { name: /dark-mode tooltip & axis label contrast/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/tokenized tooltip surfaces, foregrounds, and borders/i)
    ).toBeInTheDocument();
  });

  it("renders the live preview with axis labels on the dark surface", () => {
    render(<ChartTooltipContrastDemo surface="dark" />);
    expect(screen.getByText("Q1")).toBeInTheDocument();
    expect(screen.getByText("Q4")).toBeInTheDocument();
    expect(screen.getByText("40k")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("Q3 Revenue")).toBeInTheDocument();
    expect(screen.getByText("$42,300")).toBeInTheDocument();
  });

  it("applies the dark tooltip tokens to the live tooltip", () => {
    render(<ChartTooltipContrastDemo surface="dark" />);
    const tooltip = screen.getByText("Q3 Revenue").closest(".dt-ta-tooltip");
    expect(tooltip).not.toBeNull();
    expect(tooltip).toHaveStyle({ background: "var(--chart-tooltip-bg)" });
    expect(tooltip).toHaveStyle({ color: "var(--chart-tooltip-fg)" });
    expect(tooltip?.getAttribute("style")).toContain("var(--chart-tooltip-border)");
  });

  it("applies the light mirror values to the live tooltip on light surface", () => {
    render(<ChartTooltipContrastDemo surface="light" />);
    const tooltip = screen.getByText("Q3 Revenue").closest(".dt-ta-tooltip");
    expect(tooltip).toHaveStyle({ background: "#ffffff" });
    expect(tooltip).toHaveStyle({ color: "#1e293b" });
    expect(tooltip).toHaveStyle({ borderColor: "#64748b" });
  });

  it("renders every contrast verification row", () => {
    render(<ChartTooltipContrastDemo surface="dark" />);
    const matrix = within(
      screen.getByRole("table", { name: /tooltip and axis label contrast verification/i })
    );
    for (const label of [
      "Tooltip surface",
      "Tooltip foreground",
      "Tooltip border",
      "Axis label color",
      "Axis label size",
      "Axis label weight",
    ]) {
      expect(matrix.getByText(label)).toBeInTheDocument();
    }
    expect(matrix.getByText("--chart-tooltip-bg")).toBeInTheDocument();
    expect(matrix.getByText("--chart-tooltip-fg")).toBeInTheDocument();
    expect(matrix.getByText("--chart-tooltip-border")).toBeInTheDocument();
    expect(matrix.getByText("--chart-axis-label-color")).toBeInTheDocument();
  });

  it("validates dark-mode WCAG contrast assumptions", () => {
    expect(contrastRatio("#f8fafc", DARK_TOOLTIP_BG)!).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#64748b", DARK_TOOLTIP_BG)!).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio("#94a3b8", DARK_CHART_SURFACE)!).toBeGreaterThanOrEqual(4.5);
  });

  it("validates light-surface mirror contrast assumptions", () => {
    expect(contrastRatio("#1e293b", LIGHT_TOOLTIP_BG)!).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#64748b", LIGHT_TOOLTIP_BG)!).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio("#475569", LIGHT_CHART_SURFACE)!).toBeGreaterThanOrEqual(4.5);
  });

  it("renders the usage example code block", () => {
    render(<ChartTooltipContrastDemo surface="dark" />);
    expect(screen.getByText(/var\(--chart-tooltip-bg\)/)).toBeInTheDocument();
    expect(screen.getByText(/var\(--chart-axis-label-color\)/)).toBeInTheDocument();
  });

  it("renders guidelines and accessibility notes", () => {
    render(<ChartTooltipContrastDemo surface="dark" />);
    expect(
      screen.getByRole("heading", { name: /do: apply tokens to every chart tooltip/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /don't: use borders below 3:1 for the tooltip boundary/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /accessibility \(wcag 2\.1 aa\) & responsive assumptions/i })
    ).toBeInTheDocument();
  });

  it("passes axe accessibility checks on both surfaces", async () => {
    const { container: dark } = render(<ChartTooltipContrastDemo surface="dark" />);
    expect(await axe(dark)).toHaveNoViolations();

    const { container: light } = render(<ChartTooltipContrastDemo surface="light" />);
    expect(await axe(light)).toHaveNoViolations();
  });

  it("reflects the active surface in the surface tag", async () => {
    render(<ChartTooltipContrastDemo surface="dark" />);
    expect(screen.getByText("Dark surface")).toBeInTheDocument();
    expect(screen.queryByText("Light surface")).not.toBeInTheDocument();
  });
});
