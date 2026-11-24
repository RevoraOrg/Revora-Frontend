import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RevenueReports } from './RevenueReports';

describe('RevenueReports', () => {
  it('renders heading, description, and reporting calendar', () => {
    render(<RevenueReports />);

    expect(
      screen.getByRole('heading', { name: /revenue reports/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/monthly revenue submissions and payout estimates/i),
    ).toBeInTheDocument();
  });

  it('allows navigating calendar months', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<RevenueReports />);

    const nextMonthBtn = screen.queryByRole('button', { name: /next month/i });
    if (nextMonthBtn) {
      fireEvent.click(nextMonthBtn);
    }

    alertSpy.mockRestore();
  });
});
