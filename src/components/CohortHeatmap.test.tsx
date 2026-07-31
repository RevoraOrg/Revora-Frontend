import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { CohortHeatmap, CohortData } from './CohortHeatmap';

expect.extend(toHaveNoViolations);

describe('CohortHeatmap', () => {
  const mockData: CohortData[] = [
    {
      cohortName: '2023 Q1',
      cohortSize: 50,
      payouts: [
        { monthIndex: 0, payoutAmount: 5000, payoutPercentage: 10 },
        { monthIndex: 1, payoutAmount: 10000, payoutPercentage: 20 },
        { monthIndex: 2, payoutAmount: 15000, payoutPercentage: 30 },
      ],
    },
    {
      cohortName: '2023 Q2',
      cohortSize: 30,
      payouts: [
        { monthIndex: 0, payoutAmount: 2000, payoutPercentage: 5 },
      ],
    },
  ];

  it('renders without crashing and displays the title', () => {
    render(<CohortHeatmap data={mockData} maxMonths={3} />);
    expect(screen.getByText('Cohort Payout Heatmap')).toBeInTheDocument();
  });

  it('renders cohort names and sizes', () => {
    render(<CohortHeatmap data={mockData} maxMonths={3} />);
    expect(screen.getByText('2023 Q1')).toBeInTheDocument();
    expect(screen.getByText('(50)')).toBeInTheDocument();
    expect(screen.getByText('2023 Q2')).toBeInTheDocument();
    expect(screen.getByText('(30)')).toBeInTheDocument();
  });

  it('renders correct number of months based on maxMonths', () => {
    render(<CohortHeatmap data={mockData} maxMonths={5} />);
    expect(screen.getByLabelText('Month 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Month 5')).toBeInTheDocument();
  });

  it('renders month column headers with correct labels', () => {
    render(<CohortHeatmap data={mockData} maxMonths={4} />);
    expect(screen.getByLabelText('Month 1')).toHaveTextContent('M1');
    expect(screen.getByLabelText('Month 4')).toHaveTextContent('M4');
    expect(screen.getAllByRole('columnheader')).toHaveLength(5);
  });

  it('renders cohort column header', () => {
    render(<CohortHeatmap data={mockData} maxMonths={3} />);
    expect(screen.getByText('Cohort')).toBeInTheDocument();
  });

  it('renders heatmap cells with correct aria-labels', () => {
    render(<CohortHeatmap data={mockData} maxMonths={3} />);
    const cell = screen.getByLabelText('2023 Q1 Month 1: $5,000 payout, 10.0%');
    expect(cell).toBeInTheDocument();
    expect(cell).toHaveTextContent('10%');

    const emptyCell = screen.getByLabelText('2023 Q2 Month 2: No data');
    expect(emptyCell).toBeInTheDocument();
    expect(emptyCell).toHaveTextContent('-');
  });

  it('applies correct heatmap color class based on percentage', () => {
    render(<CohortHeatmap data={mockData} maxMonths={3} />);
    const cell10 = screen.getByLabelText('2023 Q1 Month 1: $5,000 payout, 10.0%');
    expect(cell10).toHaveClass('heatmap-val-3');

    const cell30 = screen.getByLabelText('2023 Q1 Month 3: $15,000 payout, 30.0%');
    expect(cell30).toHaveClass('heatmap-val-9');
  });

  it('shows percentage text and tooltip on hover cells', () => {
    render(<CohortHeatmap data={mockData} maxMonths={3} />);
    const cell = screen.getByLabelText('2023 Q1 Month 1: $5,000 payout, 10.0%');
    expect(cell).toHaveTextContent('10%');

    const tooltip = cell.querySelector('.heatmap-tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('2023 Q1 - M1');
    expect(tooltip).toHaveTextContent('Payout: $5,000');
    expect(tooltip).toHaveTextContent('Rate: 10.0%');
  });

  it('toggles color-blind safe mode', () => {
    render(<CohortHeatmap data={mockData} maxMonths={3} />);
    const container = screen.getByText('Cohort Payout Heatmap').closest('.cohort-heatmap-container');
    expect(container).not.toHaveClass('heatmap-cb-safe');

    const toggle = screen.getByLabelText('Enable color-blind safe mode and patterns');
    fireEvent.click(toggle);

    expect(container).toHaveClass('heatmap-cb-safe');
  });

  it('handles zero percentages properly', () => {
    const zeroData: CohortData[] = [
      {
        cohortName: '2024',
        cohortSize: 10,
        payouts: [{ monthIndex: 0, payoutAmount: 0, payoutPercentage: 0 }],
      },
    ];
    render(<CohortHeatmap data={zeroData} maxMonths={1} />);
    const cell = screen.getByLabelText('2024 Month 1: $0 payout, 0.0%');
    expect(cell).toBeInTheDocument();
    expect(cell).toHaveClass('heatmap-val-0');
  });

  it('handles sparse cohorts with gaps in month indices', () => {
    const sparseData: CohortData[] = [
      {
        cohortName: 'Sparse Cohort',
        cohortSize: 20,
        payouts: [
          { monthIndex: 0, payoutAmount: 1000, payoutPercentage: 5 },
          { monthIndex: 3, payoutAmount: 4000, payoutPercentage: 20 },
          { monthIndex: 5, payoutAmount: 6000, payoutPercentage: 30 },
        ],
      },
    ];
    render(<CohortHeatmap data={sparseData} maxMonths={6} />);
    expect(screen.getByLabelText('Sparse Cohort Month 1: $1,000 payout, 5.0%')).toBeInTheDocument();
    expect(screen.getByLabelText('Sparse Cohort Month 4: $4,000 payout, 20.0%')).toBeInTheDocument();
    expect(screen.getByLabelText('Sparse Cohort Month 6: $6,000 payout, 30.0%')).toBeInTheDocument();

    expect(screen.getByLabelText('Sparse Cohort Month 2: No data')).toBeInTheDocument();
    expect(screen.getByLabelText('Sparse Cohort Month 5: No data')).toBeInTheDocument();
  });

  it('handles empty data array gracefully', () => {
    render(<CohortHeatmap data={[]} maxMonths={3} />);
    expect(screen.getByText('Cohort Payout Heatmap')).toBeInTheDocument();
    expect(screen.getByLabelText('Month 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Month 3')).toBeInTheDocument();
  });

  it('uses default maxMonths of 12 when not specified', () => {
    render(<CohortHeatmap data={mockData} />);
    expect(screen.getByLabelText('Month 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Month 12')).toBeInTheDocument();
  });

  it('renders the legend with Less and More labels', () => {
    const { container } = render(<CohortHeatmap data={mockData} maxMonths={3} />);
    const legend = container.querySelector('.heatmap-legend');
    expect(legend).toHaveTextContent('Less');
    expect(legend).toHaveTextContent('More');
  });

  it('renders 10 legend boxes', () => {
    render(<CohortHeatmap data={mockData} maxMonths={3} />);
    const legendBoxes = document.querySelectorAll('.legend-box');
    expect(legendBoxes).toHaveLength(10);
  });

  it('renders scroll container with proper ARIA label', () => {
    render(<CohortHeatmap data={mockData} maxMonths={3} />);
    const scrollContainer = screen.getByLabelText('Heatmap scroll container');
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer).toHaveClass('cohort-heatmap-scroll');
  });

  it('renders grid with proper ARIA role', () => {
    render(<CohortHeatmap data={mockData} maxMonths={3} />);
    const grid = screen.getByRole('grid');
    expect(grid).toHaveAttribute('aria-label', 'Cohort payout heatmap');
  });

  it('renders cells as buttons for keyboard accessibility', () => {
    render(<CohortHeatmap data={mockData} maxMonths={3} />);
    const cell = screen.getByLabelText('2023 Q1 Month 1: $5,000 payout, 10.0%');
    expect(cell.tagName).toBe('BUTTON');
    expect(cell).toHaveAttribute('role', 'gridcell');
  });

  it('renders empty cells as div elements', () => {
    render(<CohortHeatmap data={mockData} maxMonths={3} />);
    const emptyCell = screen.getByLabelText('2023 Q2 Month 2: No data');
    expect(emptyCell.tagName).toBe('DIV');
    expect(emptyCell).toHaveClass('heatmap-cell-empty');
  });

  it('applies color-blind safe palette classes when toggled', () => {
    render(<CohortHeatmap data={mockData} maxMonths={3} />);
    const toggle = screen.getByLabelText('Enable color-blind safe mode and patterns');
    fireEvent.click(toggle);

    const cells = document.querySelectorAll('[role="gridcell"]');
    cells.forEach((cell) => {
      const classList = Array.from(cell.classList);
      const hasHeatmapClass = classList.some((c) => c.startsWith('heatmap-val-'));
      if (hasHeatmapClass) {
        expect(cell.closest('.heatmap-cb-safe')).not.toBeNull();
      }
    });
  });

  it('handles all payouts with same percentage without division by zero', () => {
    const flatData: CohortData[] = [
      {
        cohortName: 'Flat',
        cohortSize: 10,
        payouts: [
          { monthIndex: 0, payoutAmount: 100, payoutPercentage: 50 },
          { monthIndex: 1, payoutAmount: 100, payoutPercentage: 50 },
        ],
      },
    ];
    render(<CohortHeatmap data={flatData} maxMonths={2} />);
    expect(screen.getByLabelText('Flat Month 1: $100 payout, 50.0%')).toBeInTheDocument();
    expect(screen.getByLabelText('Flat Month 2: $100 payout, 50.0%')).toBeInTheDocument();
  });

  it('has no accessibility violations with default data', async () => {
    const { container } = render(<CohortHeatmap data={mockData} maxMonths={3} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with sparse data', async () => {
    const sparseData: CohortData[] = [
      {
        cohortName: 'Sparse',
        cohortSize: 10,
        payouts: [{ monthIndex: 0, payoutAmount: 100, payoutPercentage: 10 }],
      },
    ];
    const { container } = render(<CohortHeatmap data={sparseData} maxMonths={6} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in color-blind safe mode', async () => {
    const { container } = render(<CohortHeatmap data={mockData} maxMonths={3} />);
    const toggle = screen.getByLabelText('Enable color-blind safe mode and patterns');
    fireEvent.click(toggle);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
