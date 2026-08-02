import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TokenSupplyBlock } from './TokenSupplyBlock';

describe('TokenSupplyBlock', () => {
  it('renders the initial state correctly', () => {
    render(<TokenSupplyBlock />);
    expect(screen.getByText('Token Supply & Allocation')).toBeInTheDocument();
    expect(screen.getByLabelText(/Total Supply/i)).toHaveValue(10000000);
    expect(screen.getByLabelText(/Treasury Allocation/i)).toHaveValue(2000000);
    expect(screen.getByLabelText(/Public Offering/i)).toHaveValue(5000000);
  });

  it('updates visualization when inputs change', () => {
    render(<TokenSupplyBlock initialTotalSupply={100} initialTreasuryAllocation={20} initialPublicOffering={30} />);

    expect(screen.getAllByText(/20.0% \(20\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/30.0% \(30\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/50.0% \(50\)/i).length).toBeGreaterThan(0);

    const treasuryInput = screen.getByLabelText(/Treasury Allocation/i);
    fireEvent.change(treasuryInput, { target: { value: '40' } });

    expect(screen.getAllByText(/40.0% \(40\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/30.0% \(30\)/i).length).toBeGreaterThan(0);
  });

  it('displays an error message when over-allocated', () => {
    render(<TokenSupplyBlock initialTotalSupply={100} initialTreasuryAllocation={80} initialPublicOffering={30} />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/Allocation exceeds total supply by 10 tokens/i);
  });

  it('displays empty state when total supply is 0 or empty', () => {
    render(<TokenSupplyBlock initialTotalSupply={0} initialTreasuryAllocation={0} initialPublicOffering={0} />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /token allocation distribution/i })).not.toBeInTheDocument();
  });

  it('handles invalid inputs gracefully', () => {
    render(<TokenSupplyBlock initialTotalSupply={100} initialTreasuryAllocation={20} initialPublicOffering={30} />);

    const treasuryInput = screen.getByLabelText(/Treasury Allocation/i);
    fireEvent.change(treasuryInput, { target: { value: '' } });

    expect(screen.getByText(/0.0% \(0\)/i)).toBeInTheDocument();
  });
});
