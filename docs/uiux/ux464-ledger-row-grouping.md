# Ledger Row Grouping & Collapse Controls — Issue #464

## Overview

The Ledger (`src/pages/Ledger.tsx`) lets investors/operators group their transaction history by **Day**, **Batch**, or **Payout**, and collapse/expand each group to manage long lists. A toolbar select drives the grouping dimension, group header rows surface aggregate stats (item count + running total), and per-group toggles support mouse, touch, and full keyboard interaction.

---

## Design Rationale & UX Goals

1. **Reduce Scan Cost**: Long flat ledgers force vertical scrolling. Grouping by Day/Batch/Payout creates logical chunks with a header row that summarizes each chunk, so users can locate transactions by context rather than by reading every row.
2. **Aggregate at a Glance**: Each group header shows the number of entries and the summed `Total $X.XX` for the group, so batch/payout totals are visible without manual summation.
3. **Progressive Disclosure**: Groups render expanded by default; users collapse groups they do not care about (or use Collapse all) to reduce noise. Collapsed state is stable — it survives sorting changes and pagination.
4. **Sorting Composes with Grouping**: Sorting applies within groups (entries are re-ordered inside their bucket), so "sort by amount" does not scramble group boundaries.
5. **Accessibility First**: Group toggles are real buttons with `aria-expanded`/`aria-controls`, arrow-key support, a polite live region for announcements, and zero `jest-axe` violations. `aria-expanded` lives on the toggle button only — never on the grid row — since axe flags it as invalid for plain `grid` rows (only `treegrid` rows support it).

---

## Toolbar Layout & Component Architecture

```
+---------------------------------------------------------------------------------------------------------------+
|  Group by [Day ▼]   Sort [Amount ▼] [↑]           Groups (10)  [Collapse all]  [Expand all]                   |
+---------------------------------------------------------------------------------------------------------------+

Desktop:                                        Mobile:
┌─────────────────────────────────────────────┐ ┌───────────────────────────────────────────┐
│ ▼  Jan 1, 2025    [2 items]  Total $123.45  │ │ ▼  Jan 1, 2025                  [2] $123.45 │
│   ─────────────────────────────────────────  │ │   ───────────────────────────────────────  │
│   Date  Type  Amount  Asset  Status  Ref   │ │   ENT-0001  confirmed   $100.00  USD       │
│   ENT-0001 ...                             │ │   ENT-0002  pending     $23.45   BTC        │
└─────────────────────────────────────────────┘ └───────────────────────────────────────────┘
```

### Grouping Options

| Group Mode | Group Value Source | Header Label |
|------------|--------------------|--------------|
| `none` | — (single "All entries" bucket, sorting still applies) | — |
| `day` | `entry.date` | Locale date, e.g. `Jan 1, 2025` |
| `batch` | `entry.type` | `Investment`, `Payout`, `Distribution`, `Fee` |
| `payout` | `entry.status` | `Confirmed`, `Pending`, `Failed` |

### Component Structure (all inline in `src/pages/Ledger.tsx`)

- **Toolbar** (`role="group"`, `aria-label="Ledger table controls"`): "Group by" select, "Sort by" select, direction toggle button (↑/↓), and — only when grouped — `Groups (n)` count, `Collapse all`, and `Expand all`.
- **`DesktopGroupHeader`**: a `role="row"` `<tr colSpan={7}>` with a chevron toggle button, group label, `n item(s)` pill, and `Total $X.XX` chip.
- **`MobileGroupHeader`**: the same content as a card header inside the mobile `role="list"`.
- **Collapse state**: `Set<string>` keyed by `${mode}:${value}` (stable across sort/pagination). Group bodies use ids `ledger-group-{mode}-{slug(value)}` (desktop) / `mobile-ledger-group-...` (mobile) wired via `aria-controls`.

---

## Behavior Specification

| Interaction | Result |
|-------------|--------|
| Change "Group by" | Rows re-bucket; collapsed state preserved for matching `mode:value` keys |
| Click group chevron | Collapses/expands that group; announces `Group <label> collapsed/expanded` |
| ArrowRight / ArrowDown on toggle | Expand (no-op if already expanded) |
| ArrowLeft / ArrowUp on toggle | Collapse (no-op if already collapsed) |
| `Collapse all` / `Expand all` | Collapses/expands every visible group; button disabled when no action is possible |
| Change sort key/direction | Re-orders entries inside each group; collapsed groups stay collapsed |

### Live Region Announcements (`data-testid="ledger-live-region"`, `role="status"`)

- `Grouping cleared` / `Grouped by <label>`
- `Sorted by Amount|Date ascending|descending`
- `Sort direction ascending|descending`
- `Group <label> collapsed|expanded`
- `All n groups collapsed` / `All n groups expanded`
- Row-level: `<label> expanded|collapsed`

---

## Accessibility Checklist (WCAG 2.1 AA)

| Criteria | Implementation | Status |
|----------|----------------|--------|
| **Group semantics** | Header rows use `role="row"` inside the existing `role="grid"`; toggle buttons expose `aria-expanded` | Pass |
| **State linkage** | `aria-controls` points at the group body id (desktop & mobile variants) | Pass |
| **Keyboard** | Enter/Space activate toggles natively; arrows expand/collapse per the table above | Pass |
| **Announcements** | All grouping/sort/collapse actions announced via polite live region | Pass |
| **Focus management** | Row toggles re-focus after expansion via `requestAnimationFrame` ref lookup | Pass |
| **Disabled states** | Collapse all / Expand all disabled when nothing to do (opacity + `cursor-not-allowed`) | Pass |
| **Axe Core Audit** | `jest-axe` clean in default and grouped-with-collapsed-group states | Pass |

---

## Testing & Verification

- **Automated Tests**: 85 passing tests in `src/pages/Ledger.test.tsx`, including grouping selector, group header stats (count + total sum validation), collapse/expand, collapse-all/expand-all, sort-within-group, grouped-state persistence across pagination, mobile group headers, pagination arrow controls (desktop + mobile), focus management, and `jest-axe` checks.
- **Coverage**: `src/pages/Ledger.tsx` meets the 95% per-file threshold for branches/functions/lines/statements configured in `vite.config.ts` (100% lines, 100% functions, 100% statements, ~95% branches).
- **Lint**: `eslint src/pages/Ledger.tsx src/pages/Ledger.test.tsx` passes with 0 errors.
