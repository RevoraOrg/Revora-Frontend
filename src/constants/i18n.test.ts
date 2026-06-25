import {
  buildTranslationKey,
  formatCurrency,
  formatDate,
  formatNumber,
  getPluralCategory,
  isRtlLocale,
  selectPluralForm,
} from "./i18n";
import { describe, expect, it } from "vitest";

describe("i18n utility functions", () => {
  it("builds stable translation keys from namespace segments", () => {
    expect(buildTranslationKey("auth", "login", "title")).toBe("auth.login.title");
  });

  it("detects RTL locales", () => {
    expect(isRtlLocale("ar-SA")).toBe(true);
    expect(isRtlLocale("en-US")).toBe(false);
  });

  it("formats numbers for locale-specific display", () => {
    expect(formatNumber(12345.678, "ja-JP")).toContain("12,346");
    expect(formatNumber(12345.678, "de-DE")).toContain("12.345");
  });

  it("formats currency by locale and symbol", () => {
    expect(formatCurrency(1200, "EUR", "de-DE")).toContain("€");
    expect(formatCurrency(1200, "USD", "en-US")).toContain("$");
  });

  it("formats dates using locale settings", () => {
    expect(formatDate("2026-05-10", "en-US")).toContain("2026");
    expect(formatDate("2026-05-10", "de-DE")).toContain("2026");
  });

  it("returns correct plural categories for locales", () => {
    expect(getPluralCategory("en-US", 1)).toBe("one");
    expect(getPluralCategory("en-US", 5)).toBe("other");
  });

  it("selects the matching plural form fallback for locale counts", () => {
    const forms = {
      one: "1 offering available",
      other: "{count} offerings available",
    };

    expect(selectPluralForm("en-US", 1, forms)).toBe("1 offering available");
    expect(selectPluralForm("en-US", 3, forms)).toBe("{count} offerings available");
  });
});
