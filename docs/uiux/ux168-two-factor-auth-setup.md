# UX168: Two-Factor Authentication Setup and Recovery UX

## Scope

New `TwoFactorSetup` wizard component used inside the existing `AuthLayout` wrapper.
Integrated into `Login.tsx` via a "Set up two-factor authentication" link.
Changes are UI/UX only — no real TOTP or SMS backend is wired; callers pass props.

---

## Wizard Flow (5 Steps)

```
Step 1 ──→ Step 2 ──→ Step 3 ──→ Step 4 ──→ Step 5
Method     QR/Key    Verify    Recovery   Done
Select     Setup     Code      Codes
```

### Step 1 – Choose Authentication Method

User selects one of two methods:

| Option | Description |
|---|---|
| Authenticator App (TOTP) | Scan QR or enter key manually into any TOTP app |
| SMS Backup | Receive codes via text message (requires mobile number) |

Each option is a full-width button card (`tfa-method-card`) with an icon, title, and description. Clicking immediately advances to Step 2.

### Step 2 – Set Up Authenticator / SMS

**TOTP path:**
- QR code displayed in a white `tfa-qr-wrapper` (accessible via `role="img"` with descriptive `aria-label`)
- "Can't scan? Enter key manually" toggle button (collapsed by default) reveals the base32 secret
- Manual key is rendered in `<code>` with `aria-label` spelling out individual characters for screen readers
- Copy-to-clipboard button with `aria-live` status announcement ("Key copied to clipboard")
- Back / "I've added the account" navigation

**SMS path:**
- Phone number text input
- Back / "Send verification code" navigation

### Step 3 – Verify Code

- Single `<input type="text" inputMode="numeric">` for the 6-digit code
- Input auto-focuses on mount
- Non-numeric characters are stripped in `onChange`
- Validation on submit: empty or length < 6 shows `FormError` via `role="alert"`
- Error clears on first keystroke (after failed submit)
- Submit shows `aria-busy` on the Button while verifying (600 ms stub)
- `autoComplete="one-time-code"` for browser/password-manager assistance

### Step 4 – Recovery Codes

- 8 recovery codes displayed in a 2-column grid list (`role="list" aria-label="Recovery codes"`)
- Warning banner (`role="note"`) with amber styling
- Download (`.txt` file via Blob URL) and Print (`window.open` + `print()`) actions
- Acknowledgement checkbox required before Continue is enabled
- Continue disabled (`aria-disabled`) until checkbox checked

### Step 5 – Completion

- Success icon (green shield-check)
- Confirmation heading + description
- "Done" button auto-focused on mount
- Cancel link hidden (setup is complete)

---

## Accessibility Decisions (WCAG 2.1 AA)

### Semantic Structure

| Element | Role | Purpose |
|---|---|---|
| `<section aria-labelledby="tfa-heading">` | `region` | Wizard landmark; labelled by current step heading |
| `<h2 id="tfa-heading" tabIndex={-1}>` | `heading` | Step title; receives programmatic focus on step change |
| `<nav aria-label="Setup progress">` | `navigation` | Step indicator with `<ol>` |
| `<p aria-live="polite">` (step label) | live region | Announces "Step N of 5: …" on step change |
| `role="alert"` (FormError) | alert | Verification error announced assertively |
| `role="note"` (warning banner) | note | Recovery-code warning; not assertive |
| `role="status"` (copy feedback) | status | Polite "Key copied" announcement |

### Focus Management

Step transitions call `headingRef.current?.focus()` to move keyboard/screen-reader focus to the new step heading. The heading has `tabIndex={-1}` so it can receive programmatic focus without entering the natural tab order.

Step 3 auto-focuses the verification code input.  
Step 5 auto-focuses the "Done" button.

### Copy-to-Clipboard

- Copy button has `aria-label` that toggles between "Copy key to clipboard" and "Key copied to clipboard"
- A `role="status"` polite region appears below the key when copied

### QR Code Alternative

- QR image is wrapped in `role="img"` with a full `aria-label` instructing users to use the manual key if scanning is not possible
- The `<img>` itself has `aria-hidden="true"` (decorative duplicate of the wrapper's accessible description)
- Manual key `<code>` has `aria-label={key.split('').join(' ')}` so screen readers spell out the characters

### Keyboard Navigation

Every interactive element (`tfa-method-card`, `tfa-toggle-link`, `tfa-icon-btn`, `tfa-cancel`, checkbox) has a visible `focus-visible` ring using the `--primary` token (`2px solid var(--primary); outline-offset: 2px`).

Full keyboard-only path:
1. Tab to "Authenticator App" → Enter
2. Tab past QR → Tab to "Can't scan?" → Enter → Tab to copy button if needed → Tab to "I've added the account" → Enter
3. Code input auto-focused → type 6 digits → Enter
4. Tab to Download → Tab to Print → Tab to checkbox → Space → Tab to Continue → Enter
5. "Done" auto-focused → Enter

### Screen-Reader-Only Text

- Each step indicator `<li>` contains a `.sr-only` span: "Step N: {label} (completed|current|)"
- Copy button inner `<span class="sr-only">` mirrors the aria-label for older AT implementations

---

## Recovery-Code UX

| Concern | Decision |
|---|---|
| Lost device recovery | Recovery codes enable sign-in without authenticator |
| Download skipped | Acknowledgement checkbox blocks Continue until user confirms codes are saved |
| Print option | Opens `window.print()` in a new window with clean HTML-only output |
| Download format | Plain text `.txt` with timestamp header and usage warning |
| Code display | 2-column `<code>` grid; `user-select: all` for easy mouse selection |
| Safe storage reminder | Orange warning banner with `role="note"` — prominent but not assertive |

---

## Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| ≥480 px (desktop/tablet) | Card within `AuthLayout` at max 480 px; QR centred; 2-col recovery grid |
| 360–479 px (mobile) | Same layout; QR scales via `width: fit-content; margin: auto` |
| ≤360 px (small mobile) | Recovery grid collapses to 1 column via `@media (max-width: 360px)` |
| All | Manual-key path always accessible; QR-only approach never forced |

The QR section is accessible on same-device setup: the "Can't scan?" toggle is always available, and the manual key can be copied into an authenticator app opened in split-screen or another device.

---

## Edge Cases Handled

| Case | Resolution |
|---|---|
| Lost device | Recovery codes (Step 4) available for account recovery |
| Same-device setup | Manual key copy always accessible without scanning |
| QR unavailable | Manual key fallback behind toggle, always present |
| Recovery codes not downloaded | Checkbox prevents advancing without acknowledgement |
| Invalid code | FormError with `role="alert"`, shake animation, error cleared on typing |
| SMS method | Separate phone-input screen in Step 2; same Step 3 flow |
| Screen-reader-only flow | Full QR alternative via manual key; ARIA live regions at each step |

---

## CSS Tokens Added

All new styles are appended to `src/index.css` under `/* ─── TwoFactorSetup Wizard Styles (Issue #168) */`.

Key classes follow BEM-style naming under the `.tfa-` prefix:

| Class | Description |
|---|---|
| `.tfa-wizard` | Outer flex column container |
| `.tfa-wizard__title` | Step `<h2>` heading |
| `.tfa-steps` / `.tfa-steps__list` | Progress nav + ordered list |
| `.tfa-steps__item--active/completed/pending` | Step state modifiers |
| `.tfa-steps__dot` | Circular step marker |
| `.tfa-method-card` | Method selection button card |
| `.tfa-qr-wrapper` | White QR background container |
| `.tfa-toggle-link` | Manual key toggle button |
| `.tfa-manual-key` / `.tfa-manual-key__code` | Key display section |
| `.tfa-icon-btn` | Copy/action icon button |
| `.tfa-code-input` | Monospace centred 6-digit input |
| `.tfa-warning` | Amber save-codes warning banner |
| `.tfa-recovery-list` | 2-column recovery code grid |
| `.tfa-acknowledge` | Checkbox + label wrapper |
| `.tfa-success-icon` | Green shield-check circle |
| `.tfa-cancel` | Muted cancel text link |

All colours use existing design tokens (`--primary`, `--success`, `--error`, `--text-main`, `--text-muted`, `--glass-bg-accent`, `--glass-border`, etc.).

---

## Component API

```tsx
<TwoFactorSetup
  onComplete={() => void}      // Called when Step 5 "Done" is clicked
  onCancel={() => void}        // Called when "Cancel setup" is clicked
  totpSecret?: string          // Base32 TOTP secret (default: stub value)
  recoveryCodes?: string[]     // 8 recovery codes (default: stub values)
/>
```

Callers (e.g. `Login.tsx`) are responsible for:
- Generating a real TOTP secret server-side before showing the wizard
- Generating recovery codes server-side
- Persisting the enabled 2FA state on `onComplete`

---

## Test Coverage

File: `src/components/TwoFactorSetup.test.tsx` — **49 tests**

| Group | Count | Coverage |
|---|---|---|
| Step indicator | 2 | Live region, active step |
| Step 1 – method selection | 6 | Both options, navigation, cancel, keyboard |
| Step 2 – TOTP | 8 | QR rendering, manual key toggle, copy, back/next |
| Step 2 – SMS | 2 | Phone input, advance |
| Step 3 – verification | 8 | Input, error states, numeric filter, loading, navigation |
| Step 4 – recovery codes | 9 | All 8 codes, warning, download, print, checkbox gate |
| Step 5 – completion | 3 | Heading, onComplete, cancel hidden |
| Accessibility | 6 | Region, focus, nav label, sr-only, cancel aria-label, copy label |
| Login integration | 3 | Link renders, wizard opens, cancel closes |

Login tests: **9/9 pass** (unaffected by integration).

---

## Security Assumptions

- TOTP secret and recovery codes must be generated server-side; the component only presents them.
- The manual key is displayed in plain text — callers must ensure TLS and session authentication before rendering the wizard.
- Recovery codes are single-use server-side; the UI does not enforce this.
- No sensitive values are logged or transmitted by this component.

---

## References

- [WCAG 2.1 SC 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html)
- [WCAG 2.1 SC 2.4.3 Focus Order](https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html)
- [otpauth URI format](https://github.com/google/google-authenticator/wiki/Key-Uri-Format)
- [navigator.clipboard.writeText – MDN](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText)
- UX80 – AuthLayout spacing/responsive (existing pattern this wizard builds on)
- UX29 – Password Strength Meter (pattern reference for inline error UX)
