# Print-Friendly Stylesheet (Issue #171)

## Scope

A CSS-only `@media print` block in `src/index.css`, plus two opt-in className
hooks wired into `RevenueReportForm`. The change affects only how pages render
to paper or PDF. No routing, API, component logic, or screen layout is altered.

The print rules are global because reports, statements, and receipts are spread
across several views; the opt-in utility classes let any view tailor its own
print output without new components.

---

## Problem Statement

The screen UI is dark glassmorphism (dark gradient background, blurred glass
cards, light text). Printed as-is, that produces heavy ink usage, low contrast
on paper, and pages cluttered with navigation chrome and interactive controls
that mean nothing in print. Charts and truncated/line-clamped text also lose
information when sent to paper.

| Issue | Detail |
|---|---|
| Dark surfaces waste ink | Gradient background, glass blur, and shadows print as muddy fills |
| Low paper contrast | Light-on-dark tokens drop below readable contrast on white paper |
| Chrome leaks into print | Header, nav, drawer, notification panel, buttons, toasts, dialogs all print |
| Non-textual charts | Canvas/SVG charts carry no information once flattened to paper |
| Clipped content | `.truncate` / `line-clamp` content is cut off with no way to read the rest |
| No page geometry | Default margins differ per browser; no A4/Letter intent expressed |

---

## Approach

A single `@media print` block resets the document to a black-on-white baseline,
hides interactive and navigational chrome, and exposes a small set of opt-in
utility classes that report views apply where they need finer control. The
block lives in `src/index.css` directly after the existing screen rules and
follows the file's `/* ─── Section (Issue #NN) ─── */` comment convention.

---

## Opt-In Utility Classes

These classes do nothing on screen (except `.print-only`, `.print-header`, and
`.print-footer`, which are hidden on screen and revealed in print). Add them in
JSX where a specific element needs print-specific behaviour.

| Class | Effect in print |
|---|---|
| `.print-hidden` | Hide this element when printing (e.g. a "Back to Home" link) |
| `.print-only` | Hidden on screen; shown when printing (e.g. an accessible data table) |
| `.print-page-break` | Force a page break **before** this element |
| `.print-avoid-break` | Keep this block on one page (`break-inside: avoid`) |
| `.print-chart` | Mark a chart container so its visual is hidden in print |
| `.print-header` | Document running header text; print-only |
| `.print-footer` | Document running footer text; print-only, with a top rule |

---

## Page Geometry (A4 vs Letter)

```css
@page         { size: A4;     margin: 18mm 16mm; }
@page letter  { size: letter; margin: 0.75in;   }
```

A4 is the default `@page`. A named `@page letter` is offered for print
pipelines that target US Letter stock. Only one `@page` rule is ultimately
applied by the browser, so offering both is harmless: whichever paper the user
selects prints without clipping and keeps room for header/footer running text.

---

## Black-on-White Baseline

Inside `@media print`, four `:root` tokens are overridden so existing
token-driven styles re-colour automatically rather than needing per-element
rules:

| Token | Print value | Reason |
|---|---|---|
| `--text-main` | `#000` | Maximum contrast body text |
| `--text-muted` | `#1f2937` | ≥7:1 on white; safe for AA fine print |
| `--primary` | `#000` | Accent text/links read as plain black ink |
| `--glass-border` | `#999` | Light grey rule lines instead of glass borders |

`html, body` are forced to `#fff` background / `#000` text with
`print-color-adjust: exact` so the reset is honoured. Body type switches to
`12pt` Inter at `1.45` line height for paper legibility. Glass surfaces
(`.glass-card`, `.discovery-state-container`) are flattened: white background,
1px `#999` border, no blur, no shadow, no radius.

---

## Hidden Chrome

The following are set to `display: none` in print, so only report content
remains:

`.print-hidden`, `.app-header`, `.desktop-nav`, `.mobile-drawer`,
`.mobile-nav`, `.drawer-overlay`, `.mobile-menu-btn`, `.notifications-btn`,
`.account-btn`, `.skip-link`, `nav`, `button`, `.btn`, `.btn-primary`,
`.btn-secondary`, `[role="dialog"]`, `[role="alert"]`, `[aria-live]`.

Note on `[aria-live]`: live regions are interactive status containers (toasts,
async announcements) that carry no value on paper. Any content that must print
should live outside a live region, or be mirrored into a `.print-only` element.

---

## Chart-to-Data-Table Fallback Contract

Charts are non-textual and lose their information when flattened to paper, so in
print `.print-chart`, `canvas`, and `svg.print-chart` are hidden. The contract
for any chart that should appear in a printed report is:

1. Wrap the visual in a `.print-chart` container (or use a `<canvas>`).
2. Render an adjacent `.print-only` data table holding the same series data.

On screen the table is hidden and the chart shows; in print the chart is hidden
and the table shows. The information reaches paper in an accessible, textual
form. This is forward-looking: the codebase currently ships no charts, so these
rules activate only once a chart and its `.print-only` table are added.

---

## De-Clamping Content

Truncated and line-clamped text is expanded in print so nothing is cut off.
`.truncate`, `[class*="line-clamp"]`, and `.text-ellipsis` get
`overflow: visible`, `white-space: normal`, `text-overflow: clip`, and
`-webkit-line-clamp: none`. Like the chart fallback, this is forward-looking:
no current view uses these classes, but the rule guarantees correct paper output
if they are introduced.

---

## Page-Break and Table Behaviour

| Selector | Behaviour |
|---|---|
| `h1, h2, h3, h4` | `break-after: avoid` so headings are not orphaned at a page foot |
| `.print-page-break` | `break-before: page` |
| `.print-avoid-break` | `break-inside: avoid` |
| `tr, thead, .input-group` | `break-inside: avoid` so receipt rows and form/summary tiles stay intact |
| `table` | `width: 100%`, `border-collapse: collapse` |
| `th, td` | 1px `#999` border, `4pt 6pt` padding, `text-align: start` |
| `thead` | `display: table-header-group` so headers repeat on every printed page |

Both the modern logical property (`break-*`) and the legacy alias
(`page-break-*`) are set together for cross-browser print support.

---

## RTL Behaviour

Direction is inherited from the document, so the print block does not force
`ltr`. Table cells use `text-align: start` (logical) so numeric columns sit on
the correct edge in both LTR and RTL. An explicit `[dir="rtl"] { text-align:
right; }` rule covers engines that do not resolve `start` for block text.

---

## RevenueReportForm Wiring

Two minimal className additions demonstrate the hooks on a real report view:

| Element | Added class | Effect |
|---|---|---|
| "Back to Home" `<Link>` | `print-hidden` | Drops the navigation link from the printout |
| Submission receipt `<div>` | `print-avoid-break` | Keeps the "Report submitted" receipt summary on a single page |

No other component logic changes.

---

## Accessibility (WCAG 2.1 AA)

| SC | Description | How addressed |
|---|---|---|
| 1.4.3 Contrast Minimum | Text ≥4.5:1 | Black on white baseline (21:1); `--text-muted` `#1f2937` on white ≈7:1 |
| 1.4.5 Images of Text | Prefer real text | Charts replaced by textual `.print-only` data tables in print |
| 1.3.2 Meaningful Sequence | Reading order preserved | Source order is unchanged; only visibility/colour differ in print |
| 1.3.1 Info and Relationships | Structure programmatically determinable | Tables keep `thead`/`th`/`td`; headers repeat per page |

axe note: print styles are not exercised by axe-core (it runs against the
screen-media DOM), so these rules are verified by visual print preview rather
than automated audit. No DOM structure, roles, or text content change between
screen and print, so the existing screen-media axe coverage continues to hold.

---

## Implementation Notes

- CSS-only: no JavaScript, no `window.print` trigger, no new dependency. The
  browser's native print/Save-as-PDF path is used.
- Token overrides are scoped inside `@media print`, so screen rendering is
  untouched.
- `.print-chart` / `.truncate` / `line-clamp` rules are forward-looking: grep
  confirms the repo currently ships no charts and no clamped text, so these
  rules are inert until such content is added.

---

## Security Notes

- No user-supplied HTML is rendered and no data flow changes; this is a
  presentation-only stylesheet plus two className tokens.
