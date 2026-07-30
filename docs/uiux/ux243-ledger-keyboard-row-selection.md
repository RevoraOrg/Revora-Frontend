# UX243 — Ledger Keyboard Row Selection & Range-Copy

## Overview

Power users can select one or more Ledger rows using keyboard or mouse, then copy the visible columns as TSV (tab-separated values) to the clipboard. The interaction mirrors spreadsheet conventions (Excel / Google Sheets) while remaining fully accessible (WCAG 2.1 AA).

---

## Interaction Model

### Selection

| Trigger | Behaviour |
|---|---|
| Click a row | Selects that single row; clears previous selection |
| Shift+Click a row | Extends selection from the last anchor to the clicked row |
| `↑` / `↓` | Moves keyboard focus one row; does **not** change selection |
| `Shift+↓` | Extends selection downward by one row from the current anchor |
| `Shift+↑` | Extends selection upward by one row from the current anchor |
| `Ctrl/⌘+A` | Selects **all rows in the current page view** |
| `Escape` | Clears selection (if any); otherwise closes open detail panel |

### Copy

| Trigger | Behaviour |
|---|---|
| `Ctrl/⌘+C` | Copies selected rows as TSV to the system clipboard |

Copy output:
- **First line**: visible column headers (tab-separated)
- **Subsequent lines**: one row per selected entry, in ascending row order
- Only **visible columns** are included (respects the column-visibility toggle)
- Non-string cell values (e.g. React nodes) are omitted as empty strings

### Toast Confirmation

A non-blocking toast appears at the bottom-centre of the viewport for 3 seconds:

```
✓  5 rows copied to clipboard
```

- `role="status"` + `aria-live="polite"` — announced by screen readers without interrupting
- `aria-atomic="true"` — the full message is read as a unit
- Auto-dismisses; no user action required

---

## Visual Design

### Row Selection Highlight

```
Normal row:          background transparent
Hovered row:         background rgba(59,130,246, 0.04)
Single-click row:    background rgba(59,130,246, 0.08)   [lt-row--selected]
Range-selected row:  background rgba(59,130,246, 0.14)   [lt-row--range-selected]
                     + outline: 1px solid rgba(59,130,246, 0.35)
```

### Selection Count Badge (toolbar)

When ≥ 1 row is selected, a pill appears in the toolbar left section:

```
[ 3 selected  ✕ ]
```

- Blue tinted background (`rgba(59,130,246, 0.12)`) with matching border
- `aria-live="polite"` so screen readers announce count changes
- `✕` button clears selection (`aria-label="Clear selection"`)

### Focus Ring Overlay

The existing `lt-focus-ring-overlay` (issue #244) continues to track the keyboard-focused row independently of the selection highlight. Both can be active simultaneously.

---

## Accessibility (WCAG 2.1 AA)

| Criterion | Implementation |
|---|---|
| 1.3.1 Info and Relationships | `role="grid"` + `aria-multiselectable="true"` on the table wrapper |
| 1.4.1 Use of Color | Selection uses both colour **and** outline border |
| 2.1.1 Keyboard | All selection actions reachable without a mouse |
| 2.4.3 Focus Order | Focus ring tracks keyboard position; selection is independent |
| 4.1.2 Name, Role, Value | `aria-selected` on each `role="row"` reflects selection state |
| 4.1.3 Status Messages | Toast uses `role="status"` + `aria-live="polite"` |

### High Contrast Mode (WHCM / forced-colors)

```css
@media (forced-colors: active) {
  .lt-row--range-selected {
    outline: 2px solid Highlight;
    background: Highlight;
    color: HighlightText;
  }
}
```

### Reduced Motion

The toast fade/slide transition is governed by `opacity` + `transform`. Under `prefers-reduced-motion: reduce` the browser suppresses these transitions automatically (no additional override needed as the element is always present in the DOM).

---

## Responsive Behaviour

- On viewports ≤ 640 px the toolbar wraps; the selection badge remains visible on its own line
- Touch users can tap rows to select; Shift+tap is not expected on mobile (no keyboard shortcuts apply)
- The copy shortcut is keyboard-only; mobile users are not affected

---

## RTL Support

- `Shift+↑` / `Shift+↓` are direction-neutral (row index, not visual direction)
- `Ctrl/⌘+A` and `Ctrl/⌘+C` are unaffected by text direction
- The selection badge uses `inset-inline-end` for the clear button via flex layout

---

## Keyboard Shortcuts Reference (Shortcuts Overlay)

Added to the **Ledger** section in `shortcutsData.ts`:

| Label | Keys |
|---|---|
| Move focus down | `↓` |
| Move focus up | `↑` |
| Extend selection down | `Shift+↓` |
| Extend selection up | `Shift+↑` |
| Select all rows in view | `Ctrl/⌘+A` |
| Copy selection as TSV | `Ctrl/⌘+C` |
| Clear selection / close detail | `Esc` |
| Move cell focus right | `→` |
| Move cell focus left | `←` |
| Jump to first cell | `Home` |
| Jump to last cell | `End` |

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| Ctrl+C with empty selection | No-op; `onCopy` is not called |
| Shift+Arrow at boundary (row 0 or last row) | Clamps; no error |
| 1 000+ row select-all | `Set` construction is O(n); no UI freeze observed in testing |
| Column hidden after selection | TSV reflects columns visible **at copy time** |
| Group rows (when groupBy is active) | Group header rows are excluded from selection and TSV |

---

## Files Changed

| File | Change |
|---|---|
| `src/hooks/useLedgerSelection.ts` | New hook — selection state, range logic, TSV build, keyboard handler |
| `src/hooks/useLedgerSelection.test.ts` | 25 unit tests |
| `src/components/LedgerTable/CopyToast.tsx` | New component — accessible copy confirmation toast |
| `src/components/LedgerTable/CopyToast.test.tsx` | 8 unit tests |
| `src/components/LedgerTable/LedgerTable.tsx` | Wire selection hook, `aria-multiselectable`, selection badge, Escape handler |
| `src/components/LedgerTable/LedgerTable.test.tsx` | 11 new integration tests |
| `src/components/LedgerTable/LedgerTable.css` | `lt-row--range-selected`, `lt-selection-count`, WHCM overrides |
| `src/components/KeyboardShortcutsOverlay/shortcutsData.ts` | Ledger shortcut group |
| `docs/uiux/ux243-ledger-keyboard-row-selection.md` | This document |
