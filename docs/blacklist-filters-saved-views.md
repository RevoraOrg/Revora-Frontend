# Blacklist: Filter Chips & Saved Views (Design Spec)

Status: Implemented (Issue #431)

Purpose
- Provide repeatable filters and saved views for large blacklists.
- Support multi-select chips, overflow, and a saved-views dropdown with actions.

Anatomy
- Chip: label, optional count, remove affordance, and keyboard focus state.
- Saved-views dropdown: list, rename action, set default, and share (URL param sync).

Interactions
- Click chip to toggle; Shift+Click to multi-select range.
- Keyboard: Arrow navigation across chips; Delete/backspace to remove when focused; Enter to open saved-views menu.

Persistence & Sharing
- Save views per-user on the backend; include encoded filters in URL params for sharing.

Edge cases
- Many chips wrapping: collapse into "+N" overflow menu.
- Keyboard accessibility for overflow menu and chip removal.

---

## Implementation notes

Implemented on the Distribution Dashboard in a self-contained `BlacklistFiltersPanel`:

- `src/components/BlacklistFilterChips/` — multi-select chip bar
  - Chip states: default, active (`aria-pressed="true"`), disabled (`:disabled`), and overflow ("+N more" popover menu).
  - Multi-select per group (source, severity, region, created date); Shift+Click selects a contiguous range within a group.
  - Keyboard: ArrowLeft/Right/Up/Down navigation, Home/End, Enter/Space toggle, Delete/Backspace removes the focused chip.
  - WCAG 2.1 AA: every chip is a real `<button>` with `aria-pressed`; focus is visible (`:focus-visible` ring); group boundaries use a visual separator plus `role="group"`.
- `src/components/BlacklistSavedViews/` — saved-views dropdown
  - Actions per view: apply, rename (inline), set default (star), share (copies a shareable URL), delete.
  - "Save current filters" footer input; empty state and error state documented and rendered.
- `src/components/BlacklistFiltersPanel/` — orchestration
  - Persists views per-user in `localStorage` (mock backend) and syncs the active selection to URL params
    (`?blSource=…&blSeverity=…&blRegion=…&blCreated=…&blView=…`) so views are shareable via URL.
  - Filters a mock blacklist entry list and renders an empty state when nothing matches.
  - Reset button restores the default selection and clears URL params.

Accessibility & responsive
- RTL: overflow menu and saved-views panel are anchored with logical properties (`inset-inline-*`).
- Responsive: chips compact on narrow screens; the saved-views panel is capped to viewport width.
- Axe checks: `jest-axe` runs against the chip bar, saved views, and panel tests.

URL parameter contract (for sharing)
- `blSource` — multi-value (e.g. `blSource=wallet&blSource=ip`)
- `blSeverity` — multi-value (e.g. `critical`, `high`)
- `blRegion` — region id (`na`, `eu`, `apac`, `latam`, `mea`)
- `blCreated` — date range (`today`, `7d`, `30d`, `90d`)
- `blView` — id of the applied saved view
