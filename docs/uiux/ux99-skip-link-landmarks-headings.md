# UX99: Skip Link + Landmark / Heading Structure

This document defines the baseline accessibility structure for Revora pages (WCAG 2.1 AA).

## Landmarks (required)

### Skip link
- Every route must expose a keyboard-accessible skip link as the first focusable element.
- The skip link must point to the main landmark target:
  - Link: `href="#main-content"`
  - Target: `<main id="main-content" tabIndex={-1}>…</main>`

Why `tabIndex={-1}`: it allows the main landmark to receive programmatic focus (so keyboard users land in the content after activating the skip link).

### Main landmark
- Exactly **one** `<main>` landmark per route.
- The `main` landmark is owned by the shared app layout and wraps the routed page content.

### Navigation landmark
- Add a `<nav aria-label="…">` landmark when the UI presents navigation (primary site navigation, sub-navigation, or a meaningful set of page navigation links).
- Do not create empty or purely decorative `<nav>` landmarks.

## Heading structure (required)

### One `h1` per route
- Each route must have exactly one `h1` that names the page.
- Reusable components must not assume they “own” the page `h1` unless they are the page-level layout (e.g. `AuthLayout` on auth routes).

### No skipped heading levels
- Sections inside a page start at `h2`.
- Subsections within a section use `h3`, then `h4`, etc.
- Avoid jumping from `h1` directly to `h3` (add a section `h2` label first).

### Visually-hidden headings
- If a section needs a heading for structure but not visual presentation, use `className="sr-only"` on the heading.

## Code patterns

### App layout (landmarks + skip link)
```tsx
<a href="#main-content" className="skip-link">Skip to main content</a>
<main id="main-content" tabIndex={-1}>
  <Outlet />
</main>
```

### Section with structural heading
```tsx
<section aria-labelledby="offerings-heading">
  <h2 id="offerings-heading" className="sr-only">Offerings</h2>
  …
</section>
```

