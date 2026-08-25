# Investor Statement Print Stylesheet

## Overview

A dedicated print stylesheet for investor account statements, producing a formal, multi-page document with cover page, KPI summary, allocation table, performance history, and a signed authorization footer. Supports both A4 and Letter page sizes with RTL-awareness and monochrome printing.

## Files

| File | Role |
|------|------|
| `src/components/InvestorStatement/InvestorStatement.css` | Component-scoped print stylesheet |
| `src/components/InvestorStatement/InvestorStatement.tsx` | Print-only DOM nodes and ARIA landmarks |
| `src/components/InvestorStatement/InvestorStatement.test.tsx` | 58 unit + axe tests |

## Design Decisions

### 1. Cover Page (`print-only`)

The `.investor-statement-cover-page` is rendered in the DOM at all times but hidden from screen users via `.print-only` (`display: none` on screen, `display: block` in print). This is the only valid approach because `getComputedStyle` does not reflect CSS class-based visibility changes in jsdom. Tests verify existence by querying the DOM node and asserting its `.print-only` class, not its computed display.

### 2. Page Break Management

Three utility classes control pagination:

```css
.print-page-break-before   /* page-break-before: always */
.print-page-break-after    /* page-break-after: always  */
.print-page-break-allow    /* page-break-inside: auto (allows breaking) */
```

The KPI summary table is always followed by a page break. The allocation and performance tables each use `.print-page-break-allow` to permit internal breaks for long lists.

### 3. Table Header Repetition

All data tables (`<table>`, not `<div role="table">`) use `<thead>` + `<tbody>` so browser print engines can repeat headers across pages via:

```css
@media print {
  thead { display: table-header-group; }
}
```

### 4. Monochrome Safety

All positive/negative return indicators use explicit text tokens — `(+▲)` and `(-▼)` — rather than color alone. The CSS also applies forced `color: #000` and `background: #fff` with `print-color-adjust: exact` to guarantee correct output on monochrome printers.

### 5. Accessibility (WCAG 2.1 AA)

| Requirement | Implementation |
|-------------|----------------|
| Contrast ≥ 4.5:1 | `#000` on `#fff` (7:1) |
| Semantic structure | `<article role="document">`, `<header>`, `<section>`, `<aside>`, `<footer>` |
| Landmark labels | `aria-label` on `<article>`, `<aside>`, `<footer>`, and every data `<table>` |
| Table association | `aria-labelledby` on sections linking to `<h2>` IDs |
| Repeated IDs | Cover page disclaimer uses unique `aria-label="Statement disclaimer"` to avoid duplicate ID with footer |
| Progressbars | `role="progressbar"` on allocation bar fills |
| Screen-reader text | `className="sr-only"` captions on all data tables |
| Live region | `aria-live="polite"` on the performance summary paragraph |
| ARIA roles removed | `role="doc-note"` and `role="doc-endnotes"` replaced with `<aside>` and labelled `<footer>` to pass axe in standard HTML context |

### 6. RTL Awareness

The stylesheet uses CSS logical properties (`margin-inline-start`, `padding-inline-end`, `border-inline-start`) and an explicit `[dir="rtl"]` override block so that mirrored text direction is handled without duplicating rules.

### 7. Signature Footer

The `.investor-statement-signature-section` renders two signature lines (authorized signatory and recipient), each with a label and date line. It uses `.print-only` and is positioned at the bottom of the final page via `position: fixed; bottom: 0`.

## Test Suite (58 tests)

Tests are organized into five groups:

1. **Structure & Content** — Document root, heading hierarchy, KPI table, allocation table, performance table, bar chart, totals, empty states
2. **Accessibility (axe)** — Zero axe violations across all prop combinations
3. **Print-Specific Elements** — Cover page, signature section, page break classes, table header `<thead>` presence
4. **Edge Cases** — Empty allocations, empty performance, missing accountId, single allocation, long names, zero values, large values, multiple currencies
5. **ARIA Roles & Labels** — `role="document"`, `role="progressbar"`, `aria-labelledby`, `aria-label` on all landmarks

Run tests:

```bash
node ./node_modules/vitest/vitest.mjs run src/components/InvestorStatement/ --reporter=verbose
```

## Lint

```bash
npx eslint src/components/InvestorStatement/InvestorStatement.css src/components/InvestorStatement/InvestorStatement.tsx src/components/InvestorStatement/InvestorStatement.test.tsx
```

## Utility Classes Reference

| Class | Print Behavior |
|-------|---------------|
| `.print-only` | Visible only in print (hidden on screen) |
| `.no-print` | Hidden in print (visible on screen) |
| `.print-page-break-before` | Forces new page before element |
| `.print-page-break-after` | Forces page break after element |
| `.print-page-break-allow` | Permits page break inside element |

## Page Size

The `@page` rule declares both sizes:

```css
@page { size: A4 Letter; margin: 1.5cm 2cm; }
```

Browser support: Chrome/Edge handle this correctly; Firefox ignores the second value and uses the first; Safari uses the system default. In practice A4 is used internationally and Letter in North America; the CSS covers both.

## Browser Support

| Browser | Cover Page | Page Breaks | `@page` Size | Notes |
|---------|------------|-------------|--------------|-------|
| Chrome/Edge | ✅ | ✅ | ✅ | Full support |
| Firefox | ✅ | ✅ | ⚠️ | Uses first declared size |
| Safari | ✅ | ✅ | ⚠️ | Uses system paper size |
