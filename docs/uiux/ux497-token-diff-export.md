# Design Tokens Admin — Diff & Export (Issue #497)

## Purpose

Designers iterating on tokens need to see what changed between saves and export the diff. The Design Tokens admin page now includes a diff view that highlights added, changed, and removed tokens, plus per-format export (JSON, CSS variables, Sass) with copy-to-clipboard and download affordances.

## Anatomy

- **Summary chips**: read-only counts for added / changed / removed / unchanged tokens.
- **Status filter**: segmented control (All / Added / Changed / Removed) that narrows the rows.
- **Show unchanged toggle**: defaults to *off* so large diffs stay readable; enabling it reveals identical tokens.
- **Group accordions**: one per token category, each collapsible and showing how many rows are visible.
- **Three-column diff layout**: `Token | Before | After`. Each row carries a status badge; added rows show a dash in *Before*, removed rows a dash in *After*.
- **Color affordance**: hex color values render with a swatch in both value columns so hue shifts are visible at a glance.
- **Binary tokens**: icon/asset tokens (e.g. `--icon-logo`) are labeled "Binary asset" instead of dumping raw payloads.
- **Export panel**: format tabs (JSON / CSS variables / Sass), a live preview, a copy button, and a download button per format.

## Behavior

- The diff compares a *before* snapshot against the *after* (current draft) snapshot by CSS variable name across matching groups.
- Statuses are derived automatically:
  - `added` — token present only in the current draft
  - `removed` — token present only in the previous snapshot
  - `changed` — present in both, value differs
  - `unchanged` — present in both, value identical
- Exports represent the diff:
  - **JSON**: `{ added: {...}, changed: { var: { before, after } }, removed: {...} }`
  - **CSS variables**: `:root { /* added */ ... /* changed */ ... }` with removed tokens commented out.
  - **Sass**: `$var: value;` grouped under `// added` / `// changed` comments, with removed variables commented out.
- Binary tokens export as `[binary asset]`.
- Empty (no changes) state shows when the snapshots match; a smaller empty state appears when a status filter matches no rows.

## Large-diff readability

- Unchanged rows are hidden by default.
- Groups collapse independently so reviewers can focus on one category.
- Status filters slice the diff to a single change type.
- Values wrap within their column rather than truncating, and long export previews scroll (`max-height: 320px`).

## Accessibility (WCAG 2.1 AA)

- Status is never conveyed by color alone: badges include text labels and rows expose `aria-label="<name>: <status>"`.
- The status filter uses `aria-pressed` toggles and the export format tabs use `role="tablist"` / `role="tab"` with `aria-selected`.
- The diff table uses proper `role="table"` / `role="row"` / `role="columnheader"` / `role="cell"` relationships.
- The empty state uses `role="status"` with `aria-live="polite"`.
- All controls have visible focus indicators and the copy action announces success via the button label.
- Verified with `jest-axe` (`axe` + `toHaveNoViolations`) on both the component and the full page. Pre-existing ARIA misuses (grid/row roles, nested `main` landmarks, heading-order jumps) in the token sections, device preview, and chart guidelines were corrected as part of this work.

## Responsive and RTL notes

- Below 640px each row stacks: the token cell spans the full width, with Before/After side by side beneath it.
- The layout uses logical properties (`padding-inline`, `border-inline-end`, `text-align: start`) so the three columns mirror correctly under `dir="rtl"`.
- In print, the interactive controls (toggles, tabs, export actions) are hidden; rows remain readable.
- The code preview forces `direction: ltr` so token values render consistently regardless of page direction.

## Implementation notes

- Diff logic and export formatters live in [src/pages/DesignTokens/tokenDiff.ts](src/pages/DesignTokens/tokenDiff.ts).
- The component lives in [src/pages/DesignTokens/TokenDiff.tsx](src/pages/DesignTokens/TokenDiff.tsx).
- The page integrates it from [src/pages/DesignTokens/DesignTokensPage.tsx](src/pages/DesignTokens/DesignTokensPage.tsx) with snapshot data in `tokenDiff.ts`.
- Tests: `TokenDiff.test.tsx` (unit + interaction + axe) and `DesignTokensPage.test.tsx` (integration + axe).
- Coverage thresholds: 95% for `TokenDiff.tsx` and `tokenDiff.ts` enforced in `vite.config.ts`.
