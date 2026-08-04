# Revenue Reporting Calendar — Year, Bulk Select & Mobile Agenda

Design notes for Issues [#424](https://github.com/RevoraOrg/Revora-Frontend/issues/424),
[#426](https://github.com/RevoraOrg/Revora-Frontend/issues/426), and
[#428](https://github.com/RevoraOrg/Revora-Frontend/issues/428).

Implementation:
- [`RevenueReportingCalendar.tsx`](../../src/components/RevenueReportingCalendar.tsx)
- [`RevenueCalendarPeriodViews.tsx`](../../src/components/RevenueCalendarPeriodViews.tsx)
- [`RevenueCalendarAgendaView.tsx`](../../src/components/RevenueCalendarAgendaView.tsx)

## #424 — Period scale switcher (Month / Quarter / Year)

Segmented control under the month navigator:

| Scale | Interaction |
| --- | --- |
| **Month** | Existing day grid + details panel |
| **Quarter** | Four quarter tiles with per-month status glyphs; Enter/click drills into a month |
| **Year** | 12 mini-month tiles (4×3) with status glyphs and counts; keyboard grid nav |

Year/quarter navigation uses the same chevrons (year ±1). Selection is preserved when switching scales; drilling into a tile restores Month scale on that month.

**A11y:** `role="tablist"` for the switcher; year/quarter grids use WAI-ARIA grid + roving tabindex. Glyphs are decorative; status is in each tile’s `aria-label`.

**Responsive / RTL:** Quarter tiles stack to one column under 640px. Glyph/count placement mirrors in RTL.

## #426 — Bulk select + floating toolbar

| Input | Behavior |
| --- | --- |
| Click | Single select |
| Ctrl/Cmd+Click | Toggle date in selection |
| Shift+Click | Range from last anchor |
| Shift+Arrow | Keyboard range extend |

When 2+ dates are selected, a fixed floating toolbar offers **Export**, **Nudge Owners**, **Close**, and clear (✕).

**Close flow:** Confirm copy explains mixed statuses → Close marks due/overdue/submitted as reconciled → [`UndoBanner`](./undo-banner-pattern.md) offers undo via `onBulkClose` / `onBulkCloseUndo`.

## #428 — Mobile agenda view

Mobile-only Calendar / Agenda toggle (month scale). Agenda defaults on small screens.

Row anatomy: date stack · status pill · **issuer** (truncates) · due/meta · chevron.

Groups use **sticky month headers** across a ± window of months. Swipe left reveals Nudge / Close; each opens an inline confirm before acting (then undo banner for close).

**Edge cases:** long issuer names ellipsize; RTL mirrors swipe actions; reduced-motion disables swipe transform transitions.

## Keyboard cheat sheet

| Key | Action |
| --- | --- |
| Arrows | Move focus (day / month / quarter) |
| Shift+Arrow | Extend bulk range (month grid) |
| Enter / Space | Select / drill down |
| PageUp / PageDown | Prev / next month |
| T | Jump to today |
| ? | Open shortcuts overlay (when `onOpenShortcuts` provided) |
