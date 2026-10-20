/**
 * Focused prop and interaction coverage for `ComplianceSeverityLegend`.
 *
 * Complements the legend block in `ComplianceSeverityBadge.test.tsx` (which
 * covers the trigger, popover content, Escape and axe) by pinning the
 * `ComplianceSeverityLegendProps` contract and the dismissal / focus state
 * transitions: aria wiring, click-outside, click-inside, className passthrough
 * and focus restoration.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

import { ComplianceSeverityLegend } from './ComplianceSeverityLegend';

expect.extend(toHaveNoViolations);

const TRIGGER_NAME = /about severity levels/i;

describe('ComplianceSeverityLegend props & state transitions', () => {
  it('applies a custom className to the wrapper without dropping the base class', () => {
    const { container } = render(<ComplianceSeverityLegend className="my-legend" />);
    const wrapper = container.firstElementChild as HTMLElement;

    expect(wrapper).toHaveClass('csb-legend-wrap');
    expect(wrapper).toHaveClass('my-legend');
  });

  it('defaults className to empty and still renders the wrapper class', () => {
    const { container } = render(<ComplianceSeverityLegend />);
    const wrapper = container.firstElementChild as HTMLElement;

    expect(wrapper.className.trim()).toBe('csb-legend-wrap');
  });

  it('toggles aria-expanded and aria-controls as the popover opens and closes', () => {
    render(<ComplianceSeverityLegend />);
    const trigger = screen.getByRole('button', { name: TRIGGER_NAME });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const popover = screen.getByTestId('severity-legend-popover');
    expect(trigger.getAttribute('aria-controls')).toBe(popover.id);

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders the popover with tooltip role and one detailed badge per tier', () => {
    render(<ComplianceSeverityLegend />);
    fireEvent.click(screen.getByRole('button', { name: TRIGGER_NAME }));

    const popover = screen.getByTestId('severity-legend-popover');
    expect(popover).toHaveAttribute('role', 'tooltip');

    const badges = popover.querySelectorAll('[data-testid^="severity-badge"]');
    expect(badges).toHaveLength(3);
    badges.forEach((badge) => {
      expect(badge).toHaveAttribute('data-variant', 'detailed');
    });
  });

  it('closes when a mousedown happens outside the popover and trigger', () => {
    render(<ComplianceSeverityLegend />);
    fireEvent.click(screen.getByRole('button', { name: TRIGGER_NAME }));
    expect(screen.getByTestId('severity-legend-popover')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByTestId('severity-legend-popover')).not.toBeInTheDocument();
  });

  it('stays open when the mousedown originates inside the popover', () => {
    render(<ComplianceSeverityLegend />);
    fireEvent.click(screen.getByRole('button', { name: TRIGGER_NAME }));
    const popover = screen.getByTestId('severity-legend-popover');

    fireEvent.mouseDown(popover);

    expect(screen.getByTestId('severity-legend-popover')).toBeInTheDocument();
  });

  it('returns focus to the trigger after Escape closes the popover', () => {
    render(<ComplianceSeverityLegend />);
    const trigger = screen.getByRole('button', { name: TRIGGER_NAME });

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByTestId('severity-legend-popover')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('ignores Escape and outside clicks once the popover is closed', () => {
    render(<ComplianceSeverityLegend />);
    const trigger = screen.getByRole('button', { name: TRIGGER_NAME });

    // Never opened: stray document events must not throw or open the popover.
    expect(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
      fireEvent.mouseDown(document.body);
    }).not.toThrow();
    expect(screen.queryByTestId('severity-legend-popover')).not.toBeInTheDocument();

    // Opened then closed: the listeners must have been torn down.
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
      fireEvent.mouseDown(document.body);
    }).not.toThrow();
    expect(screen.queryByTestId('severity-legend-popover')).not.toBeInTheDocument();
  });

  it('has no axe violations while the popover is open', async () => {
    const { container } = render(<ComplianceSeverityLegend className="a11y" />);
    fireEvent.click(screen.getByRole('button', { name: TRIGGER_NAME }));

    expect(await axe(container)).toHaveNoViolations();
  });
});
