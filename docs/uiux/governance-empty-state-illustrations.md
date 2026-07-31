# Governance Empty-State Illustrations

## Scope

Governance-specific empty states for the Revora Distribution Dashboard:
**No Proposals**, **No Votes Cast**, and **No Delegates** — with original SVG
illustrations, monochrome print variants, CTA wiring, documentation, and tests.

## Problem Statement

The governance area of the Distribution Dashboard always rendered mock data.
There were no empty states for the three core governance scenarios, and the
`EmptyState` component already declared `governance-proposals` /
`governance-votes` / `governance-delegates` variants whose glyphs were
placeholder-level and unstyled.

| Scenario | Previous Treatment |
|---|---|
| No active proposals | Mock proposal always shown |
| No votes cast | Mock results breakdown always shown |
| No delegates | Mock delegation UI always shown |
| `.empty-state-*` classes | Referenced by `EmptyState` but **no CSS rules existed** |

## Solution

Three original, token-driven SVG illustrations were added to
[`src/components/designSystem/EmptyState.tsx`](src/components/designSystem/EmptyState.tsx)
and wired into [`src/pages/DistributionDashboard.tsx`](src/pages/DistributionDashboard.tsx)
using the established conditional pattern (see `AuditTrail.tsx`).

| Variant | Glyph Concept | Use Case |
|---|---|---|
| `governance-proposals` | Stacked proposal documents + "create" badge | No active proposals |
| `governance-votes` | Ballot slipping into an empty ballot box | No votes cast |
| `governance-delegates` | Delegate with two delegation chain links | No delegates |

### Wiring

Each governance block renders its `EmptyState` only when the corresponding data
is empty, otherwise the existing mock content renders unchanged.

| Governance block | Empty variant | Primary CTA | Target |
|---|---|---|---|
| Proposal detail card | `governance-proposals` | Create Proposal | `/startup/governance/proposals/create` |
| Results breakdown | `governance-votes` | View Active Proposals | `/startup/governance/proposals/create` |
| Delegation UI | `governance-delegates` | Delegate Voting Power | `/investor/portal` |

> **Note:** dedicated proposal-list and delegate-management routes do not exist
> yet; CTAs resolve to the closest available destination. Re-point the `href`
> values when those routes land.

A demo affordance exposes the empty states for review and screenshotting:

| URL | Shows |
|---|---|
| `/startup/distributions?govEmpty=proposals` | Proposals empty state |
| `/startup/distributions?govEmpty=votes` | Votes empty state |
| `/startup/distributions?govEmpty=delegates` | Delegates empty state |
| `/startup/distributions?govEmpty=all` | All three |

When the parameter is absent the page renders exactly as before (mock data).

### Monochrome print variant

- The `isMonochrome` prop (existing) switches the SVG palette to grayscale
  (`#000000` / `#555555` / `#333333`) and removes the drop shadow.
- The dashboard passes `isMonochrome={isPrinting}` from the existing
  [`usePrintMode`](src/hooks/usePrintMode.ts) hook, matching the chart widgets.
- A `@media print` block in `src/index.css` flattens the container and actions
  to monochrome for print output.

## Illustration Colour Strategy

Same rules as the rest of the `EmptyState` set:

- **Strokes**: CSS custom properties (`var(--primary)`, `var(--text-muted)`,
  `var(--text-accent)`) so illustrations adapt to light/dark mode.
- **Fills**: same tokens with alpha channels for subtlety on both backgrounds.
- **Error severity**: outer badge, well, and accent ring switch to `var(--error)`.
- **ViewBox** is always `0 0 96 96`; default render size `96px` (`size` prop).

## Asset Files

Standalone exports (identical geometry to the runtime glyphs) live in
`docs/uiux/governance-empty-states/` for docs, print, and design handoff:

| File | Variant |
|---|---|
| `governance-proposals.svg` / `.png` | Proposals, colour |
| `governance-votes.svg` / `.png` | Votes, colour |
| `governance-delegates.svg` / `.png` | Delegates, colour |
| `governance-proposals-mono.svg` / `.png` | Proposals, monochrome print |
| `governance-votes-mono.svg` / `.png` | Votes, monochrome print |
| `governance-delegates-mono.svg` / `.png` | Delegates, monochrome print |

The runtime never loads these files — the SVG glyphs are inlined in
`EmptyState.tsx` so they inherit design tokens and the `isMonochrome` prop.
The exports are the canonical source for print/design review.

### Contributor export guidance (regenerate PNGs)

macOS `qlmanage` is used to rasterize the SVGs (no rsvg-convert/inkscape on the
reference machine):

```bash
cd docs/uiux/governance-empty-states
for f in governance-*.svg; do
  qlmanage -t -s 512 -o . "$f"
  mv "$f.png" "${f%.svg}.png"
done
```

Verify: each PNG is `512×512` (`sips -g pixelWidth -g pixelHeight *.png`) and
each SVG is well-formed XML (`xmllint --noout *.svg`).

## Design Tokens Consumed

| Token | Purpose |
|---|---|
| `--ds-state-gap` | Vertical gap between illustration, text, and actions |
| `--ds-state-pad-y` / `--ds-state-pad-x` | Container padding |
| `--ds-state-max-w` | Body text column max-width |
| `--ds-state-icon-size` | Icon well diameter |
| `--text-main` / `--text-muted` / `--text-accent` | Title / body / context colours |
| `--primary` / `--error` | Illustration + CTA colours |
| `--glass-bg` / `--glass-border` / `--glass-blur` | Container background/border/blur |
| `--shadow-xl` | Container elevation |
| `--radius-2xl` | Container border-radius |
| `--primary-btn-bg` | CTA fill (WCAG 2.1 AA on dark) |

## CSS Classes

`.empty-state-*` rules were previously missing; they are now defined in
`src/index.css` (completing the UX152 system):

| Class | Purpose |
|---|---|
| `.empty-state-container` | Centred column, glass-card styling |
| `.empty-state-container--error` | Error border + title tint |
| `.empty-state-icon-wrap` | Centres the decorative SVG |
| `.empty-state-content` | Text column, capped max-width |
| `.empty-state-title` | `--font-size-xl`, semibold |
| `.empty-state-body` | `--font-size-sm`, muted |
| `.empty-state-context` | Accent colour |
| `.empty-state-actions` | Stack (mobile) → row (≥480px) |
| `.empty-state-action` | Auto-width buttons inside a row |

## Responsive Behaviour

| Viewport | Layout |
|---|---|
| 320–479 px | Single column; actions stack full-width |
| 480 px+ | Actions sit side-by-side (auto-width, min 11rem) |
| 768 px+ | Container centres at `max-width: 38rem` |

## Accessibility (WCAG 2.1 AA)

| Feature | Implementation |
|---|---|
| Decorative illustrations | `aria-hidden="true"`, `role="presentation"` |
| Status announcement | `role="status"`, `aria-live="polite"` on root |
| Heading association | `aria-labelledby` → `<h2>` |
| Keyboard focus | `<button>` / `<a>` CTAs with `:focus-visible` rings |
| Contrast | Body copy `--text-muted` ≥4.5:1 on dark; CTA uses `--primary-btn-bg` |
| RTL | Logical properties; `dir` inherited from parent |
| Demo param | `govEmpty` values only toggle which branch renders — no colour-only cues |

## Testing

- [`EmptyState.test.tsx`](src/components/designSystem/EmptyState.test.tsx) —
  all 9 variants render, governance variants render decorative SVGs, monochrome
  palette assertions (`#000000` / `#555555`), colour-mode assertions.
- [`DistributionDashboard.test.tsx`](src/pages/DistributionDashboard.test.tsx) —
  all three empty states render under `?govEmpty=all`, Create Proposal CTA href,
  Back to Discovery links, monochrome SVG output under print mode, and axe
  checks with zero violations for both the default and empty-state renders.

```bash
npm run lint
npx vitest run src/pages/DistributionDashboard.test.tsx src/components/designSystem/EmptyState.test.tsx
```

## Repairs to Pre-Existing Breakage

The dashboard file did not previously compile (missing `</div>`, missing hook
call, missing state, missing imports), which also masked a real a11y violation
(`aria-label` on a focusable `<rect>` without a role in
`RevenuePayoutChart.tsx`). These were repaired so the page renders and its
tests pass:

- `src/pages/DistributionDashboard.tsx` — restored unclosed container `</div>`,
  `useUploadQueue()`, `payoutsList`/`selectedPayoutId` state,
  `updateFiltersAndUrl`, and missing imports (`PreOpenBanner`,
  `DistributionFilterToolbar`, `TokenSupplyBlock`, `PayoutDrillDownPanel`,
  `FinancialTermsForm`, `FinancialTermsField`).
- `src/components/RevenuePayoutChart/RevenuePayoutChart.tsx` — added
  `role="img"` to the focusable bar rects.
- `src/pages/DistributionDashboard.test.tsx` — updated stale assertions
  ("Batch Upload Queue", "By Region" scoped to its section, 63.5% turnout) and
  replaced obsolete tests with the governance empty-state suite.
