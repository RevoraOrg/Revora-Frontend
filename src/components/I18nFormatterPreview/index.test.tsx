import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nFormatterPreview } from "./index";

describe("I18nFormatterPreview module exports (index.ts)", () => {
  it("exports I18nFormatterPreview component", () => {
    expect(I18nFormatterPreview).toBeDefined();
    expect(typeof I18nFormatterPreview).toBe("function");
  });

  it("renders successfully (exported behavior)", () => {
    render(<I18nFormatterPreview />);
    expect(screen.getByRole("heading", { name: /Locale Formatter Preview/i })).toBeInTheDocument();
  });

  it("handles representative invalid inputs gracefully", () => {
    // When provided with an invalid or unmapped locale, it should not crash.
    // It should render the fallback or literal string of the unknown locale.
    render(<I18nFormatterPreview initialLocale="unknown-LOCALE-123" />);
    expect(screen.getByText("unknown-LOCALE-123")).toBeInTheDocument();
    expect(screen.getByText(/Custom Override Active/i)).toBeInTheDocument();
  });

  it("handles primary state transitions (e.g. locale changes via search/dropdown)", () => {
    const onLocaleChange = vi.fn();
    render(<I18nFormatterPreview onLocaleChange={onLocaleChange} />);

    // Open dropdown and search
    const input = screen.getByLabelText(/Select or search locale/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Deutsch" } });

    // Select the option
    const option = screen.getByText(/German \(Germany\)/i);
    fireEvent.click(option);

    expect(onLocaleChange).toHaveBeenCalledWith("de-DE");
    expect(screen.getByText(/Custom Override Active/i)).toBeInTheDocument();
  });

  it("reverts to default locale (state transition)", () => {
    render(<I18nFormatterPreview initialLocale="de-DE" systemDefaultLocale="en-US" />);
    
    const revertBtn = screen.getByRole("button", { name: /Revert to Default/i });
    expect(revertBtn).not.toBeDisabled();
    
    fireEvent.click(revertBtn);
    
    expect(screen.getByText(/System Default Active/i)).toBeInTheDocument();
    expect(revertBtn).toBeDisabled();
  });
});
