import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { axe } from 'jest-axe';
import { RevenuePayoutChart, RevenuePayoutDataPoint } from './RevenuePayoutChart';

function mockMatchMedia(matches = false) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

const mockData: RevenuePayoutDataPoint[] = [
  { period: 'Jan', revenue: 100000, payout: 80000 },
  { period: 'Feb', revenue: 120000, payout: 100000 },
];

const mockEmptyData: RevenuePayoutDataPoint[] = [];

describe('RevenuePayoutChart', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('renders correctly with data', () => {
    render(<RevenuePayoutChart data={mockData} />);
    expect(screen.getByTestId('revenue-payout-chart')).toBeInTheDocument();
    expect(screen.getByText('Revenue vs Payouts')).toBeInTheDocument();
  });

  it('renders empty state correctly', () => {
    render(<RevenuePayoutChart data={mockEmptyData} />);
    expect(screen.getByText('No data available.')).toBeInTheDocument();
  });

  it('is accessible (WCAG 2.1 AA)', async () => {
    const { container } = render(<RevenuePayoutChart data={mockData} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('can toggle between chart and table views', () => {
    render(<RevenuePayoutChart data={mockData} __initialView="chart" />);
    
    // Check if SVG is rendered
    expect(screen.getByRole('img', { name: /Revenue vs Payouts dual-axis chart/i })).toBeInTheDocument();
    
    // Toggle to table
    const tableToggle = screen.getByTestId('table-toggle');
    fireEvent.click(tableToggle);
    
    // SVG should not be present, table should be present
    expect(screen.queryByRole('img', { name: /Revenue vs Payouts dual-axis chart/i })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Revenue and Payouts data table/i })).toBeInTheDocument();
  });

  it('handles hover state for tooltips', () => {
    render(<RevenuePayoutChart data={mockData} __initialView="chart" />);

    // Find the first bar
    const firstBar = screen.getByLabelText(/Jan Payout:/i);

    fireEvent.mouseEnter(firstBar);

    // Tooltip should appear containing the period and payout
    expect(screen.getByText('Revenue:')).toBeInTheDocument();
    expect(screen.getByText(/80,000/i)).toBeInTheDocument();

    fireEvent.mouseLeave(firstBar);
    expect(screen.queryByText('Revenue:')).not.toBeInTheDocument();
  });

  it('exports CSV on button click', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<RevenuePayoutChart data={mockData} />);

    const exportBtn = screen.getByTestId('export-csv-btn');
    fireEvent.click(exportBtn);

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(clickSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
    clickSpy.mockRestore();
  });

  it('handles negative or sparse data without crashing', () => {
    const sparseData: RevenuePayoutDataPoint[] = [
      { period: 'Jan', revenue: -5000, payout: 0 },
      { period: 'Feb', revenue: 0, payout: -1000 },
    ];
    render(<RevenuePayoutChart data={sparseData} />);
    expect(screen.getByTestId('revenue-payout-chart')).toBeInTheDocument();
  });
});
