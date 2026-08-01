import React from 'react';
import { render, screen } from '@testing-library/react';
import ActivityDateGroup, { formatDateLabel } from './ActivityDateGroup';

describe('ActivityDateGroup', () => {
  it('renders "Today" for current date', () => {
    const today = new Date().toISOString().split('T')[0];
    render(<ActivityDateGroup date={today} />);
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('renders "Yesterday" for yesterday', () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
    render(<ActivityDateGroup date={yesterday} />);
    expect(screen.getByText('Yesterday')).toBeTruthy();
  });

  it('renders weekday name for dates within 7 days', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString().split('T')[0];
    render(<ActivityDateGroup date={threeDaysAgo} />);
    const element = screen.getByRole('separator');
    const label = element.textContent || '';
    // Should be a weekday name, not a numeric date
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    expect(weekdays.some(d => label.includes(d))).toBe(true);
  });

  it('renders "Last Week" for dates 7-13 days ago', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 86_400_000).toISOString().split('T')[0];
    render(<ActivityDateGroup date={eightDaysAgo} />);
    expect(screen.getByText('Last Week')).toBeTruthy();
  });

  it('renders "This Month" for dates 14-29 days ago', () => {
    const twentyDaysAgo = new Date(Date.now() - 20 * 86_400_000).toISOString().split('T')[0];
    render(<ActivityDateGroup date={twentyDaysAgo} />);
    expect(screen.getByText('This Month')).toBeTruthy();
  });

  it('renders full date for older dates', () => {
    render(<ActivityDateGroup date="2025-01-15" />);
    const element = screen.getByRole('separator');
    expect(element.getAttribute('aria-label')).toContain('2025');
  });

  it('has sticky positioning', () => {
    render(<ActivityDateGroup date="2026-08-01" />);
    const element = document.querySelector('.activity-date-group');
    expect(element).toBeTruthy();
    const styles = getComputedStyle(element!);
    expect(styles.position).toBe('sticky');
  });

  it('has data-date attribute for CSS targeting', () => {
    render(<ActivityDateGroup date="2026-08-01" />);
    const element = document.querySelector('[data-date="2026-08-01"]');
    expect(element).toBeTruthy();
  });
});

describe('formatDateLabel', () => {
  it('returns "Today" for current date', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(formatDateLabel(today)).toBe('Today');
  });

  it('returns "Yesterday" for yesterday', () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
    expect(formatDateLabel(yesterday)).toBe('Yesterday');
  });
});
