# UX 442 — Gantt-style Payout Schedule Timeline

## Overview

A horizontal Gantt-style timeline that lets investors see payout cadence, gaps, and
overlaps at a glance. Implemented as a toggle-able alternative to the default table
view so keyboard and screen-reader users always have a fully accessible path.

---

## Files

```
src/pages/PayoutSchedule.tsx              — page component (Gantt + Table + DrillDown)
src/pages/PayoutSchedule.css              — scoped styles (psg-* namespace)
src/pages/PayoutSchedule.test.tsx         — integration tests (11 tests)
src/pages/PayoutSchedule.gantt.test.tsx   — Gantt-specific + utility unit tests (35 tests)
docs/uiux/ux442-payout-schedule-gantt-view.md — this document
```

Route added: `GET /investor/payouts` → `<PayoutSchedule />`

---

## Lane and bar anatomy

```
┌─ psg-page ───────────────────────────────────────────────────────────┐
│  ┌─ psg-header ────────────────────────────────────────────────────┐ │
│  │  h1 "Payout Schedule"    [Table | Gantt]  [Subscribe]           │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  (Gantt panel — hidden by default, shown when Gantt tab selected)     │
│  ┌─ psg-gantt-card ────────────────────────────────────────────────┐ │
│  │  psg-controls: [range label aria-live]  [Week|Month|Quarter]    │ │
│  │  ──────────────────────────────────────────────────────────     │ │
│  │  psg-gantt-scroll (overflow-x:auto on mobile)                   │ │
│  │    psg-gantt-inner (role=grid)                                  │ │
│  │      psg-gantt-header: label spacer + date tick spans           │ │
│  │      psg-lane (role=row) × N issuers                            │ │
│  │        psg-lane-label (role=rowheader): issuer name + count     │ │
│  │        psg-lane-track (role=gridcell)                           │ │
│  │          psg-today-marker (aria-hidden)                         │ │
│  │          psg-bar--{status} (role=button, tabindex=0)            │ │
│  │            psg-tooltip (role=tooltip on hover/focus)            │ │
│  │  ──────────────────────────────────────────────────────────     │ │
│  │  psg-pattern-key: swatch labels                                 │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  (Table panel — default view)                                         │
│  ┌─ psg-table-card ────────────────────────────────────────────────┐ │
│  │  <table> with th scope=col, one tr per payout                   │ │
│  │  Status column wraps pill in <button> for drill-down            │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─ psg-legend-card (always visible) ─────────────────────────────┐ │
│  │  h2 "Status Legend"  PayoutStatusPill × 7 (full variant)       │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  PayoutDrillDownPanel (slide-over, opens on bar/row click)            │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Status bar colours and patterns

Colour is never the only cue (WCAG 1.4.1).

| Status    | Bar colour | Pattern fill                       |
|-----------|------------|------------------------------------|
| scheduled | `#94a3b8`  | solid                              |
| preparing | `#60a5fa`  | solid                              |
| sending   | `#22d3ee`  | solid                              |
| confirmed | `#10b981`  | solid                              |
| retrying  | `#fbbf24`  | solid                              |
| failed    | `#ef4444`  | diagonal stripe 45°, 3 px / 6 px  |
| canceled  | `#64748b`  | diagonal stripe 45°, 3 px / 6 px  |

Pattern key legend is always rendered below the Gantt chart.

---

## Today marker

- 2 px vertical line in `--primary/60` spanning all lane tracks
- Dot at the top of the line (`.psg-today-marker__dot`)
- "Today" label in the tick header row
- `aria-hidden="true"` — decorative, conveys no unique meaning to SR users
- Clamped: only rendered when today falls within the computed range

---

## Zoom controls

| Level   | Min window | Bar width | Tick interval     |
|---------|------------|-----------|-------------------|
| Week    | 7 days     | 1 day     | Every day         |
| Month   | 28 days    | 2 days    | 1st of each month |
| Quarter | 84 days    | 4 days    | 1st of each month |

Buttons use `aria-pressed`, grouped under `role="group" aria-label="Zoom controls"`.
Range label uses `aria-live="polite" aria-atomic="true"` so screen readers announce changes.

---

## Hover / focus popover

On mouse-enter or keyboard focus of a bar:

- Renders `role="tooltip"` above the bar
- Content: issuer name, amount, scheduled date, compact `PayoutStatusPill`
- Bar references tooltip via `aria-describedby`
- Dismissed on mouse-leave / blur

---

## Click-through to DrillDown panel

Clicking (or pressing Enter / Space) on any bar or table-row status button opens
`PayoutDrillDownPanel` — a resizable slide-over with focus trap and ESC close.

A `PayoutDetail` object is synthesised from `PayoutData` fields so the panel renders
without a back-end call during the demo.

---

## Table alternative (WCAG 2.1 AA)

Default view on page load:

- `<table>` with `<th scope="col">` headers
- One `<tr data-testid="payout-row-{id}">` per payout
- Status cell wraps pill in a `<button>` for keyboard drill-down
- Screen readers announce: Issuer · Recipient · Amount · Date · Status

---

## Accessibility checklist

- [x] No colour-only cues — icons + labels + diagonal patterns
- [x] All interactive elements keyboard-reachable (Tab, Enter, Space)
- [x] `role="grid"` / `row` / `gridcell` / `rowheader` on Gantt
- [x] `role="tablist"` / `tab` / `tabpanel` on view toggle
- [x] `role="group"` + `aria-label` on zoom controls
- [x] `aria-pressed` on zoom buttons; `aria-selected` on view tabs
- [x] `aria-live="polite"` on range label
- [x] Focus trap + ESC inside DrillDownPanel
- [x] `prefers-reduced-motion`: CSS animation removed
- [x] `forced-colors`: bar outlines via `outline: 1px solid ButtonText`
- [x] `jest-axe` passes in table, gantt, week, and quarter modes

---

## Responsive behaviour

- Gantt wrapped in `overflow-x: auto` container
- Track `min-width` narrows from 36 rem → 28 rem at ≤ 640 px
- Lane labels narrow from 9 rem → 7 rem on mobile
- Table view naturally reflowable

---

## Edge cases

| Case | Handling |
|------|----------|
| Empty payouts | `empty` prop renders `EmptyState` variant |
| Today outside visible range | Today marker clamped and hidden |
| Dense same-day bars | All bars positioned at same left%, `min-width: 0.25rem` ensures visibility |
| Single-item lane | Zoom-specific padding added so bar is never clipped |
| RTL | Ticks and amounts wrapped in `direction:ltr; unicode-bidi:isolate` |

---

## Before / After

**Before:** `PayoutSchedule.tsx` was broken — duplicate imports, mixed incomplete Gantt
fragments, no Gantt view actually rendered.

**After:**

- Clean, fully-typed component (no duplicate imports)
- Gantt lane view (tab-toggled) with today marker and 3-level zoom
- Table view as default (keyboard/SR accessible)
- Hover popovers + click-through `PayoutDrillDownPanel`
- WCAG 2.1 AA — axe-clean in all modes
- 46 tests, all passing; 95 % coverage threshold enforced in `vite.config.ts`
