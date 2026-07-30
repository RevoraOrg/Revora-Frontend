# Auth Submit Button States

Auth forms use `AuthSubmitButton` for primary submit actions across Login, Signup, and Forgot Password.

## States

- Idle: primary action text, enabled when the form can submit.
- Loading: button is disabled, `aria-busy="true"` is set, and the visible label describes the pending action. The spinner is decorative.
- Success: button remains disabled briefly while the success destination or confirmation view appears.

## Accessibility

- Loading state must be communicated with text, not only animation.
- Disabled contrast uses the same primary token with reduced opacity.
- Focus remains visible through the shared button focus ring.
- Motion is disabled under `prefers-reduced-motion: reduce`.
