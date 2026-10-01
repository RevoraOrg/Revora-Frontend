/**
 * Terminology coverage for `src/constants/terminology.ts`.
 *
 * The constants file is the single source of truth for product language.
 * This suite pins the approved copy, proves the prohibited-term guidance is
 * present, and guards against accidentally shipping the banned variants
 * ("dividend", "revenue-share", "revenue sharing") anywhere in the token set.
 */

import { describe, expect, it } from "vitest";
import { TERMINOLOGY, type TerminologyKey } from "./terminology";

const BANNED = ["dividend", "revenue-share", "revenue sharing"];

function collectStrings(value: unknown, into: string[] = []): string[] {
  if (typeof value === "string") {
    into.push(value);
  } else if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectStrings(nested, into);
    }
  }
  return into;
}

describe("TERMINOLOGY", () => {
  it("exposes the expected core terms", () => {
    expect(TERMINOLOGY.revenueShare).toBe("RevenueShare");
    expect(TERMINOLOGY.revenueShareOffering).toBe("RevenueShare offering");
    expect(TERMINOLOGY.revenueShareOfferings).toBe("RevenueShare offerings");
    expect(TERMINOLOGY.revenueSharePayout).toBe("RevenueShare payout");
    expect(TERMINOLOGY.revenueSharePayouts).toBe("RevenueShare payouts");
    expect(TERMINOLOGY.revenueShareDistribution).toBe("RevenueShare distribution");
    expect(TERMINOLOGY.revenueShareDistributions).toBe("RevenueShare distributions");
  });

  it("exposes the approved action verbs", () => {
    expect(TERMINOLOGY.configureOfferings).toBe("Configure RevenueShare offerings");
    expect(TERMINOLOGY.manageDistributions).toBe("Manage RevenueShare distributions");
    expect(TERMINOLOGY.trackPayouts).toBe("Track on-chain RevenueShare payouts");
    expect(TERMINOLOGY.viewPayouts).toBe("See real-time RevenueShare payouts");
  });

  it("keeps the prohibited-term guidance pointing at the replacement copy", () => {
    expect(TERMINOLOGY.prohibited.dividend).toBe("Use 'RevenueShare payout' instead");
    expect(TERMINOLOGY.prohibited.revenueShareHyphenated).toBe("Use 'RevenueShare' (no hyphen)");
    expect(TERMINOLOGY.prohibited.revenueSharingGerund).toBe(
      "Use 'RevenueShare distributions' instead",
    );
  });

  it("never uses a banned variant in any shipped string", () => {
    const strings = collectStrings(TERMINOLOGY);
    expect(strings.length).toBeGreaterThan(0);
    for (const value of strings) {
      const lower = value.toLowerCase();
      // The prohibited block is guidance text; it must not itself contain the
      // banned phrasing it is warning about beyond the key names.
      if (lower.includes("use '")) continue;
      for (const banned of BANNED) {
        expect(lower, `banned "${banned}" in "${value}"`).not.toContain(banned);
      }
    }
  });

  it("keeps key names stable and typed as TerminologyKey", () => {
    const expected: TerminologyKey[] = [
      "revenueShare",
      "revenueShareOffering",
      "revenueShareOfferings",
      "revenueSharePayout",
      "revenueSharePayouts",
      "revenueShareDistribution",
      "revenueShareDistributions",
      "configureOfferings",
      "manageDistributions",
      "trackPayouts",
      "viewPayouts",
      "prohibited",
    ];

    expect(Object.keys(TERMINOLOGY).sort()).toEqual([...expected].sort());
  });

  it("is stable across repeated reads (no accidental mutation)", () => {
    const snapshot = JSON.stringify(TERMINOLOGY);
    expect(TERMINOLOGY.revenueShare).toBe("RevenueShare");
    expect(JSON.stringify(TERMINOLOGY)).toBe(snapshot);
  });
});
