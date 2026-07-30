# Revenue calendar hover / focus preview

## Purpose

The revenue reporting calendar provides a compact, read-only period preview without requiring a date selection. It is an enhancement to—not a replacement for—the calendar details panel.

The preview appears only for a date that has at least one report and contains:

1. **Reported revenue** — aggregate `grossRevenue` for the date.
2. **Payout status** — the canonical payout lifecycle state, when supplied.
3. **Variance vs prior period** — reported-revenue percentage against the same day in the preceding month.
4. **Revenue trend** — a decorative five-period-or-fewer sparkline. The preceding text KPIs are the text equivalent; the SVG itself is hidden from assistive technology.

## Data contract

`RevenueReport` now accepts an optional `payoutStatus` using the canonical `PayoutStatus` taxonomy from `PayoutStatusPill`:

```tsx
{
  id: 'apr-2026',
  date: '2026-04-08',
  dueDate: '2026-04-08',
  status: 'accepted',          // revenue-report status
  grossRevenue: 1250,
  currency: 'USD',
  payoutStatus: 'confirmed',   // payout lifecycle status
}
```

`status` and `payoutStatus` are deliberately separate. A submitted report does not imply that its investor payout has been sent. If payout data is absent, the preview says **Not available** rather than inventing a payout state. If several reports on one day have different payout states, it says **Mixed** and exposes the individual states in the value's native description.

A variance is shown only when both periods have reported revenue. A non-zero current amount against a zero prior amount is labelled **New**; missing data is shown as an em dash rather than as a misleading -100% change.

## Interaction and timing

| Trigger | Behaviour |
| --- | --- |
| Fine-pointer hover | Opens after **300 ms** to avoid flashing while a user scans the grid. |
| Keyboard focus | Opens **immediately**. The active day cell references the card with `aria-describedby`. |
| Pointer leave / blur | Closes after a **150 ms** grace period, avoiding accidental closure while moving between adjacent cells. |
| `Escape` | Closes immediately while keeping focus on the day. It remains suppressed until hover or focus clears, then can open normally on re-entry. |
| Enter / Space / click | Keeps existing date-selection behaviour and closes the compact preview. |
| `prefers-reduced-motion: reduce` | Removes the CSS entrance animation and uses an immediate hover open/close path. |

The preview contains no interactive controls and has `pointer-events: none`; it cannot trap focus or cause hover flicker. Full actions continue to live in the details panel.

## Accessibility (WCAG 2.1 AA)

- The day remains a keyboard-reachable `gridcell` with a roving tab stop. A newly focused cell opens its preview immediately.
- The card has `role="tooltip"` and is connected only while visible with `aria-describedby`. It is not a live region, avoiding duplicate announcements.
- Escape dismissal, visible focus styling, keyboard selection, and existing grid navigation are preserved.
- KPI labels and full text values communicate status and trend without relying on colour. The sparkline is marked `aria-hidden` because it is supplementary.
- The preview inherits high-contrast support via a `forced-colors` rule and uses high-contrast foreground tokens on the dark glass surface.
- `jest-axe` is exercised while a preview is open. The test also corrected the calendar header's ARIA grid relationship and the mobile agenda's nested-list relationship.

## Responsive and edge positioning

The card is 240 px at its intended size and is capped at `calc(100vw - 1rem)` for narrow viewports. Position is recalculated when it opens and on resize/scroll:

1. Prefer **top** if it has enough room; otherwise use **bottom**. If neither side fully fits, use the side with more room.
2. Prefer a centred anchor.
3. At the left viewport edge, use `*-start` (anchor to the cell's left edge); at the right edge, use `*-end` (anchor to the cell's right edge).
4. The corresponding caret and logical anchors are mirrored in RTL.

On a touch-only device (`hover: none` and `pointer: coarse`), the hover card is visually suppressed. Tapping a day keeps the established selection and details-panel flow, which gives touch users the full information without a transient tooltip.

## Visual before / after

A reviewable visual reference is available at [revenue-calendar-hover-preview-before-after.svg](./revenue-calendar-hover-preview-before-after.svg). It is a design reference generated from the implemented layout, not a runtime browser capture.

```text
Before: date status only                 After: no-click compact preview

 ┌──────┐                                 ┌────────────────────────────────┐
 │  08  │                                 │ Apr 8               ACCEPTED   │
 │  •   │      hover / focus              │ REPORTED   PAYOUT      VS PRIOR │
 └──────┘ ─────────────────────────────▶  │ $1,250     Confirmed   ↑ +25.0% │
                                          │ ╱╲__╱  REVENUE TREND            │
                                          └────────────────────────────────┘
```

The implementation deliberately does not make the preview a clickable card: date selection remains predictable and the details panel remains the single place for report actions.

## Verification checklist

- `npx vitest run src/components/RevenueReportingCalendar.preview.test.tsx --coverage=false`
  - hover timing, focus open, blur timeout, Escape dismissal
  - reported revenue / canonical payout status / prior-period variance / trend
  - upper-left edge placement and reduced-motion behaviour
  - open-preview axe audit: no violations
- Manually review at 320 px, 768 px, and desktop widths; include right-edge and RTL dates.
- Verify dark-mode and forced-colors output in the target browser because CSS token values can be themed by the consuming application.

## Ownership

- Component: `src/components/RevenueReportingCalendar.tsx`
- Styles: `src/components/RevenueReportingCalendar.css`
- Data shape: `src/components/RevenueReportingCalendar.types.ts`
- Focused regression and axe coverage: `src/components/RevenueReportingCalendar.preview.test.tsx`
