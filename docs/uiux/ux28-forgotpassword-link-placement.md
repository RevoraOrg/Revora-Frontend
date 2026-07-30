# UX28: Error Recovery - Forgot Password Link Placement

## Scope
UI/UX only for auth recovery discoverability and cross-page consistency in `Login`, `Signup`, and `ForgotPassword` flows.

## States Covered
- Login default state
- Forgot password request state
- Forgot password confirmation state
- Signup persona selection state
- Signup form state

## Flow Updates
1. User on `Login` can discover `Forgot password?` directly beside the password label.
2. User navigates to `ForgotPassword` with security-safe copy ("If an account exists...").
3. User can always return with a visible `Back to Sign In` recovery action.
4. User on `Signup` form still has a visible route back to `Sign in`, reducing dead-end risk.

## Accessibility and WCAG-Oriented Choices
- Consistent focus indicator for primary and secondary buttons (`:focus-visible` outline).
- Link focus style remains visible and keyboard-accessible.
- Recovery copy avoids account enumeration and supports understandable outcomes.
- Label/link grouping in login keeps relationship between password field and recovery action.
- Responsive wrapping in the password row prevents overlap at smaller widths.

## Implementation Notes
- Kept existing visual language (`glass-card`, `btn-primary`, utility class patterns).
- No backend/API behavior changed.
- No route structure changes beyond existing auth pages.

## Test Notes
- Added auth flow tests to validate:
  - Forgot-password link discoverability on login
  - Neutral confirmation copy in forgot password success state
  - Sign-in recovery path visibility during signup form completion

## Security Assumptions and Risk
- Assumption: password reset endpoint should remain non-enumerating server-side.
- Frontend copy now aligns with non-enumeration best practice.
- Residual risk: without backend rate limiting and abuse controls, reset flow can still be targeted; this ticket does not modify backend controls.
