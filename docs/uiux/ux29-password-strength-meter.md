# UX29: Password Strength Meter & Inline Rule Checklist

## Scope
UI/UX enhancement for the password field in `Signup.tsx`, replacing the static hint with a live strength meter and progressive inline rule checklist.

## States Covered
- Empty: no meter shown, all rules in pending (muted) state
- Weak (1–2 of 5 rules met): red bar segments, "Weak" label
- Medium (3–4 rules met): amber bar segments, "Medium" label
- Strong (5 rules met): green bar segments, "Strong" label
- Each individual rule toggles between pending / pass (green check) / fail (red x)
- Post-submit: per-rule error message displayed when password is insufficient

## Flow Updates
1. User focuses password field and sees the rule checklist in pending state.
2. As user types, each rule resolves to pass or fail in real time.
3. Strength bar appears once input is non-empty and updates progressively.
4. Submit validates against all 5 rules (replaces simple length check).
5. Inline error message appears below the checklist if submission fails.

## Accessibility and WCAG-Oriented Choices
- Strength label is announced via `aria-live="polite"` region (e.g., "Password strength: Medium. 4 of 5 rules met.").
- Strength bar has `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.
- Rule state is conveyed with icon + text + sr-only prefix ("Requirement met:" / "Requirement not met:"), never color alone.
- Checklist container has `role="list"` and `aria-label="Password requirements"`.
- Password input retains `aria-describedby` pointing to the rule list.
- `prefers-reduced-motion` disables fade-in animations on the rule items and bar transitions.
- Focus-visible outlines on interactive elements follow existing patterns.
- Bar level colors use design tokens (`--error`, `--success`, amber `#f59e0b`) with sufficient contrast on dark background.

## Implementation Notes
- Created `src/utils/passwordStrength.ts` for the pure-strength evaluation function (5 criteria: minLength, hasUpper, hasLower, hasNumber, hasSpecial).
- Created `src/components/PasswordStrength.tsx` as a reusable component.
- Integrated component into `src/pages/Signup.tsx`, replacing `<p id="password-hint">`.
- Updated submit validation to use the shared rule set instead of `password.length < 12`.
- Used design tokens from `src/index.css` and extended with animation keyframes and strength-segment classes.
- No new dependencies beyond existing `lucide-react` icons.

## Test Coverage
- `PasswordStrength.test.tsx`: 18 tests covering empty, weak, medium, strong states, ARIA attributes, rule states, live region, and checklist rendering.
- `Signup.test.tsx`: 12 tests covering persona flow, password strength integration, validation on submit, error states, password visibility toggle, and accessibility attributes.
- Coverage: >95% on both `PasswordStrength.tsx` and `Signup.tsx`.

## Security Assumptions and Risk
- Password strength is evaluated client-side only; server-side enforcement should independently validate password policy.
- No password data is logged or transmitted to third parties.
- The live-region announcement and ARIA attributes improve screen reader experience without introducing security concerns.
