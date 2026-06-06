# Revora Design System Tokens (Issue #100)

This document describes the design tokens defined in `src/index.css` for typography, spacing, and radius scales, and explains how to use them in the Revora Frontend codebase.

## 1. Spacing Scale

We have defined a standard, logical spacing scale from `3xs` to `4xl` based on `rem` units (where `1rem = 16px`).

| Token | CSS Variable | Value | Pixels | Use Case |
|---|---|---|---|---|
| `3xs` | `--spacing-3xs` | `0.125rem` | 2px | Micro alignments, tiny borders |
| `2xs` | `--spacing-2xs` | `0.25rem` | 4px | Small gaps, internal list paddings |
| `xs` | `--spacing-xs` | `0.5rem` | 8px | Button/Input internal gap, tight grid gap |
| `sm` | `--spacing-sm` | `0.75rem` | 12px | Compact item padding, gap in headers |
| `md` | `--spacing-md` | `1rem` | 16px | Standard gap, general card layouts, margins |
| `lg` | `--spacing-lg` | `1.25rem` | 20px | Outer spacing, list gaps, section margins |
| `xl` | `--spacing-xl` | `1.5rem` | 24px | Responsive component layouts (default mobile padding) |
| `2xl` | `--spacing-2xl` | `2rem` | 32px | Section gap, large card separation |
| `3xl` | `--spacing-3xl` | `3rem` | 48px | Huge margins, top hero spacers |
| `4xl` | `--spacing-4xl` | `4rem` | 64px | Main header margins, page footer gaps |

### Example Usage:
```css
.card {
  padding: var(--spacing-xl) var(--spacing-lg);
  margin-bottom: var(--spacing-2xl);
}
```

---

## 2. Border Radius Scale

Consistent corner rounding helps create a cohesive aesthetic across Revora's visual containers.

| Token | CSS Variable | Value | Pixels | Use Case |
|---|---|---|---|---|
| `xs` | `--radius-xs` | `0.25rem` | 4px | Small checkboxes, tags |
| `sm` | `--radius-sm` | `0.375rem` | 6px | Small buttons, badges |
| `md` | `--radius-md` | `0.5rem` | 8px | Form fields/inputs, standard buttons |
| `lg` | `--radius-lg` | `0.75rem` | 12px | Large buttons, small card elements |
| `xl` | `--radius-xl` | `1rem` | 16px | Medium cards, popups |
| `2xl` | `--radius-2xl` | `1.5rem` | 24px | Outer wrappers, major cards (glass-card) |
| `full` | `--radius-full` | `9999px` | — | Pill buttons, circular avatars |

### Example Usage:
```css
.input-field {
  border-radius: var(--radius-md);
}
```

---

## 3. Typography Scale

Standardized font sizes and line heights satisfy both aesthetic balance and WCAG accessibility standards.

| Token | CSS Variable | Size | Line Height | Use Case |
|---|---|---|---|---|
| `xs` | `--font-size-xs` | `0.75rem` (12px) | `var(--line-height-normal)` (1.5) | Caption, disclaimer, utility text |
| `sm` | `--font-size-sm` | `0.875rem` (14px) | `var(--line-height-normal)` (1.5) | Body text (small), secondary labels |
| `base` | `--font-size-base` | `1rem` (16px) | `var(--line-height-normal)` (1.5) | Body text (standard), input text |
| `lg` | `--font-size-lg` | `1.125rem` (18px) | `var(--line-height-relaxed)` (1.625) | Large descriptions, subtitles |
| `xl` | `--font-size-xl` | `1.25rem` (20px) | `var(--line-height-snug)` (1.375) | Subheadings, section titles |
| `2xl` | `--font-size-2xl` | `1.5rem` (24px) | `var(--line-height-tight)` (1.2) | Sub-page headers |
| `3xl` | `--font-size-3xl` | `1.875rem` (30px) | `var(--line-height-tight)` (1.2) | Large titles, dashboard headers |
| `4xl` | `--font-size-4xl` | `2.25rem` (36px) | `var(--line-height-tight)` (1.2) | Page-level hero headings |
| `5xl` | `--font-size-5xl` | `3rem` (48px) | `var(--line-height-tight)` (1.2) | Promotional hero headings |

### Typography Weights:
- `--font-weight-normal`: `400`
- `--font-weight-medium`: `500`
- `--font-weight-semibold`: `600`
- `--font-weight-bold`: `700`

---

## 4. Responsive & Component Specific Tokens

For fluid layouts (mobile-first designs), specific composite tokens are defined using the `clamp()` formula.

| Component Token | CSS Variable | Formula / Value | Use Case |
|---|---|---|---|
| Title Size | `--auth-title-size` | `clamp(1.5rem, 4vw, 1.875rem)` | Heading size on Auth layout pages (scales dynamically) |
| Card Padding X | `--auth-card-padding-x` | `clamp(1.25rem, 5vw, 2.5rem)` | Outer card horizontal padding |
| Card Padding Y | `--auth-card-padding-y` | `clamp(1.5rem, 4vw, 2.5rem)` | Outer card vertical padding |

---

## 5. Migration Guide

When refactoring older files or writing new components, avoid using ad-hoc classes or raw padding/margin properties. Instead, follow this mapping:

### Spacing Migration:
- **Before**: `p-6` or `padding: 24px;`
- **After**: `padding: var(--spacing-xl);` or use a semantic layout class styled in `index.css`.

### Radius Migration:
- **Before**: `rounded-2xl` or `border-radius: 16px;`
- **After**: `border-radius: var(--radius-xl);`

### Heading Migration:
- **Before**: `<h1 className="text-3xl font-bold mb-4">Title</h1>`
- **After**: `<h1 className="auth-title">Title</h1>` (styled with `--auth-title-size`, `--auth-title-weight`, `--spacing-2xl` margin-bottom).
