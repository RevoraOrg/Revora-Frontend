import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  DARK_SURFACE,
  LIGHT_SURFACE,
  wcagGrade,
} from "./contrast";
import { DARK_CHART_TOKENS, LIGHT_CHART_TOKENS } from "./tokens";

describe("contrastRatio", () => {
  it("returns 21 for black on white regardless of argument order", () => {
    expect(contrastRatio("#000000", LIGHT_SURFACE)).toBe(21);
    expect(contrastRatio(LIGHT_SURFACE, "#000000")).toBe(21);
  });

  it("returns 1 for identical colors", () => {
    expect(contrastRatio("#ffffff", "#ffffff")).toBe(1);
    expect(contrastRatio("#000000", "#000000")).toBe(1);
    expect(contrastRatio("#3b82f6", "#3b82f6")).toBe(1);
    expect(contrastRatio(DARK_SURFACE, DARK_SURFACE)).toBe(1);
  });

  it("supports 3-digit shorthand hex and hex values without a leading #", () => {
    expect(contrastRatio("#000", "#fff")).toBe(21);
    expect(contrastRatio("#fff", "#fff")).toBe(1);
    expect(contrastRatio("000000", "ffffff")).toBe(21);
    expect(contrastRatio("000", "fff")).toBe(21);
  });

  it("returns null for invalid hex inputs", () => {
    expect(contrastRatio("invalid", LIGHT_SURFACE)).toBeNull();
    expect(contrastRatio(LIGHT_SURFACE, "invalid")).toBeNull();
    expect(contrastRatio("", LIGHT_SURFACE)).toBeNull();
    expect(contrastRatio("#12345", LIGHT_SURFACE)).toBeNull();
    expect(contrastRatio("#1234567", LIGHT_SURFACE)).toBeNull();
    expect(contrastRatio("#gggggg", LIGHT_SURFACE)).toBeNull();
    expect(contrastRatio("rgba(15,23,42,0.85)", DARK_SURFACE)).toBeNull();
  });

  it("computes expected ratios for documented chart tokens", () => {
    for (const token of DARK_CHART_TOKENS) {
      const ratio = contrastRatio(token.value, DARK_SURFACE);
      expect(ratio).not.toBeNull();
      expect(wcagGrade(ratio)).toBe("AAA");
    }

    for (const token of LIGHT_CHART_TOKENS) {
      const ratio = contrastRatio(token.value, LIGHT_SURFACE);
      expect(ratio).not.toBeNull();
      expect(ratio as number).toBeGreaterThanOrEqual(3);
      expect(wcagGrade(ratio)).not.toBe("Fail");
    }
  });
});

describe("wcagGrade", () => {
  it("returns 'Fail' for null and ratios below 3", () => {
    expect(wcagGrade(null)).toBe("Fail");
    expect(wcagGrade(1)).toBe("Fail");
    expect(wcagGrade(2.99)).toBe("Fail");
  });

  it("returns 'AA Large' at and above 3 up to below 4.5", () => {
    expect(wcagGrade(3)).toBe("AA Large");
    expect(wcagGrade(3.5)).toBe("AA Large");
    expect(wcagGrade(4.49)).toBe("AA Large");
  });

  it("returns 'AA' at and above 4.5 up to below 7", () => {
    expect(wcagGrade(4.5)).toBe("AA");
    expect(wcagGrade(5.2)).toBe("AA");
    expect(wcagGrade(6.99)).toBe("AA");
  });

  it("returns 'AAA' at and above 7", () => {
    expect(wcagGrade(7)).toBe("AAA");
    expect(wcagGrade(21)).toBe("AAA");
  });

  it("grades invalid contrastRatio results as 'Fail'", () => {
    expect(wcagGrade(contrastRatio("not-a-hex", LIGHT_SURFACE))).toBe("Fail");
  });
});
