import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe, toHaveNoViolations } from "jest-axe";

// Directly import from index under test
import * as IndexModule from "./index";
import {
  ErrorRateSparklineTile,
  type ErrorRateSparklineTileProps,
  type ErrorRateDataPoint,
} from "./index";

expect.extend(toHaveNoViolations);

describe("src/components/ErrorRateSparklineTile/index.ts", () => {
  const samplePoints: ErrorRateDataPoint[] = [
    { label: "W1", value: 3.5 },
    { label: "W2", value: 2.1 },
    { label: "W3", value: 1.8 },
  ];

  const defaultProps: ErrorRateSparklineTileProps = {
    id: "tile-summary",
    title: "FAILURE RATE",
    value: "1.8%",
    rate: 1.8,
    delta: -0.5,
    sparklineData: samplePoints,
    groupBy: "issuer",
    filterValue: "Nexus Tech",
  };

  describe("Module Exports Contract", () => {
    it("exports ErrorRateSparklineTile as a functional React component", () => {
      expect(IndexModule.ErrorRateSparklineTile).toBeDefined();
      expect(typeof IndexModule.ErrorRateSparklineTile).toBe("function");
      expect(ErrorRateSparklineTile).toBe(IndexModule.ErrorRateSparklineTile);
    });

    it("verifies type checking for exported data structures", () => {
      const dataPoint: ErrorRateDataPoint = {
        label: "Oct 2026",
        value: 4.2,
      };
      const customProps: ErrorRateSparklineTileProps = {
        id: "type-check",
        title: "Test",
        value: "4.2%",
        rate: 4.2,
        delta: 0.3,
        sparklineData: [dataPoint],
        groupBy: "region",
        filterValue: "LATAM",
      };

      expect(dataPoint.value).toBe(4.2);
      expect(customProps.groupBy).toBe("region");
    });
  });

  describe("Component Rendering and Primary State Transitions via index export", () => {
    it("renders core KPI tile elements with headings and delta status", () => {
      render(<ErrorRateSparklineTile {...defaultProps} />);

      expect(screen.getByTestId("error-rate-tile-tile-summary")).toBeInTheDocument();
      expect(screen.getByText("FAILURE RATE")).toBeInTheDocument();
      expect(screen.getByText("1.8%")).toBeInTheDocument();
      expect(screen.getByText(/Issuer: Nexus Tech/)).toBeInTheDocument();

      const deltaEl = screen.getByLabelText(/Improved by 0\.5%/i);
      expect(deltaEl).toBeInTheDocument();
      expect(deltaEl).toHaveClass("error-rate-delta--good");
      expect(deltaEl).toHaveTextContent("↓ 0.5%");
    });

    it("renders worsened state for positive delta", () => {
      render(<ErrorRateSparklineTile {...defaultProps} delta={2.4} />);

      const deltaEl = screen.getByLabelText(/Worsened by 2\.4%/i);
      expect(deltaEl).toBeInTheDocument();
      expect(deltaEl).toHaveClass("error-rate-delta--bad");
      expect(deltaEl).toHaveTextContent("↑ 2.4%");
    });

    it("renders neutral state when delta is zero", () => {
      render(<ErrorRateSparklineTile {...defaultProps} delta={0} />);

      const deltaEl = screen.getByLabelText(/No change/i);
      expect(deltaEl).toBeInTheDocument();
      expect(deltaEl).toHaveClass("error-rate-delta--neutral");
      expect(deltaEl).toHaveTextContent("→ 0.0%");
    });

    it("renders region grouping label when groupBy is region", () => {
      render(
        <ErrorRateSparklineTile
          {...defaultProps}
          groupBy="region"
          filterValue="Asia Pacific"
        />
      );

      expect(screen.getByText("Region: Asia Pacific")).toBeInTheDocument();
    });

    it("handles interactive button click and keyboard activation", () => {
      const onClick = vi.fn();
      render(<ErrorRateSparklineTile {...defaultProps} onClick={onClick} />);

      const tile = screen.getByTestId("error-rate-tile-tile-summary");
      expect(tile).toHaveAttribute("role", "button");
      expect(tile).toHaveAttribute("tabindex", "0");
      expect(tile).toHaveClass("error-rate-tile--interactive");

      // Click event
      fireEvent.click(tile);
      expect(onClick).toHaveBeenCalledTimes(1);

      // Enter key
      fireEvent.keyDown(tile, { key: "Enter" });
      expect(onClick).toHaveBeenCalledTimes(2);

      // Space key
      fireEvent.keyDown(tile, { key: " " });
      expect(onClick).toHaveBeenCalledTimes(3);

      // Non-activation key (e.g. ArrowDown)
      fireEvent.keyDown(tile, { key: "ArrowDown" });
      expect(onClick).toHaveBeenCalledTimes(3);
    });

    it("renders router Link wrapping when href is supplied", () => {
      render(
        <MemoryRouter>
          <ErrorRateSparklineTile {...defaultProps} href="/analytics/errors" />
        </MemoryRouter>
      );

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/analytics/errors");
      expect(link).toHaveClass("error-rate-tile__link");
    });
  });

  describe("Boundary & Representative Input Scenarios", () => {
    it("handles empty sparkline data gracefully without rendering SVG", () => {
      const { container } = render(
        <ErrorRateSparklineTile {...defaultProps} sparklineData={[]} />
      );

      expect(container.querySelector(".error-rate-sparkline-svg")).toBeNull();
    });

    it("handles single point sparkline data", () => {
      const singlePoint: ErrorRateDataPoint[] = [{ label: "W1", value: 1.5 }];
      const { container } = render(
        <ErrorRateSparklineTile {...defaultProps} sparklineData={singlePoint} rate={1.5} />
      );

      expect(container.querySelector(".error-rate-sparkline-svg")).toBeInTheDocument();
    });

    it("handles increasing sparkline trend encoding", () => {
      const risingData: ErrorRateDataPoint[] = [
        { label: "Day 1", value: 0.5 },
        { label: "Day 2", value: 1.2 },
        { label: "Day 3", value: 2.8 },
      ];

      render(
        <ErrorRateSparklineTile {...defaultProps} sparklineData={risingData} rate={2.8} />
      );

      const svg = screen.getByRole("img", { name: /trend: increasing/i });
      expect(svg).toBeInTheDocument();
    });

    it("handles all-zero flat values and rate gracefully", () => {
      const flatZero: ErrorRateDataPoint[] = [
        { label: "W1", value: 0 },
        { label: "W2", value: 0 },
      ];

      const { container } = render(
        <ErrorRateSparklineTile
          {...defaultProps}
          value="0.0%"
          rate={0}
          delta={0}
          sparklineData={flatZero}
        />
      );

      expect(container.querySelector(".error-rate-sparkline-svg")).toBeInTheDocument();
      expect(screen.getByText("0.0%")).toBeInTheDocument();
    });

    it("falls back to em dash when filterValue is undefined or empty", () => {
      render(
        <ErrorRateSparklineTile
          {...defaultProps}
          filterValue={undefined}
        />
      );

      expect(screen.getByText("Issuer: —")).toBeInTheDocument();
    });
  });

  describe("Accessibility Validation", () => {
    it("passes automated axe compliance audit with zero violations", async () => {
      const { container } = render(
        <MemoryRouter>
          <ErrorRateSparklineTile
            {...defaultProps}
            href="/details"
            onClick={vi.fn()}
          />
        </MemoryRouter>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
