import type { UploadStatus, Uploader } from '../../hooks/useUploadQueue';
import type { DocumentType } from '../KycDocumentCapture';
import type { WizardStep } from '../WizardStepper';
import { readRecoveryFrame, saveRecoveryFrame } from '../ResumeRecoveryBanner';

export const KYC_WIZARD_PAGE = '/startup/kyc';
export const KYC_DRAFT_EXPIRATION_DAYS = 7;

export const KYC_STEPS: WizardStep[] = [
  { id: 'kyc-step-identity', label: 'Identity details' },
  { id: 'kyc-step-document', label: 'Document capture' },
  { id: 'kyc-step-selfie', label: 'Selfie' },
  { id: 'kyc-step-review', label: 'Review' },
];

export const EMPTY_KYC_IDENTITY: KycIdentityDetails = {
  fullName: '',
  dateOfBirth: '',
  nationality: '',
  documentType: 'id_card',
  documentNumber: '',
};

export interface KycIdentityDetails {
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  documentType: DocumentType;
  documentNumber: string;
}

export interface KycFileMeta {
  name: string;
  size: number;
  type: string;
}

export interface KycUploadMeta extends KycFileMeta {
  status: UploadStatus;
  progress: number;
  errorMessage?: string;
}

export interface KycWizardDraft {
  step: number;
  identity: KycIdentityDetails;
  document: KycFileMeta | null;
  selfie: KycFileMeta | null;
  uploads: KycUploadMeta[];
  updatedAt: number;
}

const DOCUMENT_TYPES: DocumentType[] = ['passport', 'id_card', 'drivers_license'];
const UPLOAD_STATUSES: UploadStatus[] = ['pending', 'uploading', 'success', 'error'];
const STORAGE_KEY = `recovery_state_${KYC_WIZARD_PAGE}`;

export function clampStep(step: number): number {
  if (!Number.isFinite(step)) return 0;
  return Math.max(0, Math.min(KYC_STEPS.length - 1, Math.floor(step)));
}

export function toFileMeta(file: File): KycFileMeta {
  return { name: file.name, size: file.size, type: file.type };
}

export function toUploadMeta(upload: {
  file: File;
  status: UploadStatus;
  progress: number;
  errorMessage?: string;
}): KycUploadMeta {
  return {
    ...toFileMeta(upload.file),
    status: upload.status,
    progress: upload.progress,
    ...(upload.errorMessage === undefined ? {} : { errorMessage: upload.errorMessage }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseFileMeta(value: unknown): KycFileMeta | null {
  if (!isRecord(value) || typeof value.name !== 'string' || typeof value.size !== 'number') {
    return null;
  }
  return {
    name: value.name,
    size: value.size,
    type: typeof value.type === 'string' ? value.type : '',
  };
}

function parseUploadMeta(value: unknown): KycUploadMeta | null {
  const file = parseFileMeta(value);
  if (!file || !isRecord(value)) return null;
  const status = UPLOAD_STATUSES.includes(value.status as UploadStatus)
    ? (value.status as UploadStatus)
    : 'pending';
  const progress = typeof value.progress === 'number' && Number.isFinite(value.progress)
    ? Math.max(0, Math.min(100, value.progress))
    : 0;
  return {
    ...file,
    status,
    progress,
    ...(typeof value.errorMessage === 'string' ? { errorMessage: value.errorMessage } : {}),
  };
}

export function normalizeKycDraft(value: unknown): KycWizardDraft | null {
  if (!isRecord(value)) return null;

  const rawIdentity = isRecord(value.identity) ? value.identity : {};
  const identity: KycIdentityDetails = {
    fullName: typeof rawIdentity.fullName === 'string' ? rawIdentity.fullName : '',
    dateOfBirth: typeof rawIdentity.dateOfBirth === 'string' ? rawIdentity.dateOfBirth : '',
    nationality: typeof rawIdentity.nationality === 'string' ? rawIdentity.nationality : '',
    documentType: DOCUMENT_TYPES.includes(rawIdentity.documentType as DocumentType)
      ? (rawIdentity.documentType as DocumentType)
      : 'id_card',
    documentNumber: typeof rawIdentity.documentNumber === 'string' ? rawIdentity.documentNumber : '',
  };

  return {
    step: typeof value.step === 'number' ? clampStep(value.step) : 0,
    identity,
    document: parseFileMeta(value.document),
    selfie: parseFileMeta(value.selfie),
    uploads: Array.isArray(value.uploads)
      ? value.uploads
          .map(parseUploadMeta)
          .filter((upload): upload is KycUploadMeta => upload !== null)
      : [],
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : Date.now(),
  };
}

export function hasDraftProgress(draft: KycWizardDraft): boolean {
  const { fullName, dateOfBirth, nationality, documentNumber } = draft.identity;
  return (
    draft.step > 0 ||
    Boolean(fullName.trim() || dateOfBirth || nationality.trim() || documentNumber.trim()) ||
    draft.document !== null ||
    draft.selfie !== null ||
    draft.uploads.length > 0
  );
}

export function loadKycDraft(): KycWizardDraft | null {
  const frame = readRecoveryFrame(KYC_WIZARD_PAGE, KYC_DRAFT_EXPIRATION_DAYS);
  return frame ? normalizeKycDraft(frame.payload) : null;
}

export function saveKycDraft(draft: KycWizardDraft): void {
  saveRecoveryFrame({
    page: KYC_WIZARD_PAGE,
    timestamp: Date.now(),
    payload: draft,
  });
}

export function clearKycDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}

export interface KycUploaderOptions {
  delayMs?: number;
  shouldFail?: (file: File) => boolean;
}

export function createKycUploader(options: KycUploaderOptions = {}): Uploader {
  const delayMs = Math.max(20, options.delayMs ?? 300);
  const shouldFail = options.shouldFail ?? ((file: File) => /fail/i.test(file.name));

  return (file, onProgress, signal) =>
    new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Upload aborted', 'AbortError'));
        return;
      }

      let progress = 0;
      const timer: ReturnType<typeof setInterval> = setInterval(() => {
        if (signal?.aborted) {
          clearInterval(timer);
          reject(new DOMException('Upload aborted', 'AbortError'));
          return;
        }

        progress = Math.min(100, progress + 20);
        onProgress(progress);

        if (progress === 100) {
          clearInterval(timer);
          if (shouldFail(file)) {
            reject(new Error('Upload failed. Retry to continue.'));
          } else {
            resolve();
          }
        }
      }, Math.max(4, Math.round(delayMs / 5)));

      signal?.addEventListener(
        'abort',
        () => {
          clearInterval(timer);
          reject(new DOMException('Upload aborted', 'AbortError'));
        },
        { once: true },
      );
    });
}
