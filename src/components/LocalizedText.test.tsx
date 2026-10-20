import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocalizedText } from "./LocalizedText";

describe("LocalizedText", () => {
  it("renders child text with the localized-text class", () => {
    render(<LocalizedText>Copy example</LocalizedText>);
    const node = screen.getByText("Copy example");
    expect(node).toHaveClass("localized-text");
    expect(node).toHaveAttribute("dir", "auto");
  });

  it("uses RTL direction for Arabic locale", () => {
    render(<LocalizedText locale="ar-SA">مرحبا</LocalizedText>);
    const node = screen.getByText("مرحبا");
    expect(node).toHaveAttribute("dir", "rtl");
  });

  it("renders as a div when requested", () => {
    render(
      <LocalizedText as="div" locale="en-US">
        Block copy
      </LocalizedText>,
    );
    const node = screen.getByText("Block copy");
    expect(node.tagName).toBe("DIV");
  });
});
