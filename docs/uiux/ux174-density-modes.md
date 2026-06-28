# Density Modes — Design System Documentation

**Issue #174** · Comfortable / Cozy / Compact density via design tokens

---

## Overview

Three density modes let power users trade whitespace for information density, while casual users keep comfortable defaults. The setting is global, persisted to `localStorage`, and toggled from the app header.

| Mode | Row Height | Vertical Padding | Font Size | Use Case |
|---|---|---|---|---|
| **Comfortable** (default) | 56 px | 14 px | 15 px | Onboarding, casual browsing |
| **Cozy** | 48 px | 10 px | 14 px | Day-to-day use |
| **Compact** | 36 px | 6 px | 13 px | Power users, audit/ledger views |

---

## Design Tokens

Defined in `src/index.css` under `:root` (comfortable defaults) and overridden via `[data-density="cozy"|"compact"]` attribute on `<html>`.

```css
--density-row-height   /* row height in tables */
--density-pad-y        /* block (top/bottom) padding */
--density-pad-x        /* inline (left/right) padding */
--density-font-size    /* base font size for density-aware text */
--density-line-height  /* line height */
--density-gap          /* gap between sibling items */
```

The `comfortable` mode is the `:root` default — no `data-density` attribute is set on `<html>` for it. `cozy` and `compact` set `data-density="cozy|compact"` respectively.

---

## Component Opt-In / Opt-Out

### Opt-in (consume density tokens)

Use the CSS custom properties in your component styles:

```css
.my-row {
  height: var(--density-row-height);
  padding: var(--density-pad-y) var(--density-pad-x);
  font-size: var(--density-font-size);
  gap: var(--density-gap);
}
```

For interactive controls that must maintain a 44 × 44 px touch target on mobile in compact mode, add the `density-touch-target` class:

```html
<button class="density-touch-target">…</button>
```

```css
/* index.css handles this at the global level: */
@media (max-width: 768px) {
  [data-density="compact"] .density-touch-target {
    min-height: 2.75rem; /* 44px */
    min-width: 2.75rem;
  }
}
```

### Opt-out (hardcode your own sizing)

Simply don't reference `--density-*` variables. The provider only affects elements that explicitly use those tokens.

---

## React API

### DensityProvider

Wrap your app root (done in `main.tsx`):

```tsx
import { DensityProvider } from './components/DensityProvider';

<DensityProvider>
  <App />
</DensityProvider>
```

Reads the stored preference from `localStorage` key `revora-density` on mount. Falls back to `'comfortable'`.

### useDensity

```tsx
import { useDensity } from './hooks/useDensity';

const { density, setDensity, cycle } = useDensity();
// density: 'comfortable' | 'cozy' | 'compact'
// setDensity('compact')  — set directly
// cycle()               — advance to next mode
```

Must be called inside `<DensityProvider>`.

### DensityToggle

```tsx
import { DensityToggle } from './components/DensityToggle';

// Full labels (for settings pages):
<DensityToggle />

// Icon-only (for header bars):
<DensityToggle compact />
```

Renders as `role="radiogroup"` with three `role="radio"` buttons. Arrow keys cycle through options (WCAG 2.1 AA roving tabindex pattern).

---

## Accessibility Notes

- Toggle is a `role="radiogroup"` with `role="radio"` children — screen readers announce current selection and available options.
- Arrow key navigation (←↑ / →↓) cycles through modes; `Tab` moves focus to/from the group.
- Compact mode mobile touch targets are enforced at ≥ 44 × 44 px via the `.density-touch-target` utility class and a `@media (max-width: 768px)` override.
- Focus rings on all interactive elements use `outline: 2px solid var(--primary)` with `outline-offset: 2px` (2:1 minimum contrast, meets WCAG 2.4.11).

---

## LedgerTable Integration

`LedgerTable` accepts an optional `defaultDensity` prop for a per-instance override. When omitted it defaults to `'cozy'`. The table-local density toggle cycles independently of the global setting, allowing override without affecting other views.

```tsx
<LedgerTable
  defaultDensity="compact"   /* override for this table */
  ...
/>
```

CSS classes applied to the table wrapper mirror the mode names:

```
.lt-density--comfortable
.lt-density--cozy
.lt-density--compact
```
