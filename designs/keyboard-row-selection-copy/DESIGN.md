# Design Specification: Keyboard-Driven Row Selection & Range-Copy for the Ledger

**Issue**: RevoraOrg/Revora-Frontend#466
**Type**: UI/UX Design | **Status**: Specification
**Designer**: @laurentketterle-hub (Stellar Wave 7th Wave)

## 1. Overview

The Ledger is the most data-dense surface in Revora. Currently mouse-only for selection and copying — inaccessible for keyboard users and inefficient for power users extracting data for reporting/accounting/tax.

This design adds keyboard-driven row navigation with single/range selection and range-copy (TSV, CSV, JSON) to the virtualized Ledger.

## 2. Interaction Model

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| ↑/↓ | Move focus up/down one row |
| Shift+↑/↓ | Extend selection range |
| Space | Toggle selection of focused row |
| Ctrl+A | Select all visible rows |
| Ctrl+Shift+A | Select all rows (including off-screen) |
| Ctrl+C | Copy selected rows (tab-separated, Excel-pasteable) |
| Ctrl+Shift+C | Copy with headers + format dialog |
| Escape | Clear selection |
| Page Up/Down | Move focus by visible page |
| Home/End | First/last row |
| ? | Keyboard shortcuts overlay |

### Mouse (Enhanced)
Click: select single row. Ctrl+Click: toggle. Shift+Click: range. Right-click: context menu with Copy, Copy CSV, Copy JSON, Export. Drag: multi-select range.

## 3. Selection Visual Design

**Normal row**: transparent bg. **Focused row**: blue 3px left border. **Selected row**: blue highlight bg rgba(59,130,246,0.15). **Range selected**: all rows between anchor and cursor highlighted. Dashed connector between rows in range.

### Selection Toolbar
Floating sticky bar above Ledger when selection.count > 0: `[3 selected] [Copy] [Copy CSV ▼] [Clear]`

## 4. Copy Functionality

| Format | Trigger | Example |
|--------|---------|---------|
| Tab-separated | Ctrl+C | Excel-pasteable columns |
| With headers | Ctrl+Shift+C → dialog | Header row + data |
| CSV | Right-click → Copy as CSV | "id","type","amount","status" |
| JSON | Right-click → Copy as JSON | [{"id":42,...}] |

**Feedback**: Toast "✅ Copied 3 rows" slides up from bottom, auto-dismiss 2s. Selected rows flash briefly (250ms).

## 5. Accessibility

- role="row", aria-selected, aria-rowindex on each row
- aria-activedescendant on table container for focus tracking
- Screen reader: "Selected row 42. 3 rows selected." "Copied 3 rows. Tab-separated format."
- Focus stays on last selected row after copy (no focus loss)
- Keyboard shortcuts overlay: ? key shows modal with all shortcuts

## 6. Implementation (Virtualization-Safe)

Selection state: `{ anchorIndex, focusIndex, selectedIndices: Set<number>, lastCopiedFormat }`. Selection by row ID persists when rows scroll out/in. O(1) lookup via Set. 10K row cap for copy. Selection toolbar is a portal (doesn't re-trigger virtualization).

## 7. Edge Cases

Sort: selection persists by row ID. Filter: hidden rows deselected. New row: indices shift, IDs persist. Row deleted: silently removed. Page change: configurable (clear or persist). 10K+ rows: warning before copy.

## 8. Testing Checklist (16 items)

Arrow keys navigate, Shift+Arrow extends range, Space toggles, Ctrl+A selects all, Ctrl+C copies + toast, Ctrl+Shift+C shows dialog, Escape clears, selection survives sort/filter, copy to Excel preserves columns, screen reader announces, keyboard overlay works (? key), right-click context menu, drag multi-select, WCAG AA contrast, virtualization-safe, 10K+ warning.

*Design delivered for Stellar Wave 7th Wave review.*
