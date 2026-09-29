/**
 * Focused behavior coverage for the `WizardStepper` barrel
 * `src/components/WizardStepper/index.ts` (#788).
 *
 * The existing suite imports `./WizardStepper` directly, so the public entry
 * point every consumer actually imports was unverified. This suite pins:
 *
 * - the barrel's value exports are the same bindings as the implementation
 *   module (no accidental re-implementation or dropped export),
 * - the exported helpers keep their documented state transitions at the
 *   boundaries (negative, zero-length, out-of-range), and
 * - the exported component clamps invalid `currentIndex` inputs
 *   deterministically when rendered through the barrel.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import * as barrel from './index';
import * as implementation from './WizardStepper';
import type { WizardStep } from './index';

const STEPS: WizardStep[] = [
  { id: 'a', label: 'Choose method', number: 1 },
  { id: 'b', label: 'Verify', number: 2 },
  { id: 'c', label: 'Done', number: 3 },
];

describe('WizardStepper barrel exports', () => {
  it('re-exports the implementation bindings unchanged', () => {
    expect(barrel.getStepState).toBe(implementation.getStepState);
    expect(barrel.getWizardProgressPercent).toBe(implementation.getWizardProgressPercent);
    expect(barrel.WizardStepper).toBe(implementation.WizardStepper);
  });

  it('exposes the three documented value exports', () => {
    expect(typeof barrel.WizardStepper).toBe('function');
    expect(typeof barrel.getStepState).toBe('function');
    expect(typeof barrel.getWizardProgressPercent).toBe('function');
  });

  it('keeps the component displayName for devtools/debug output', () => {
    expect(barrel.WizardStepper.displayName).toBe('WizardStepper');
  });
});

describe('getStepState transitions via the barrel', () => {
  it('maps completed / active / pending across the whole list', () => {
    expect(barrel.getStepState(0, 2)).toBe('completed');
    expect(barrel.getStepState(1, 2)).toBe('completed');
    expect(barrel.getStepState(2, 2)).toBe('active');
    expect(barrel.getStepState(3, 2)).toBe('pending');
  });

  it('treats a negative currentIndex as "nothing started yet" (boundary)', () => {
    expect(barrel.getStepState(0, -1)).toBe('pending');
    expect(barrel.getStepState(-1, -1)).toBe('active');
  });

  it('is deterministic and repeatable for the same inputs', () => {
    const first = [0, 1, 2, 3].map((index) => barrel.getStepState(index, 1));
    const second = [0, 1, 2, 3].map((index) => barrel.getStepState(index, 1));
    expect(first).toEqual(second);
  });
});

describe('getWizardProgressPercent boundaries via the barrel', () => {
  it('spans 0 → 100 across the step range', () => {
    expect(barrel.getWizardProgressPercent(0, 3)).toBe(0);
    expect(barrel.getWizardProgressPercent(1, 3)).toBe(50);
    expect(barrel.getWizardProgressPercent(2, 3)).toBe(100);
  });

  it('handles the degenerate single-step and empty cases', () => {
    expect(barrel.getWizardProgressPercent(0, 1)).toBe(100);
    expect(barrel.getWizardProgressPercent(-1, 1)).toBe(0);
    expect(barrel.getWizardProgressPercent(0, 0)).toBe(100);
    expect(barrel.getWizardProgressPercent(-1, 0)).toBe(0);
  });

  it('clamps out-of-range indices instead of returning NaN or overshooting', () => {
    expect(barrel.getWizardProgressPercent(99, 4)).toBe(100);
    expect(barrel.getWizardProgressPercent(-99, 4)).toBe(0);
    expect(Number.isNaN(barrel.getWizardProgressPercent(50, 4))).toBe(false);
  });
});

describe('WizardStepper rendered through the barrel', () => {
  it('renders an accessible progress navigation with the documented status', () => {
    render(<barrel.WizardStepper steps={STEPS} currentIndex={1} />);

    expect(screen.getByRole('navigation', { name: /wizard progress/i })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');

    const status = document.querySelector('.wizard-stepper__status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status?.textContent).toBe('Step 2 of 3: Verify');
  });

  it('clamps a negative currentIndex to the first step (boundary)', () => {
    const { container } = render(<barrel.WizardStepper steps={STEPS} currentIndex={-5} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    const active = container.querySelector('.wizard-stepper__item--active');
    expect(active?.textContent).toContain('Choose method');
  });

  it('clamps an out-of-range currentIndex to the last step (boundary)', () => {
    const { container } = render(<barrel.WizardStepper steps={STEPS} currentIndex={99} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    const active = container.querySelector('.wizard-stepper__item--active');
    expect(active?.textContent).toContain('Done');
  });

  it('renders an empty step list without a progress bar or status region', () => {
    const { container } = render(<barrel.WizardStepper steps={[]} currentIndex={0} />);

    expect(container.querySelector('.wizard-stepper__track')).toBeNull();
    expect(container.querySelector('.wizard-stepper__status')).toBeNull();
    expect(container.querySelectorAll('.wizard-stepper__item')).toHaveLength(0);
  });

  it('honours showProgressTrack=false and a custom aria label', () => {
    render(<barrel.WizardStepper steps={STEPS} currentIndex={0} showProgressTrack={false} ariaLabel="Setup progress" />);

    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Setup progress' })).toBeInTheDocument();
  });
});
