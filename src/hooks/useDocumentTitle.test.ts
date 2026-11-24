import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { formatDocumentTitle, useDocumentTitle } from "./useDocumentTitle";

describe("formatDocumentTitle", () => {
  it("formats a page title as 'Page - Revora'", () => {
    expect(formatDocumentTitle("Dashboard")).toBe("Dashboard - Revora");
  });

  it("trims surrounding whitespace", () => {
    expect(formatDocumentTitle("  Investor Portal  ")).toBe("Investor Portal - Revora");
  });

  it("falls back to 'Revora' when given an empty or whitespace-only title", () => {
    expect(formatDocumentTitle("")).toBe("Revora");
    expect(formatDocumentTitle("   ")).toBe("Revora");
  });
});

describe("useDocumentTitle", () => {
  const originalTitle = "Revora – Stellar RevenueShare";

  beforeEach(() => {
    document.title = originalTitle;
  });

  afterEach(() => {
    document.title = originalTitle;
  });

  it("sets document.title on mount and restores previous title on unmount", () => {
    const { unmount } = renderHook(() => useDocumentTitle("Home"));

    expect(document.title).toBe("Home - Revora");

    unmount();

    expect(document.title).toBe(originalTitle);
  });

  it("updates document.title when title prop changes and still restores original title on unmount", () => {
    const { rerender, unmount } = renderHook(
      ({ title }: { title: string }) => useDocumentTitle(title),
      { initialProps: { title: "Sign In" } },
    );

    expect(document.title).toBe("Sign In - Revora");

    rerender({ title: "Sign Up" });
    expect(document.title).toBe("Sign Up - Revora");

    unmount();
    expect(document.title).toBe(originalTitle);
  });
});
