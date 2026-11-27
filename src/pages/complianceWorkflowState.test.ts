import { describe, expect, it } from 'vitest';
import {
  complianceWorkflowReducer,
  createInitialComplianceWorkflowState,
} from './complianceWorkflowState';

describe('complianceWorkflowReducer', () => {
  it('updates the hold and review timeline when an appeal is submitted', () => {
    const initialState = createInitialComplianceWorkflowState();
    const submittedAt = '2026-11-27T10:00:00.000Z';

    const state = complianceWorkflowReducer(initialState, {
      type: 'appeal-submitted',
      appeal: {
        reason: 'incorrect_info',
        explanation: 'The document was already replaced.',
        attachmentNames: ['corrected-id.pdf'],
        submittedAt,
      },
    });

    expect(state.holdStatus).toBe('appeal-pending');
    expect(state.appealStatus).toBe('submitted');
    expect(state.timeline).toEqual({
      submissionType: 'appeal',
      status: 'submitted',
      submittedAt,
    });
    expect(state.appeal?.attachmentNames).toEqual(['corrected-id.pdf']);
  });

  it('requires every remediation step before accepting a resubmission', () => {
    const initialState = createInitialComplianceWorkflowState();
    const blocked = complianceWorkflowReducer(initialState, {
      type: 'resubmission-submitted',
      submittedAt: '2026-11-27T10:00:00.000Z',
    });
    expect(blocked).toBe(initialState);

    const ready = initialState.remediationSteps.reduce(
      (state, step) =>
        complianceWorkflowReducer(state, {
          type: 'remediation-step-toggled',
          stepId: step.id,
        }),
      initialState,
    );
    const submittedAt = '2026-11-27T10:00:00.000Z';
    const submitted = complianceWorkflowReducer(ready, {
      type: 'resubmission-submitted',
      submittedAt,
    });

    expect(submitted.resubmissions).toBe(1);
    expect(submitted.holdStatus).toBe('resubmitted');
    expect(submitted.rejectionReasons).toHaveLength(0);
    expect(submitted.timeline).toEqual({
      submissionType: 'resubmission',
      status: 'submitted',
      submittedAt,
    });
  });
});
