# Pull Request Description

## Issue
Add regression coverage for `TxStatus` failure and empty-result handling in `ActivityItem`.

## Summary
- Preserve the public `TxStatus` API and `normalizeTxStatus` behavior: missing, empty, whitespace-only, and unsupported statuses return `undefined`.
- Repair the malformed `ActivityItem` component body so the receipt and focused tests can compile, retaining its existing receipt toggle, unread action, icon, and actor behavior.
- Add regression cases for whitespace-padded valid input, the `reorg` alias, and the neutral receipt placeholder for an unsupported runtime status.

## Exercised Cases
- Success: canonical and legacy statuses normalize to their supported badge variants, including case/whitespace normalization and `reorg` alias handling.
- Empty/failure: omitted, empty, whitespace-only, and unknown status strings normalize to `undefined`.
- Render fallback: an unsupported runtime status displays `—`, retains the `status-unknown` class, and does not render an on-chain badge.
- Neighboring normal behavior: supported transaction statuses continue to render their corresponding on-chain badges.

## Validation
- Focused tests: `npx vitest run --coverage.enabled=false src/components/ActivityItem.test.tsx` passed (25 tests).
- Focused lint: `npx eslint src/components/ActivityItem.tsx src/components/ActivityItem.test.tsx` passed.
- Production build: `npm run build` passed; Vite reports its existing large-chunk advisory.
- Full Vitest suite: 116 test files passed and 36 failed; 2,579 tests passed, 158 failed, and 3 were skipped. Failures include unrelated `SaveAsDraft`, `ComplianceSeverityBadge`, `RedemptionBanner`, and `GovernanceProposalDetail` tests.
- Repository-wide lint and TypeScript checks are blocked by parse/syntax errors in unrelated files (`KycSelfieCapture`, `TwoFactorSetup.test.tsx`, `AuditTrail`, and `DistributionDashboard`). The default focused test command with repository coverage enabled also hits the unrelated `DistributionDashboard` parse error during coverage remapping.
