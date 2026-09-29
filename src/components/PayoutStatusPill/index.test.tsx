import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import {
  PayoutStatusPill,
  PAYOUT_STATUS_ORDER,
  PAYOUT_STATUS_TAXONOMY,
  getPayoutStatusDefinition,
  isPayoutStatus,
  normalizePayoutStatus,
} from './index';

describe('PayoutStatusPill public exports', () => {
  it('exposes the component and complete canonical status taxonomy', () => {
    expect(PayoutStatusPill).toBeTypeOf('function');
    expect(PAYOUT_STATUS_ORDER).toEqual(Object.keys(PAYOUT_STATUS_TAXONOMY));

    for (const status of PAYOUT_STATUS_ORDER) {
      expect(getPayoutStatusDefinition(status)).toMatchObject({
        status,
        label: expect.any(String),
        description: expect.any(String),
        tone: expect.any(String),
        icon: expect.any(String),
      });
    }
  });

  it('recognizes canonical values and normalizes aliases and invalid input', () => {
    expect(isPayoutStatus('confirmed')).toBe(true);
    expect(isPayoutStatus('CONFIRMED')).toBe(false);
    expect(isPayoutStatus('unknown')).toBe(false);

    expect(normalizePayoutStatus('  IN_PROGRESS ')).toBe('scheduled');
    expect(normalizePayoutStatus('cancelled')).toBe('canceled');
    expect(normalizePayoutStatus('')).toBe('scheduled');
    expect(normalizePayoutStatus(null)).toBe('scheduled');
    expect(normalizePayoutStatus(undefined)).toBe('scheduled');
  });

  it('renders status changes and falls back for an unsupported status', () => {
    const { rerender } = render(<PayoutStatusPill status="preparing" showTooltip={false} />);
    expect(screen.getByTestId('payout-status-pill')).toHaveAttribute('data-status', 'preparing');
    expect(screen.getByText('Preparing')).toBeInTheDocument();

    rerender(<PayoutStatusPill status="confirmed" showTooltip={false} />);
    expect(screen.getByTestId('payout-status-pill')).toHaveAttribute('data-status', 'confirmed');
    expect(screen.getByText('Confirmed')).toBeInTheDocument();

    rerender(<PayoutStatusPill status="not-a-real-status" showTooltip={false} />);
    expect(screen.getByTestId('payout-status-pill')).toHaveAttribute('data-status', 'scheduled');
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });
});