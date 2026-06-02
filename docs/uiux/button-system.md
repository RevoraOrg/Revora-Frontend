# Button System

This document defines the reusable button component patterns for Revora Frontend.

## Tokens
- `--primary`, `--primary-hover`, `--error` etc. are defined in `src/index.css`.

## Class API
- Base: `btn` — use on all buttons.
- Variants: `btn--primary`, `btn--secondary`, `btn--destructive`, `btn--icon`.
- Width helpers: `btn--block` (full width), `btn--auto` (auto width).
- Sizes: `btn--sm`, `btn--md`, `btn--lg`.
- Backwards compatibility: legacy classes `btn-primary` and `btn-secondary` remain as full-width aliases.
- Screen-reader helper: `sr-only` to visually hide content but keep it available to assistive tech.

## States
- Hover: subtle lift and color change per variant.
- Focus-visible: 2px outline + soft blue shadow to meet WCAG 2.1 AA contrast and keyboard visibility.
- Active: minor transform reset.
- Disabled: reduced opacity (`opacity: 0.45`) and `pointer-events: none`.

## Accessibility
- Icon-only buttons must provide an accessible name. Use either:
  - `aria-label="Filter results"`, or
  - include visible text and visually hide it with `sr-only`.

Example:

```jsx
<button className="btn btn--icon btn--sm" aria-label="Filter results">
  <Filter />
</button>

<button className="btn btn--primary btn--sm btn--block">View Prospectus</button>
```

## Migration notes
- Existing `.btn-primary` and `.btn-secondary` will continue to work (kept as full-width aliases).
- New code should prefer `btn` + `btn--<variant>` + size + width helper for clarity.
- When migrating screens, ensure icon-only buttons keep an `aria-label` or `sr-only` content.

## Example: Accessible icon button pattern

```jsx
<button className="btn btn--icon" aria-label="Open filters">
  <Filter />
</button>
```

## Visual testing & accessibility checklist
- Use `npm run lint` and component tests.
- Verify focus ring and contrast with axe or Lighthouse.
- Confirm icon-only buttons expose accessible names.

---

File: `src/index.css` contains the implementation.
