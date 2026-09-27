/**
 * Regression suite for the `validateSavedFilterInput` failure/empty-result
 * path in `src/components/AuditTrailFilters/savedFilters.ts` (Issue #688).
 *
 * The module already has a happy-path suite (`savedFilters.test.ts`). This
 * fixture pins the branch evidence called out in the issue — the `return null`
 * at the end of the validator — plus the ordering contract between the four
 * rejection reasons, the trim-before-measure rule, and the boundaries that sit
 * exactly on the documented limits. It deliberately asserts current behavior
 * (for example, UTF-16 length counting) so a silent change is caught.
 */

import { describe, it, expect } from 'vitest';
import {
  DESCRIPTION_MAX_LENGTH,
  NAME_MAX_LENGTH,
  validateSavedFilterInput,
  validationMessage,
  type SavedFilter,
} from './savedFilters';

function saved(name: string, overrides: Partial<SavedFilter> = {}): SavedFilter {
  return {
    id: overrides.id ?? `id-${name}`,
    name,
    description: 'desc',
    filters: { query: '', action: '', actor: '', dateFrom: '', dateTo: '' },
    pinned: false,
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('validateSavedFilterInput — empty-result (null) path', () => {
  it('returns null for a normal, non-conflicting input (the success branch)', () => {
    expect(validateSavedFilterInput('Quarterly payouts', 'Audits for Q3', [])).toBeNull();
  });

  it('returns null when the description is empty or whitespace-only', () => {
    expect(validateSavedFilterInput('Name', '', [])).toBeNull();
    expect(validateSavedFilterInput('Name', '   ', [])).toBeNull();
  });

  it('returns null when the trimmed description is exactly at the limit', () => {
    expect(
      validateSavedFilterInput('Name', 'd'.repeat(DESCRIPTION_MAX_LENGTH), []),
    ).toBeNull();
  });

  it('trims the description before measuring, so padded text at the limit still passes', () => {
    const padded = `  ${'d'.repeat(DESCRIPTION_MAX_LENGTH)}  `;
    expect(padded.length).toBeGreaterThan(DESCRIPTION_MAX_LENGTH);
    expect(validateSavedFilterInput('Name', padded, [])).toBeNull();
  });

  it('returns null when the trimmed name is exactly at the limit', () => {
    expect(validateSavedFilterInput('n'.repeat(NAME_MAX_LENGTH), '', [])).toBeNull();
  });

  it('trims the name before measuring, so padded names at the limit still pass', () => {
    const padded = `  ${'n'.repeat(NAME_MAX_LENGTH)}  `;
    expect(padded.length).toBeGreaterThan(NAME_MAX_LENGTH);
    expect(validateSavedFilterInput(padded, '', [])).toBeNull();
  });

  it('returns null when ignoreId excludes the only conflicting entry', () => {
    const existing = [saved('Mine', { id: 'own-id' })];
    expect(validateSavedFilterInput('Mine', '', existing, 'own-id')).toBeNull();
  });

  it('does not mutate the existing list or its entries', () => {
    const existing = [saved('Existing', { id: 'e1' })];
    const snapshot = JSON.parse(JSON.stringify(existing));

    validateSavedFilterInput('Existing', 'x'.repeat(500), existing, 'ignored');

    expect(existing).toEqual(snapshot);
  });
});

describe('validateSavedFilterInput — rejection ordering', () => {
  it('reports a blank name before looking at the description', () => {
    expect(
      validateSavedFilterInput('   ', 'd'.repeat(DESCRIPTION_MAX_LENGTH + 1), []),
    ).toBe('NAME_REQUIRED');
  });

  it('reports an over-long name before duplicate detection', () => {
    const existing = [saved('n'.repeat(NAME_MAX_LENGTH + 1))];
    expect(
      validateSavedFilterInput('n'.repeat(NAME_MAX_LENGTH + 1), '', existing),
    ).toBe('NAME_TOO_LONG');
  });

  it('reports a duplicate before an over-long description', () => {
    const existing = [saved('Quarterly')];
    expect(
      validateSavedFilterInput('Quarterly', 'd'.repeat(DESCRIPTION_MAX_LENGTH + 1), existing),
    ).toBe('NAME_DUPLICATE');
  });

  it('reports an over-long description only when name and duplicate checks pass', () => {
    expect(
      validateSavedFilterInput('Fresh name', 'd'.repeat(DESCRIPTION_MAX_LENGTH + 1), []),
    ).toBe('DESCRIPTION_TOO_LONG');
  });

  it('treats an empty/whitespace name as NAME_REQUIRED rather than a duplicate', () => {
    const existing = [saved('   ')];
    expect(validateSavedFilterInput('   ', '', existing)).toBe('NAME_REQUIRED');
  });
});

describe('validateSavedFilterInput — duplicate detection boundaries', () => {
  it('matches case-insensitively and after trimming on both sides', () => {
    const existing = [saved('  Failed Payouts  ')];
    expect(validateSavedFilterInput('failed payouts', '', existing)).toBe('NAME_DUPLICATE');
    expect(validateSavedFilterInput('  FAILED PAYOUTS  ', '', existing)).toBe('NAME_DUPLICATE');
  });

  it('ignores a candidate that only matches a different (ignored) id', () => {
    const existing = [saved('Alpha', { id: 'a' }), saved('Beta', { id: 'b' })];
    expect(validateSavedFilterInput('Alpha', '', existing, 'a')).toBeNull();
    expect(validateSavedFilterInput('Alpha', '', existing, 'b')).toBe('NAME_DUPLICATE');
  });

  it('still detects a duplicate when the ignoreId does not exist', () => {
    const existing = [saved('Gamma', { id: 'g' })];
    expect(validateSavedFilterInput('gamma', '', existing, 'missing')).toBe('NAME_DUPLICATE');
  });

  it('never treats a whitespace-only stored name as a duplicate match', () => {
    const existing = [saved('   ', { id: 'blank' })];
    expect(validateSavedFilterInput('Any name', '', existing)).toBeNull();
  });

  it('compares only the trimmed name, not surrounding whitespace', () => {
    const existing = [saved('Tight Name')];
    expect(validateSavedFilterInput('\tTight Name\n', '', existing)).toBe('NAME_DUPLICATE');
  });
});

describe('validateSavedFilterInput — length boundaries (UTF-16 units)', () => {
  it('rejects a name one unit past the limit and accepts one exactly at it', () => {
    expect(validateSavedFilterInput('n'.repeat(NAME_MAX_LENGTH + 1), '', [])).toBe(
      'NAME_TOO_LONG',
    );
    expect(validateSavedFilterInput('n'.repeat(NAME_MAX_LENGTH), '', [])).toBeNull();
  });

  it('rejects a description one unit past the limit and accepts one exactly at it', () => {
    expect(
      validateSavedFilterInput('ok', 'd'.repeat(DESCRIPTION_MAX_LENGTH + 1), []),
    ).toBe('DESCRIPTION_TOO_LONG');
    expect(validateSavedFilterInput('ok', 'd'.repeat(DESCRIPTION_MAX_LENGTH), [])).toBeNull();
  });

  it('counts astral characters as two UTF-16 units (documents the JS length contract)', () => {
    // Each emoji is a surrogate pair → 2 code units.
    const atLimit = '😀'.repeat(NAME_MAX_LENGTH / 2);
    const overLimit = '😀'.repeat(NAME_MAX_LENGTH / 2 + 1);

    expect(atLimit.length).toBe(NAME_MAX_LENGTH);
    expect(overLimit.length).toBe(NAME_MAX_LENGTH + 2);

    expect(validateSavedFilterInput(atLimit, '', [])).toBeNull();
    expect(validateSavedFilterInput(overLimit, '', [])).toBe('NAME_TOO_LONG');
  });
});

describe('validationMessage', () => {
  it('returns non-empty, distinct copy for every rejection reason', () => {
    const reasons = [
      'NAME_REQUIRED',
      'NAME_TOO_LONG',
      'NAME_DUPLICATE',
      'DESCRIPTION_TOO_LONG',
    ] as const;

    const messages = reasons.map((reason) => validationMessage(reason));
    expect(messages.every((message) => message.length > 0)).toBe(true);
    expect(new Set(messages).size).toBe(reasons.length);
  });

  it('interpolates the configured limits into the copy', () => {
    expect(validationMessage('NAME_TOO_LONG')).toContain(String(NAME_MAX_LENGTH));
    expect(validationMessage('DESCRIPTION_TOO_LONG')).toContain(String(DESCRIPTION_MAX_LENGTH));
  });
});
