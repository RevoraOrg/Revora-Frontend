/**
 * Revora Product Terminology Constants
 * 
 * This file establishes consistent product language across the Revora platform.
 * All UI copy should reference these constants to ensure terminology consistency.
 * 
 * TERMINOLOGY GUIDELINES:
 * 
 * 1. RevenueShare (noun, camelCase when used as modifier)
 *    - The core product mechanism for distributing revenue to token holders
 *    - Use as: "RevenueShare offerings", "RevenueShare payouts", "RevenueShare distributions"
 *    - DO NOT use: "revenue-share", "revenue sharing" (use as separate concept)
 * 
 * 2. Payout (noun)
 *    - The actual distribution event when revenue is sent to token holders
 *    - Use as: "RevenueShare payouts", "Track payouts", "View payout history"
 *    - DO NOT use: "dividends" (this is equity/corporate terminology, not applicable to revenue sharing)
 * 
 * 3. Dividend (PROHIBITED)
 *    - DO NOT USE in Revora UI
 *    - Dividends refer to equity distributions in traditional corporate structures
 *    - Revora uses revenue-sharing, which is fundamentally different from equity dividends
 *    - Replace any instance of "dividend" with "RevenueShare payout"
 * 
 * 4. Offering (noun)
 *    - A revenue-share opportunity created by a startup
 *    - Use as: "RevenueShare offerings", "Discover offerings", "Configure offerings"
 * 
 * 5. Distribution (noun)
 *    - Synonym for payout, can be used interchangeably
 *    - Use as: "RevenueShare distributions", "Manage distributions"
 * 
 * CONTEXT EXAMPLES:
 * - For Startups: "Create offerings and manage RevenueShare distributions"
 * - For Investors: "See real-time RevenueShare payouts"
 * - Platform Description: "Tokenized RevenueShare infrastructure on Stellar"
 */

export const TERMINOLOGY = {
  // Core product terms
  revenueShare: "RevenueShare",
  revenueShareOffering: "RevenueShare offering",
  revenueShareOfferings: "RevenueShare offerings",
  revenueSharePayout: "RevenueShare payout",
  revenueSharePayouts: "RevenueShare payouts",
  revenueShareDistribution: "RevenueShare distribution",
  revenueShareDistributions: "RevenueShare distributions",
  
  // Action verbs
  configureOfferings: "Configure RevenueShare offerings",
  manageDistributions: "Manage RevenueShare distributions",
  trackPayouts: "Track on-chain RevenueShare payouts",
  viewPayouts: "See real-time RevenueShare payouts",
  
  // Prohibited terms (for documentation/reference)
  prohibited: {
    dividend: "Use 'RevenueShare payout' instead",
    revenueShareHyphenated: "Use 'RevenueShare' (no hyphen)",
    revenueSharingGerund: "Use 'RevenueShare distributions' instead",
  },
} as const;

export type TerminologyKey = keyof typeof TERMINOLOGY;
