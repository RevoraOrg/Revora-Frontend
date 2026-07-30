import { render, screen, fireEvent } from '@testing-library/react';
import { RedemptionPostCloseBanner } from './RedemptionPostCloseBanner';
import { vi, describe, it, expect } from 'vitest';

describe('RedemptionPostCloseBanner', () => {
  const mockProps = {
    totalRedeemed: 100000,
    userShare: 5000,
    reportLink: '/report',
    onDismiss: vi.fn(),
    closedAt: new Date().toISOString(),
  };

  it('renders correctly with participation', () => {
    render(<RedemptionPostCloseBanner {...mockProps} />);
    expect(screen.getByText(/Redemption Window Closed/i)).toBeDefined();
    expect(screen.getByText(/Total Redeemed: \$100,000/i)).toBeDefined();
    expect(screen.getByText(/Your Share: \$5,000/i)).toBeDefined();
    expect(screen.getByText(/View Detailed Report/i)).toBeDefined();
  });

  it('renders correctly without participation', () => {
    render(<RedemptionPostCloseBanner {...mockProps} userShare={0} />);
    expect(screen.getByText(/You did not participate in this window/i)).toBeDefined();
    expect(screen.queryByText(/Total Redeemed/i)).toBeNull();
  });

  it('calls onDismiss when dismissed', () => {
    render(<RedemptionPostCloseBanner {...mockProps} />);
    const dismissBtn = screen.getByLabelText(/Dismiss banner/i);
    fireEvent.click(dismissBtn);
    expect(mockProps.onDismiss).toHaveBeenCalled();
  });

  it('auto-dismisses after 30 days', () => {
    const thirtyOneDaysAgo = new Date();
    thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
    
    render(<RedemptionPostCloseBanner {...mockProps} closedAt={thirtyOneDaysAgo.toISOString()} />);
    expect(screen.queryByText(/Redemption Window Closed/i)).toBeNull();
    expect(mockProps.onDismiss).toHaveBeenCalled();
  });
});
