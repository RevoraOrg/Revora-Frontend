import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { AdminCompliancePage } from './AdminCompliancePage';
import { COMPLIANCE_WORKFLOW_STORAGE_KEY } from './complianceWorkflowState';

expect.extend(toHaveNoViolations);

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminCompliancePage />
    </MemoryRouter>,
  );
}

describe('AdminCompliancePage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('submits an appeal and updates the hold, timeline, and persisted workflow', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /appeal identity verification/i }));
    await user.selectOptions(screen.getByLabelText('Reason for appeal'), 'incorrect_info');
    await user.type(screen.getByLabelText('Explanation'), 'The updated identity document is attached.');
    await user.click(screen.getByRole('button', { name: /submit appeal/i }));

    expect(await screen.findByRole('heading', { name: 'Appeal submitted' })).toBeInTheDocument();
    expect(screen.getByText('Identity verification appeal under review')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your appeal progress' })).toBeInTheDocument();
    expect(screen.getByText('We received your appeal.')).toBeInTheDocument();

    await waitFor(() => {
      const saved = JSON.parse(
        localStorage.getItem(COMPLIANCE_WORKFLOW_STORAGE_KEY) ?? 'null',
      );
      expect(saved.appealStatus).toBe('submitted');
      expect(saved.timeline.submissionType).toBe('appeal');
    });
  });

  it('requires all remediation steps, submits a resubmission, and restores progress after remount', async () => {
    const user = userEvent.setup();
    const firstRender = renderPage();
    const submitButton = screen.getByRole('button', { name: /submit corrected information/i });

    expect(submitButton).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /mark complete for upload a clear government id/i }));
    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    firstRender.unmount();
    renderPage();
    expect(screen.getByText('1/3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /mark complete for provide proof of address/i }));
    await user.click(screen.getByRole('button', { name: /mark complete for complete the liveness check/i }));
    const restoredSubmitButton = screen.getByRole('button', {
      name: /submit corrected information/i,
    });
    expect(restoredSubmitButton).toBeEnabled();

    await user.click(restoredSubmitButton);

    expect(screen.getByRole('heading', { name: 'Your KYC resubmission progress' })).toBeInTheDocument();
    expect(screen.getByText('Resubmission 1 is awaiting review.')).toBeInTheDocument();
    expect(screen.queryByTestId('kyc-rejection-panel')).not.toBeInTheDocument();
  });

  it('has no accessibility violations in the initial workflow', async () => {
    const { container } = renderPage();
    expect(await axe(container)).toHaveNoViolations();
  });
});
