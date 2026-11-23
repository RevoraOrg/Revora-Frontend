import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { StartupDashboard } from './StartupDashboard';

describe('StartupDashboard', () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <StartupDashboard />
      </MemoryRouter>,
    );

  it('renders the demo scenario switcher, hero, calendar, and navigation links', () => {
    renderPage();

    expect(
      screen.getByRole('region', { name: /demo scenario switcher/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /revenue reporting calendar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /^submit revenue report$/i }),
    ).toHaveAttribute('href', '/startup/report-revenue');
    expect(
      screen.getByRole('link', { name: /back to home/i }),
    ).toHaveAttribute('href', '/');
  });

  it('switches demo scenarios and updates aria-pressed state', () => {
    renderPage();

    const dueSoonBtn = screen.getByRole('button', {
      name: /report due in 4 days/i,
    });
    const loadingBtn = screen.getByRole('button', {
      name: /all kpis loading/i,
    });

    expect(dueSoonBtn).toHaveAttribute('aria-pressed', 'true');
    expect(loadingBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(loadingBtn);

    expect(loadingBtn).toHaveAttribute('aria-pressed', 'true');
    expect(dueSoonBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(
      screen.getByRole('button', { name: /empty metrics \(new issuer\)/i }),
    );
    expect(
      screen.getByRole('button', { name: /empty metrics \(new issuer\)/i }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('handles calendar month navigation without errors', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderPage();

    const nextMonthBtn = screen.queryByRole('button', { name: /next month/i });
    if (nextMonthBtn) {
      fireEvent.click(nextMonthBtn);
    }

    alertSpy.mockRestore();
  });
});
