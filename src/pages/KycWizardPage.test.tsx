import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Link, createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EMPTY_KYC_IDENTITY,
  KYC_WIZARD_PAGE,
  loadKycDraft,
  saveKycDraft,
  type KycWizardDraft,
} from '../components/KycOnboardingWizard/kycDraft';
import type { Uploader } from '../hooks/useUploadQueue';
import { KycWizardPage } from './KycWizardPage';

vi.mock('../components/KycDocumentCapture', () => ({
  KycDocumentCapture: ({
    onCapture,
    onUseFileUpload,
  }: {
    onCapture?: (file: File) => void;
    onUseFileUpload?: () => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onCapture?.(new File(['PRIVATE_IMAGE_BYTES'], 'id-card.png', { type: 'image/png' }))
        }
      >
        Mock document captured
      </button>
      <button type="button" onClick={onUseFileUpload}>
        Mock document upload
      </button>
    </div>
  ),
}));

vi.mock('../components/KycSelfieCapture', () => ({
  KycSelfieCapture: ({
    onCapture,
    onUseFileUpload,
  }: {
    onCapture?: (file: File) => void;
    onUseFileUpload?: () => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() => onCapture?.(new File(['SELFIE_BYTES'], 'selfie.png', { type: 'image/png' }))}
      >
        Mock selfie captured
      </button>
      <button type="button" onClick={onUseFileUpload}>
        Mock selfie upload
      </button>
    </div>
  ),
}));

function makeDraft(overrides: Partial<KycWizardDraft> = {}): KycWizardDraft {
  return {
    step: 0,
    identity: { ...EMPTY_KYC_IDENTITY },
    document: null,
    selfie: null,
    uploads: [],
    updatedAt: Date.now(),
    ...overrides,
  };
}

function renderWizard(options: { uploader?: Uploader; draft?: KycWizardDraft } = {}) {
  if (options.draft) {
    saveKycDraft(options.draft);
  }

  const router = createMemoryRouter(
    [
      {
        path: KYC_WIZARD_PAGE,
        element: (
          <>
            <Link to="/startup/dashboard">Leave wizard</Link>
            <KycWizardPage uploader={options.uploader} />
          </>
        ),
      },
      {
        path: '/startup/dashboard',
        element: <div>Startup dashboard destination</div>,
      },
    ],
    { initialEntries: [KYC_WIZARD_PAGE] },
  );

  return { user: userEvent.setup(), ...render(<RouterProvider router={router} />) };
}

async function fillIdentity(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/full legal name/i), 'Ada Lovelace');
  fireEvent.change(screen.getByLabelText(/date of birth/i), {
    target: { value: '1815-12-10' },
  });
  await user.type(screen.getByLabelText(/nationality/i), 'British');
  await user.selectOptions(screen.getByLabelText(/id document type/i), 'passport');
  await user.type(screen.getByLabelText(/document number/i), 'P1234567');
}

function expectStep(container: HTMLElement, number: number, label: string) {
  const status = container.querySelector('.wizard-stepper__status');
  expect(status?.textContent).toContain(`Step ${number} of 4: ${label}`);
}

describe('KycWizardPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders the identity step with an accessible wizard shell', async () => {
    const { container } = renderWizard();

    expect(screen.getByRole('heading', { level: 1, name: /identity verification/i })).toBeInTheDocument();
    expect(screen.getByTestId('wizard-stepper')).toBeInTheDocument();
    expectStep(container, 1, 'Identity details');
    expect(screen.getByLabelText(/full legal name/i)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('requires identity details before advancing', async () => {
    const { container, user } = renderWizard();
    const next = screen.getByRole('button', { name: /^continue$/i });

    expect(next).toBeDisabled();

    await fillIdentity(user);

    expect(next).toBeEnabled();
    await user.click(next);

    expectStep(container, 2, 'Document capture');
  });

  it('autosaves serializable draft metadata without image bytes', async () => {
    const { user } = renderWizard();

    await fillIdentity(user);
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await user.click(screen.getByRole('button', { name: /mock document captured/i }));

    await waitFor(() => {
      expect(loadKycDraft()?.identity.fullName).toBe('Ada Lovelace');
    });

    const raw = localStorage.getItem(`recovery_state_${KYC_WIZARD_PAGE}`);
    expect(raw).toContain('id-card.png');
    expect(raw).not.toContain('PRIVATE_IMAGE_BYTES');
  });

  it('offers resume on return and restores the saved step and metadata', async () => {
    const { container, user } = renderWizard({
      draft: makeDraft({
        step: 2,
        identity: {
          ...EMPTY_KYC_IDENTITY,
          fullName: 'Grace Hopper',
          dateOfBirth: '1906-12-09',
          nationality: 'American',
          documentType: 'passport',
          documentNumber: 'P9876543',
        },
        document: { name: 'id.png', size: 24, type: 'image/png' },
      }),
    });

    expect(screen.getByTestId('resume-recovery-banner')).toBeInTheDocument();
    expectStep(container, 1, 'Identity details');

    await user.click(screen.getByRole('button', { name: /resume session/i }));

    expectStep(container, 3, 'Selfie');

    await user.click(screen.getByRole('button', { name: /^back$/i }));

    expectStep(container, 2, 'Document capture');
    expect(screen.getByText(/previously attached: id\.png/i)).toBeInTheDocument();
  });

  it('allows retrying failed uploads from the review step before submitting', async () => {
    const mockUploader = vi.fn();
    mockUploader.mockRejectedValueOnce(new Error('Network unavailable'));
    mockUploader.mockResolvedValue(undefined);

    const { container, user } = renderWizard({ uploader: mockUploader as unknown as Uploader });

    await fillIdentity(user);
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await user.click(screen.getByRole('button', { name: /mock document captured/i }));
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await user.click(screen.getByRole('button', { name: /mock selfie captured/i }));
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    expectStep(container, 4, 'Review');

    const submit = screen.getByRole('button', { name: /submit verification/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByTestId('file-input'), {
      target: { files: [new File(['proof'], 'proof.png', { type: 'image/png' })] },
    });
    await user.click(screen.getByTestId('upload-all-btn'));

    expect(await screen.findByText(/network unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/retry failed uploads before submitting/i)).toBeInTheDocument();
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /retry upload for proof\.png/i }));

    await waitFor(() => {
      expect(screen.queryByText(/network unavailable/i)).not.toBeInTheDocument();
    });

    await user.click(
      screen.getByLabelText(/i confirm that the information and images provided are accurate/i),
    );

    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(
      await screen.findByRole('heading', { name: /identity verification submitted/i }),
    ).toBeInTheDocument();
    expect(mockUploader).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(`recovery_state_${KYC_WIZARD_PAGE}`)).toBeNull();
  });

  it('blocks navigation away while the wizard has unsaved changes', async () => {
    const { user } = renderWizard();

    await user.type(screen.getByLabelText(/full legal name/i), 'Ada');

    await user.click(screen.getByRole('link', { name: /leave wizard/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /stay on page/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { level: 1, name: /identity verification/i })).toBeInTheDocument();
  });
});
