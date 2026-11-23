import { describe, it, expect } from "vitest";
import {
  DARK_CHART_TOKENS,
  LIGHT_CHART_TOKENS,
  TOKEN_GROUPS,
  type Token,
} from "./tokens";
import { contrastRatio, DARK_SURFACE, LIGHT_SURFACE } from "./contrast";

interface ParsedContrastClaim {
  claimedRatio: number;
  surface: string;
  level: "AAA" | "AA" | "AA-graphical";
}

/**
 * Parses a contrast ratio claim (e.g. "7.9:1 WCAG AAA contrast on #020617 surface"
 * or "3.2:1 WCAG AA graphical/large-text (≥3:1) contrast on #ffffff surface")
 * from a token description.
 */
function parseContrastClaim(description: string): ParsedContrastClaim | null {
  const ratioMatch = description.match(/(\d+(?:\.\d+)?):1/);
  const surfaceMatch = description.match(/on\s+(#[0-9a-fA-F]{6})\s+surface/i);
  if (!ratioMatch || !surfaceMatch) return null;

  const claimedRatio = parseFloat(ratioMatch[1]);
  const surface = surfaceMatch[1].toLowerCase();

  let level: ParsedContrastClaim["level"] = "AA";
  if (/WCAG\s+AAA\b/i.test(description)) {
    level = "AAA";
  } else if (/WCAG\s+AA\s+(?:graphical|large)/i.test(description)) {
    level = "AA-graphical";
  } else if (/WCAG\s+AA\b/i.test(description)) {
    level = "AA";
  }

  return { claimedRatio, surface, level };
}

function verifyTokenContrastClaim(token: Token): {
  valid: boolean;
  reason?: string;
} {
  if (!token.description) {
    return { valid: false, reason: "Missing description" };
  }

  const claim = parseContrastClaim(token.description);
  if (!claim) {
    return {
      valid: false,
      reason: `Could not parse contrast claim from "${token.description}"`,
    };
  }

  const actual = contrastRatio(token.value, claim.surface);
  if (actual === null) {
    return {
      valid: false,
      reason: `Invalid hex color (${token.value}) or surface (${claim.surface})`,
    };
  }

  const diff = Math.abs(actual - claim.claimedRatio);
  if (diff > 0.1) {
    return {
      valid: false,
      reason: `Claimed ${claim.claimedRatio}:1 differs from actual ${actual}:1 by ${diff.toFixed(2)} (> 0.1)`,
    };
  }

  if (claim.level === "AAA" && actual < 7.0) {
    return {
      valid: false,
      reason: `Claimed WCAG AAA (requires ≥7:1) but actual ratio is ${actual}:1`,
    };
  }

  if (claim.level === "AA" && actual < 4.5) {
    return {
      valid: false,
      reason: `Claimed WCAG AA normal text (requires ≥4.5:1) but actual ratio is ${actual}:1`,
    };
  }

  if (claim.level === "AA-graphical" && actual < 3.0) {
    return {
      valid: false,
      reason: `Claimed WCAG AA graphical/large-text (requires ≥3:1) but actual ratio is ${actual}:1`,
    };
  }

  return { valid: true };
}

describe("Design token contrast claims", () => {
  describe("DARK_CHART_TOKENS", () => {
    it.each(DARK_CHART_TOKENS)(
      "$name ($value) matches its claimed contrast ratio within 0.1 and WCAG level on #020617",
      (token) => {
        const claim = parseContrastClaim(token.description ?? "");
        expect(claim).not.toBeNull();
        expect(claim!.surface).toBe(DARK_SURFACE);

        const result = verifyTokenContrastClaim(token);
        expect(result.valid, result.reason).toBe(true);
      }
    );
  });

  describe("LIGHT_CHART_TOKENS", () => {
    it.each(LIGHT_CHART_TOKENS)(
      "$name ($value) matches its claimed contrast ratio within 0.1 and WCAG level on #ffffff",
      (token) => {
        const claim = parseContrastClaim(token.description ?? "");
        expect(claim).not.toBeNull();
        expect(claim!.surface).toBe(LIGHT_SURFACE);

        const result = verifyTokenContrastClaim(token);
        expect(result.valid, result.reason).toBe(true);
      }
    );
  });

  describe("All TOKEN_GROUPS with ratio claims", () => {
    it("verifies every token description that includes a ratio claim", () => {
      const tokensWithClaims = TOKEN_GROUPS.flatMap((g) => g.tokens).filter(
        (t) => t.description && /\d+(?:\.\d+)?:1/.test(t.description)
      );

      expect(tokensWithClaims.length).toBeGreaterThanOrEqual(
        DARK_CHART_TOKENS.length + LIGHT_CHART_TOKENS.length
      );

      for (const token of tokensWithClaims) {
        const result = verifyTokenContrastClaim(token);
        expect(result.valid, `${token.name}: ${result.reason}`).toBe(true);
      }
    });
  });

  describe("verifyTokenContrastClaim failure detection", () => {
    it("fails when a claimed ratio is off by more than 0.1", () => {
      const wrongRatioToken: Token = {
        name: "Bad Ratio",
        variable: "--bad-ratio",
        value: "#60a5fa",
        description: "Blue 400 - 8.5:1 WCAG AAA contrast on #020617 surface",
      };
      const result = verifyTokenContrastClaim(wrongRatioToken);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/differs from actual/);
    });

    it("fails when a token below 4.5:1 is labelled plain WCAG AA (normal text)", () => {
      const mislabelledAA: Token = {
        name: "Mislabelled Amber",
        variable: "--bad-aa",
        value: "#d97706",
        description: "Amber 600 - 3.2:1 WCAG AA contrast on #ffffff surface",
      };
      const result = verifyTokenContrastClaim(mislabelledAA);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/requires ≥4\.5:1/);
    });

    it("passes when a 3.2:1 token is labelled WCAG AA graphical/large-text (≥3:1)", () => {
      const graphicalToken: Token = {
        name: "Graphical Amber",
        variable: "--good-graphical",
        value: "#d97706",
        description:
          "Amber 600 - 3.2:1 WCAG AA graphical/large-text (≥3:1) contrast on #ffffff surface",
      };
      const result = verifyTokenContrastClaim(graphicalToken);
      expect(result.valid, result.reason).toBe(true);
    });
  });
});
