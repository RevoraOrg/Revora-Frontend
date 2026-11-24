import React from 'react';
import { WizardStepper } from '../WizardStepper';
import { WIZARD_STEPS } from './constants';
import type { Step } from './types';

interface StepIndicatorProps {
  current: Step;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ current }) => (
  <WizardStepper
    steps={WIZARD_STEPS}
    currentIndex={current - 1}
    ariaLabel="Setup progress"
    showProgressTrack
  />
);
