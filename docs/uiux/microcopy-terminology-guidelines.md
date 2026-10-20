Microcopy & Terminology Guidelines

Purpose
- Ensure UI copy follows Revora product terminology and is accessible, consistent, and easy to review.

Core rules
- Use `RevenueShare` (single token, camel-cased) for the product mechanism.
- Use `RevenueShare offering` / `RevenueShare offerings` for opportunities listed by startups.
- Use `RevenueShare payout` / `RevenueShare payouts` or `RevenueShare distribution(s)` for distribution events.
- DO NOT use: `dividend`, `dividends`, `revenue-share` (hyphenated), or `revenue sharing` (as an interchangeable label).

Examples
- Good: "Discover RevenueShare offerings" / "See real-time RevenueShare payouts"
- Bad: "revenue-share opportunities" / "dividends"

Files changed in this pass
- `src/components/InvestorDiscovery.tsx`
  - Replaced: "revenue-share opportunities" → "RevenueShare offerings"
  - Replaced: "15% Revenue Share" → "15% RevenueShare"

How to validate locally
- Terminology validator: `node scripts/validate-terminology.js` (scans `src/` for prohibited terms)
- Lint: `npm run lint` (requires dev deps installed)
- Tests + coverage: `npm run test` (requires dev deps installed)

Accessibility & Responsive notes
- Ensure all CTAs have clear labels and `aria-label` where needed.
- Empty-state copy should explain action and next step; keep reading level plain and concise.
- Test in narrow viewports to ensure copy truncation or wrapping doesn't obscure meaning.
- Recommended: run axe or similar accessibility checks in CI for key routes.

Developer workflow
- Branch: `uiux/microcopy-terminology-audit`
- Commit message example: `design: refine microcopy for terminology consistency`
- Run `node scripts/validate-terminology.js` before committing to catch regressions.

Notes
- Keep `src/constants/terminology.ts` as the single source of truth for copy guidance.
- If you need new approved phrasing, add it to `TERMINOLOGY` and update the validator mapping in `scripts/validate-terminology.js`.

Contact
- For voice-and-tone questions, consult the product copy owner or open a PR comment in this repo.
