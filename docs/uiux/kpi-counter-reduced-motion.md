# KPI Counter — Reduced-Motion Variant

**Issue:** UX — Design a reduced-motion variant for the KPI counter animations (#492)  
**Status:** Implemented  
**Files:**
- `src/components/KpiHeader.tsx` (`AnimatedValue`)
- `src/hooks/useReducedMotion.ts`
- Tests: `src/components/KpiHeader.test.tsx`, `src/hooks/useReducedMotion.test.ts`

---

## Overview

KPI counters in the portfolio header animate from 0 to their final value on load (1.5s ease-out-quint numeric tick). Users who enable **reduce motion** at the OS level get an alternative presentation: the final value renders **immediately**, accompanied by a **subtle opacity fade**, with **no numeric ticking**.

## Detection

Reduced-motion detection uses the `(prefers-reduced-motion: reduce)` media query through the shared `useReducedMotion()` hook:

- Synchronous initial read from `window.matchMedia`
- Live updates when the system-level accessibility toggle changes mid-session (`change` event)
- Legacy `addListener`/`removeListener` fallback for Safari < 14

## Behaviours

| Mode | Trigger | Presentation |
|---|---|---|
| Default | `prefers-reduced-motion: no-preference` | Numeric count-up from `0`, 1500ms, ease-out-quint, comma/decimal formatting preserved per frame |
| Reduced | `prefers-reduced-motion: reduce` | Final value rendered immediately inside `.animate-fade-in` (opacity-only fade); no `requestAnimationFrame` loop |

### Edge cases (covered by tests)

- **Mid-animation toggle → reduced:** pending frames are cancelled (`cancelAnimationFrame`) and the exact final value is shown at once.
- **Toggle back to full motion:** the count-up restarts and lands on the exact prop value.
- **Value prop change while reduced:** new value appears immediately.
- **Non-numeric values** (e.g. `"N/A"`): rendered verbatim, no animation scheduled.

## Tokens

| Token | Value | Usage |
|---|---|---|
| `--transition-base` | `0.4s ease-out` | Duration of the reduced-motion fade (inline `animationDuration` override on `.animate-fade-in`) |
| Counter duration | `1500ms` (component constant) | Full-motion tick duration; intentionally not user-facing |

The fade reuses the global `.animate-fade-in` keyframes from `src/index.css` so no component-scoped animation CSS is introduced.

## Usage Guidance

- Reuse `AnimatedValue`'s pattern for any future counting metric: gate the rAF loop behind `useReducedMotion()`, render the static value inside `.animate-fade-in` when reduced, and always land the loop on the exact formatted prop value.
- Keep reduced-motion fallbacks to **opacity fades only** — never movement, scaling, or parallax (see `reduced-motion-guidelines.md`).
- Never leave a ticking loop running after the reduced preference flips on; cancel pending frames before switching presentation.

## Accessibility

- Supports WCAG 2.1 AA — addresses Success Criterion **2.3.3 Animation from Interactions**
- The fade is opacity-only and short (≤0.4s), which is acceptable under reduced-motion preferences
- Values are identical text content in both modes, so screen readers announce the same final figure regardless of the setting
- No information is conveyed by the animation itself; it is purely decorative

## Test Coverage

Both implementation files sit at **100% statement / branch / function / line coverage**:

```
npx vitest run src/components/KpiHeader.test.tsx src/hooks/useReducedMotion.test.ts --coverage
 KpiHeader.tsx     | 100 | 100 | 100 | 100
 useReducedMotion  | 100 | 100 | 100 | 100
```
