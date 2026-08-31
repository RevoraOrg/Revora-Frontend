import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { FormError } from './FormError';

expect.extend(toHaveNoViolations);

describe('FormError Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Backward Compatibility & Basic Rendering
  // ---------------------------------------------------------------------------
  describe('Backward Compatibility & Basic Rendering', () => {
    it('renders the error message when provided', () => {
      const message = 'Test error message';
      render(<FormError message={message} />);

      const errorElement = screen.getByRole('alert');
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent(message);
      expect(errorElement).toHaveAttribute('aria-live', 'assertive');
      expect(errorElement).toHaveClass('form-error--inline');
    });

    it('does not render when message is null and no children/title are provided', () => {
      const { container } = render(<FormError message={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('does not render when message is empty string and no other content', () => {
      const { container } = render(<FormError message="" />);
      expect(container.firstChild).toBeNull();
    });

    it('applies custom id and className', () => {
      render(<FormError message="Error" id="custom-id" className="custom-class" />);
      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveAttribute('id', 'custom-id');
      expect(errorElement).toHaveClass('custom-class');
    });

    it('is accessible according to role and aria attributes', () => {
      render(<FormError message="Accessible error" />);
      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveAttribute('aria-atomic', 'true');
      expect(errorElement).toHaveAttribute('aria-live', 'assertive');
    });

    it('renders custom children when provided', () => {
      render(
        <FormError message="Error with extra info">
          <div data-testid="custom-child">Additional recovery instructions</div>
        </FormError>
      );
      expect(screen.getByTestId('custom-child')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Scopes (inline, modal, page)
  // ---------------------------------------------------------------------------
  describe('Error Scopes', () => {
    it('renders inline scope with alert role', () => {
      render(
        <FormError
          scope="inline"
          title="Inline Error"
          message="Failed to validate form field."
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('form-error--inline');
      expect(screen.getByText('Inline Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to validate form field.')).toBeInTheDocument();
    });

    it('renders modal scope with alertdialog role, focus trap and close button', async () => {
      const onDismiss = vi.fn();
      render(
        <FormError
          scope="modal"
          title="Critical Transaction Error"
          message="The blockchain transaction could not be completed."
          onDismiss={onDismiss}
        />
      );

      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByText('Critical Transaction Error')).toBeInTheDocument();

      // Close button in header
      const closeBtn = screen.getByLabelText('Close error dialog');
      expect(closeBtn).toBeInTheDocument();
      fireEvent.click(closeBtn);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('closes modal on Escape key press', () => {
      const onDismiss = vi.fn();
      render(
        <FormError
          scope="modal"
          title="Modal Error"
          message="Escape test"
          onDismiss={onDismiss}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('handles Tab and Shift+Tab keyboard navigation within modal', () => {
      const onDismiss = vi.fn();
      const onRetry = vi.fn();
      render(
        <FormError
          scope="modal"
          title="Modal Nav"
          message="Keyboard navigation test"
          onDismiss={onDismiss}
          onRetry={onRetry}
        />
      );

      const closeBtn = screen.getByLabelText('Close error dialog');
      const retryBtn = screen.getByRole('button', { name: /retry/i });
      const dismissBtn = screen.getByRole('button', { name: /cancel/i });

      // Focus first element
      closeBtn.focus();
      expect(document.activeElement).toBe(closeBtn);

      // Shift+Tab from first element wraps to last element (dismissBtn)
      fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(dismissBtn);

      // Shift+Tab from an element other than first element does not wrap
      fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });

      // Tab from last element wraps to first element (closeBtn)
      dismissBtn.focus();
      expect(document.activeElement).toBe(dismissBtn);
      fireEvent.keyDown(window, { key: 'Tab', shiftKey: false });
      expect(document.activeElement).toBe(closeBtn);

      // Tab from an element other than last element
      fireEvent.keyDown(window, { key: 'Tab', shiftKey: false });
    });

    it('closes modal when clicking on backdrop', () => {
      const onDismiss = vi.fn();
      const { container } = render(
        <FormError
          scope="modal"
          title="Backdrop Test"
          message="Click outside"
          onDismiss={onDismiss}
        />
      );

      const backdrop = container.querySelector('.form-error-modal__backdrop');
      expect(backdrop).not.toBeNull();
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(onDismiss).toHaveBeenCalledTimes(1);
      }
    });

    it('renders page scope with centered layout and alert role', () => {
      render(
        <FormError
          scope="page"
          title="Network Offline"
          message="Unable to reach Revora services."
          description="Please check your connection and reload the page."
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('form-error--page');
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Network Offline');
      expect(screen.getByText('Unable to reach Revora services.')).toBeInTheDocument();
      expect(screen.getByText('Please check your connection and reload the page.')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Error Categories & Tailored Defaults
  // ---------------------------------------------------------------------------
  describe('Error Categories & Tailored Presets', () => {
    it('applies network error presets', () => {
      render(<FormError errorType="network" message="Connection timed out" scope="modal" />);
      expect(screen.getByText('Network Connection Error')).toBeInTheDocument();
      expect(screen.getByText(/Unable to connect to the network/i)).toBeInTheDocument();
    });

    it('applies RPC error presets', () => {
      render(<FormError errorType="rpc" message="Horizon endpoint 504" scope="modal" />);
      expect(screen.getByText('Blockchain RPC Error')).toBeInTheDocument();
      expect(screen.getByText(/Unable to reach the blockchain node/i)).toBeInTheDocument();
    });

    it('applies wallet rejection presets', () => {
      render(<FormError errorType="wallet" message="User rejected signing" scope="modal" />);
      expect(screen.getByText('Transaction Rejected')).toBeInTheDocument();
      expect(screen.getByText(/The transaction was rejected or cancelled in your wallet/i)).toBeInTheDocument();
    });

    it('applies server error presets', () => {
      render(<FormError errorType="server" message="Internal Server Error" scope="modal" />);
      expect(screen.getByText('Server Error (5xx)')).toBeInTheDocument();
      expect(screen.getByText(/An unexpected server error occurred/i)).toBeInTheDocument();
    });

    it('applies validation error presets', () => {
      render(<FormError errorType="validation" message="Invalid Stellar address" scope="modal" />);
      expect(screen.getByText('Validation Error')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Recovery Actions (Retry, Dismiss, Contact Support)
  // ---------------------------------------------------------------------------
  describe('Recovery Actions Pattern', () => {
    it('triggers onRetry callback when Retry button is clicked', () => {
      const onRetry = vi.fn();
      render(<FormError message="Temporary glitch" onRetry={onRetry} />);

      const retryBtn = screen.getByRole('button', { name: /^retry$/i });
      expect(retryBtn).toBeInTheDocument();
      fireEvent.click(retryBtn);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('disables Retry button and displays spinner when isRetrying is true', () => {
      render(<FormError message="Processing retry" onRetry={vi.fn()} isRetrying={true} />);

      const retryBtn = screen.getByRole('button', { name: /retrying/i });
      expect(retryBtn).toBeDisabled();
      expect(retryBtn).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByText('Retrying...')).toBeInTheDocument();
    });

    it('shows retry attempt counter when retryCount and maxRetries are provided', () => {
      render(
        <FormError
          message="Failed attempt"
          onRetry={vi.fn()}
          retryCount={2}
          maxRetries={3}
        />
      );

      expect(screen.getByRole('button', { name: /retry \(2\/3\)/i })).toBeInTheDocument();
    });

    it('disables Retry button when retryCount reaches maxRetries', () => {
      render(
        <FormError
          message="Max attempts reached"
          onRetry={vi.fn()}
          retryCount={3}
          maxRetries={3}
        />
      );

      const retryBtn = screen.getByRole('button', { name: /retry \(3\/3\)/i });
      expect(retryBtn).toBeDisabled();
    });

    it('displays countdown and disables Retry when retryCountdown > 0', () => {
      render(
        <FormError
          message="Rate limit hit"
          onRetry={vi.fn()}
          retryCountdown={10}
        />
      );

      const retryBtn = screen.getByRole('button', { name: /retry \(10s\)/i });
      expect(retryBtn).toBeDisabled();
    });

    it('respects disableRetry prop', () => {
      render(
        <FormError
          message="Operation disabled"
          onRetry={vi.fn()}
          disableRetry={true}
        />
      );

      const retryBtn = screen.getByRole('button', { name: /^retry$/i });
      expect(retryBtn).toBeDisabled();
    });

    it('triggers onDismiss or onCancel when dismiss button is clicked', () => {
      const onDismiss = vi.fn();
      render(
        <FormError
          message="Dismissable error"
          onDismiss={onDismiss}
          dismissLabel="Ignore"
        />
      );

      const dismissBtn = screen.getByRole('button', { name: 'Ignore' });
      fireEvent.click(dismissBtn);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('triggers onContactSupport callback when support action is clicked', () => {
      const onContactSupport = vi.fn();
      render(
        <FormError
          message="Unrecoverable error"
          onContactSupport={onContactSupport}
          supportLabel="Get Help"
        />
      );

      const supportBtn = screen.getByRole('button', { name: 'Get Help' });
      fireEvent.click(supportBtn);
      expect(onContactSupport).toHaveBeenCalledTimes(1);
    });

    it('renders mailto link when supportEmail is provided', () => {
      render(
        <FormError
          message="Server crashed"
          errorCode="ERR_500"
          supportEmail="support@revora.finance"
        />
      );

      const mailtoLink = screen.getByRole('link', { name: /contact support/i });
      expect(mailtoLink).toHaveAttribute('href', expect.stringContaining('mailto:support@revora.finance'));
      expect(mailtoLink).toHaveAttribute('href', expect.stringContaining('Error%20Report'));
    });

    it('renders external link when supportUrl is provided', () => {
      render(
        <FormError
          message="RPC outage"
          supportUrl="https://status.revora.finance"
          supportLabel="Check System Status"
        />
      );

      const statusLink = screen.getByRole('link', { name: /check system status/i });
      expect(statusLink).toHaveAttribute('href', 'https://status.revora.finance');
      expect(statusLink).toHaveAttribute('target', '_blank');
      expect(statusLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Diagnostics Accordion & Copying
  // ---------------------------------------------------------------------------
  describe('Technical Diagnostics Accordion', () => {
    it('renders toggle button when technical details are present', () => {
      render(
        <FormError
          message="Execution failed"
          errorCode="TX_FAILED_400"
          txHash="0xabcdef123456"
          timestamp="2026-08-30T03:00:00Z"
          details="Stack trace: Error at dispatch..."
        />
      );

      const toggleBtn = screen.getByRole('button', { name: /show technical details/i });
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    });

    it('expands and collapses technical details on toggle click', async () => {
      render(
        <FormError
          message="Transaction reverted"
          errorCode="ERR_REVERT_9"
          txHash="0x9876543210"
          details={{ reason: 'insufficient_allowance', gasUsed: 42000 }}
        />
      );

      const toggleBtn = screen.getByRole('button', { name: /show technical details/i });

      // Click to expand
      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('ERR_REVERT_9')).toBeInTheDocument();
      expect(screen.getByText('0x9876543210')).toBeInTheDocument();
      expect(screen.getByText(/insufficient_allowance/i)).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('ERR_REVERT_9')).not.toBeInTheDocument();
    });

    it('supports defaultShowDetails={true}', () => {
      render(
        <FormError
          message="Error with pre-opened details"
          errorCode="PRE_OPEN_1"
          defaultShowDetails={true}
        />
      );

      expect(screen.getByText('PRE_OPEN_1')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /hide technical details/i })).toHaveAttribute('aria-expanded', 'true');
    });

    it('copies diagnostic payload to clipboard and displays feedback', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(
        <FormError
          title="On-Chain Failure"
          message="Signature expired"
          errorCode="ERR_SIG_EXPIRED"
          txHash="0xdeadbeef"
          defaultShowDetails={true}
        />
      );

      const copyBtn = screen.getByRole('button', { name: /copy technical error details/i });
      fireEvent.click(copyBtn);

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledTimes(1);
        expect(writeTextMock).toHaveBeenCalledWith(
          expect.stringContaining('ERR_SIG_EXPIRED')
        );
        expect(screen.getByText('Copied to Clipboard')).toBeInTheDocument();
      });
    });

    it('handles Date object for timestamp prop', () => {
      const date = new Date('2026-08-30T00:00:00.000Z');
      render(
        <FormError
          message="Timestamp test"
          timestamp={date}
          defaultShowDetails={true}
        />
      );

      expect(screen.getByText('2026-08-30T00:00:00.000Z')).toBeInTheDocument();
    });

    it('copies diagnostic payload with string details and without title/txHash', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(
        <FormError
          message="Simple message"
          details="Raw string trace detail"
          defaultShowDetails={true}
        />
      );

      const copyBtn = screen.getByRole('button', { name: /copy technical error details/i });
      fireEvent.click(copyBtn);

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith(
          expect.stringContaining('Raw string trace detail')
        );
      });
    });

    it('handles clipboard failure gracefully when writeText throws', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('Permission denied')),
        },
      });

      render(
        <FormError
          message="Clipboard test"
          errorCode="ERR_CLIP"
          defaultShowDetails={true}
        />
      );

      const copyBtn = screen.getByRole('button', { name: /copy technical error details/i });
      fireEvent.click(copyBtn);

      // Should not throw or crash
      expect(screen.getByText('ERR_CLIP')).toBeInTheDocument();
      consoleErrorSpy.mockRestore();
    });

    it('handles string details format', () => {
      render(
        <FormError
          message="String details test"
          details="Raw error string detail"
          defaultShowDetails={true}
        />
      );

      expect(screen.getByText('Raw error string detail')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Modal and Keyboard Edge Cases
  // ---------------------------------------------------------------------------
  describe('Modal & Keyboard Edge Cases', () => {
    it('ignores non-Escape and non-Tab keys in modal', () => {
      const onDismiss = vi.fn();
      render(
        <FormError
          scope="modal"
          message="Key test"
          onDismiss={onDismiss}
        />
      );

      fireEvent.keyDown(window, { key: 'Enter' });
      fireEvent.keyDown(window, { key: 'ArrowDown' });
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('handles showSupport={false} explicitly', () => {
      render(
        <FormError
          message="Support test"
          onContactSupport={vi.fn()}
          showSupport={false}
        />
      );

      expect(screen.queryByRole('button', { name: /contact support/i })).not.toBeInTheDocument();
    });

    it('handles showSupport={true} when no support handler or link is given', () => {
      render(
        <FormError
          message="Support test"
          showSupport={true}
        />
      );

      expect(screen.queryByRole('button', { name: /contact support/i })).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Accessibility Checks (jest-axe)
  // ---------------------------------------------------------------------------
  describe('Accessibility (axe)', () => {
    it('has no axe violations in inline scope', async () => {
      const { container } = render(
        <FormError
          scope="inline"
          title="Inline Error"
          message="Please enter a valid amount."
          onRetry={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations in modal scope', async () => {
      const { container } = render(
        <FormError
          scope="modal"
          title="Transaction Failed"
          message="Wallet rejected the transaction."
          errorCode="4001"
          onRetry={vi.fn()}
          onDismiss={vi.fn()}
          onContactSupport={vi.fn()}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations in page scope', async () => {
      const { container } = render(
        <FormError
          scope="page"
          title="Service Unavailable"
          message="Unable to reach blockchain RPC node."
          description="The network is experiencing high latency."
          errorCode="RPC_504"
          onRetry={vi.fn()}
          onContactSupport={vi.fn()}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations when technical details are expanded', async () => {
      const { container } = render(
        <FormError
          scope="inline"
          title="Network Error"
          message="Request timeout."
          errorCode="ETIMEDOUT"
          txHash="0x12345"
          details="Stack trace error"
          defaultShowDetails={true}
          onRetry={vi.fn()}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
