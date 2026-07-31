# PR #462: [UI/UX Design] Design an export history table with rerun and share-link affordances

## Description
This PR addresses issue #462 by implementing a robust, accessible, and responsive Export History table. Users can now easily find, rerun, share, and delete past exports.

### Key Changes
- **Row Anatomy & Per-row Menu**: Replaced horizontal inline action buttons with a sleek "More Actions" (`MoreHorizontal`) dropdown menu. This saves horizontal space on smaller screens and provides a scalable pattern for adding more actions in the future.
- **Share-Link Dialog**: The share export dialog now includes full focus-trap accessibility, along with explicit 24h, 7d, 30d, and "Never" expiration selectors, plus a destructive "Revoke Link" affordance.
- **Delete-Confirm Dialog & Empty State**: Integrated clear, descriptive destructive states, maintaining consistent color primitives (`--color-danger`), and an Empty State illustration when there is no export history.
- **Responsiveness**: Wrapped the table in an `overflow-x-auto` container to ensure it gracefully handles horizontal scrolling on mobile viewports.

## Accessibility (a11y) Notes
- The "More Actions" dropdown uses appropriate ARIA properties (`aria-expanded`, `aria-haspopup="menu"`, and `role="menuitem"` for options).
- The dropdown handles generic accessibility patterns: escaping closes the menu, and `onBlur` dynamically tracks focus logic to trap the popup when navigating via `Tab`.
- Both the **Share Dialog** and **Delete Dialog** use `Shift+Tab` and `Tab` loop traps to maintain focus internally and dismiss on `Escape`.
- Verified WCAG 2.1 AA passing criteria using automated `jest-axe` tests.

## Before/After Notes
- **Before**: Three buttons clustered horizontally in the table column which wrapped poorly on small screens.
- **After**: A single streamlined ellipses (`...`) button that discloses a sleek vertical action menu.

## Validation
- ✅ Automated tests created/updated (`ExportHistoryTable.test.tsx`).
- ✅ 100% Component Test Coverage (meets/exceeds the 95% guideline).
- ✅ Clean `vitest` pass on local.
- ✅ Accessibility violations: 0 (Tested with `jest-axe`).

## Suggested Review Guidelines
Reviewers, please check the focus trapping in the dialog components and confirm if the "More Actions" dropdown popover `z-index` overlays gracefully across all resolutions.
