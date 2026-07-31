# Network Switcher – Recent Networks Quick List

## Overview & Philosophy

Frequent users switch between a small handful of networks (e.g. Polygon → Ethereum → Solana) on every session. The Network Switcher popover keeps the full network list, but forces the user to re-scan every option each time.

The **Recent Networks** section is a small, user-scoped list pinned **above** the full "All Networks" list. It surfaces the user's last few selections for one-tap access without removing or re-ordering the canonical list.

```
+--------------------------------------+
|  Recent Networks                     |  <- section header (muted, uppercase)
|  • Polygon                     ✓     |  <- current network marked
|  • Ethereum                          |
|  ─────────────────────────────       |  <- 1px divider
|  All Networks                        |
|  • Solana                            |
|  • Arbitrum                          |
+--------------------------------------+
|                          [ Close ]   |
+--------------------------------------+
```

---

## Behavior Rules

1. **Recency, most-recent-first.** Selecting a network moves it to the top of the Recent Networks list.
2. **Dedupe.** Re-selecting a network that is already in the list moves it to the top; it is never listed twice.
3. **Cap at 3.** Only the three most recently used networks are kept. When a fourth is selected, the oldest drops off.
4. **Current network allowed.** The active network may appear in the recent list if it is part of the history. It is visually marked with `aria-selected="true"` and the primary accent color.
5. **No duplication between sections.** A network in the Recent Networks list is excluded from "All Networks" (both stay mutually exclusive so each network appears exactly once).
6. **Every selection is recorded** — even when the network does not change — via `addRecentNetwork(id)` before `onNetworkChange(id)`. Switching logic itself is untouched.

---

## Persistence

- Stored in `localStorage` under the key `revora-recent-networks:{userId}`.
- The storage format is a JSON array of network ids: `["polygon","ethereum"]`.
- **Per-user scoping.** `RecentNetworksProvider` accepts a `userId` prop; when no identity is available it falls back to the `default` scope (the app currently has no auth context, so all clients share the `default` scope until a user identity source exists).
- **Auto-restore.** On mount the provider hydrates from storage, so recents survive reloads and return visits.
- **Corrupt-safe.** Unparseable or malformed storage (non-array, non-string entries) is treated as an empty history; the provider never throws.

---

## Component Architecture

```
AppShell
 └── RecentNetworksProvider (wraps App in main.tsx)
      └── NetworkSwitcher
           └── NetworkSwitcherPanel
                ├── role=listbox  "Select a network"
                │    ├── [group "Recent Networks"] (aria-labelledby header)
                │    ├── [group "All Networks"]    (aria-labelledby header)
                └── footer [Close]
```

- `src/hooks/useRecentNetworks.ts` exposes `{ recentNetworkIds, addRecentNetwork }`.
- `NetworkSwitcherPanel` derives `recentNetworks` by mapping over `recentNetworkIds` (preserving recency order), and `nonRecentNetworks` by filtering the full list.

---

## Popover Anatomy & A11y (WCAG 2.1 AA)

| Element | Treatment |
| --- | --- |
| Trigger | `aria-haspopup="listbox"`, `aria-expanded`, label `Current network: {name}` |
| Popover | Focused on open; closes on `Escape`, outside `mousedown`, selection, or `Close` |
| Listbox | `role="listbox"`, `aria-label="Select a network"` |
| Section headers | Visible muted/uppercase labels; each `<ul>` is `role="group"` linked to its header via `aria-labelledby` so screen readers announce the section (`Recent Networks` vs `All Networks`) without double-reading the heading |
| Divider | Decorative only — `aria-hidden="true"`, `data-testid="network-switcher-separator"` |
| Options | `role="option"`, `aria-selected` for the current network; visible `:focus-visible` ring |
| Keyboard | ArrowDown/ArrowUp cycle options across both sections, `Home`/`End` jump to first/last, `Escape` closes |
| Footer | `[Close]` button outside the listbox (not an option) |

### Keyboard interaction

Focus lands on the listbox when the panel opens. From there:

- `↓` / `↑` — move to next/previous option (wraps around; flows across the Recent → All boundary)
- `Home` — first option; `End` — last option
- `Enter` / `Space` — select the focused option (native `<button role="option">` behavior)
- `Escape` — close the popover

---

## Empty States

- **New user, no history:** the Recent Networks section and divider are **not rendered** — the panel opens directly on "All Networks". No dead whitespace.
- **No networks configured:** a lightweight centered empty state ("No networks available") replaces the list; the header is suppressed.

---

## Responsive

- **Desktop:** fixed-width glass panel anchored below the trigger (min-width 220px, right-aligned, RTL-aware).
- **≤ 768px:** the panel becomes a bottom sheet (`position: fixed; left/right: 1rem; bottom: 1rem; max-height: 60vh` with internal scroll) — no horizontal overflow.
- **High contrast:** trigger border and divider thickness increase via `prefers-contrast: high`.

---

## Verified (Tests)

`src/components/NetworkSwitcher/NetworkSwitcher.test.tsx` + `RecentNetworksProvider.test.tsx`:

- New user / no recents → section hidden, all networks shown.
- Selecting one / multiple networks populates recents most-recent-first.
- Duplicate selection moves to top without repeating.
- Cap at 3 (4th selection evicts the oldest).
- Persistence across sessions via mocked `localStorage`; corrupted storage treated as empty.
- Keyboard navigation across both sections (`ArrowDown`/`ArrowUp`/`Home`/`End`).
- Section groups labelled from their headers (`aria-labelledby`).
- Empty state when no networks are configured.
- jest-axe: zero violations in light and dark mode with recents present.
