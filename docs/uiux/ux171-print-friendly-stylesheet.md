# Print-Friendly Stylesheet — Issue #171

## Overview

A comprehensive `@media print` stylesheet that produces clean, professional PDF and printed output for revenue reports, distribution statements, and transaction receipts.

## Design Decisions

### 1. Centralized Print Styles in `src/index.css`

All print rules live in a single, well-organized `@media print` block at the bottom of [`src/index.css`](src/index.css). This keeps print styles co-located with the design tokens they consume, making maintenance straightforward.

### 2. Design Token Reuse

Print styles reference existing CSS custom properties where possible:

```css
--spacing-*      /* spacing scale */
--font-size-*    /* typography scale */
--line-height-*  /* vertical rhythm */
--radius-*       /* border radius (reset to 0 for print) */
```

New print-specific tokens are defined in a nested `:root` inside `@media print`:

```css
@media print {
  :root {
    --print-bg: #ffffff;
    --print-text: #000000;
    --print-border: #cccccc;
    --print-font-size-base: 11pt;
    /* ... */
  }
}
```

### 3. Black-on-White Default

All printed pages default to black text on a white background. Dark-mode backgrounds, glass effects, gradients, and shadows are explicitly overridden:

```css
@media print {
  .glass-card,
  .auth-card,
  .home-card {
    background: var(--print-bg) !important;
    background-image: none !important;
    backdrop-filter: none !important;
    box-shadow: none !important;
    border: 1px solid var(--print-border) !important;
    color: var(--print-text) !important;
  }
}
```

### 4. Page Break Rules

Explicit `break-inside: avoid` and `page-break-inside: avoid` prevent content from splitting across pages:

- Tables (`table`, `thead`, `tbody`, `tr`, `th`, `td`)
- Headings (`h1`–`h6`)
- Calendar sections (`.rc-calendar-section`, `.rc-details-panel`)
- Report items (`.rc-report-item`)
- Cards (`.glass-card`, `.empty-state-container`)
- List items (`li`)

Headings also use `break-after: avoid` to prevent orphaned headings at page bottoms.

### 5. Print Headers & Footers

Uses the CSS `@page` margin-box syntax where supported:

```css
@page {
  @top-center {
    content: "Revora RevenueShare — Printed Report";
    font-size: 9pt;
    color: #666666;
    border-bottom: 1px solid var(--print-border);
  }
  @bottom-center {
    content: "Page " counter(page) " of " counter(pages);
  }
}
```

A `.print-header` / `.print-footer` fallback class is provided for browsers that don't support `@page` margin boxes.

### 6. Hidden Interactive UI

All navigation, buttons, forms, search/filter controls, tooltips, modals, and decorative elements are hidden in print:

```css
@media print {
  .app-header,
  .desktop-nav,
  .mobile-nav,
  .btn,
  button,
  input,
  select,
  .tooltip,
  .modal,
  [role="dialog"] {
    display: none !important;
  }
}
```

Decorative icons and status dots are also hidden to reduce visual noise.

### 7. Chart-to-Table Fallback

Two mechanisms ensure charts print as accessible tables:

1. **CSS-only fallback**: `@media print` rules hide SVG charts and show table alternatives.
2. **React hook**: [`usePrintMode`](src/hooks/usePrintMode.ts) detects `beforeprint`/`afterprint` events and forces widgets into table/bar view.

```tsx
const isPrinting = usePrintMode();
const effectiveView = isPrinting ? "table" : view;
```

Widgets modified:
- [`PerformanceTrendWidget`](src/components/PerformanceTrendWidget.tsx) — forces table view
- [`AllocationWidget`](src/components/AllocationWidget.tsx) — forces bar view

### 8. Table Optimization

Tables are optimized for print with:
- Full-width layout with collapsed borders
- Zebra striping for readability
- Header row repeat on new pages (`display: table-header-group`)
- Numeric right-alignment with `tabular-nums`
- Totals/summary rows with bold weight and top border

### 9. Accessibility (WCAG 2.1 AA)

- **Contrast**: All text is forced to `#000000` on `#ffffff` (7:1+ contrast ratio)
- **Links**: Printed links include the URL in parentheses after the link text
- **Semantic structure**: Headings, tables, and landmarks are preserved
- **Focus indicators**: `:focus-visible` outlines remain visible in print preview
- **RTL support**: Logical properties and `[dir="rtl"]` overrides ensure correct layout

### 10. Responsive & Edge Cases

- **Paper sizes**: `@page { size: A4 Letter; }` supports both A4 and Letter
- **Multi-page reports**: Page break rules prevent orphaned headings and broken table rows
- **Long text**: `overflow-wrap: break-word` and `word-break: break-word` prevent overflow
- **Dark mode**: All dark backgrounds are overridden to white in print

## Component Coverage

| Component | Print Behavior |
|-----------|---------------|
| `AppShell` | Header, nav, drawer, overlay hidden |
| `RevenueReportingCalendar` | Calendar grid + details panel, no nav buttons |
| `PerformanceTrendWidget` | Forces table view |
| `AllocationWidget` | Forces bar view |
| `EmptyState` | Actions hidden, title/body preserved |
| `InvestorDiscovery` | Cards print as simple bordered boxes |
| `StatusTimeline` | Milestones print with borders |
| `NotificationBell` | Hidden |
| `KeyboardShortcutsOverlay` | Hidden |
| `ActivityFeed` | Hidden |

## Utility Classes

Print-specific utility classes are available for use in JSX:

```tsx
<div className="print-break-before"> {/* forces new page */} </div>
<div className="print-break-after"> {/* forces page break after */} </div>
<div className="print-break-inside-avoid"> {/* prevents break inside */} </div>
<div className="print-only"> {/* visible only in print */} </div>
<div className="no-print"> {/* hidden in print */} </div>
```

## Testing

- Lint: `npm run lint` (2 pre-existing errors in `RevenueReportingCalendar.tsx`, not related to print changes)
- Tests: Pre-existing ESM/CJS compatibility issues in the test environment prevent full test runs
- New test: [`src/hooks/usePrintMode.test.ts`](src/hooks/usePrintMode.test.ts) covers the print mode hook

## Browser Support

- Chrome/Edge: Full `@page` margin-box support
- Firefox: Supports `@page` size and margins; margin boxes limited
- Safari: Basic `@media print` support; margin boxes not supported
- Fallback: `.print-header` / `.print-footer` classes for unsupported browsers

## Files Modified

| File | Change |
|------|--------|
| [`src/index.css`](src/index.css) | Added ~500 lines of `@media print` rules |
| [`src/hooks/usePrintMode.ts`](src/hooks/usePrintMode.ts) | New hook for print detection |
| [`src/hooks/usePrintMode.test.ts`](src/hooks/usePrintMode.test.ts) | New test file |
| [`src/components/PerformanceTrendWidget.tsx`](src/components/PerformanceTrendWidget.tsx) | Print mode integration |
| [`src/components/AllocationWidget.tsx`](src/components/AllocationWidget.tsx) | Print mode integration |
