# Revenue Report Form

## Purpose

Create a founder-facing monthly revenue submission experience that connects directly to RevenueShare payouts.

## Design goals

- Accessible: keyboard-first focus states, semantic form elements, clear validation messaging, and high-contrast text.
- Responsive: single-column mobile layout, stacked form and preview panel on smaller screens, two-column desktop layout for faster review.
- Consistent: uses existing `input-field`, `btn-primary`, `btn-secondary`, and glass-card patterns already present in `src/index.css`.
- Terminology-aligned: uses `report monthly revenue` and `RevenueShare payouts` from `src/constants/terminology.ts`.

## Key UI elements

- Reporting period select
- Gross revenue numeric entry with currency indicator
- Currency picker
- Notes/attachments textarea
- Inline payout-preview panel with estimated payout
- Submission feedback section with success state

## Accessibility notes

- All form controls use `label` elements with `htmlFor`.
- Inputs include `aria-invalid` and `aria-describedby` for validation guidance.
- Focus-visible styles are implemented globally for buttons, inputs, and links.
- Error feedback is rendered inside a `role="alert"` container.
- Buttons are keyboard accessible and disabled state is visually distinct.

## Responsive behavior

- Desktop: form and preview panel sit side-by-side in a two-column layout.
- Mobile: form and preview panel stack vertically and maintain full-width controls.
- Breakpoints align with existing `max-width: 640px` and `max-width: 1024px` rules in global CSS.

## Validation and states

- Invalid/zero revenue triggers an inline error state and prevents submission.
- Submission button shows a loading state while the report is being submitted.
- Success state confirms submission and displays the selected period, reported amount, and payout estimate.

## Notes

- This flow adds a new route at `/startup/report-revenue`.
- It uses an 8% payout example for preview estimates; actual payout calculations should be replaced when integrated with backend logic.
