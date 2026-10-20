import { describe, expect, it } from 'vitest';
import {
    WIZARD_STEP_LABELS,
    type CsvRow,
    type WizardStep,
} from './RevenueCalendarCsvImport.types';

const VALID_WIZARD_STEPS: WizardStep[] = ['upload', 'map', 'preview', 'confirm'];

function nextStep(currentStep: WizardStep): WizardStep {
    const index = VALID_WIZARD_STEPS.indexOf(currentStep);
    if (index === -1) {
        throw new Error(`Unknown wizard step: ${String(currentStep)}`);
    }

    return VALID_WIZARD_STEPS[index + 1] ?? currentStep;
}

function previousStep(currentStep: WizardStep): WizardStep {
    const index = VALID_WIZARD_STEPS.indexOf(currentStep);
    if (index === -1) {
        throw new Error(`Unknown wizard step: ${String(currentStep)}`);
    }

    return VALID_WIZARD_STEPS[index - 1] ?? currentStep;
}

describe('RevenueCalendarCsvImport types', () => {
    it('exposes the canonical wizard steps and labels', () => {
        expect(VALID_WIZARD_STEPS).toEqual(['upload', 'map', 'preview', 'confirm']);
        expect(WIZARD_STEP_LABELS).toEqual({
            upload: 'Upload File',
            map: 'Map Columns',
            preview: 'Preview Data',
            confirm: 'Confirm Import',
        });

        Object.entries(WIZARD_STEP_LABELS).forEach(([step, label]) => {
            expect(VALID_WIZARD_STEPS).toContain(step as WizardStep);
            expect(label).toBeTypeOf('string');
            expect(label.length).toBeGreaterThan(0);
        });
    });

    it('accepts string-keyed CSV rows while preserving empty and invalid values', () => {
        const validRow: CsvRow = {
            date: '2024-01-01',
            revenue: '1250.50',
            currency: 'USD',
        };

        const invalidRow: CsvRow = {
            date: '',
            revenue: '',
            currency: 'INVALID',
        };

        expect(validRow.date).toBe('2024-01-01');
        expect(validRow.revenue).toBe('1250.50');
        expect(validRow.currency).toBe('USD');

        expect(invalidRow.date).toBe('');
        expect(invalidRow.revenue).toBe('');
        expect(invalidRow.currency).toBe('INVALID');
    });

    it('rejects invalid wizard transitions deterministically', () => {
        const invalidStep = 'review' as unknown as WizardStep;

        expect(() => nextStep(invalidStep)).toThrow('Unknown wizard step: review');
        expect(() => previousStep(invalidStep)).toThrow('Unknown wizard step: review');
        expect(VALID_WIZARD_STEPS).not.toContain('review');
    });

    it('moves through the primary import flow in the expected order', () => {
        expect(nextStep('upload')).toBe('map');
        expect(nextStep('map')).toBe('preview');
        expect(nextStep('preview')).toBe('confirm');
        expect(nextStep('confirm')).toBe('confirm');

        expect(previousStep('confirm')).toBe('preview');
        expect(previousStep('preview')).toBe('map');
        expect(previousStep('map')).toBe('upload');
        expect(previousStep('upload')).toBe('upload');
    });
});
