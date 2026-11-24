# Ledger: Sticky Headers & Column Resize (Design Spec)

Status: Draft

Purpose
- Keep column headers visible while scrolling long ledgers.
- Provide drag-to-resize and keyboard resize alternatives.
- Persist column widths per-user and per-view.

Anatomy
- Header cell: label, optional sort indicator, resize handle (12px wide). The handle is keyboard-focusable and has `role="separator"`.
- Resize handle visuals: 2px vertical grab line + hit target expanding to 12px; visible focus ring.

Interactions
- Mouse: drag handle horizontally to resize; constrained by min/max widths.
- Keyboard: Tab into the header handle, then use Left/Right arrows to shrink/grow by 8px. Hold Shift to change by 1px.
- Accessible name: "Resize column {columnName}".

Persistence
- Store widths in per-user settings keyed by view id (e.g. `ledger:activeView:v1`) via API or localStorage fallback.
- Provide API endpoint to save/retrieve widths for long-term persistence and cross-device sync.

Reset affordance
- Add "Reset column widths" action in the table's kebab/menu. Confirmation: none (instant reset) with an undo toast.

Accessibility
- Ensure keyboard focus, ARIA labels, and `aria-valuenow`/`aria-valuemin`/`aria-valuemax` on the handle.
- Expose `aria-rowcount` on the grid and 1-based `aria-rowindex` on every rendered row (accounting for pagination and virtualization).
- Use roving `tabIndex` on rows so only the active row is in the tab order (`tabIndex={0}`), and automatically scroll the focused row into the virtualized viewport.
- Test with screen readers and RTL layouts.

Keyboard Navigation (Virtualized Rows)
| Key | Action |
| --- | --- |
| `ArrowDown` / `ArrowUp` | Move focus to the next / previous row and scroll it into view |
| `ArrowRight` / `ArrowLeft` | Move focus between cells within the focused row (RTL-aware) |
| `PageDown` / `PageUp` | Jump down / up by one visible viewport of rows and scroll into view |
| `Ctrl+Home` / `Cmd+Home` | Jump to the first row on the current page and scroll into view |
| `Ctrl+End` / `Cmd+End` | Jump to the last row on the current page and scroll into view |
| `Home` / `End` | Move cell focus to the first / last column in the focused row |
| `Enter` / `Space` | Open or toggle the row detail drawer (or expand/collapse a group row) |
| `Escape` | Close the open row detail drawer |

Edge cases
- Very narrow columns clamp to 36px min.
- Virtualized list: ensure header remains sticky and in sync with column alignments.

Next steps
- Implement the header cell and resize hook in the shared
  `src/components/LedgerTable/LedgerTable.tsx` component.
- Add unit + visual tests and axe accessibility tests.
