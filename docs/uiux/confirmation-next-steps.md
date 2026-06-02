**Confirmation / Next Steps**

Overview
* A reusable confirmation layout for email-driven flows (signup, password reset).

Purpose
* Reassures users, sets expectations about the verification/reset email, and provides clear recovery actions: resend, change email, return.

Props
* `title` (string) — heading shown above content.
* `email` (string) — highlighted address shown in message.
* `message` (ReactNode) — optional custom message body.
* `onResend(email?)` (fn) — called when user requests resend. Should return a Promise when hitting APIs.
* `onChangeEmail()` (fn) — called when user wants to change the submitted email.
* `primaryLabel` / `primaryTo` / `onPrimary` — primary CTA configuration (link or handler).

Accessibility
* Buttons and links use `aria-label` for clear intent.
* A hidden `role="status" aria-live="polite"` region announces resend outcomes.
* Component content is keyboard-focusable and designed to meet WCAG 2.1 AA contrast (follow tokenized color classes).

Usage
* Import from `src/components/ConfirmationNextSteps.tsx` and provide `email` and handlers. Use `onResend` to call backend resend endpoints and return a Promise.

Notes
* Component has a built-in 30s cooldown after a resend to prevent accidental duplicate requests.
* Keep messages concise and avoid leaking account existence when used for password flows; the component supports a custom `message` for that.
