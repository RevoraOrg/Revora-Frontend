# PR: Governance Empty-State Illustrations

## Summary

Adds governance-specific empty states — **No Proposals**, **No Votes Cast**, and
**No Delegates** — to the Distribution Dashboard, with three original SVG
illustrations, monochrome print variants, CTA wiring, CSS completion for the
`EmptyState` system, docs, and tests.

## Changes

### Illustrations (`src/components/designSystem/EmptyState.tsx`)
Redesigned the three governance glyphs from placeholder-level shapes into
distinct original illustrations (token-driven, `aria-hidden`, `isMonochrome`-ready):

| Variant | Glyph |
|---|---|
| `governance-proposals` | Stacked proposal documents + "create" badge |
| `governance-votes` | Ballot slipping into an empty ballot box |
| `governance-delegates` | Delegate with two delegation chain links |

### Wiring (`src/pages/DistributionDashboard.tsx`)
Each governance block now renders its `EmptyState` when data is empty, otherwise
the existing mock content renders unchanged:

| Block | Variant | Primary CTA |
|---|---|---|
| Proposal detail | `governance-proposals` | Create Proposal → `/startup/governance/proposals/create` |
| Results breakdown | `governance-votes` | View Active Proposals |
| Delegation | `governance-delegates` | Delegate Voting Power |

Demo affordance for review/screenshots: `?govEmpty=proposals|votes|delegates|all`.

Monochrome print: the dashboard passes `isMonochrome={isPrinting}` via the
existing `usePrintMode` hook; a `@media print` block flattens the container.

### CSS (`src/index.css`)
Added the previously missing `.empty-state-*` rules (completing the UX152
system): glass-card container, icon wrap, title/body/context, responsive actions
(stack → row ≥480px), RTL-friendly, and print monochrome handling. Consumes
existing `--ds-state-*` and colour tokens.

### Assets (`docs/uiux/governance-empty-states/`)
Standalone SVG sources + `512×512` PNG fallbacks for each illustration in colour
and monochrome, plus export guidance (qlmanage rasterization).

### Repairs to pre-existing breakage
`DistributionDashboard.tsx` did not previously compile (missing `</div>`,
missing `useUploadQueue()` call, missing state, missing imports). These were
restored so the page renders and its tests pass. Also fixed a real a11y
violation surfaced by the axe suite: focusable `<rect>`s in
`RevenuePayoutChart.tsx` now carry `role="img"`.

### Tests
- `EmptyState.test.tsx` — all 9 variants render; governance SVGs decorative;
  monochrome palette (`#000000`/`#555555`) and colour-mode assertions.
- `DistributionDashboard.test.tsx` — all three empty states under `?govEmpty=all`,
  Create Proposal CTA href, Back to Discovery links, print-mode monochrome SVG,
  axe checks with 0 violations (default + empty renders); stale assertions updated.

### Documentation
- `docs/uiux/governance-empty-state-illustrations.md` — specs, colour strategy,
  asset table + export guidance, tokens, responsive, a11y, testing, demo URLs.
- `docs/uiux/ux152-branded-empty-state-system.md` — governance variants added.

## Screenshots

Demo URLs to capture before/after:
- Before: `/startup/distributions` (mock data always present)
- After (empty): `/startup/distributions?govEmpty=all`
- Per-state: `?govEmpty=proposals` · `?govEmpty=votes` · `?govEmpty=delegates`

## Testing

```bash
npm run lint
npx vitest run src/pages/DistributionDashboard.test.tsx src/components/designSystem/EmptyState.test.tsx
```

Full suite and repo-wide lint verified on the feature branch — no new failures
or lint errors introduced; `DistributionDashboard.test.tsx` moves from failing
to passing.

## Checklist

- [x] 3 original governance SVG illustrations (proposals/votes/delegates)
- [x] Monochrome print variants (SVG palette + `@media print` CSS)
- [x] Wired into `DistributionDashboard.tsx` with CTAs
- [x] `.empty-state-*` CSS completed (was missing)
- [x] PNG fallbacks exported (512×512) + export guidance
- [x] Accessibility (WCAG 2.1 AA) — axe checks pass with 0 violations
- [x] Tests added/updated
- [x] Documentation written
- [x] `npm run lint` clean on changed files
- [x] Full test suite: no new failures
