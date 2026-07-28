# PR: Issue #153 — Revenue Reporting Calendar

## Summary

Replaces the static `EmptyState` placeholder on the Revenue Reports page with a fully interactive, accessible `RevenueReportingCalendar` component that provides issuers with a month-by-month overview of report due dates, submission status, and acceptance status.

## Changes

### New Component
- **`src/components/RevenueReportingCalendar.tsx`** — Responsive month-grid calendar with:
  - WAI-ARIA Grid pattern with full keyboard navigation (Arrow keys, Home, End, Page Up, Page Down)
  - Status indicators (Due, Submitted, Accepted, Overdue) with color-coded dots
  - Side details panel with day/month view toggle
  - Submit Report CTA for due/overdue reports
  - Loading, error, and empty states
  - Responsive: desktop (side-by-side), tablet (collapsible), mobile (stacked with toggle)
  - RTL support and reduced-motion respect
  - Print-friendly styles

### New Types
- **`src/components/RevenueReportingCalendar.types.ts`** — TypeScript interfaces for:
  - `RevenueReport` data model
  - `ReportStatus` union type
  - `RevenueReportingCalendarProps` component props
  - `DayCellData` and `DetailsPanelProps`

### New Styles
- **`src/components/RevenueReportingCalendar.css`** — 820+ lines of scoped CSS with:
  - Calendar-specific design tokens (`--rc-status-*`, `--rc-cell-size`, etc.)
  - Responsive breakpoints (mobile <768px, tablet 768-1023px, desktop ≥1024px)
  - RTL logical properties
  - `prefers-reduced-motion` support
  - `forced-colors` (high contrast) support
  - Print media styles

### New Tests
- **`src/components/RevenueReportingCalendar.test.tsx`** — 30+ tests covering:
  - Loading, error, and empty states
  - Month navigation (prev/next buttons)
  - Date selection and callbacks
  - Keyboard navigation (WAI-ARIA Grid)
  - Details panel (day view, month view, submit CTAs)
  - Accessibility (ARIA roles, labels, tab panels)
  - Week start configuration
  - Today highlighting
  - Multiple reports on same day
  - Controlled props

### Integration
- **`src/pages/RevenueReports.tsx`** — Replaced `EmptyState` with `RevenueReportingCalendar`, added mock data and event handlers
- **`src/index.css`** — Added calendar-specific CSS custom properties

## Design Tokens Used

| Token | Purpose |
|---|---|
| `--rc-status-due/submitted/accepted/overdue` | Status indicator colours |
| `--rc-cell-size` | Calendar day cell size |
| `--rc-cell-gap` | Gap between cells |
| `--rc-header-height` | Day-name header height |
| `--rc-nav-height` | Month nav height |
| `--rc-pad-x/y` | Horizontal/vertical padding |
| `--rc-gap` | Layout gap |
| `--rc-radius` | Cell/panel radius |
| `--rc-title-size` | Month title size |
| `--text-main/muted/accent` | Typography colours |
| `--primary/success/error` | CTA and status colours |
| `--glass-*` | Container background/border/blur |
| `--shadow-xl` | Container elevation |
| `--radius-2xl` | Container border-radius |

## Accessibility

- WAI-ARIA Grid pattern: `role="grid"`, `role="row"`, `role="gridcell"`, `role="columnheader"`
- Roving tabindex for keyboard navigation
- `aria-label` on all interactive elements with descriptive text
- `aria-selected` on selected date
- `aria-expanded` on mobile toggle
- `role="tablist"` / `role="tab"` / `role="tabpanel"` for view mode toggle
- `aria-live` regions for dynamic content
- `prefers-reduced-motion` respected
- `forced-colors` (Windows High Contrast) supported
- All decorative icons marked `aria-hidden="true"`

## Responsive Behaviour

| Breakpoint | Layout |
|---|---|
| Desktop ≥1024px | Side-by-side: calendar (60%) + sticky details panel (380px) |
| Tablet 768–1023px | Row layout with collapsible 320px details panel |
| Mobile <768px | Stacked layout with toggle button to show/hide details |

## Testing

```bash
npm run lint
npm test
```

## Checklist

- [x] New `RevenueReportingCalendar` component created
- [x] TypeScript types defined
- [x] Scoped CSS with responsive breakpoints
- [x] WAI-ARIA Grid keyboard navigation
- [x] Loading, error, and empty states
- [x] Details panel with day/month view toggle
- [x] Submit Report CTA for due/overdue reports
- [x] RTL support
- [x] Reduced motion support
- [x] High contrast mode support
- [x] Print styles
- [x] Comprehensive test suite (30+ tests)
- [x] Integrated into `RevenueReports` page
- [x] Design tokens added to `index.css`
- [x] No breaking changes

## Related Issues

- Closes #153
