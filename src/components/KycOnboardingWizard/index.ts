export {
  KYC_DRAFT_EXPIRATION_DAYS,
  KYC_STEPS,
  KYC_WIZARD_PAGE,
  EMPTY_KYC_IDENTITY,
  clampStep,
  clearKycDraft,
  createKycUploader,
  hasDraftProgress,
  loadKycDraft,
  normalizeKycDraft,
  saveKycDraft,
  toFileMeta,
  toUploadMeta,
} from './kycDraft';
export type {
  KycFileMeta,
  KycIdentityDetails,
  KycUploadMeta,
  KycUploaderOptions,
  KycWizardDraft,
} from './kycDraft';
