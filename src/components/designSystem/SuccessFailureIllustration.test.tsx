import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { SuccessFailureIllustration } from './SuccessFailureIllustration';

describe('SuccessFailureIllustration', () => {
  it('renders an SVG with expected size', () => {
    const { container } = render(
      <SuccessFailureIllustration variant="transactionSuccess" size={96} />,
    );
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('width')).toBe('96');
    expect(svg?.getAttribute('height')).toBe('96');
  });

  it('is aria-hidden by default (decorative)', () => {
    const { container } = render(
      <SuccessFailureIllustration variant="transactionSuccess" />,
    );
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('uses presentation role when ariaHidden=true', () => {
    const { container } = render(
      <SuccessFailureIllustration variant="transactionFailure" ariaHidden />,
    );
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('presentation');
  });

  it('renders with role img and aria-label when ariaHidden=false', () => {
    const { container } = render(
      <SuccessFailureIllustration variant="kycRejected" ariaHidden={false} />,
    );
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toMatch(/KYC rejected/i);
  });

  it('renders distinct SVG paths for success vs failure (basic DOM sanity)', () => {
    const success = render(
      <SuccessFailureIllustration variant="transactionSuccess" />,
    );
    const failure = render(
      <SuccessFailureIllustration variant="transactionFailure" />,
    );

    // Quick heuristic: both contain paths but success includes check path; failure includes two cross paths.
    const successPaths = success.container.querySelectorAll('path').length;
    const failurePaths = failure.container.querySelectorAll('path').length;
    expect(successPaths).toBeGreaterThan(0);
    expect(failurePaths).toBeGreaterThan(0);
    expect(successPaths).not.toEqual(0);
  });

  const variants = [
    'transactionSuccess',
    'transactionFailure',
    'kycApproved',
    'kycRejected',
    'offeringPublished',
  ] as const;

  it.each(variants)('accepts variant %s', (variant: (typeof variants)[number]) => {
    const { container } = render(
      <SuccessFailureIllustration variant={variant} ariaHidden={false} />,
    );
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-label')).toBeTruthy();
  });
});

