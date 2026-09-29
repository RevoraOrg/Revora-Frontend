# PR: Issue #706 - DocumentReplacementFlow Behavior Tests

## Summary

Add focused automated behavior coverage for the public `DocumentVersion`, `DiffSummary`, and `ReplacementStep` contracts as rendered and exercised by `DocumentReplacementFlow`. No production behavior or public API changes.

## Cases Covered

- Renders version metadata including uploader, page count, and shortened SHA-256.
- Keeps the upload step active and exposes a deterministic alert when file processing rejects.
- Falls back to a computed summary when diff computation rejects, including byte, line, and page changes.
- Renders supplied diff confidence, changed fields, byte totals, and collapsible breakdown.
- Exercises review, confirm, and success progress states, active-version selection, retention choice, back navigation, and the final confirmation payload.

## Verification

- Focused suite: `DocumentReplacementFlow.test.tsx` passes (5 tests).
- Production build: passes; Vite reports the existing large-chunk warning.
- Repository test suite: does not pass because unrelated app and shell tests render components without required provider/data context.
- ESLint: blocked by existing errors in unrelated files, including parse errors and a missing `react-hooks/exhaustive-deps` rule.
- TypeScript: blocked by existing parse errors in five unrelated files. No errors were reported for the new test file.
