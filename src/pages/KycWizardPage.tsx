import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import type { DocumentType } from '../components/KycDocumentCapture';
import { KycDocumentCapture } from '../components/KycDocumentCapture';
import { KycSelfieCapture } from '../components/KycSelfieCapture';
import { ExitConfirmationModal } from '../components/designSystem/ExitConfirmationModal';
import { SaveAsDraft } from '../components/designSystem/SaveAsDraft';
import {
  KYC_STEPS,
  KYC_WIZARD_PAGE,
  clampStep,
  clearKycDraft,
  createKycUploader,
  hasDraftProgress,
  loadKycDraft,
  normalizeKycDraft,
  saveKycDraft,
  toFileMeta,
  toUploadMeta,
  EMPTY_KYC_IDENTITY,
  type KycFileMeta,
  type KycIdentityDetails,
  type KycWizardDraft,
} from '../components/KycOnboardingWizard/kycDraft';
import { ResumeRecoveryBanner } from '../components/ResumeRecoveryBanner';
import { UploadQueue } from '../components/UploadQueue';
import { WizardStepper } from '../components/WizardStepper';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { useUploadQueue, type Uploader } from '../hooks/useUploadQueue';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const STEP_HEADINGS = [
  'Tell us about yourself',
  'Capture your identity document',
  'Take a verification selfie',
  'Review and submit',
];

interface RestoredFileSummary {
  document: KycFileMeta | null;
  selfie: KycFileMeta | null;
  uploads: string[];
}

const EMPTY_RESTORED_FILES: RestoredFileSummary = {
  document: null,
  selfie: null,
  uploads: [],
};

export interface KycWizardPageProps {
  uploader?: Uploader;
}

export const KycWizardPage: React.FC<KycWizardPageProps> = ({ uploader }) => {
  useDocumentTitle('KYC Verification');
  const [availableDraft] = useState<KycWizardDraft | null>(() => loadKycDraft());
  const [showResumeBanner, setShowResumeBanner] = useState(availableDraft !== null);
  const [step, setStep] = useState(0);
  const [identity, setIdentity] = useState<KycIdentityDetails>({ ...EMPTY_KYC_IDENTITY });
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [restoredFiles, setRestoredFiles] = useState<RestoredFileSummary>(EMPTY_RESTORED_FILES);
  const [documentUploadMode, setDocumentUploadMode] = useState(false);
  const [selfieUploadMode, setSelfieUploadMode] = useState(false);
  const [attested, setAttested] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fullNameId = useId();
  const dateOfBirthId = useId();
  const nationalityId = useId();
  const documentTypeId = useId();
  const documentNumberId = useId();
  const documentFallbackId = useId();
  const selfieFallbackId = useId();
  const attestationId = useId();

  const resolvedUploader = useMemo(() => uploader ?? createKycUploader(), [uploader]);
  const uploadQueue = useUploadQueue();
  const blocker = useUnsavedChanges(isDirty);
  const blocked = blocker.state === 'blocked' ? blocker : null;

  const buildDraft = useCallback(
    (): KycWizardDraft => ({
      step,
      identity,
      document: documentFile ? toFileMeta(documentFile) : restoredFiles.document,
      selfie: selfieFile ? toFileMeta(selfieFile) : restoredFiles.selfie,
      uploads: uploadQueue.queue.map(toUploadMeta),
      updatedAt: Date.now(),
    }),
    [step, identity, documentFile, selfieFile, restoredFiles, uploadQueue.queue],
  );

  useEffect(() => {
    if (submitted) return;
    const draft = buildDraft();
    if (!hasDraftProgress(draft)) return;
    saveKycDraft(draft);
  }, [buildDraft, submitted]);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const handleResume = useCallback((_page: string, payload: unknown) => {
    const draft = normalizeKycDraft(payload);
    if (!draft) return;
    setStep(clampStep(draft.step));
    setIdentity(draft.identity);
    setDocumentFile(null);
    setSelfieFile(null);
    setRestoredFiles({
      document: draft.document,
      selfie: draft.selfie,
      uploads: draft.uploads.map((upload) => upload.name),
    });
    setAttested(false);
    setDocumentUploadMode(false);
    setSelfieUploadMode(false);
    setIsDirty(false);
    setShowResumeBanner(false);
  }, []);

  const handleSaveDraft = useCallback(async () => {
    saveKycDraft(buildDraft());
    setIsDirty(false);
  }, [buildDraft]);

  const handleSaveAndExit = useCallback(() => {
    saveKycDraft(buildDraft());
    setIsDirty(false);
    blocked?.proceed();
  }, [blocked, buildDraft]);

  const handleDiscardAndExit = useCallback(() => {
    setIsDirty(false);
    blocked?.proceed();
  }, [blocked]);

  const updateIdentity = useCallback(
    <K extends keyof KycIdentityDetails>(field: K, value: KycIdentityDetails[K]) => {
      setIdentity((previous) => ({ ...previous, [field]: value }));
      markDirty();
    },
    [markDirty],
  );

  const goToStep = useCallback(
    (index: number) => {
      setStep(clampStep(index));
      markDirty();
    },
    [markDirty],
  );

  const handleDocumentCapture = useCallback(
    (file: File) => {
      setDocumentFile(file);
      markDirty();
    },
    [markDirty],
  );

  const handleSelfieCapture = useCallback(
    (file: File) => {
      setSelfieFile(file);
      markDirty();
    },
    [markDirty],
  );

  const identityComplete = Boolean(
    identity.fullName.trim() &&
      identity.dateOfBirth &&
      identity.nationality.trim() &&
      identity.documentNumber.trim(),
  );
  const uploadsSettled = uploadQueue.queue.every((item) => item.status === 'success');
  const canContinue =
    step === 0
      ? identityComplete
      : step === 1
        ? documentFile !== null
        : step === 2
          ? selfieFile !== null
          : attested && uploadsSettled;

  const handleSubmit = useCallback(() => {
    clearKycDraft();
    setIsDirty(false);
    setShowResumeBanner(false);
    setSubmitted(true);
  }, []);

  const handleNext = useCallback(() => {
    if (!canContinue) return;
    if (step < KYC_STEPS.length - 1) {
      setStep(step + 1);
      markDirty();
      return;
    }
    handleSubmit();
  }, [canContinue, handleSubmit, markDirty, step]);

  const handleBack = useCallback(() => {
    if (step === 0) return;
    setStep(step - 1);
    markDirty();
  }, [markDirty, step]);

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto p-6 animate-fade-in">
        <div className="glass-card p-8 space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Identity verification submitted</h1>
          <p className="text-muted">
            Your document, selfie and supporting files were submitted for review. A compliance
            reviewer will contact you if anything else is needed.
          </p>
          <Link to="/startup/dashboard" className="btn btn-primary inline-block">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const renderSupportingDocuments = () => (
    <section
      aria-labelledby="kyc-supporting-documents-heading"
      className="mt-6 rounded-lg border border-white/10 p-4"
    >
      <h3 id="kyc-supporting-documents-heading" className="text-lg font-semibold text-main">
        Supporting documents
      </h3>
      <p className="mt-1 text-sm text-muted">
        Add proof of address or other verification files. Failed uploads stay in the queue and can
        be retried from the review step.
      </p>
      {restoredFiles.uploads.length > 0 && uploadQueue.queue.length === 0 && (
        <p role="note" className="mt-2 text-sm text-muted">
          Previously attached (re-add to continue): {restoredFiles.uploads.join(', ')}
        </p>
      )}
      <div className="mt-4">
        <UploadQueue
          queue={uploadQueue.queue}
          onAddFiles={(files) => {
            uploadQueue.addFiles(files);
            markDirty();
          }}
          onRemove={(id) => {
            uploadQueue.removeFile(id);
            markDirty();
          }}
          onRetry={(id, selectedUploader) => {
            uploadQueue.retryFile(id, selectedUploader);
            markDirty();
          }}
          onUploadAll={() => {
            uploadQueue.uploadFiles(resolvedUploader);
            markDirty();
          }}
          onClearComplete={() => {
            uploadQueue.clearComplete();
            markDirty();
          }}
          totalCount={uploadQueue.totalCount}
          successCount={uploadQueue.successCount}
          errorCount={uploadQueue.errorCount}
          uploadingCount={uploadQueue.uploadingCount}
          overallProgress={uploadQueue.overallProgress}
          uploader={resolvedUploader}
          accept="image/*,.pdf"
        />
      </div>
    </section>
  );

  const renderStep = () => {
    if (step === 0) {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={fullNameId} className="block text-sm font-medium text-main mb-1">
              Full legal name
            </label>
            <input
              id={fullNameId}
              type="text"
              autoComplete="name"
              required
              value={identity.fullName}
              onChange={(event) => updateIdentity('fullName', event.target.value)}
              className="w-full rounded-md border border-white/15 bg-transparent px-3 py-2 text-main"
            />
          </div>
          <div>
            <label htmlFor={dateOfBirthId} className="block text-sm font-medium text-main mb-1">
              Date of birth
            </label>
            <input
              id={dateOfBirthId}
              type="date"
              required
              value={identity.dateOfBirth}
              onChange={(event) => updateIdentity('dateOfBirth', event.target.value)}
              className="w-full rounded-md border border-white/15 bg-transparent px-3 py-2 text-main [color-scheme:dark]"
            />
          </div>
          <div>
            <label htmlFor={nationalityId} className="block text-sm font-medium text-main mb-1">
              Nationality
            </label>
            <input
              id={nationalityId}
              type="text"
              autoComplete="country-name"
              required
              value={identity.nationality}
              onChange={(event) => updateIdentity('nationality', event.target.value)}
              className="w-full rounded-md border border-white/15 bg-transparent px-3 py-2 text-main"
            />
          </div>
          <div>
            <label htmlFor={documentTypeId} className="block text-sm font-medium text-main mb-1">
              ID document type
            </label>
            <select
              id={documentTypeId}
              value={identity.documentType}
              onChange={(event) =>
                updateIdentity('documentType', event.target.value as DocumentType)
              }
              className="w-full rounded-md border border-white/15 bg-transparent px-3 py-2 text-main"
            >
              <option value="id_card">National ID card</option>
              <option value="passport">Passport</option>
              <option value="drivers_license">Driver&apos;s license</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={documentNumberId} className="block text-sm font-medium text-main mb-1">
              Document number
            </label>
            <input
              id={documentNumberId}
              type="text"
              required
              value={identity.documentNumber}
              onChange={(event) => updateIdentity('documentNumber', event.target.value)}
              className="w-full rounded-md border border-white/15 bg-transparent px-3 py-2 text-main"
            />
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <>
          {restoredFiles.document && !documentFile && (
            <p role="note" className="mb-4 text-sm text-muted">
              Previously attached: {restoredFiles.document.name}. Image data is not saved in drafts;
              attach the photo again to continue.
            </p>
          )}
          {documentFile && (
            <div role="status" className="mb-4 flex items-center gap-3 text-sm text-main">
              <span>Attached document: {documentFile.name}</span>
              <Button variant="secondary" onClick={() => setDocumentFile(null)}>
                Replace photo
              </Button>
            </div>
          )}
          {documentUploadMode ? (
            <div className="space-y-3">
              <label
                htmlFor={documentFallbackId}
                className="block text-sm font-medium text-main"
              >
                Upload document photo
              </label>
              <input
                id={documentFallbackId}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleDocumentCapture(file);
                }}
                className="block w-full text-sm text-muted"
              />
              <Button variant="secondary" onClick={() => setDocumentUploadMode(false)}>
                Use camera instead
              </Button>
            </div>
          ) : (
            <KycDocumentCapture
              documentType={identity.documentType}
              onCapture={handleDocumentCapture}
              onUseFileUpload={() => setDocumentUploadMode(true)}
            />
          )}
          {renderSupportingDocuments()}
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          {restoredFiles.selfie && !selfieFile && (
            <p role="note" className="mb-4 text-sm text-muted">
              Previously attached: {restoredFiles.selfie.name}. Image data is not saved in drafts;
              attach the selfie again to continue.
            </p>
          )}
          {selfieFile && (
            <div role="status" className="mb-4 flex items-center gap-3 text-sm text-main">
              <span>Attached selfie: {selfieFile.name}</span>
              <Button variant="secondary" onClick={() => setSelfieFile(null)}>
                Replace photo
              </Button>
            </div>
          )}
          {selfieUploadMode ? (
            <div className="space-y-3">
              <label htmlFor={selfieFallbackId} className="block text-sm font-medium text-main">
                Upload selfie photo
              </label>
              <input
                id={selfieFallbackId}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleSelfieCapture(file);
                }}
                className="block w-full text-sm text-muted"
              />
              <Button variant="secondary" onClick={() => setSelfieUploadMode(false)}>
                Use camera instead
              </Button>
            </div>
          ) : (
            <KycSelfieCapture
              onCapture={handleSelfieCapture}
              onUseFileUpload={() => setSelfieUploadMode(true)}
            />
          )}
        </>
      );
    }

    return (
      <>
        <section aria-labelledby="kyc-review-heading">
          <h3 id="kyc-review-heading" className="text-lg font-semibold text-main">
            Verification details
          </h3>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Full legal name</dt>
              <dd className="text-main">{identity.fullName}</dd>
            </div>
            <div>
              <dt className="text-muted">Date of birth</dt>
              <dd className="text-main">{identity.dateOfBirth}</dd>
            </div>
            <div>
              <dt className="text-muted">Nationality</dt>
              <dd className="text-main">{identity.nationality}</dd>
            </div>
            <div>
              <dt className="text-muted">Document</dt>
              <dd className="text-main">
                {identity.documentType}: {identity.documentNumber}
              </dd>
            </div>
            <div>
              <dt className="text-muted">ID photo</dt>
              <dd className="text-main">{documentFile?.name ?? restoredFiles.document?.name ?? 'Not attached'}</dd>
            </div>
            <div>
              <dt className="text-muted">Selfie</dt>
              <dd className="text-main">{selfieFile?.name ?? restoredFiles.selfie?.name ?? 'Not attached'}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => goToStep(0)}>
              Edit identity
            </Button>
            <Button variant="secondary" onClick={() => goToStep(1)}>
              Edit document
            </Button>
            <Button variant="secondary" onClick={() => goToStep(2)}>
              Edit selfie
            </Button>
          </div>
        </section>
        {renderSupportingDocuments()}
        <div className="mt-6">
          <label htmlFor={attestationId} className="flex items-start gap-2 text-sm text-main">
            <input
              id={attestationId}
              type="checkbox"
              checked={attested}
              onChange={(event) => {
                setAttested(event.target.checked);
                markDirty();
              }}
              className="mt-1"
            />
            <span>
              I confirm that the information and images provided are accurate and belong to me.
            </span>
          </label>
        </div>
        {uploadQueue.errorCount > 0 && (
          <p role="alert" className="mt-3 text-sm text-red-400">
            Retry failed uploads before submitting your verification.
          </p>
        )}
      </>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Identity verification</h1>
        <p className="mt-1 text-sm text-muted">
          Complete all four steps to verify your identity for your startup account.
        </p>
      </div>

      {showResumeBanner && (
        <ResumeRecoveryBanner
          activePage={KYC_WIZARD_PAGE}
          onResume={handleResume}
        />
      )}

      <WizardStepper
        steps={KYC_STEPS}
        currentIndex={step}
        ariaLabel="KYC onboarding progress"
      />

      <section aria-labelledby="kyc-step-heading" className="glass-card p-6">
        <h2 id="kyc-step-heading" className="text-xl font-semibold text-main">
          {STEP_HEADINGS[step]}
        </h2>
        <div className="mt-5">{renderStep()}</div>
      </section>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SaveAsDraft onSave={handleSaveDraft} />
        <div className="flex gap-3 sm:justify-end">
          <Button variant="secondary" onClick={handleBack} disabled={step === 0}>
            Back
          </Button>
          <Button variant="primary" onClick={handleNext} disabled={!canContinue}>
            {step === KYC_STEPS.length - 1 ? 'Submit verification' : 'Continue'}
          </Button>
        </div>
      </div>

      <ExitConfirmationModal
        isOpen={blocked !== null}
        onStay={() => blocked?.reset()}
        onDiscard={handleDiscardAndExit}
        onSaveAndExit={handleSaveAndExit}
        description="Your KYC draft is saved locally, but photos need to be attached again after leaving."
      />
    </div>
  );
};

export default KycWizardPage;
