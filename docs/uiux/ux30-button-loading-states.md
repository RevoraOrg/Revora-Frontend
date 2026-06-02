# Button Loading, Disabled, and Success States

## Overview
This document defines the loading, disabled, and success visual states for all primary (`btn-primary`) and secondary (`btn-secondary`) buttons in the auth forms (Login, Signup, ForgotPassword). These states prevent double submission and communicate submission progress to the user.

## Button Component
A reusable `Button` component is provided at `src/components/Button.tsx` with the following props:

| Prop       | Type                  | Default     | Description                                      |
|------------|-----------------------|-------------|--------------------------------------------------|
| variant    | `'primary' \| 'secondary'` | `'primary'` | Visual variant matching `.btn-primary` / `.btn-secondary` |
| loading    | `boolean`             | `false`     | Shows spinner + disables button + sets `aria-busy` |
| success    | `boolean`             | `false`     | Shows checkmark + green background + disables    |
| disabled   | `boolean`             | `false`     | Reduces opacity + sets `aria-disabled`           |

All native `<button>` attributes are forwarded.

## State Visual Design

### Default
- Primary: solid blue (`--primary: #3b82f6`) background, white text
- Secondary: glass-background, muted text, thin border

### Loading
- Visually: spinner icon (rotating `Loader2` from lucide-react) before label text
- Opacity: slight reduction to 0.8 via `.btn-loading`
- Cursor: `wait`
- Interaction: `disabled` attribute prevents click
- Accessibility: `aria-busy="true"` signals pending update to screen readers
- Reduced motion: spinner animation is disabled when `prefers-reduced-motion: reduce` is active; static icon remains visible

### Disabled
- Visually: reduced opacity to 0.55 via `.btn-disabled`
- Cursor: `not-allowed`
- Hover: no background/transform changes (overrides default hover lift)
- Interaction: `disabled` attribute prevents click
- Accessibility: `aria-disabled="true"` when not in loading state

### Success
- Visually: green background (`--success: #10b981`) with checkmark icon
- Cursor: `default`
- Interaction: `disabled` attribute prevents click
- Duration: parent component controls timing — typically 600–800ms before page transitions to next step

## Usage in Auth Forms

### Login (`src/pages/Login.tsx`)
- Submit button shows loading during mock API call (1s), then success (800ms)
- Button text changes to "Signed In!" during success state
- All inputs disabled during submission
- Form validates email before submitting

### Signup (`src/pages/Signup.tsx`)
- "Create Account" button shows loading (800ms), then success (600ms), then transitions to success step
- Validation errors still appear synchronously (no loading state shown)
- Inputs disabled during submission

### ForgotPassword (`src/pages/ForgotPassword.tsx`)
- "Send Reset Link" button shows loading (800ms), then success (600ms) with "Sent!" text, then transitions to confirmation view
- Inputs disabled during submission

## Accessibility (WCAG 2.1 AA)
- `aria-busy="true"` on buttons during loading state
- `aria-disabled="true"` on buttons in disabled (non-loading) state
- Spinner icon has `aria-hidden="true"` — not announced by screen readers
- `prefers-reduced-motion: reduce` support: spinner animation disabled, static icon remains visible
- Disabled state opacity (0.55) meets WCAG exemption for disabled elements
- Focus-visible outlines maintained on disabled buttons for keyboard navigation context
- Inputs are disabled during submission to prevent edit conflicts

## Responsiveness
- Buttons span full width (`width: 100%`) on all viewport sizes
- `inline-flex` layout with `gap: 0.5rem` ensures icon and text stay aligned
- No hardcoded pixel widths that break on small screens

## Implementation Notes
- CSS classes: `btn-loading`, `btn-disabled`, `btn-success` added to `src/index.css`
- CSS custom properties design tokens used throughout
- `.sr-only` utility class added for screen-reader-only content
- No new dependencies required — uses existing `lucide-react` icons (`Loader2`, `Check`)

## Test Coverage (≥95%)
- `src/components/Button.test.tsx` — 22 tests covering all states, accessibility attributes, event handling
- `src/pages/Login.test.tsx` — 8 tests covering form rendering, validation, loading, success, disabled states
- `src/pages/Signup.test.tsx` — 14 tests covering persona selection, form validation, loading, success, accessibility
- `src/pages/ForgotPassword.test.tsx` — 8 tests covering form rendering, validation, loading, success, error clearing
