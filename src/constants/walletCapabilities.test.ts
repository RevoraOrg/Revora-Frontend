/**
 * Wallet capability coverage for `src/constants/walletCapabilities.ts`.
 *
 * Pins the public contract used by the network switcher:
 *   - every `WalletType` has exactly one capability entry whose `type` matches
 *     its key;
 *   - auto-switch support flags are correct for each wallet;
 *   - `getWalletCapability` resolves names case-insensitively and falls back to
 *     the generic capability for unknown / blank input.
 */

import { describe, expect, it } from "vitest";
import {
  WALLET_CAPABILITIES,
  getWalletCapability,
  type WalletCapability,
  type WalletType,
} from "./walletCapabilities";

const ALL_TYPES: WalletType[] = [
  "metamask",
  "rabby",
  "coinbase",
  "walletconnect",
  "ledger",
  "phantom",
  "generic",
];

describe("WALLET_CAPABILITIES", () => {
  it("has exactly one entry per WalletType keyed by that type", () => {
    expect(Object.keys(WALLET_CAPABILITIES).sort()).toEqual([...ALL_TYPES].sort());
    for (const type of ALL_TYPES) {
      expect(WALLET_CAPABILITIES[type]).toBeDefined();
      expect(WALLET_CAPABILITIES[type].type).toBe(type);
    }
  });

  it("marks only the wallets that support programmatic switching", () => {
    const autoSwitch: Record<WalletType, boolean> = {
      metamask: true,
      rabby: true,
      coinbase: true,
      walletconnect: false,
      ledger: false,
      phantom: true,
      generic: true,
    };

    for (const type of ALL_TYPES) {
      expect(WALLET_CAPABILITIES[type].supportsAutoSwitch, type).toBe(autoSwitch[type]);
    }
  });

  it("gives every wallet non-empty microcopy and switch steps", () => {
    for (const type of ALL_TYPES) {
      const capability = WALLET_CAPABILITIES[type];
      expect(capability.name.length, `${type}.name`).toBeGreaterThan(0);
      expect(capability.iconName.length, `${type}.iconName`).toBeGreaterThan(0);
      expect(capability.mismatchNotice.length, `${type}.mismatchNotice`).toBeGreaterThan(0);
      expect(capability.manualSwitchSteps.length, `${type}.manualSwitchSteps`).toBeGreaterThanOrEqual(2);
      for (const step of capability.manualSwitchSteps) {
        expect(step.length, `${type} step`).toBeGreaterThan(0);
      }
    }
  });

  it("only MetaMask ships an external support link, and it is https", () => {
    for (const type of ALL_TYPES) {
      const { helpUrl } = WALLET_CAPABILITIES[type];
      if (type === "metamask") {
        expect(helpUrl).toMatch(/^https:\/\//);
      } else {
        expect(helpUrl).toBeUndefined();
      }
    }
  });
});

describe("getWalletCapability", () => {
  it("returns the generic capability for blank input", () => {
    expect(getWalletCapability()).toBe(WALLET_CAPABILITIES.generic);
    expect(getWalletCapability("")).toBe(WALLET_CAPABILITIES.generic);
  });

  it("matches wallet names case-insensitively and by substring", () => {
    expect(getWalletCapability("MetaMask Extension").type).toBe("metamask");
    expect(getWalletCapability("RABBY").type).toBe("rabby");
    expect(getWalletCapability("Coinbase Wallet").type).toBe("coinbase");
    expect(getWalletCapability("WalletConnect v2").type).toBe("walletconnect");
    expect(getWalletCapability("Phantom").type).toBe("phantom");
  });

  it("treats 'hardware' as a Ledger alias", () => {
    expect(getWalletCapability("Ledger Nano X").type).toBe("ledger");
    expect(getWalletCapability("generic hardware wallet").type).toBe("ledger");
  });

  it("falls back to the generic shape but preserves an unknown wallet name", () => {
    const capability: WalletCapability = getWalletCapability("Brave Wallet");
    expect(capability.type).toBe("generic");
    expect(capability.name).toBe("Brave Wallet");
    expect(capability.supportsAutoSwitch).toBe(WALLET_CAPABILITIES.generic.supportsAutoSwitch);
    expect(capability.mismatchNotice).toBe(WALLET_CAPABILITIES.generic.mismatchNotice);
  });

  it("does not mutate the shared generic capability for unknown names", () => {
    getWalletCapability("Some Unknown Wallet");
    expect(WALLET_CAPABILITIES.generic.name).toBe("Web3 Wallet");
  });
});
