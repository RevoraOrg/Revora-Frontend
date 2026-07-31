# Investor Dashboard Hero — Issue: Investor Portfolio Hero UI/UX

## Summary

Redeveloped the hero band of the Investor Portfolio Summary (`/investor/portfolio`)
to a complete, documented, WCAG 2.1 AA–compliant hero: 4 KPI tiles with full state
coverage, a responsive portfolio sparkline, and a contrast-safe primary CTA.
No unrelated dashboard sections or business logic were touched.

## Changes

### Hero component — `src/components/DashboardHero.tsx`
- **KPI tile states** now fully documented and accessible:
  - **Normal** — value + optional trend / action link
  - **Empty** — contextual messages: "No investments yet", "No payouts scheduled",
    "No pending actions" (`emptyText` on `KPIData`)
  - **Error** — friendly "Couldn't load this data." + icon + optional
    **Try again** button (`onRetry`, per-tile overrides hero-level)
  - **Loading** — skeleton with `role="status"`, `aria-busy="true"`, labelled
- **Sparkline** is now responsive: visible at all breakpoints (was hidden on
  mobile), full-width on mobile, fixed 160px on `sm+`, `role="img"` + descriptive
  label, token colours (`--success`/`--error`).
- Stable `data-testid`s on the section, header, KPI grid, and each tile.
- Each value/trend exposes an `aria-label`; all interactive elements keep `focus-ring`.

### Page — `src/pages/InvestorPortfolioSummary.tsx`
- Passes contextual `emptyText` to every KPI.
- Added `__kpiStatus` injectable prop so the tile states can be driven through
  the real page wiring in tests/demos (follows the existing `__` prop convention).

### Design system — `src/index.css` + `src/pages/DesignTokens/tokens.ts`
- New tokens `--primary-btn-bg: #2563eb`, `--primary-btn-bg-hover: #1d4ed8`.
- `.btn-primary` now uses them: white text contrast rises **3.68:1 → 5.17:1**
  (hover 6.70:1), meeting WCAG 2.1 AA. `--primary` is untouched so text links
  keep their 4.86:1 contrast.
- Empty-state text bumped to `text-slate-400` (6.96:1).

### Test infra — `src/test/setup.ts`
- Added a `window.matchMedia` stub (jsdom lacks it) — unblocks `usePrintMode`/
  chart widget tests that previously crashed on mount.

## Tests

- `src/components/DashboardHero.test.tsx` — 29 tests
- `src/pages/InvestorPortfolioSummary.test.tsx` — 21 tests (rewritten; the old
  file asserted a removed `KpiHeader` and stale copy)

Coverage: new investor (no positions), negative returns, error state, empty state,
loading state, dark mode rendering, responsive layout classes, and `jest-axe` on
nominal / loading / error / empty / dark states — **all passing**.

## Accessibility notes

| Check | Result |
|---|---|
| `jest-axe` | 0 violations across all states |
| Landmark + heading | `section` labelled by the single `h1` |
| Status semantics | `role="status"` on loading/empty/error tiles |
| Keyboard / focus | Native links/buttons, logical order, `focus-ring` visible |
| CTA contrast | White on `#2563eb` = **5.17:1** (AA ≥ 4.5:1) |
| Link contrast | `#3b82f6` on dark = **4.86:1** |
| Empty text contrast | `#94a3b8` on dark = **6.96:1** |
| Reduced motion | `prefers-reduced-motion` pauses pulse/fade |

## Verification

- `npm run lint` — no new errors in changed files (baseline repo already has 9
  pre-existing errors in unrelated files)
- Component tests — all hero/page tests pass
- Visual tests — none exist in this repo (no Storybook/Playwright); see
  before/after below

## Before / After

> Manual screenshots at 360px / 768px / 1280px (light & dark) are attached to
> the PR per the [design doc](docs/uiux/investor-dashboard-hero.md).

| Aspect | Before | After |
|---|---|---|
| Empty tiles | generic "No data yet" | contextual per-tile messaging |
| Error tiles | static, no action | friendly message + "Try again" |
| Loading tiles | unlabelled skeleton | `role="status"` + `aria-busy` |
| Sparkline | hidden on mobile | responsive, scales 100%→160px |
| Primary CTA | 3.68:1 (AA fail) | 5.17:1 (AA pass) |
| Docs | — | `docs/uiux/investor-dashboard-hero.md` |
