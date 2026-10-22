import { describe, expect, it } from "vitest";
import { parseMoneyInput, computePayoutEstimateCents, formatCentsAsCurrency } from "./parseMoneyInput";
import type { SupportedLocale } from "../constants/i18n";

describe("parseMoneyInput", () => {
  const testLocale = (locale: SupportedLocale, description: string) => {
    describe(`locale: ${locale} (${description})`, () => {
      const { decimalSeparator, groupSeparator } = getLocaleDecimalInfoForTest(locale);

      it("parses valid integer input", () => {
        const result = parseMoneyInput("1000", locale);
        expect(result.ok).toBe(true);
        expect(result.cents).toBe(100000);
      });

      it("parses valid decimal input with locale decimal separator", () => {
        const input = `1234${decimalSeparator}56`;
        const result = parseMoneyInput(input, locale);
        expect(result.ok).toBe(true);
        expect(result.cents).toBe(123456);
      });

      it("parses valid decimal input with group separators", () => {
        const input = `1${groupSeparator}234${decimalSeparator}56`;
        const result = parseMoneyInput(input, locale);
        expect(result.ok).toBe(true);
        expect(result.cents).toBe(123456);
      });

      it("rejects empty string", () => {
        const result = parseMoneyInput("", locale);
        expect(result.ok).toBe(false);
        expect(result.error).toBe("EMPTY");
      });

      it("rejects whitespace only", () => {
        const result = parseMoneyInput("   ", locale);
        expect(result.ok).toBe(false);
        expect(result.error).toBe("EMPTY");
      });

      it("rejects negative values", () => {
        const result = parseMoneyInput("-500", locale);
        expect(result.ok).toBe(false);
        expect(result.error).toBe("NEGATIVE");
      });

      it("rejects negative values with group separators", () => {
        const input = `-1${groupSeparator}000${decimalSeparator}00`;
        const result = parseMoneyInput(input, locale);
        expect(result.ok).toBe(false);
        expect(result.error).toBe("NEGATIVE");
      });

      it("rejects multiple decimal separators (malformed)", () => {
        const result = parseMoneyInput(`1${decimalSeparator}2${decimalSeparator}3`, locale);
        expect(result.ok).toBe(false);
        expect(result.error).toBe("MALFORMED_SEPARATORS");
      });

      it("rejects group separator after decimal", () => {
        const input = `1${decimalSeparator}23${groupSeparator}45`;
        const result = parseMoneyInput(input, locale);
        expect(result.ok).toBe(false);
        expect(result.error).toBe("MALFORMED_SEPARATORS");
      });

      it("rejects consecutive group separators", () => {
        const input = `1${groupSeparator}${groupSeparator}234`;
        const result = parseMoneyInput(input, locale);
        expect(result.ok).toBe(false);
        expect(result.error).toBe("MALFORMED_SEPARATORS");
      });

      it("rejects group separator at start", () => {
        const input = `${groupSeparator}123`;
        const result = parseMoneyInput(input, locale);
        expect(result.ok).toBe(false);
        expect(result.error).toBe("MALFORMED_SEPARATORS");
      });

      it("rejects group separator at end", () => {
        const input = `123${groupSeparator}`;
        const result = parseMoneyInput(input, locale);
        expect(result.ok).toBe(false);
        expect(result.error).toBe("MALFORMED_SEPARATORS");
      });

      it("rejects too many decimal places", () => {
        const input = `1${decimalSeparator}234`;
        const result = parseMoneyInput(input, locale);
        expect(result.ok).toBe(false);
        expect(result.error).toBe("TOO_MANY_DECIMALS");
      });

      it("rejects non-numeric input", () => {
        const result = parseMoneyInput("abc", locale);
        expect(result.ok).toBe(false);
        expect(result.error).toBe("NAN");
      });

      it("rejects just decimal separator", () => {
        const result = parseMoneyInput(decimalSeparator, locale);
        expect(result.ok).toBe(false);
        expect(result.error).toBe("NAN");
      });

      it("rejects just group separator", () => {
        const result = parseMoneyInput(groupSeparator, locale);
        expect(result.ok).toBe(false);
        expect(result.error).toBe("MALFORMED_SEPARATORS");
      });

      it("parses single decimal digit", () => {
        const input = `123${decimalSeparator}5`;
        const result = parseMoneyInput(input, locale);
        expect(result.ok).toBe(true);
        expect(result.cents).toBe(12350);
      });

      it("parses zero decimal places", () => {
        const input = `123${decimalSeparator}00`;
        const result = parseMoneyInput(input, locale);
        expect(result.ok).toBe(true);
        expect(result.cents).toBe(12300);
      });

      it("handles leading/trailing whitespace", () => {
        const input = `  1${groupSeparator}234${decimalSeparator}56  `;
        const result = parseMoneyInput(input, locale);
        expect(result.ok).toBe(true);
        expect(result.cents).toBe(123456);
      });
    });
  };

  // Test en-US (dot decimal, comma group)
  testLocale("en-US", "dot decimal, comma group");

  // Test de-DE (comma decimal, dot group)
  testLocale("de-DE", "comma decimal, dot group");

  // Test fr-FR (comma decimal, space group)
  testLocale("fr-FR", "comma decimal, space group");

  // Test ja-JP (dot decimal, comma group, 0 decimal places)
  testLocale("ja-JP", "dot decimal, comma group, 0 decimals");

  it("rejects invalid locale", () => {
    const result = parseMoneyInput("1000", "invalid-locale" as SupportedLocale);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("INVALID_LOCALE");
  });

  it("returns rawValue in result", () => {
    const result = parseMoneyInput("1,234.56", "en-US");
    expect(result.rawValue).toBe("1,234.56");
  });
});

// Helper to get locale decimal info for tests
function getLocaleDecimalInfoForTest(locale: SupportedLocale) {
  const formatter = new Intl.NumberFormat(locale);
  const parts = formatter.formatToParts(1234.56);
  let decimalSeparator = ".";
  let groupSeparator = ",";
  for (const part of parts) {
    if (part.type === "decimal") {
      decimalSeparator = part.value;
    } else if (part.type === "group") {
      groupSeparator = part.value;
    }
  }
  return { decimalSeparator, groupSeparator };
}

describe("computePayoutEstimateCents", () => {
  it("computes 8% of gross revenue in cents", () => {
    // 1234.56 * 0.08 = 98.7648 -> rounded to 9876 cents
    expect(computePayoutEstimateCents(123456)).toBe(9876);
  });

  it("rounds correctly for edge cases", () => {
    // 10000 cents = $100, 8% = $8 = 800 cents
    expect(computePayoutEstimateCents(10000)).toBe(800);

    // 12500 cents = $125, 8% = $10 = 1000 cents
    expect(computePayoutEstimateCents(12500)).toBe(1000);
  });

  it("handles small amounts", () => {
    // 1 cent -> 8% = 0.08 cents -> rounded to 0
    expect(computePayoutEstimateCents(1)).toBe(0);

    // 13 cents -> 8% = 1.04 cents -> rounded to 1
    expect(computePayoutEstimateCents(13)).toBe(1);
  });
});

describe("formatCentsAsCurrency", () => {
  it("formats cents as currency with 2 decimal places for en-US", () => {
    const result = formatCentsAsCurrency(123456, "USD", "en-US");
    expect(result).toBe("$1,234.56");
  });

  it("formats cents as currency for de-DE", () => {
    const result = formatCentsAsCurrency(123456, "EUR", "de-DE");
    expect(result).toContain("1.234,56");
    expect(result).toContain("€");
  });

  it("formats zero correctly", () => {
    const result = formatCentsAsCurrency(0, "USD", "en-US");
    expect(result).toBe("$0.00");
  });

  it("formats small amounts correctly", () => {
    const result = formatCentsAsCurrency(99, "USD", "en-US");
    expect(result).toBe("$0.99");
  });
});