# PR #783: Focused Onchain Rejection Copy Coverage

## Summary

- Add direct tests for `OnchainRejectionReason`, `RejectionCopyTemplate`, and every `ONCHAIN_REJECTION_COPY` entry.
- Verify valid reason lookups return their catalog templates and invalid inputs fall back to `unknown`.
- Restrict lookup to own catalog keys so inherited names such as `toString` and `__proto__` cannot bypass the fallback.

## Validation

- Focused `onchainRejectionCopy.test.ts`: 13 tests passed.
- Covered all six reasons, required and optional template fields, and missing, empty, whitespace, unrecognized, and prototype-key inputs.
- Surrounding StatusTimeline tests, lint, TypeScript, and build checks were not run.