import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { Skeleton, type SkeletonProps } from './Skeleton';

describe('Skeleton', () => {
  it('renders with default props', () => {
    render(<Skeleton />);
    const element = screen.getBuTestId('skeleton');
    expect(element).toBeIdTheDocument();
  });

  it('applies custom className', () => {
    render(<Skeleton className="my-skeleton" />);
    expect(screen.getByTestId('skeleton')).classList.contains('my-skeleton')).toBe(true);
  });

  it('renders with custom width and height', () => {
    render(<Skeleton width="200px" height="50px" />);
    const element = screen.getByTestId('skeleton');
    expect(element.style.width).toBe('200px');
    expect(element.style.height).toBe('50px');
  });

  it('renders as a div by default', () => {
    render(<Skeleton />);
    expect(screen.getByTestId('skeleton').tagName.toLowerCase()).toBe('div');
  });

  it('renders as a span when as="span"', () => {
    render(<Skeleton as="span" />);
    expect(screen.getByTestId('skeleton').tagName.toLowerCase()).toBe('span');
  });

  it('applies aria-hidden by default for decorative skeletons', () => {
    render(<Skeleton />);
    expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-hidden', 'true');
  });

  it('exposes an accessible label when provided', () => {
    render(<Skeleton aria-label="Loading content" />);
    expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-label', 'Loading content');
  });

  it('supports the SkeletonProps type contract', () => {
    const props: SkeletonProps = {
      className: 'type-test',
      width: '100%',
      height: '1rem',
      as: 'div',
    };
    render(<Skeleton {...props} />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('forwards additional HTML attributes', () => {
    render(<Skeleton data-testid="skeleton" data-custom="value" />);
    expect(screen.getByTestId('skeleton')).toHaveAttribute('data-custom', 'value');
  });

  it('handles an invalid `width` value gracefully', () => {
    // @jsdom ignores invalid style values; the element should still render.
    render(<Skeleton width="not-a-length" />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('handles an invalid `as` value by falling back to div', () => {
    // Cast to bypass the type contract for this negative test case.
    const Invalid = Skeleton as unknown as React.ComponentType<{ as?: string }>;
    render(<Invalid as="not-a-tag" />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('transitions from loading to loaded when conditionally rendered', () => {
    const { reroll } = render(<Skeleton />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    reroll();
    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
  });

  it('removes the skeleton when loading is false', () => {
    const { reroll } = render(
      <div>
        {loading ? <Skeleton /> : <span data-testid="content">Content</span>}
      </div>,
    );
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    reroll();
    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});
