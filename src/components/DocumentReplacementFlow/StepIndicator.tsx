import React from 'react';
import { Check } from 'lucide-react';
import type { ReplacementStep } from './types';

interface StepIndicatorProps {
  steps: Array<{ key: ReplacementStep; label: string }>;
  current: ReplacementStep;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, current }) => {
  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <ol
      className="drf-step-indicator"
      role="list"
      aria-label="Replacement progress"
    >
      {steps.map((step, idx) => {
        const status =
          idx < currentIndex
            ? 'complete'
            : idx === currentIndex
              ? 'current'
              : 'upcoming';
        return (
          <li
            key={step.key}
            className={`drf-step drf-step--${status}`}
            aria-current={status === 'current' ? 'step' : undefined}
          >
            <span className="drf-step-bubble" aria-hidden="true">
              {status === 'complete' ? (
                <Check size={14} aria-hidden="true" />
              ) : (
                idx + 1
              )}
            </span>
            <span className="drf-step-label">{step.label}</span>
            {idx < steps.length - 1 && (
              <span className="drf-step-connector" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
};
