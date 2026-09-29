# PR: Issue #701 - KPIData and Sparkline Regression Coverage

## Summary

Extend the `DashboardHero` behavior suite to protect KPI failure handling and the sparkline's insufficient-data guard without changing production behavior.

## Cases Covered

- Empty and single-point sparkline inputs omit the accessible sparkline.
- Two-point rising and falling inputs produce deterministic point coordinates and trend colors.
- Equal-value input uses the non-zero range fallback and renders finite coordinates.
- Existing KPI tests continue to cover error, empty, loading, and successful presentations.

## Verification

- Focused and adjacent tests: 58 tests pass across `DashboardHero.test.tsx` and `IssuerDashboardHero.test.tsx`.
- Changed test lint: passes.
- Production build: passes; Vite reports the existing large-chunk warning.
- Repository lint: blocked by 9 existing errors and 1 warning in unrelated files.
- TypeScript: blocked by 40 existing parse errors in 5 unrelated files; none are in the changed test.
