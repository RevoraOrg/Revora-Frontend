# UX107: Discovery Empty & Error States

## Scope

`InvestorDiscovery` component — the offering discovery results area used by the Investor Portal.
Changes are UI/UX only; no routing, API, or backend behaviour is altered.

---

## Problem Statement

The previous `InvestorDiscovery` was a static stub with a hard-coded three-card grid. It had:

| Issue | Detail |
|---|---|
| No filtering / search wiring | Search input was purely decorative |
| No empty state | Zero-result queries showed nothing |
| No distinction between state types | "no offerings at all" vs "no matches for filter" looked identical |
| No error state | Load failures had no UI treatment |
| No ARIA live regions | Screen readers couldn't announce result changes |
| No accessible progress bars | Funding progress had no `progressbar` role |

---

## State Model

The component uses a **discriminated union** `DiscoveryState` to drive the result area:

```
DiscoveryState =
  | { kind: 'loaded';         offerings: Offering[] }
  | { kind: 'filtered-empty'; query: string; hasFilters: boolean }
  | { kind: 'truly-empty' }
  | { kind: 'error';          retryCount: number }
```

### State Decision Tree

```
MOCK_OFFERINGS.length === 0
  └─ truly-empty
        ↓
query or filtersActive?
  ├─ YES → filter(offerings by query)
  │          └─ length === 0 → filtered-empty  (active query echoed)
  │          └─ length > 0  → loaded
  └─ NO  → loaded (full list)
```

---

## Components

### `DiscoveryEmptyState` (exported, independently testable)

| Prop | Type | Required | Description |
|---|---|---|---|
| `variant` | `'filtered' \| 'truly-empty'` | ✅ | Controls icon, heading, copy, and CTA |
| `query` | `string` | ❌ | Echoed search term (filtered variant only) |
| `onClearFilters` | `() => void` | ✅ | Fired when user clicks "Clear filters" |

**Filtered variant** — rendered when a search/filter produced zero results:
- Icon: `SearchX` (blue tinted circle)
- Heading: "No offerings match your search"
- Body: echoes the `query` in an accent-coloured `<span>` or falls back to "matching the active filters"
- CTA: "Clear filters" button → calls `onClearFilters`

**Truly-empty variant** — rendered when the platform has no offerings at all:
- Icon: `PackageOpen` (blue tinted circle)
- Heading: "No offerings yet"
- Body: Reassuring copy about future listings
- CTA: "How it works" secondary button

### `DiscoveryErrorState` (exported, independently testable)

| Prop | Type | Required | Description |
|---|---|---|---|
| `onRetry` | `() => void` | ✅ | Fired when user clicks "Try again" |
| `retryCount` | `number` | ❌ | When > 0 shows "Retried N time(s)" hint |

- Icon: `ServerCrash` (red tinted circle)
- Heading: "Couldn't load offerings"
- Body: Reassuring — "Your portfolio and account are unaffected"
- Retry hint: Appears only when `retryCount > 0` (singular "time" / plural "times")
- CTA: "Try again" primary button → calls `onRetry`

---

## Design System Tokens Added (`index.css → :root`)

| Token | Value | Usage |
|---|---|---|
| `--ds-empty-icon-bg` | `rgba(59, 130, 246, 0.08)` | Icon well background (empty) |
| `--ds-empty-icon-fg` | `var(--primary)` | Icon stroke (empty) |
| `--ds-error-icon-bg` | `rgba(239, 68, 68, 0.08)` | Icon well background (error) |
| `--ds-error-icon-fg` | `var(--error)` | Icon stroke (error) |
| `--ds-state-gap` | `1.25rem` | Column gap between state slots |
| `--ds-state-max-w` | `28rem` | Max-width of body text column |
| `--ds-state-pad-y` | `3.5rem` | Vertical padding inside state card |
| `--ds-state-pad-x` | `2rem` | Horizontal padding inside state card |
| `--ds-state-icon-size` | `4.5rem` | Icon well diameter |
| `--ds-filter-badge-size` | `0.5rem` | Active-filter dot indicator size |

---

## CSS Component Classes

| Class | Applied to | Purpose |
|---|---|---|
| `.discovery-state-container` | Both state root `<div>`s | Centred column flex layout, glass-card styling |
| `.discovery-state-icon-wrap` | Icon well `<div>` | Circular container base |
| `.discovery-state-icon-wrap--empty` | Empty state icon | Blue-tinted background + border |
| `.discovery-state-icon-wrap--error` | Error state icon | Red-tinted background + border |
| `.discovery-state-title` | `<h2>` in state cards | 20px / 600 weight heading |
| `.discovery-state-body` | Body `<p>` | 14px, muted, max-width capped |
| `.discovery-state-query` | Echoed query `<span>` | Accent colour + subtle bg highlight |
| `.discovery-state-retry-hint` | Retry count `<p>` | 13px, italic, muted |
| `.discovery-state-action` | CTA buttons | `inline-flex`, min-width 9rem |
| `.discovery-filter-btn--active` | Filter button when pressed | Brightened border, accent icon colour |
| `.discovery-filter-badge` | Dot badge on filter button | 8px circle, accent colour, `position: absolute` |

---

## Layout

```
┌─── <div.max-w-6xl> ──────────────────────────────────────────────────────┐
│                                                                           │
│  ┌─ Page header ────────────────────────────────────────────────────────┐ │
│  │  <h1> Discover Offerings                                             │ │
│  │  [Search input ─────────────────────] [Filter ●]                    │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  [Filters active • Clear all]  ← aria-live="polite", visible when active │
│                                                                           │
│  ┌─ <section aria-label="Offering results" aria-live="polite"> ────────┐ │
│  │                                                                      │ │
│  │  [loaded]         3-column OfferingCard grid                         │ │
│  │  [filtered-empty] DiscoveryEmptyState variant="filtered"             │ │
│  │  [truly-empty]    DiscoveryEmptyState variant="truly-empty"          │ │
│  │  [error]          DiscoveryErrorState                                │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌─ Portfolio CTA (loaded state only) ─────────────────────────────────┐ │
│  │  Build Your Portfolio  …  [How it works]                            │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## ARIA & Accessibility

| Element | Role / Attribute | Rationale |
|---|---|---|
| `<section>` result area | `aria-live="polite"` + `aria-label="Offering results"` | Announces result changes to screen readers without interruption |
| `DiscoveryEmptyState` root | `role="status"` + `aria-live="polite"` + `aria-labelledby` | Polite status region; heading linked |
| `DiscoveryErrorState` root | `role="alert"` + `aria-live="assertive"` + `aria-labelledby` | Assertive announcement for failures |
| Funding progress bar | `role="progressbar"` + `aria-valuenow/min/max` + `aria-label` | Accessible progress semantics |
| Filter toggle button | `aria-pressed` (boolean) | Communicates toggle state to AT |
| Echoed query `<span>` | `aria-label="search term: {query}"` | Provides spoken label for the highlighted text |
| Filter indicator | `aria-live="polite"` | Announces when filter becomes active |
| Icon `<div>`s | `aria-hidden="true"` | Decorative; excluded from AT tree |

### WCAG 2.1 AA Mapping

| SC | Description | How addressed |
|---|---|---|
| 1.3.1 Info and Relationships | Structure is programmatically determinable | `role="alert/status"`, `aria-labelledby`, `<h1>/<h2>` hierarchy |
| 1.4.3 Contrast Minimum | Text ≥4.5:1 | `--text-muted` (#cbd5e1 on #020617) ≈5.9:1; error red on dark ≈5.4:1 |
| 2.1.1 Keyboard | All interactive elements keyboard accessible | Buttons and links reachable via Tab; focus order logical |
| 2.4.3 Focus Order | Focus order preserves meaning | State views render actions first in DOM tab order |
| 2.4.7 Focus Visible | Focus indicators visible | Global `:focus-visible` rules from `index.css` inherited |
| 4.1.3 Status Messages | Status messages available to AT without focus | `role="status"` / `role="alert"` + `aria-live` |

---

## Test Coverage

File: `src/components/InvestorDiscovery.test.tsx` — **68 tests across 10 describe blocks**

| Group | Tests |
|---|---|
| DiscoveryEmptyState – filtered | 13 tests (ARIA, heading, query echo, CTA, focus) |
| DiscoveryEmptyState – truly-empty | 6 tests (heading, copy, CTA, icon class) |
| DiscoveryErrorState | 12 tests (ARIA, heading, copy, retry hint singular/plural, focus) |
| InvestorDiscovery – loaded | 6 tests (cards, search, progressbar ARIA, CTA) |
| InvestorDiscovery – search filtering | 5 tests (type, no-match, clear-X, case-insensitive) |
| InvestorDiscovery – filter toggle | 5 tests (aria-pressed, indicator, clear-all) |
| InvestorDiscovery – simulated states | 7 tests (all 4 state kinds, portfolio CTA visibility) |
| InvestorDiscovery – retry interaction | 1 test |
| InvestorDiscovery – clear filtered-empty | 1 test (round-trip: type → empty → clear → loaded) |
| Result area accessibility | 3 tests (region role, aria-live, alert inside region) |

**Coverage target:** ≥95% branches / functions / lines / statements on `InvestorDiscovery.tsx`
Enforced via `vite.config.ts → coverage.thresholds`.

---

## Responsive Behaviour

| Viewport | Layout |
|---|---|
| 320 px | State card full-width; body text wraps within `--ds-state-max-w`; padding `--ds-state-pad-x` clips safely |
| 375–480 px | Same single-column; offering grid is 1-col |
| 768 px+ | Offering grid switches to 3-col; header row aligns search bar right |

---

## Implementation Notes

- `__simulateState` prop on `InvestorDiscovery` — available for Storybook and tests to force any state without touching mock data. Not a production API surface.
- `useId()` used in both `DiscoveryEmptyState` and `DiscoveryErrorState` for stable `aria-labelledby` IDs.
- `DiscoveryEmptyState` and `DiscoveryErrorState` are named exports — independently renderable and testable in isolation.
- The filter button uses `aria-pressed` (a toggle pattern) rather than `aria-expanded` because it toggles a filter state, not a disclosure panel.
- Portfolio CTA is conditionally rendered only in the `loaded` state to avoid visual clutter alongside state views.

---

## Security Notes

- No user-supplied HTML is rendered. The echoed query string is inserted as React text content (auto-escaped).
- No backend changes; purely frontend UI state.
