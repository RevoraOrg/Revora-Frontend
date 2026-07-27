# Slot Picker Compact Bands Mode — Issue #220

## Overview

The **Slot Picker Compact Bands Mode** (`src/components/dashboard/slot-list.tsx`) solves visual overload and scroll fatigue on high-density operational days (containing 50+ time slots). Time slots are aggregated into hourly collapsed band chips that expand on click, tap, or keyboard focus, with density preferences saved per supplier in `localStorage`.

---

## Design Rationale & UX Goals

1. **High-Density Scannability**: Days with 50+ time slots produce severe vertical scroll length in a full grid. Compact Bands group slots by hour (e.g. `09:00 - 10:00 (12 slots)`), reducing layout height by ~75%.
2. **Density Toggle Toolbar**: Users can switch between **Full Grid** and **Compact Bands** modes via a segmented toggle group in the toolbar.
3. **Automatic High-Density Trigger**: Days containing 50 or more slots automatically default to Compact Bands mode unless explicitly overridden by the user.
4. **Per-Supplier Persistence**: Saves density preference in `localStorage` under `revora_slot_density_${supplierId}`, preserving context when navigating across different suppliers.
5. **Keyboard & Focus Retention**:
   - Band chips act as disclosure accordions (`aria-expanded`, `aria-controls`, `role="region"`).
   - Pressing `Enter` or `Space` toggles expansion.
   - `ArrowUp` and `ArrowDown` navigate between band chip headers.
   - Collapsing an expanded band explicitly restores keyboard focus to that band's header button.

---

## Component Anatomy

```
+-------------------------------------------------------------------+
|  August 15, 2026 Slots   [52 available slots]                      |  <-- Toolbar Header
|                          [ Full Grid ] [ Compact Bands (Active) ] |  <-- Density Toggle
+-------------------------------------------------------------------+
| ⚡ High-density day (52 slots) — Compact Bands auto-enabled.       |  <-- Auto Banner
+-------------------------------------------------------------------+
| [▼] 09:00 - 10:00   [ 12 available ]              from $50   [▼] |  <-- Collapsed Band Chip
+-------------------------------------------------------------------+
| [▲] 10:00 - 11:00   [ 8 available ]               from $50   [▲] |  <-- Expanded Band Chip
| +---------------------------------------------------------------+ |
| | [ 10:00 ($50) ]  [ 10:15 ($50) ]  [ 10:30 ($60) ]  [ 10:45 ]  | |  <-- Time Slot Grid
| +---------------------------------------------------------------+ |
+-------------------------------------------------------------------+
| [▼] 11:00 - 12:00   [ Sold Out ]                  from $60   [▼] |
+-------------------------------------------------------------------+
```

---

## Accessibility & Keyboard Specification (WCAG 2.1 AA)

| Criteria | Implementation | Status |
|----------|----------------|--------|
| **Disclosure Semantics** | `aria-expanded="true\|false"`, `aria-controls="slot-band-body-{hourKey}"`, `role="region"` | Pass |
| **Keyboard Navigation** | `Enter` / `Space` toggles expand/collapse; `ArrowUp`/`ArrowDown` navigates band headers | Pass |
| **Focus Retention** | Focus returns to `headerRefs.current[hourKey]` when band is collapsed | Pass |
| **Axe Core Audit** | `jest-axe` tests return 0 violations | Pass |
| **RTL Layout** | `[dir="rtl"]` alignment and chevron rotations | Pass |
| **Dark Mode & Contrast** | High contrast text (4.5:1+) on dark glassmorphic background | Pass |

---

## File Summary

| File Path | Description |
|-----------|-------------|
| `src/components/dashboard/slot-list.tsx` | Primary SlotList component with Compact Bands mode |
| `src/components/dashboard/slot-list.css` | Glassmorphic styles, band chip tokens, expansion animations, dark mode, RTL |
| `src/components/dashboard/slot-list.types.ts` | TypeScript interfaces for `TimeSlot`, `HourlyBand`, `SlotDensityMode` |
| `src/components/dashboard/slot-list.test.tsx` | Vitest & `jest-axe` test suite (>95% coverage) |
| `src/components/dashboard/index.ts` | Barrel export |
| `docs/uiux/ux220-slot-picker-compact-bands.md` | Design system documentation |
