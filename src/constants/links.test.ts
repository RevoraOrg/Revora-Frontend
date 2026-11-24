import { describe, expect, it } from "vitest";
import { LIVE_URL, REPO_URL } from "./links";

describe("links constants", () => {
  it("exports LIVE_URL as a valid HTTPS URL", () => {
    const parsed = new URL(LIVE_URL);
    expect(parsed.protocol).toBe("https:");
    expect(parsed.hostname.length).toBeGreaterThan(0);
  });

  it("exports REPO_URL as a valid HTTPS URL", () => {
    const parsed = new URL(REPO_URL);
    expect(parsed.protocol).toBe("https:");
    expect(parsed.hostname.length).toBeGreaterThan(0);
  });
});
