/**
 * Integration tests for PayoutSchedule + status pills (Issue #221 / #442).
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';

import { PayoutSchedule, DEMO_PAYOUTS } from './PayoutSchedule';
import { PAYOUT_STATUS_ORDER } from '../components/PayoutStatusPill';

expect.extend(toHaveNoViolations);

function renderPage(props: React.ComponentProps<typeof PayoutSchedule> = {}) {
  return render(
    <MemoryRouter>
      <PayoutSchedule {...props} />
    </MemoryRouter>
  );
}

describe('PayoutSchedule', () => {
  it('renders the page heading', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: /payout schedule/i, level: 1 }),
    ).toBeInTheDocument();
  });

  it('renders the schedule table by default', () => {
    renderPage();
    expect(screen.getByTestId('payout-schedule-table')).toBeInTheDocument();
  });

  it('renders a compact pill for each payout row in the table', () => {
    renderPage();
    // Pills in the table rows (one per payout) + pills in the legend
    const allPills = screen.getAllByTestId('payout-status-pill');
    expect(allPills.length).toBeGreaterThanOrEqual(DEMO_PAYOUTS.length);
  });

  it('documents the canonical status set in the legend (full variant)', () => {
    renderPage();
    const legend = screen.getByTestId('payout-status-legend');
    const pills = within(legend).getAllByTestId('payout-status-pill');
    expect(pills.map((p) => p.getAttribute('data-status'))).toEqual(PAYOUT_STATUS_ORDER);
    expect(pills.every((p) => p.getAttribute('data-variant') === 'full')).toBe(true);
  });

  it('renders a row for each payout in table view', () => {
    renderPage();
    DEMO_PAYOUTS.forEach((p) => {
      expect(screen.getByTestId(`payout-row-${p.id}`)).toBeInTheDocument();
    });
  });

  it('shows the empty state when requested', () => {
    renderPage({ empty: true });
    expect(screen.getByText(/no payouts scheduled/i)).toBeInTheDocument();
    expect(screen.queryByTestId('payout-schedule-table')).not.toBeInTheDocument();
  });

  it('shows the subscribe button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument();
  });

  it('opens the CalendarExportDialog when Subscribe is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /subscribe/i }));
    // Dialog should appear (CalendarExportDialog renders a dialog/modal)
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders a payout with only required fields (no issuer defaults to recipient)', () => {
    renderPage({
      payouts: [
        {
          id: 'only',
          issuer: 'Test Issuer',
          recipient: '0xtest',
          amount: 'USDC 1',
          scheduledFor: '2026-08-01',
          status: 'failed',
        },
      ],
    });
    expect(screen.getByTestId('payout-row-only')).toBeInTheDocument();
  });

  it('shows the payout status pill in a table row', () => {
    renderPage({
      payouts: [
        {
          id: 'pill-test',
          issuer: 'Test Issuer',
          recipient: '0xabc',
          amount: 'USDC 100',
          scheduledFor: '2026-08-01',
          status: 'failed',
        },
      ],
    });
    const row = screen.getByTestId('payout-row-pill-test');
    expect(within(row).getByTestId('payout-status-pill')).toBeInTheDocument();
  });

  it('has no axe-detectable accessibility violations', async () => {
    const { container } = renderPage();
    expect(await axe(container)).toHaveNoViolations();
  });
});
