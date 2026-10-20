import { describe, expect, it } from 'vitest';
import {
  getOnchainRejectionCopy,
  ONCHAIN_REJECTION_COPY,
  type OnchainRejectionReason,
  type RejectionCopyTemplate,
} from './onchainRejectionCopy';

const reasons = [
  'insufficient-gas',
  'nonce-mismatch',
  'slippage-exceeded',
  'user-rejected',
  'execution-reverted',
  'unknown',
] as const satisfies readonly OnchainRejectionReason[];

describe('ONCHAIN_REJECTION_COPY', () => {
  it('provides one complete template for every rejection reason', () => {
    expect(Object.keys(ONCHAIN_REJECTION_COPY).sort()).toEqual([...reasons].sort());

    for (const reason of reasons) {
      const template: RejectionCopyTemplate = ONCHAIN_REJECTION_COPY[reason];
      expect(template.title).toEqual(expect.any(String));
      expect(template.description).toEqual(expect.any(String));
      expect(template.assuranceNote).toEqual(expect.any(String));
      expect(template.primaryCtaLabel).toEqual(expect.any(String));
      if (template.secondaryCtaLabel !== undefined) {
        expect(template.secondaryCtaLabel).toEqual(expect.any(String));
      }
    }
  });
});

describe('getOnchainRejectionCopy', () => {
  it.each(reasons)('returns the catalog template for %s', (reason) => {
    expect(getOnchainRejectionCopy(reason)).toBe(ONCHAIN_REJECTION_COPY[reason]);
  });

  it.each([undefined, '', '   ', 'unrecognized-reason', 'toString', '__proto__'])(
    'returns the unknown template for invalid input %s',
    (reason) => {
      expect(getOnchainRejectionCopy(reason)).toBe(ONCHAIN_REJECTION_COPY.unknown);
    },
  );
});