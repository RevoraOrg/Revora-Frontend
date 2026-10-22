import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import {
  ComplianceSeverityBadge,
  ComplianceSeverityLegend,
} from './index';

describe('ComplianceSeverityBadge public entry point', () => {
  it('exports the badge component through the public index', () => {
    expect(ComplianceSeverityBadge).toBeDefined();
    expect(typeof ComplianceSeverityBadge).toBe('function');
  });

  it('exports the legend component through the public index', () => {
    expect(ComplianceSeverityLegend).toBeDefined();
    expect(typeof ComplianceSeverityLegend).toBe('function');
  });

  it('preserves all supported severity states through the public API', () => {
    const tiers = ['advisory', 'warning', 'blocking'] as const;

    tiers.forEach((severity) => {
      const { container, unmount } = render(
        <ComplianceSeverityBadge severity={severity} />,
      );

      expect(
        container.querySelector(`[data-severity="${severity}"]`),
      ).toBeInTheDocument();

      unmount();
    });
  });

  it('fails deterministically for an invalid severity value', () => {
    expect(() =>
      render(
        <ComplianceSeverityBadge
          severity={'invalid' as 'advisory'}
        />,
      ),
    ).toThrow();
  });

  it('transitions the legend from closed to open and back to closed', () => {
    render(<ComplianceSeverityLegend />);

    const trigger = screen.getByRole('button', {
      name: /about severity levels/i,
    });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByTestId('severity-legend-popover'),
    ).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByTestId('severity-legend-popover'),
    ).toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByTestId('severity-legend-popover'),
    ).not.toBeInTheDocument();
  });

  it('closes the open legend when Escape is pressed', () => {
    render(<ComplianceSeverityLegend />);

    const trigger = screen.getByRole('button', {
      name: /about severity levels/i,
    });

    fireEvent.click(trigger);

    expect(
      screen.getByTestId('severity-legend-popover'),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(
      screen.queryByTestId('severity-legend-popover'),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });
});