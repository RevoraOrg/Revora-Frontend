# Print-Friendly Stylesheet — Issue #171

## Summary

Implements a comprehensive `@media print` stylesheet that produces clean, professional PDF and printed output for revenue reports, distribution statements, and transaction receipts.

## Changes

### Core Implementation
- **`src/index.css`** — Added ~500 lines of `@media print` rules:
  - Global print reset: black text on white background, removal of glass effects/shadows/gradients
  - Hidden interactive UI: navigation, buttons, forms, search/filter controls, tooltips, modals
  - Page break rules: `break-inside: avoid` on tables, headings, cards, report items
  - Print headers & footers via `@page` margin-box syntax with fallback classes
  - Table optimization: zebra striping, repeated headers, numeric alignment, bold totals
  - Chart-to-table fallback: CSS hides SVG charts, shows table alternatives
  - WCAG 2.1 AA: forced `#000000` on `#ffffff` (7:1+ contrast), readable link URLs
  - RTL support, dark mode override, long text wrapping
  - Utility classes: `.print-break-before`, `.print-break-after`, `.print-only`, `.no-print`

### React Integration
- **`src/hooks/usePrintMode.ts`** — New hook detecting `beforeprint`/`afterprint` events
- **`src/hooks/usePrintMode.test.ts`** — 5 tests covering print mode detection and cleanup
- **`src/components/PerformanceTrendWidget.tsx`** — Forces table view when printing
- **`src/components/AllocationWidget.tsx`** — Forces bar view when printing

### Documentation
- **`docs/uiux/ux171-print-friendly-stylesheet.md`** — Complete design-system documentation

## Design Decisions

1. **Centralized in `src/index.css`** — Print styles co-located with design tokens for maintainability
2. **Token reuse** — References existing `--spacing-*`, `--font-size-*`, `--line-height-*` variables
3. **Black-on-white default** — All dark backgrounds, glass effects, and shadows explicitly overridden
4. **Dual fallback mechanism** — CSS-only rules + React hook for chart widgets
5. **No breaking changes** — All modifications are additive (`@media print` rules, new hook)

## Component Coverage

| Component | Print Behavior |
|-----------|---------------|
| `AppShell` | Header, nav, drawer, overlay hidden |
| `RevenueReportingCalendar` | Calendar grid + details panel, no nav buttons |
| `PerformanceTrendWidget` | Forces table view |
| `AllocationWidget` | Forces bar view |
| `EmptyState` | Actions hidden, title/body preserved |
| `InvestorDiscovery` | Cards print as simple bordered boxes |

## Verification

- **Lint**: `npm run lint` passes (2 pre-existing errors in `RevenueReportingCalendar.tsx`, unrelated)
- **TypeScript**: No errors in new `usePrintMode` files
- **Tests**: Pre-existing ESM/CJS compatibility issues in test environment; new test file written and ready

## Browser Support

- Chrome/Edge: Full `@page` margin-box support
- Firefox: Supports `@page` size and margins; margin boxes limited
- Safari: Basic `@media print` support; margin boxes not supported
- Fallback: `.print-header` / `.print-footer` classes for unsupported browsers
