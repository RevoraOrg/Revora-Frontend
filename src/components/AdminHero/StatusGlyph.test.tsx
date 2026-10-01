import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatusGlyph } from './StatusGlyph';
import type { HealthStatus } from './StatusGlyph';

describe('StatusGlyph', () => {
  const statuses: { status: HealthStatus; expectedLabel: string; expectedClass: string }[] = [
    { status: 'healthy', expectedLabel: 'Status: Healthy', expectedClass: 'sg-glyph--healthy' },
    { status: 'degraded', expectedLabel: 'Status: Degraded', expectedClass: 'sg-glyph--degraded' },
    { status: 'outage', expectedLabel: 'Status: Outage', expectedClass: 'sg-glyph--outage' },
    { status: 'unknown', expectedLabel: 'Status: Unknown', expectedClass: 'sg-glyph--unknown' },
  ];

  it.each(statuses)('renders correctly for status: $status', ({ status, expectedLabel, expectedClass }) => {
    render(<StatusGlyph status={status} />);
    
    const element = screen.getByRole('img');
    
    expect(element).toBeInTheDocument();
    expect(element).toHaveAttribute('aria-label', expectedLabel);
    expect(element).toHaveAttribute('data-status', status);
    expect(element).toHaveClass('sg-glyph');
    expect(element).toHaveClass(expectedClass);
  });

  it('applies custom className', () => {
    render(<StatusGlyph status="healthy" className="custom-class" />);
    
    const element = screen.getByRole('img');
    expect(element).toHaveClass('custom-class');
  });

  it('renders with expected accessibility attributes', () => {
    render(<StatusGlyph status="healthy" />);
    
    const wrapper = screen.getByRole('img');
    expect(wrapper).toHaveAttribute('aria-label', 'Status: Healthy');
    
    // The icon inside should have aria-hidden="true"
    // We can't query by role because it's hidden, but we can query by container
    const icon = wrapper.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('handles invalid status gracefully (if coerced)', () => {
    // In TypeScript this is an error, but in JS it might happen.
    // However, the component will crash since STATUS_CONFIG[status] will be undefined.
    // The instructions say "representative invalid inputs". We should test if it throws or how it behaves.
    // If it throws, we assert it throws.
    
    // Actually, looking at the code:
    // const config = STATUS_CONFIG[status];
    // const Icon = config.icon;
    // This throws an error if config is undefined. Let's write a test for this boundary behavior.
    
    render(<StatusGlyph status={'invalid' as HealthStatus} />);
    
    const element = screen.getByRole('img');
    
    // It should fallback to unknown state
    expect(element).toHaveAttribute('aria-label', 'Status: Unknown');
    // Note: the component sets data-status to the raw status prop value even if invalid, 
    // but the shape/glyph will be unknown. We could test that shapeClass is unknown.
    expect(element).toHaveClass('sg-glyph--unknown');
  });
});
