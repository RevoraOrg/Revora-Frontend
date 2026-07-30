# Reduced Motion Guidelines

## Purpose

Ensure the interface respects `prefers-reduced-motion: reduce` while keeping state and error feedback clear.

## What changes when reduced motion is enabled

- `.animate-fade-in` is disabled so content appears without motion.
- `.animate-shake` is disabled for error feedback.
- Hover translate/lift effects on `.glass-card-interactive`, `.btn-primary`, and `.btn-secondary` are removed.

## Error feedback fallback

When shake animations are disabled, form errors must still communicate clearly through:

- red border styling on invalid inputs
- an error icon where present in the UI
- descriptive error text beside or below the field

This ensures users still receive the same feedback without animation.

## Accessibility

- Supports WCAG 2.1 AA
- Addresses Success Criterion 2.3.3 (Animation from Interactions)
- Honors the user's reduced motion preference

## Design rationale

Motion is useful for subtle entry and hover affordances, but users who request reduced motion need a predictable, non-animated experience. We preserve the same visual states and feedback using color, borders, and text rather than relying on movement.
