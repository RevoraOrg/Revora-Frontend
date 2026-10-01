# TwoFactorSetup verification contract

`TwoFactorSetup` no longer treats every six-digit value as valid.

## Verification boundary

Callers may provide `verifyCode(request)` when verification is owned by an API or another trusted boundary. The request contains:

- `method`: `totp` or `sms`
- `code`: the normalized six-digit code entered by the user
- `secret`: the current TOTP secret when one was supplied to the component

The handler may return a boolean directly or a promise. `true` advances the wizard; `false` keeps the user on the verification step and displays an invalid/expired-code error. If the handler throws or rejects, the wizard remains on the same step and displays a retryable verification error without exposing the underlying exception.

## Default TOTP behavior

When `verifyCode` is omitted, authenticator-app codes are verified locally with RFC 6238 using HMAC-SHA1, a 30-second period, six digits, and a one-period clock-skew window. The implementation uses Web Crypto and the base32 `totpSecret` already displayed by the setup flow.

SMS has no safe local verification equivalent. Callers using the SMS path must provide `verifyCode`; otherwise verification fails closed and the wizard does not advance.

## Input and failure behavior

- Non-digits are removed while typing and input is capped at six characters.
- Submission requires exactly six digits before the verifier is called.
- Invalid or expired codes are observable through `FormError` and do not advance the wizard.
- Verifier/network failures produce a deterministic retryable error and re-enable the input.
- Malformed TOTP secrets and unavailable Web Crypto are treated as verification failures, never successful setup.

This keeps the existing `onComplete`, `onCancel`, `totpSecret`, and `recoveryCodes` props intact while adding the optional server-verification extension point.
