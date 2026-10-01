/**
 * Focused test suite for src/components/ResumeRecoveryBanner/index.ts
 *
 * Purpose: verify that every member of the barrel's public contract is
 * correctly re-exported and behaves as specified when imported via the
 * index entry-point (not the internal module directly).
 *
 * Coverage areas
 * ──────────────
 * 1. Named value exports exist and are the right JavaScript type.
 * 2. readRecoveryFrame  – success, expiry, dismiss, and error paths.
 * 3. saveRecoveryFrame  – happy path and silent-fail on storage error.
 * 4. dismissRecoveryForever – sets dismiss flag and removes frame key.
 * 5. variantFromPage    – all three variant branches.
 * 6. Type exports – compile-time check via assignability assertions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Import exclusively from the barrel.
import {
  ResumeRecoveryBanner,
  readRecoveryFrame,
  saveRecoveryFrame,
  dismissRecoveryForever,
  variantFromPage,
} from "./index";
import type {
  RecoveryFrame,
  RecoveryVariant,
  ResumeRecoveryBannerProps,
} from "./index";

// ---------------------------------------------------------------------------
// Constants (mirror of the internal module — kept here to avoid a coupling
// import from the implementation file).
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

const STORAGE_KEY = (page: string) => `recovery_state_${page}`;
const DISMISS_KEY = (page: string) => `recovery_dismissed_${page}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFrame(overrides: Partial<RecoveryFrame> = {}): RecoveryFrame {
  return {
    page: "/test-page",
    timestamp: Date.now(),
    payload: { step: 1 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Export surface — every named export must be present and the right type
// ---------------------------------------------------------------------------

describe("index.ts export surface", () => {
  it("exports ResumeRecoveryBanner as a function (React component)", () => {
    expect(typeof ResumeRecoveryBanner).toBe("function");
  });

  it("exports readRecoveryFrame as a function", () => {
    expect(typeof readRecoveryFrame).toBe("function");
  });

  it("exports saveRecoveryFrame as a function", () => {
    expect(typeof saveRecoveryFrame).toBe("function");
  });

  it("exports dismissRecoveryForever as a function", () => {
    expect(typeof dismissRecoveryForever).toBe("function");
  });

  it("exports variantFromPage as a function", () => {
    expect(typeof variantFromPage).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// 2. readRecoveryFrame — imported via barrel
// ---------------------------------------------------------------------------

describe("readRecoveryFrame (via index)", () => {
  it("returns null when localStorage contains no matching key", () => {
    expect(readRecoveryFrame("/missing-page", 7)).toBeNull();
  });

  it("returns a valid frame that was previously saved", () => {
    const frame = makeFrame();
    localStorage.setItem(STORAGE_KEY(frame.page), JSON.stringify(frame));

    const result = readRecoveryFrame(frame.page, 7);
    expect(result).toEqual(frame);
  });

  it("returns null and cleans up an expired frame", () => {
    const frame = makeFrame({ timestamp: Date.now() - 8 * MS_PER_DAY });
    localStorage.setItem(STORAGE_KEY(frame.page), JSON.stringify(frame));

    expect(readRecoveryFrame(frame.page, 7)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY(frame.page))).toBeNull();
  });

  it("returns null when the frame is within a custom shorter expiration", () => {
    // 3-day-old frame, 2-day expiration window → expired
    const frame = makeFrame({ timestamp: Date.now() - 3 * MS_PER_DAY });
    localStorage.setItem(STORAGE_KEY(frame.page), JSON.stringify(frame));

    expect(readRecoveryFrame(frame.page, 2)).toBeNull();
  });

  it("returns the frame when it is within a custom longer expiration", () => {
    // 10-day-old frame, 30-day expiration window → still valid
    const frame = makeFrame({ timestamp: Date.now() - 10 * MS_PER_DAY });
    localStorage.setItem(STORAGE_KEY(frame.page), JSON.stringify(frame));

    expect(readRecoveryFrame(frame.page, 30)).toEqual(frame);
  });

  it("returns null when the page has been permanently dismissed", () => {
    const frame = makeFrame();
    localStorage.setItem(STORAGE_KEY(frame.page), JSON.stringify(frame));
    localStorage.setItem(DISMISS_KEY(frame.page), "true");

    expect(readRecoveryFrame(frame.page, 7)).toBeNull();
  });

  it("returns null and removes corrupted JSON from storage", () => {
    localStorage.setItem(STORAGE_KEY("/corrupt"), "{bad json!!!");
    expect(readRecoveryFrame("/corrupt", 7)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY("/corrupt"))).toBeNull();
  });

  it("returns null when the stored object lacks a timestamp", () => {
    const bad = { page: "/no-ts", payload: {} };
    localStorage.setItem(STORAGE_KEY("/no-ts"), JSON.stringify(bad));
    expect(readRecoveryFrame("/no-ts", 7)).toBeNull();
  });

  it("returns null when the stored object lacks a page string", () => {
    const bad = { timestamp: Date.now(), payload: {} };
    localStorage.setItem(STORAGE_KEY("/no-page"), JSON.stringify(bad));
    expect(readRecoveryFrame("/no-page", 7)).toBeNull();
  });

  it("returns null gracefully when localStorage.getItem throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError: access denied");
    });
    expect(readRecoveryFrame("/throws", 7)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. saveRecoveryFrame — imported via barrel
// ---------------------------------------------------------------------------

describe("saveRecoveryFrame (via index)", () => {
  it("persists the frame so that readRecoveryFrame can retrieve it", () => {
    const frame = makeFrame({ page: "/save-test", payload: { x: 42 } });
    saveRecoveryFrame(frame);

    const result = readRecoveryFrame("/save-test", 7);
    expect(result).toEqual(frame);
  });

  it("overwrites an existing frame for the same page", () => {
    const first = makeFrame({ page: "/overwrite", payload: { v: 1 } });
    const second = makeFrame({ page: "/overwrite", payload: { v: 2 } });
    saveRecoveryFrame(first);
    saveRecoveryFrame(second);

    const result = readRecoveryFrame("/overwrite", 7);
    expect(result).toEqual(second);
  });

  it("degrades silently when localStorage.setItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    // Should not throw
    expect(() => saveRecoveryFrame(makeFrame())).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 4. dismissRecoveryForever — imported via barrel
// ---------------------------------------------------------------------------

describe("dismissRecoveryForever (via index)", () => {
  it("sets the dismiss flag in localStorage", () => {
    dismissRecoveryForever("/dismiss-test");
    expect(localStorage.getItem(DISMISS_KEY("/dismiss-test"))).toBe("true");
  });

  it("removes the frame key from localStorage", () => {
    const frame = makeFrame({ page: "/dismiss-test" });
    saveRecoveryFrame(frame);
    dismissRecoveryForever("/dismiss-test");
    expect(localStorage.getItem(STORAGE_KEY("/dismiss-test"))).toBeNull();
  });

  it("causes subsequent readRecoveryFrame calls to return null", () => {
    const frame = makeFrame({ page: "/dismiss-after-save" });
    saveRecoveryFrame(frame);
    dismissRecoveryForever("/dismiss-after-save");
    expect(readRecoveryFrame("/dismiss-after-save", 7)).toBeNull();
  });

  it("degrades silently when localStorage.setItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    expect(() => dismissRecoveryForever("/throws-on-dismiss")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 5. variantFromPage — imported via barrel
// ---------------------------------------------------------------------------

describe("variantFromPage (via index)", () => {
  it("returns 'upload' when the path contains 'upload'", () => {
    expect(variantFromPage("/startup/offering-registration/upload")).toBe("upload");
    expect(variantFromPage("/upload-documents")).toBe("upload");
  });

  it("returns 'payout' when the path contains 'payout'", () => {
    expect(variantFromPage("/investor/payouts")).toBe("payout");
    expect(variantFromPage("/payout-history")).toBe("payout");
  });

  it("returns 'form' for any other path (default branch)", () => {
    expect(variantFromPage("/startup/report-revenue")).toBe("form");
    expect(variantFromPage("/dashboard")).toBe("form");
    expect(variantFromPage("")).toBe("form");
  });

  it("returns 'upload' when path matches 'upload' before 'payout'", () => {
    // 'upload' check comes first in implementation; path containing both
    // should resolve to 'upload'.
    expect(variantFromPage("/upload-payout-hybrid")).toBe("upload");
  });
});

// ---------------------------------------------------------------------------
// 6. Type-level contract assertions (compile-time only)
//    These assignments would cause a TypeScript error if the shapes diverge.
// ---------------------------------------------------------------------------

describe("type contract (compile-time assertions)", () => {
  it("RecoveryFrame has the expected shape", () => {
    const frame: RecoveryFrame = {
      page: "/any",
      timestamp: 0,
      payload: null,
    };
    expect(frame.page).toBe("/any");
  });

  it("RecoveryVariant accepts only the three literal values", () => {
    const form: RecoveryVariant = "form";
    const upload: RecoveryVariant = "upload";
    const payout: RecoveryVariant = "payout";
    expect([form, upload, payout]).toEqual(["form", "upload", "payout"]);
  });

  it("ResumeRecoveryBannerProps requires onResume", () => {
    const onResume = vi.fn();
    const props: ResumeRecoveryBannerProps = { onResume };
    expect(typeof props.onResume).toBe("function");
  });

  it("ResumeRecoveryBannerProps accepts optional fields", () => {
    const onResume = vi.fn();
    const props: ResumeRecoveryBannerProps = {
      onResume,
      expirationDays: 14,
      activePage: "/custom",
      className: "extra",
      id: "my-banner",
    };
    expect(props.expirationDays).toBe(14);
    expect(props.activePage).toBe("/custom");
    expect(props.className).toBe("extra");
    expect(props.id).toBe("my-banner");
  });
});
