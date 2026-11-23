import type { Step } from './types';
import type { WizardStep } from '../WizardStepper';

// ─── Standalone fallback data ─────────────────────────────────────────────────

/**
 * Demo-only TOTP secret. Used only when no `totpSecret` prop is supplied.
 * Production callers must always pass a server-generated secret.
 */
export const DEFAULT_SECRET = 'JBSWY3DPEHPK3PXP';

export const DEFAULT_RECOVERY_CODES = [
  'REVR-A1B2-C3D4',
  'REVR-E5F6-G7H8',
  'REVR-I9J0-K1L2',
  'REVR-M3N4-O5P6',
  'REVR-Q7R8-S9T0',
  'REVR-U1V2-W3X4',
  'REVR-Y5Z6-A7B8',
  'REVR-C9D0-E1F2',
  'REVR-G3H4-I5J6',
  'REVR-K7L8-M9N0',
];

// ─── Step metadata ────────────────────────────────────────────────────────────

export const STEP_LABELS: Record<Step, string> = {
  1: 'Choose method',
  2: 'Set up authenticator',
  3: 'Verify code',
  4: 'Save recovery codes',
  5: 'Done',
};

export const TOTAL_STEPS = 5;

export const WIZARD_STEPS: WizardStep[] = (
  Object.keys(STEP_LABELS) as unknown as Step[]
).map((s) => {
  const step = Number(s) as Step;
  return { id: `tfa-step-${step}`, label: STEP_LABELS[step], number: step };
});

// ─── Recovery-code display ────────────────────────────────────────────────────

export const CODE_PLACEHOLDER = '••••••';
export const CODES_PER_ROW = 5;
