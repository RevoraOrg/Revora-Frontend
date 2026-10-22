import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AlertRow } from './AlertRow';
import { Alert, AlertSeverity, AlertStatus } from './types';

expect.extend(toHaveNoViolations);

describe('AlertRow', () => {
  const baseAlert: Alert = {
    id: 'alert-1',
    issuerId: 'iss-1',
    issuerName: 'Acme Corp',
    severity: 'high',
    status: 'active',
    title: 'Missed Revenue Payment',
    description: 'Quarterly payment overdue by 3 days.',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
  };

  const defaultProps = {
    alert: baseAlert,
    isSelected: false,
    onSelect: vi.fn(),
    onAction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering and Content', () => {
    it('renders basic alert details correctly', () => {
      render(<AlertRow {...defaultProps} />);

      expect(screen.getByText('Missed Revenue Payment')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText(/Quarterly payment overdue by 3 days\./)).toBeInTheDocument();
      expect(screen.getByLabelText('Select alert: Missed Revenue Payment')).toBeInTheDocument();
    });

    it('renders correct status badges for each status', () => {
      const statuses: AlertStatus[] = ['active', 'acknowledged', 'assigned', 'resolved'];

      statuses.forEach((status) => {
        const { unmount } = render(
          <AlertRow {...defaultProps} alert={{ ...baseAlert, status }} />
        );
        const expectedLabel = status.charAt(0).toUpperCase() + status.slice(1);
        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
        unmount();
      });
    });

    it('renders correct severity icons and labels for each severity level', () => {
      const severities: { severity: AlertSeverity; ariaLabel: string }[] = [
        { severity: 'critical', ariaLabel: 'Critical Severity' },
        { severity: 'high', ariaLabel: 'High Severity' },
        { severity: 'medium', ariaLabel: 'Medium Severity' },
        { severity: 'low', ariaLabel: 'Low Severity' },
      ];

      severities.forEach(({ severity, ariaLabel }) => {
        const { unmount } = render(
          <AlertRow {...defaultProps} alert={{ ...baseAlert, severity }} />
        );
        expect(screen.getByLabelText(ariaLabel)).toBeInTheDocument();
        unmount();
      });
    });

    it('renders fallback icon for unknown severity', () => {
      const { container } = render(
        <AlertRow
          {...defaultProps}
          alert={{ ...baseAlert, severity: 'unknown' as unknown as AlertSeverity }}
        />
      );
      // Fallback renders Info icon with slate-500
      expect(container.querySelector('.text-slate-500')).toBeInTheDocument();
    });

    it('formats time ago correctly across second, minute, hour, and day boundaries', () => {
      const now = new Date('2026-09-28T12:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);

      const testCases = [
        { past: new Date(now.getTime() - 1000 * 30), expected: '30s ago' },
        { past: new Date(now.getTime() - 1000 * 60 * 15), expected: '15m ago' },
        { past: new Date(now.getTime() - 1000 * 60 * 60 * 4), expected: '4h ago' },
        { past: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3), expected: '3d ago' },
      ];

      testCases.forEach(({ past, expected }) => {
        const { unmount } = render(
          <AlertRow {...defaultProps} alert={{ ...baseAlert, createdAt: past.toISOString() }} />
        );
        expect(screen.getByText(expected)).toBeInTheDocument();
        unmount();
      });
    });

    it('applies selected background style when isSelected is true', () => {
      const { container, rerender } = render(<AlertRow {...defaultProps} isSelected={false} />);
      expect(container.firstElementChild).toHaveClass('hover:bg-white/5');
      expect(container.firstElementChild).not.toHaveClass('bg-primary/5');

      rerender(<AlertRow {...defaultProps} isSelected={true} />);
      expect(container.firstElementChild).toHaveClass('bg-primary/5');
      const checkbox = screen.getByLabelText('Select alert: Missed Revenue Payment') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('User Interactions and State Transitions', () => {
    it('triggers onSelect when checkbox is changed', () => {
      const onSelect = vi.fn();
      render(<AlertRow {...defaultProps} onSelect={onSelect} />);

      const checkbox = screen.getByLabelText('Select alert: Missed Revenue Payment');
      fireEvent.click(checkbox);

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith('alert-1');
    });

    it('renders quick action buttons when alert is not resolved', () => {
      const onAction = vi.fn();
      render(<AlertRow {...defaultProps} onAction={onAction} />);

      const ackBtn = screen.getByTitle('Acknowledge');
      const assignBtn = screen.getByTitle('Assign');
      const resolveBtn = screen.getByTitle('Resolve');

      expect(ackBtn).toBeInTheDocument();
      expect(assignBtn).toBeInTheDocument();
      expect(resolveBtn).toBeInTheDocument();

      fireEvent.click(ackBtn);
      expect(onAction).toHaveBeenCalledWith('alert-1', 'acknowledge');

      fireEvent.click(assignBtn);
      expect(onAction).toHaveBeenCalledWith('alert-1', 'assign');

      fireEvent.click(resolveBtn);
      expect(onAction).toHaveBeenCalledWith('alert-1', 'resolve');
    });

    it('does not render quick triage buttons when alert status is resolved', () => {
      render(<AlertRow {...defaultProps} alert={{ ...baseAlert, status: 'resolved' }} />);

      expect(screen.queryByTitle('Acknowledge')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Assign')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Resolve')).not.toBeInTheDocument();
    });

    it('opens and closes mobile menu and handles action clicks', () => {
      const onAction = vi.fn();
      const { container } = render(<AlertRow {...defaultProps} onAction={onAction} />);

      const mobileMenuContainer = container.querySelector('.sm\\:hidden.relative') as HTMLElement;
      expect(mobileMenuContainer).toBeInTheDocument();

      // Ensure dropdown items are not rendered initially
      expect(within(mobileMenuContainer).queryByText('Acknowledge')).not.toBeInTheDocument();
      expect(within(mobileMenuContainer).queryByText('Assign')).not.toBeInTheDocument();
      expect(within(mobileMenuContainer).queryByText('Resolve')).not.toBeInTheDocument();

      const menuToggle = within(mobileMenuContainer).getByLabelText('Alert actions');

      // Open mobile menu
      fireEvent.click(menuToggle);
      const ackMenuItem = within(mobileMenuContainer).getByText('Acknowledge');
      const assignMenuItem = within(mobileMenuContainer).getByText('Assign');
      const resolveMenuItem = within(mobileMenuContainer).getByText('Resolve');

      expect(ackMenuItem).toBeInTheDocument();
      expect(assignMenuItem).toBeInTheDocument();
      expect(resolveMenuItem).toBeInTheDocument();

      // Click acknowledge in menu
      fireEvent.click(ackMenuItem);
      expect(onAction).toHaveBeenCalledWith('alert-1', 'acknowledge');
      // Menu should be closed after clicking action
      expect(within(mobileMenuContainer).queryByText('Acknowledge')).not.toBeInTheDocument();

      // Open and click assign
      fireEvent.click(menuToggle);
      fireEvent.click(within(mobileMenuContainer).getByText('Assign'));
      expect(onAction).toHaveBeenCalledWith('alert-1', 'assign');

      // Open and click resolve
      fireEvent.click(menuToggle);
      fireEvent.click(within(mobileMenuContainer).getByText('Resolve'));
      expect(onAction).toHaveBeenCalledWith('alert-1', 'resolve');

      // Toggle menu open and closed
      fireEvent.click(menuToggle);
      expect(within(mobileMenuContainer).getByText('Resolve')).toBeInTheDocument();
      fireEvent.click(menuToggle);
      expect(within(mobileMenuContainer).queryByText('Resolve')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has no axe accessibility violations in default state', async () => {
      const { container } = render(<AlertRow {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe accessibility violations with mobile menu open', async () => {
      const { container } = render(<AlertRow {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Alert actions'));
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
