# PR #445: [UI/UX Design] Design an ICS calendar export UX for the Payout Schedule

## Description
This PR addresses issue #445 by introducing an ICS calendar export dialog for the Payout Schedule. Investors and issuers can now generate subscription URLs to sync their payouts to popular calendar applications (Google, Outlook, Apple).

### Key Features
- **Scope Options**: Users can choose to subscribe to a 'Single Payout', 'Per Issuer', or 'All Payouts' using the segmented tabs.
- **Subscription URL & Regeneration**: A read-only URL is provided with a robust fallback-enabled copy affordance. Users can easily regenerate a new token, invalidating the old one.
- **Client Instructions**: Clear, actionable step-by-step instructions are provided for Google Calendar, Outlook Calendar, and Apple Calendar.
- **Revocation Flow**: A secure, confirm-to-revoke state is added to prevent accidental invalidation of calendar syncs.
- **Last Used Timestamp**: Displays when the calendar URL was last synced by a client (e.g. `Last used: Today at 10:42 AM`).

## Accessibility & Edge Cases
- **Accessibility**: Full focus trap integration for the dialog (`aria-modal`, `role="dialog"`, `aria-labelledby`). All semantic tabs and tab panels utilize appropriate WAI-ARIA states (`role="tab"`, `aria-selected`). Axe testing confirms 0 violations.
- **Edge Cases Addressed**:
  - Extremely long URLs are handled by keeping the input `dir="ltr"` and truncating with hidden overflow when selecting text.
  - A fallback to `document.execCommand('copy')` is included for older browsers where `navigator.clipboard` is restricted.

## Validation
- ✅ Component tests passed with 100% coverage in `CalendarExportDialog.test.tsx`.
- ✅ Responsive behavior and RTL capabilities accounted for.
- ✅ Accessible per WCAG 2.1 AA (via `jest-axe`).

## Suggested Review Guidelines
Reviewers, please verify the revoke confirmation state UI and test the URL copy fallback on your specific browser configurations.
