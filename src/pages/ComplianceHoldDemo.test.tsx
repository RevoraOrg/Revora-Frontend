import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import ComplianceHoldDemo from './ComplianceHoldDemo';

expect.extend(toHaveNoViolations);

describe('ComplianceHoldDemo', () => {
  it('renders the demo heading, compliance hold banner, severity legend, checklist, and guidelines', () => {
    render(<ComplianceHoldDemo />);

    expect(
      screen.getByRole('heading', { name: /compliance hold components demo/i }),
    ).toBeInTheDocument();

    // Banner region and initial holds
    expect(screen.getByRole('region', { name: /compliance holds/i })).toBeInTheDocument();
    expect(screen.getByText('2 holds active')).toBeInTheDocument();
    expect(screen.getByText('Identity verification required')).toBeInTheDocument();
    expect(screen.getByText('Additional information needed')).toBeInTheDocument();

    // Severity badges & legend trigger
    expect(screen.getByTestId('severity-badge-blocking')).toBeInTheDocument();
    expect(screen.getByTestId('severity-badge-warning')).toBeInTheDocument();
    const legendTrigger = screen.getByRole('button', { name: /about severity levels/i });
    expect(legendTrigger).toBeInTheDocument();
    expect(legendTrigger).toHaveAttribute('aria-expanded', 'false');

    // Open severity legend
    fireEvent.click(legendTrigger);
    expect(legendTrigger).toHaveAttribute('aria-expanded', 'true');

    // Remediation checklist region and initial progress
    expect(screen.getByRole('region', { name: /remediation checklist/i })).toBeInTheDocument();
    expect(screen.getByText('Upload government ID')).toBeInTheDocument();
    expect(screen.getByText('Take a selfie')).toBeInTheDocument();
    expect(screen.getByText('Provide tax ID')).toBeInTheDocument();
    expect(screen.getByText('0/3')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

    // Usage guidelines
    expect(screen.getByRole('heading', { name: /usage guidelines/i })).toBeInTheDocument();
  });

  it('dismisses a dismissible hold while keeping non-dismissible holds', () => {
    render(<ComplianceHoldDemo />);

    const dismissButton = screen.getByRole('button', {
      name: /dismiss additional information needed/i,
    });
    fireEvent.click(dismissButton);

    expect(screen.queryByText('Additional information needed')).not.toBeInTheDocument();
    expect(screen.getByText('Identity verification required')).toBeInTheDocument();
    expect(screen.queryByText('2 holds active')).not.toBeInTheDocument();
  });

  it('completes remediation checklist steps and updates progress', () => {
    render(<ComplianceHoldDemo />);

    fireEvent.click(screen.getByRole('button', { name: /upload now for upload government id/i }));
    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    expect(
      screen.queryByRole('button', { name: /upload now for upload government id/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /start verification for take a selfie/i }));
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');

    fireEvent.click(screen.getByRole('button', { name: /enter now for provide tax id/i }));
    expect(screen.getByText('3/3')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
  });

  it('resets holds and remediation steps when Reset Demo is clicked', () => {
    render(<ComplianceHoldDemo />);

    // Dismiss a hold and complete a step
    fireEvent.click(
      screen.getByRole('button', { name: /dismiss additional information needed/i }),
    );
    fireEvent.click(screen.getByRole('button', { name: /upload now for upload government id/i }));

    expect(screen.queryByText('Additional information needed')).not.toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();

    // Reset demo
    fireEvent.click(screen.getByRole('button', { name: /reset demo/i }));

    expect(screen.getByText('Additional information needed')).toBeInTheDocument();
    expect(screen.getByText('2 holds active')).toBeInTheDocument();
    expect(screen.getByText('0/3')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /upload now for upload government id/i }),
    ).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ComplianceHoldDemo />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
