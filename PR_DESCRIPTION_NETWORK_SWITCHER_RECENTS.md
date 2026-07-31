# Network Switcher: Recent Networks quick list

## What & why

The Network Switcher popover now surfaces a user-scoped **Recent Networks** section pinned above the full list, so frequent switchers reach their last 3 networks in one tap. The section is backed by existing per-user `localStorage` persistence (key `revora-recent-networks:{userId}`), restores on load, and degrades gracefully on corrupted storage.

A partial implementation shipped in `946ad87`; this PR closes the correctness, accessibility, and testing gaps.

## Behavior

- Last **3 unique** networks, most-recent-first; selecting a network moves it to the top, dedupes, and caps at 3.
- Current network may appear in recents (marked `aria-selected`); recents are excluded from "All Networks" so each network appears exactly once.
- No recents → section (and divider) hidden entirely; no networks → lightweight empty state.
- Every selection is recorded; switching logic unchanged.

## Accessibility (WCAG 2.1 AA)

- Sections now announced to screen readers: each list is `role="group"` labelled from its visible header via `aria-labelledby` (headers were previously `aria-hidden` with no SR label).
- Popover `role="listbox"` now contains only valid children (option groups); decorative divider and footer `Close` moved out of the listbox role — fixes `aria-required-children`.
- Arrow-key navigation flows across both sections (`↓/↑/Home/End`), `Escape` closes, focus lands on the listbox on open.
- jest-axe: 0 violations in light and dark mode with recents present.

## Test results

- `NetworkSwitcher.test.tsx`: 22 tests (was 16, 2 of them broken) — new coverage: no-recents empty state, most-recent-first ordering, dedupe-to-top, cap-at-3, cross-session persistence (mocked storage), corrupted-storage fallback, keyboard nav across sections, group `aria-labelledby`, empty state, axe light+dark.
- `RecentNetworksProvider.test.tsx`: 8 tests, passing.
- Full suite: 37 failing files (all pre-existing; 0 in changed files), 0 new lint errors, no new tsc errors.

## Files changed

- `src/components/NetworkSwitcher/NetworkSwitcherPanel.tsx` — recency-ordered recents (was network-array order), valid listbox children, group `aria-labelledby`.
- `src/components/NetworkSwitcher/NetworkSwitcher.test.tsx` — stateful harness + 13 new/restored tests.
- `docs/uiux/network-switcher-recent-networks.md` — design doc.
