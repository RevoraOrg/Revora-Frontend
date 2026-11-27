import type { KycRejectionReason } from '../components/KycRejectionPanel/kycRejectionTaxonomy';
import type { KycReviewStatus } from '../components/KycResubmissionTimeline/KycResubmissionTimeline';

export const COMPLIANCE_WORKFLOW_STORAGE_KEY = 'revora:admin-compliance-workflow:v1';

export type ComplianceHoldStatus = 'active' | 'appeal-pending' | 'resubmitted';
export type ComplianceAppealStatus = 'not-submitted' | 'submitted';
export type ComplianceSubmissionType = 'appeal' | 'resubmission';

export interface ComplianceRemediationStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface ComplianceWorkflowState {
  holdStatus: ComplianceHoldStatus;
  appealStatus: ComplianceAppealStatus;
  appeal: {
    reason: string;
    explanation: string;
    attachmentNames: string[];
    submittedAt: string;
  } | null;
  remediationSteps: ComplianceRemediationStep[];
  rejectionReasons: KycRejectionReason[];
  resubmissions: number;
  timeline: {
    submissionType: ComplianceSubmissionType | null;
    status: KycReviewStatus;
    submittedAt: string | null;
  };
}

export type ComplianceWorkflowAction =
  | {
      type: 'appeal-submitted';
      appeal: NonNullable<ComplianceWorkflowState['appeal']>;
    }
  | { type: 'remediation-step-toggled'; stepId: string }
  | { type: 'resubmission-submitted'; submittedAt: string };

export function createInitialComplianceWorkflowState(): ComplianceWorkflowState {
  return {
    holdStatus: 'active',
    appealStatus: 'not-submitted',
    appeal: null,
    remediationSteps: [
      {
        id: 'government-id',
        title: 'Upload a clear government ID',
        description: 'Provide a current passport, national ID, or driver’s licence.',
        completed: false,
      },
      {
        id: 'address-proof',
        title: 'Provide proof of address',
        description: 'Upload a recent utility bill, bank statement, or government letter.',
        completed: false,
      },
      {
        id: 'liveness-check',
        title: 'Complete the liveness check',
        description: 'Retake your selfie in a well-lit space without sunglasses or a mask.',
        completed: false,
      },
    ],
    rejectionReasons: [
      { id: 'reason-id-blurry', code: 'ID_BLURRY' },
      { id: 'reason-address-missing', code: 'ADDRESS_MISSING' },
    ],
    resubmissions: 0,
    timeline: {
      submissionType: null,
      status: 'submitted',
      submittedAt: null,
    },
  };
}

export function complianceWorkflowReducer(
  state: ComplianceWorkflowState,
  action: ComplianceWorkflowAction,
): ComplianceWorkflowState {
  switch (action.type) {
    case 'appeal-submitted':
      if (state.appealStatus === 'submitted' || state.holdStatus !== 'active') return state;
      return {
        ...state,
        holdStatus: 'appeal-pending',
        appealStatus: 'submitted',
        appeal: action.appeal,
        timeline: {
          submissionType: 'appeal',
          status: 'submitted',
          submittedAt: action.appeal.submittedAt,
        },
      };
    case 'remediation-step-toggled':
      if (state.resubmissions > 0) return state;
      return {
        ...state,
        remediationSteps: state.remediationSteps.map((step) =>
          step.id === action.stepId ? { ...step, completed: !step.completed } : step,
        ),
      };
    case 'resubmission-submitted':
      if (
        state.resubmissions > 0 ||
        state.remediationSteps.length === 0 ||
        state.remediationSteps.some((step) => !step.completed)
      ) {
        return state;
      }
      return {
        ...state,
        holdStatus: 'resubmitted',
        rejectionReasons: [],
        resubmissions: state.resubmissions + 1,
        timeline: {
          submissionType: 'resubmission',
          status: 'submitted',
          submittedAt: action.submittedAt,
        },
      };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStoredWorkflowState(value: unknown): value is ComplianceWorkflowState {
  if (!isRecord(value)) return false;
  if (
    (value.holdStatus !== 'active' &&
      value.holdStatus !== 'appeal-pending' &&
      value.holdStatus !== 'resubmitted') ||
    (value.appealStatus !== 'not-submitted' && value.appealStatus !== 'submitted') ||
    !Array.isArray(value.remediationSteps) ||
    !Array.isArray(value.rejectionReasons) ||
    !Number.isInteger(value.resubmissions) ||
    (value.resubmissions as number) < 0 ||
    !isRecord(value.timeline)
  ) {
    return false;
  }

  const stepsValid = value.remediationSteps.every(
    (step) =>
      isRecord(step) &&
      typeof step.id === 'string' &&
      typeof step.title === 'string' &&
      typeof step.description === 'string' &&
      typeof step.completed === 'boolean',
  );
  const reasonsValid = value.rejectionReasons.every(
    (reason) =>
      isRecord(reason) &&
      typeof reason.id === 'string' &&
      typeof reason.code === 'string' &&
      (reason.detail === undefined || typeof reason.detail === 'string'),
  );
  const timeline = value.timeline;
  const timelineValid =
    (timeline.submissionType === null ||
      timeline.submissionType === 'appeal' ||
      timeline.submissionType === 'resubmission') &&
    (timeline.status === 'submitted' ||
      timeline.status === 'under-review' ||
      timeline.status === 'decision' ||
      timeline.status === 'canceled') &&
    (timeline.submittedAt === null || typeof timeline.submittedAt === 'string');

  if (!stepsValid || !reasonsValid || !timelineValid) return false;

  if (value.appeal === null) return true;
  if (!isRecord(value.appeal)) return false;
  return (
    typeof value.appeal.reason === 'string' &&
    typeof value.appeal.explanation === 'string' &&
    Array.isArray(value.appeal.attachmentNames) &&
    value.appeal.attachmentNames.every((name) => typeof name === 'string') &&
    typeof value.appeal.submittedAt === 'string'
  );
}

export function loadComplianceWorkflowState(): {
  state: ComplianceWorkflowState;
  error: string | null;
} {
  try {
    const raw = localStorage.getItem(COMPLIANCE_WORKFLOW_STORAGE_KEY);
    if (!raw) return { state: createInitialComplianceWorkflowState(), error: null };
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredWorkflowState(parsed)) {
      return {
        state: createInitialComplianceWorkflowState(),
        error: 'Saved compliance workflow data was invalid. A fresh workflow has started.',
      };
    }
    return { state: parsed, error: null };
  } catch {
    return {
      state: createInitialComplianceWorkflowState(),
      error: 'Saved compliance workflow data could not be read. A fresh workflow has started.',
    };
  }
}

export function saveComplianceWorkflowState(state: ComplianceWorkflowState): void {
  localStorage.setItem(COMPLIANCE_WORKFLOW_STORAGE_KEY, JSON.stringify(state));
}
