import { render, screen, fireEvent } from '@testing-library/react';
import { PayoutDrillDownPanel, type PayoutDetail } from './index';

const payout: PayoutDetail = {
  id: 'PO-757',
  payoutNumber: 'Payout #PO-757',
  date: 'Jul 25, 2026',
  time: '12:00:00 UTC',
  status: 'completed',
  grossAmount: 1000,
  netAmount: 975,
  protocolFeeUsd: 25,
  currency: 'USD',
  offeringName: 'RevenueShare Offering',
  offeringId: 'OFF-757',
  gasFeeUsd: 5,
  gasFeeEth: 0.001,
  gasPriceGwei: 20,
  estimatedGasUsd: 6,
  estimatedGasPriceGwei: 22,
  executionNetwork: 'Ethereum Mainnet',
  blockNumber: 123456,
  contractAddress: '0x1234567890123456789012345678901234567890',
  transactionHash: '0xabcdef',
  recipientsCount: 0,
  recipients: [],
  retries: [],
};

const defaultProps = {
  isOpen: true,
  payoutId: 'PO-757',
  payoutData: payout,
  onClose: vi.fn(),
};

describe('PayoutDrillDownPanel public module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('exports the panel and renders its successful overview state', () => {
    render(<PayoutDrillDownPanel {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Payout #PO-757')).toBeInTheDocument();
    expect(screen.getByTestId('payout-tabpanel-overview')).toBeInTheDocument();
  });

  it('handles the closed and missing-data boundary without rendering content', () => {
    const { rerender } = render(
      <PayoutDrillDownPanel {...defaultProps} isOpen={false} />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(<PayoutDrillDownPanel {...defaultProps} payoutData={null} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Payout #PO-757')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('transitions from loading to the loaded state', () => {
    const { rerender } = render(
      <PayoutDrillDownPanel {...defaultProps} loading payoutData={null} />,
    );

    expect(screen.getByTestId('payout-panel-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('payout-tabpanel-overview')).not.toBeInTheDocument();

    rerender(<PayoutDrillDownPanel {...defaultProps} />);

    expect(screen.queryByTestId('payout-panel-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('payout-tabpanel-overview')).toBeInTheDocument();
  });

  it('renders an error state and exposes retry behavior', () => {
    const onRetryLoad = vi.fn();
    render(
      <PayoutDrillDownPanel
        {...defaultProps}
        error="Unable to load payout"
        payoutData={null}
        onRetryLoad={onRetryLoad}
      />,
    );

    expect(screen.getByTestId('payout-panel-error')).toHaveTextContent(
      'Unable to load payout',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry Loading' }));
    expect(onRetryLoad).toHaveBeenCalledTimes(1);
  });

  it('gives loading precedence when loading and error are both present', () => {
    render(
      <PayoutDrillDownPanel
        {...defaultProps}
        loading
        error="Stale error"
        payoutData={null}
      />,
    );

    expect(screen.getByTestId('payout-panel-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('payout-panel-error')).not.toBeInTheDocument();
  });
});
