import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RedemptionBanner } from './RedemptionBanner';

describe('RedemptionBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 2);

  test('renders upcoming variant correctly', () => {
    render(
      <RedemptionBanner 
        windowId="test-1" 
        status="upcoming" 
        endDate={futureDate} 
      />
    );
    expect(screen.getByText('📅 Upcoming')).toBeInTheDocument();
    expect(screen.getByRole('region')).toHaveClass('redemption-banner--upcoming');
  });

  test('renders active variant correctly', () => {
    render(
      <RedemptionBanner 
        windowId="test-2" 
        status="active" 
        endDate={futureDate} 
        eligibilityHint="Eligible"
      />
    );
    expect(screen.getByText('🟢 Active')).toBeInTheDocument();
    expect(screen.getByText('(Eligible)')).toBeInTheDocument();
    expect(screen.getByRole('region')).toHaveClass('redemption-banner--active');
  });

  test('renders closing-soon variant correctly', () => {
    render(
      <RedemptionBanner 
        windowId="test-3" 
        status="closing-soon" 
        endDate={futureDate} 
      />
    );
    expect(screen.getByText('⏳ Closing Soon')).toBeInTheDocument();
    expect(screen.getByRole('region')).toHaveClass('redemption-banner--closing-soon');
  });

  test('dismisses banner and persists to localStorage', () => {
    render(
      <RedemptionBanner 
        windowId="test-4" 
        status="active" 
        endDate={futureDate} 
      />
    );
    
    const closeBtn = screen.getByLabelText('Dismiss banner');
    fireEvent.click(closeBtn);
    
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(localStorage.getItem('redemption_banner_dismissed_test-4')).toBe('true');
  });

  test('does not render if previously dismissed', () => {
    localStorage.setItem('redemption_banner_dismissed_test-5', 'true');
    render(
      <RedemptionBanner 
        windowId="test-5" 
        status="active" 
        endDate={futureDate} 
      />
    );
    
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
  
  test('handles cta click', () => {
    const handleCta = jest.fn();
    render(
      <RedemptionBanner 
        windowId="test-6" 
        status="active" 
        endDate={futureDate}
        onCtaClick={handleCta}
      />
    );
    
    fireEvent.click(screen.getByText('Redeem Now'));
    expect(handleCta).toHaveBeenCalled();
  });
});
