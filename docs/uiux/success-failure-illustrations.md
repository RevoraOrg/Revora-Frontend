# Success / Failure Illustrations (Design System)

## Overview
A paired illustration set for confirmation and error screens.

## Illustration variants
- `transactionSuccess` — transaction confirmed
- `transactionFailure` — transaction failed
- `kycApproved` — KYC approved
- `kycRejected` — KYC rejected
- `offeringPublished` — offering published

## Component API

```tsx
import { SuccessFailureIllustration } from '@/components/designSystem/SuccessFailureIllustration';

<SuccessFailureIllustration
  variant="transactionSuccess"
  size={96}
  ariaHidden={true}
/>
```

### Props
- `variant` (required): one of the values above.
- `size` (optional): renders a `96x96` SVG when omitted. Keep `>= 96px` for mobile legibility.
- `ariaHidden` (optional):
  - `true` (default): decorative SVG. Screen readers should use surrounding headline/body copy.
  - `false`: SVG becomes meaningful content and receives an `aria-label`.

## Pairing rules (headline + body microcopy)
Illustrations should always be paired with explicit text.

### Transaction success
- Headline: “Transaction confirmed”
- Body: “We’ve received your request. You can track updates from your activity page.”

### Transaction failure
- Headline: “Transaction failed”
- Body: “No changes were made. Check your details and try again.”

### KYC approved
- Headline: “KYC approved”
- Body: “Your verification is complete. You can continue to the next step.”

### KYC rejected
- Headline: “KYC needs attention”
- Body: “Review the reason and submit corrected information.”

### Offering published
- Headline: “Offering published”
- Body: “Your offering is live. Investors can now view and participate.”

## Accessibility (WCAG 2.1 AA)
- Default behavior: `ariaHidden={true}` so the SVG is decorative.
- Provide a visible headline near the illustration.
- For failures, ensure the surrounding container uses `role="alert"` / `aria-live="assertive"` where appropriate.
- Color-blind safe: the illustration uses redundant shapes (check, X, shield, arrow), not color alone.

## Dark mode
The SVG uses design tokens (`--success`, `--error`) and semi-transparent fills so it remains readable in the app’s dark theme.

## RTL mirroring
No directional arrows are used for essential meaning; therefore no RTL flipping is required.

## Reduced motion
No animation is included inside the SVG.

## Notes for reviewers (before/after)
- Confirm legibility at `96px`.
- Confirm that AT announcements come from headline/body (not the SVG).
- Confirm contrast of the accent ring and glyph stroke against the dark glass background.

