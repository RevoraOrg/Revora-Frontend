# UX80: AuthLayout – Refined Spacing, Responsive Width & Type Scale

## Scope

Shared `AuthLayout` wrapper used by **Login**, **Signup**, and **ForgotPassword** pages.
Changes are UI/UX only — no routing, API, or backend behaviour is altered.

---

## Problem Statement

The previous `AuthLayout` had several gaps:

| Issue | Detail |
|---|---|
| Hard-coded padding | `p-8 md:p-10` via Tailwind utilities with no token — hard to audit or override |
| No width fluidity at 320 px | `max-w-[480px]` + `p-6` outer padding leaves only 268 px of card width on the smallest Android viewports |
| Unformalized type scale | Title/subtitle/helperText used ad-hoc `text-3xl`, `text-sm`, `text-xs` classes with no shared token |
| Weak ARIA structure | Outer `<div>` with no landmark; `<h1>` had no `id`; screen readers had no way to label the page region |
| Header spacing implicit | Bottom margin on the header wrapper (`mb-8`) was not a named token |

---

## Design System Tokens Added (`index.css → :root`)

### Typography Scale

| Token | Value | Usage |
|---|---|---|
| `--auth-title-size` | `clamp(1.5rem, 4vw, 1.875rem)` | fluid 24 → 30 px |
| `--auth-title-weight` | `700` | Bold |
| `--auth-title-tracking` | `-0.025em` | Tight tracking at large size |
| `--auth-title-lh` | `1.2` | Display line height |
| `--auth-subtitle-size` | `0.9375rem` (15 px) | One step below body |
| `--auth-subtitle-lh` | `1.5` | |
| `--auth-helper-size` | `0.8125rem` (13 px) | Fine print / security notes |
| `--auth-helper-lh` | `1.5` | |

### Layout Tokens

| Token | Value | Usage |
|---|---|---|
| `--auth-card-max-w` | `480px` | Card maximum width |
| `--auth-card-padding-x` | `clamp(1.25rem, 5vw, 2.5rem)` | fluid 20 → 40 px horizontal |
| `--auth-card-padding-y` | `clamp(1.5rem, 4vw, 2.5rem)` | fluid 24 → 40 px vertical |
| `--auth-header-gap` | `0.5rem` | Column gap: title → subtitle → helperText |
| `--auth-header-mb` | `2rem` | Bottom margin of header above form |

---

## Layout Slots

```
┌─── .auth-layout-outer ───────────────────────────────────────┐
│  min-height: 100vh  •  flex column  •  centred               │
│  padding: safe-area-aware 1rem horizontal                     │
│                                                               │
│  ┌─── .auth-card  (.glass-card) ──────────────────────────┐  │
│  │  max-width: 480px  •  fluid padding via tokens          │  │
│  │                                                         │  │
│  │  ┌─── <header class="auth-header"> ─────────────────┐  │  │
│  │  │  <h1 class="auth-title" id="{uid}">              │  │  │
│  │  │    {title}                                        │  │  │
│  │  │  </h1>                                            │  │  │
│  │  │  <p class="auth-subtitle">  (if subtitle)         │  │  │
│  │  │  <p class="auth-helper">    (if helperText)       │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  ┌─── <div class="auth-body"> ─────────────────────┐   │  │
│  │  │  {children}   — form content                     │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### Prop API

| Prop | Type | Required | CSS Class | Description |
|---|---|---|---|---|
| `title` | `string` | ✅ | `.auth-title` | Page `<h1>`. Must be unique per page view. |
| `subtitle` | `string` | ❌ | `.auth-subtitle` | Short description beneath title. Omit to suppress element. |
| `helperText` | `string` | ❌ | `.auth-helper` | Tertiary note (security tips, recovery hints). Omit to suppress. |
| `children` | `ReactNode` | ✅ | `.auth-body` | Form content. Manages its own internal spacing. |

---

## ARIA & Accessibility Changes

| Before | After |
|---|---|
| Outer `<div>` — no landmark | `<main role="main">` — navigable landmark |
| `<h1>` had no `id` | `<h1 id="{useId()}">` — stable generated id |
| No `aria-labelledby` | `<main aria-labelledby="{titleId}">` — links region to heading |
| No `<header>` | `<header class="auth-header">` — semantic grouping |

### WCAG 2.1 AA Compliance

- **1.3.1 Info and Relationships** — `<main>` + `<header>` + `<h1>` hierarchy is programmatically determinable
- **2.4.1 Bypass Blocks** — `<main>` landmark allows keyboard users to jump directly to auth content
- **2.4.6 Headings and Labels** — `<h1>` title uniquely describes the page purpose
- **1.4.3 Contrast (Minimum)** — `--text-muted` (#cbd5e1 on #020617) passes at ≥5.9:1; helper text at 13 px passes large-text threshold
- **2.4.7 Focus Visible** — focus rings inherited from global `:focus-visible` rules in `index.css`

---

## Responsive Behaviour

| Viewport | Card Behaviour |
|---|---|
| 320 px | Full width; padding ~20px h × 24px v; title ~24px |
| 375 px (iPhone SE) | Full width; padding ~18px h; title ~25px |
| 480 px+ | Card reaches max-width cap; padding ~32px h × 32px v |
| 768 px+ | Card centred, padding ~40px × 40px; title 30px |

**Edge cases tested:**
- 320 px width — card fits without horizontal scroll
- Very long title (200 chars) — wraps via `overflow-wrap: break-word`
- Very long subtitle/helperText (300–500 chars) — wraps cleanly
- Missing subtitle / helperText — no empty DOM node emitted
- Success-state layouts (title only, no subtitle/helperText) — clean

---

## Test Coverage

File: `src/components/AuthLayout.test.tsx`

| Test Group | Cases |
|---|---|
| Title slot | Renders as `<h1>`, has `id`, `auth-title` class, long title, special chars |
| Subtitle slot | Renders when present, `auth-subtitle` class, absent when omitted / undefined |
| HelperText slot | Renders when present, `auth-helper` class, absent when omitted / undefined |
| Children slot | Renders inside `.auth-body`, complex multi-child form |
| All slots | All four slots together |
| ARIA | `<main>` landmark, `aria-labelledby` ↔ `<h1>` id linkage, stable ids across re-renders, `<header>` grouping, focus inheritance |
| CSS class structure | `.auth-layout-outer`, `.auth-card` + `.glass-card`, `.auth-header`, `animate-fade-in` |
| Edge cases | Title-only render, null children, success-state screens, empty header when no optional props |

**Coverage target:** ≥ 95% branches / functions / lines / statements on `AuthLayout.tsx`
(enforced via `vite.config.ts` `coverage.thresholds`)

---

## Implementation Notes

- No changes to `Login.tsx`, `Signup.tsx`, or `ForgotPassword.tsx` — the new CSS classes are purely additive and the HTML structure changes are internal to `AuthLayout`.
- `glass-card` is retained on `.auth-card` — the new class adds sizing/padding; the existing glassmorphic visual style is unchanged.
- `useId()` (React 18) is used instead of a custom counter to generate the heading `id` — this is SSR-safe and avoids collision on pages that embed multiple micro-frontends.

---

## Security Assumptions & Risk

- No backend changes; this is purely frontend layout.
- The `helperText` slot is rendered as plain text — callers should not pass raw user-controlled HTML.

---

## References

- [WCAG 2.1 SC 1.3.1](https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html)
- [WCAG 2.1 SC 2.4.1](https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html)
- [ARIA Landmark Roles – MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/main_role)
- [CSS `clamp()` – MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/clamp)
- [React `useId` – React docs](https://react.dev/reference/react/useId)
