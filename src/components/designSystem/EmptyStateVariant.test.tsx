import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { EmptyState, type EmptyStateVariant } from './EmptyState';

/**
 * Regression coverage for the `default: return null` fallback branch of the
 * illustration glyph switch in `EmptyState.tsx`.
 *
 * `EmptyStateIllustration` renders the decorative SVG badge for every value in
 * the `EmptyStateVariant` union, and falls back to *no glyph at all* when it is
 * handed a variant it does not recognise. That fallback is intentional (the
 * badge is purely decorative and must never throw), but it was untested, so a
 * newly added variant that is missing a `case` would silently render an empty
 * badge.
 *
 * These tests pin both halves of the contract:
 *   - an unrecognised variant renders the decorative shell with no glyph, and
 *     leaves the accessible content and actions intact;
 *   - every variant declared in the union renders an actual glyph, so a missing
 *     `case` fails loudly here.
 */

const noop = () => {};

const baseProps = {
  variant: 'distribution-dashboard' as EmptyStateVariant,
  title: 'No distributions yet',
  description: 'When revenue is reported, distributions will appear here.',
  primaryAction: { label: 'Report Revenue', onClick: noop },
};

/** Every variant declared by the `EmptyStateVariant` union. */
const declaredVariants: EmptyStateVariant[] = [
  'distribution-dashboard',
  'payout-schedule',
  'ledger',
  'audit-trail',
  'notifications',
  'revenue-reports',
  'governance-proposals',
  'governance-votes',
  'governance-delegates',
];

/**
 * The decorative badge group is the first `<g>` child of the `<svg>`; the
 * variant glyph (when present) is its last child. Counting drawing primitives
 * inside it distinguishes "a glyph was rendered" from "the fallback was taken".
 */
function glyphPrimitiveCount(container: HTMLElement): number {
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('illustration svg was not rendered');
  const outerGroup = Array.from(svg.children).find(
    (child) => child.tagName.toLowerCase() === 'g',
  );
  if (!outerGroup) throw new Error('illustration badge group was not rendered');
  return outerGroup.querySelectorAll('rect, path, line, polyline, text, ellipse').length;
}

describe('EmptyState unrecognised-variant fallback', () => {
  it('renders the decorative shell without a glyph for an unrecognised variant', () => {
    const { container } = render(
      <EmptyState {...baseProps} variant={'unsupported-future-variant' as EmptyStateVariant} />,
    );

    // The decorative shell is still there and still decorative.
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('role', 'presentation');
    expect(svg).toHaveAttribute('focusable', 'false');

    // ...but the glyph switch took the `default` branch, so no glyph was drawn.
    expect(glyphPrimitiveCount(container)).toBe(0);
  });

  it('keeps the accessible content and actions when the glyph falls back', () => {
    render(<EmptyState {...baseProps} variant={'unsupported-future-variant' as EmptyStateVariant} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('No distributions yet')).toBeInTheDocument();
    expect(screen.getByText(/When revenue is reported/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Report Revenue/i })).toBeInTheDocument();
  });

  it('does not throw when the fallback renders repeatedly', () => {
    const { container, rerender } = render(
      <EmptyState {...baseProps} variant={'unsupported-future-variant' as EmptyStateVariant} />,
    );
    rerender(<EmptyState {...baseProps} variant={'unsupported-future-variant' as EmptyStateVariant} />);
    rerender(<EmptyState {...baseProps} variant={'unsupported-future-variant' as EmptyStateVariant} />);

    expect(glyphPrimitiveCount(container)).toBe(0);
  });

  it('falls back for an unrecognised variant in monochrome mode too', () => {
    const { container } = render(
      <EmptyState
        {...baseProps}
        variant={'unsupported-future-variant' as EmptyStateVariant}
        isMonochrome
      />,
    );

    expect(glyphPrimitiveCount(container)).toBe(0);
    expect(container.querySelector('svg')!.innerHTML).toContain('#000000');
  });
});

describe('EmptyState declared variants', () => {
  it.each(declaredVariants)('renders a glyph for the %s variant', (variant) => {
    const { container } = render(<EmptyState {...baseProps} variant={variant} />);

    // A glyph must be drawn, i.e. the `default` fallback must not be taken.
    expect(glyphPrimitiveCount(container)).toBeGreaterThan(0);
  });

  it.each(declaredVariants)('keeps the accessible status region for the %s variant', (variant) => {
    render(<EmptyState {...baseProps} variant={variant} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('uses the error colour strategy when severity is error', () => {
    const { container: defaultContainer } = render(<EmptyState {...baseProps} variant="ledger" />);
    expect(defaultContainer.querySelector('svg')!.innerHTML).toContain('var(--primary)');

    const { container: errorContainer } = render(
      <EmptyState {...baseProps} variant="ledger" severity="error" />,
    );
    expect(errorContainer.querySelector('svg')!.innerHTML).toContain('var(--error)');
  });
});
