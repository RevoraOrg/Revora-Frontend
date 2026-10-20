# Ledger Entry Table — Virtualization, Row-Detail Drawer & Deep Links

**Issue #628** · Virtualized investor ledger with sticky header, configurable
columns, density toggle, row-detail side drawer, and deep-link permalinks

---

## Overview

Investors review many distributions across their portfolio. The ledger entry
table must render **tens of thousands of rows** without jank, keep column
headers visible while scrolling, let users show/hide columns and switch density,
and reveal a full detail view for a single entry in a **side drawer** that can be
**deep-linked** (a sharable URL that reopens the same entry).

| Capability | Approach |
|---|---|
| Large data | Windowed virtualization — only visible rows are in the DOM |
| Sticky header | Fixed-position header row in the scroll container |
| Column control | Visibility menu (last visible column cannot be hidden) |
| Density | Comfortable / Cozy / Compact (rows reflow to 56 / 48 / 36 px) |
| Row detail | Side drawer (`role="dialog"`, `aria-modal`) instead of inline expansion |
| Deep link | `?entry=<rowKey>` query param via `history.replaceState` |

---

## Component API

`LedgerTable` lives in `src/components/LedgerTable/` and is consumed by the
portfolio page through `LedgerEntriesSection` in
`src/components/InvestorDiscovery.tsx`.

### Props

```ts
interface LedgerTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
  rowDetail?: (row: T) => React.ReactNode;
  pageSize?: number;            // default 50
  defaultDensity?: DensityMode; // 'comfortable' | 'cozy' | 'compact', default 'cozy'
  stickyHeader?: boolean;       // default true
  ariaLabel?: string;
  detailMode?: 'inline' | 'drawer'; // default 'inline' (legacy expanding panel)
  drawer?: {
    deepLinkParam?: string;     // e.g. 'entry' → ?entry=<rowKey>
    title?: (row: T) => string;
    footer?: (row: T, close: () => void) => React.ReactNode;
  };
}
```

`detailMode="drawer"` switches the legacy inline expanding panel for the side
drawer; when `drawer.deepLinkParam` is set the drawer is deep-linkable.

---

## Interaction & Behavior

### Opening the drawer

- Clicking a row, or activating it from the keyboard (Enter / Space), opens the
  side drawer for that row.
- Focus moves to the drawer's close button; while open the page body scroll is
  locked; `Escape`, the backdrop, or the close button dismiss it.

### Deep-link permalink

- Opening a drawer writes `?entry=<rowKey>` with `history.replaceState`; closing
  removes it.
- On mount, an existing `?entry=` param restores the drawer for the matching row
  and scrolls that row into view.
- A "Copy link" button in the drawer footer copies the permalink to the clipboard
  (with a `document.execCommand('copy')` fallback when the Clipboard API is
  unavailable); a polite `role="status"` toast confirms success/failure.
- The URL syncs across `popstate` so the drawer follows browser back/forward.

### Virtualization & row semantics

- Only the rows intersecting the visible viewport (plus a 5-row overscan) are
  rendered; total height is reserved on the scroll container.
- Every row sets `role="row"` + `aria-rowindex`, the grid sets `aria-rowcount`
  to the full flattened row count, and visible columns preserve keyboard cell
  navigation via the existing focus-ring overlay.

### ARIA / accessibility

- Drawer: `role="dialog"`, `aria-modal="true"`, labelled by its title (`useId`).
- While open, focus is trapped in the drawer and the body scroll is locked.
- Reduced-motion: drawer slide is suppressed under `prefers-reduced-motion`.
- Forced-colors: drawer border/backdrop use `ButtonBorder`/`CanvasText` tokens.
- RTL: drawer slides from the inline-start edge; icons/actions mirror.

---

## Visual Design

```txt
┌───────────────────────────────────────────────┬──────────────┐
│  Ledger Entries        12 entries    [⛭][▤]  │  Ledger entry│
│  Sticky header row (stays on scroll)         │  LED-0001    │
│──────────────────────────────────────────────│  http://…/?  │
│  Entry │ Offering │ Amount │ Status │ Date   │  entry=…     │
│──────────────────────────────────────────────│  ┌────────┐  │
│  row 1  (virtualized rows between viewport)  │  │ detail │  │
│  …       …         …       …       …         │  │ content│  │
│  row 12                                      │  │        │  │
│                                              │  └────────┘  │
│  [wk column menu] [density menu] [paginate]  │  [Copy] [Done]│
└──────────────────────────────────────────────┴──────────────┘
```

- Drawer width: `min(420px, 100vw)`; full width (≤100vw) below 640px.
- Backdrop: `rgba(2, 6, 23, 0.5)` with blur; drawer background uses the app
  surface token.
- Permalink rendered as a monospace, muted URL under the drawer title.

Density modes follow the existing design tokens
(see `ux174-density-modes.md`); this table does **not** depend on the global
DensityProvider — the toggle is local to the component.

---

## Mock Data

`generateLedgerEntries(count)` produces deterministic entries
(`LED-0001…`, six cyclical offering names, seeded amounts, cycling statuses,
stable ISO dates) — no `Math.random`, so tests and demos are reproducible.

---

## Integration (& Issue #628 acceptance)

- `LedgerEntriesSection` renders the table within the `InvestorDiscovery`
  **loaded** state only (not during skeleton loading, filtered-empty,
  truly-empty, or error states). Its empty state shows "No Ledger Entries Yet".
- Coverage: new `InvestorDiscovery.tsx` paths and the drawer tests in
  `LedgerTable.test.tsx` keep the Issue #628 surface covered.

## Files

- `src/components/LedgerTable/LedgerTable.tsx` / `.css` — drawer, deep-link,
  virtualization, row-index semantics
- `src/components/LedgerTable/LedgerTable.test.tsx` — drawer/permalink suite
- `src/components/InvestorDiscovery.tsx` — `LedgerEntriesSection` + integration
- `src/components/InvestorDiscovery.test.tsx` — ledger section tests