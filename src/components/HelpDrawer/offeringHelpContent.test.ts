import { describe, expect, it } from 'vitest';
import { OFFERING_HELP_CONTENT } from './offeringHelpContent';
import type { OfferingStep } from './offeringHelpContent';

const OFFERING_STEPS: OfferingStep[] = [
  'application',
  'kyc-check',
  'compliance-review',
  'listed',
  'funding-open',
];

describe('OFFERING_HELP_CONTENT', () => {
  it('exposes every offering step in registration order', () => {
    expect(Object.keys(OFFERING_HELP_CONTENT)).toEqual(OFFERING_STEPS);
  });

  it('provides complete help content for every step in the progression', () => {
    const contentByStep = OFFERING_STEPS.map((step) => OFFERING_HELP_CONTENT[step]);

    expect(contentByStep.map((content) => content.title)).toEqual([
      'Application',
      'KYC Check',
      'Compliance Review',
      'Listed',
      'Funding Open',
    ]);
    expect(contentByStep.map((content) => content.stepLabel)).toEqual([
      'Step 1 of 5',
      'Step 2 of 5',
      'Step 3 of 5',
      'Step 4 of 5',
      'Step 5 of 5',
    ]);

    for (const content of contentByStep) {
      expect(content.overview.trim()).not.toBe('');
      expect(content.definitions?.length).toBeGreaterThan(0);
      expect(content.links?.length).toBeGreaterThan(0);
      expect(content.example?.trim()).not.toBe('');
    }
  });

  it('provides application-specific definitions, example, and documentation links', () => {
    const application = OFFERING_HELP_CONTENT.application;

    expect(application.definitions?.map(({ term }) => term)).toContain('Revenue Share %');
    expect(application.example).toContain('$500,000');
    expect(application.links?.map(({ href }) => href)).toContain(
      'https://docs.revora.io/offerings/revenue-share',
    );
  });

  it('includes KYC requirements and the document security note', () => {
    const kyc = OFFERING_HELP_CONTENT['kyc-check'];

    expect(kyc.definitions?.map(({ term }) => term)).toContain('Beneficial Owner');
    expect(kyc.links?.map(({ href }) => href)).toContain(
      'https://docs.revora.io/kyc/required-documents',
    );
    expect(kyc.footerNote).toContain('encrypted');
  });

  it('keeps optional footer notes absent when a step has none', () => {
    expect(OFFERING_HELP_CONTENT.listed.footerNote).toBeUndefined();
    expect(OFFERING_HELP_CONTENT['funding-open'].footerNote).toContain('5 business days');
  });

  it.each(['', 'Application', 'unknown-step'])('returns no content for invalid step %j', (step) => {
    expect(OFFERING_HELP_CONTENT[step as OfferingStep]).toBeUndefined();
  });
});