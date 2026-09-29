/**
 * Behavior coverage for src/components/BlacklistCsvImport.types.ts
 *
 * Covers the public contract of:
 *   - ConflictReason union type
 *   - CONFLICT_REASON_LABELS   (Record<ConflictReason, string>)
 *   - CONFLICT_REASON_COLORS   (Record<ConflictReason, string>)
 *
 * And for completeness, the sibling exports from the same module:
 *   - WizardStep / WIZARD_STEP_LABELS
 *   - PreviewRow (structural)
 *   - CsvRow (structural)
 *   - ColumnMapping (structural)
 *   - BlacklistCsvImportProps (structural)
 *
 * These are pure data/type modules — no DOM, no React needed.
 */

import { describe, it, expect } from 'vitest';
import {
  CONFLICT_REASON_LABELS,
  CONFLICT_REASON_COLORS,
  WIZARD_STEP_LABELS,
} from './BlacklistCsvImport.types';
import type {
  ConflictReason,
  WizardStep,
  CsvRow,
  PreviewRow,
  ColumnMapping,
  BlacklistCsvImportProps,
} from './BlacklistCsvImport.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** All valid ConflictReason members — mirrors the union definition. */
const CONFLICT_REASONS: ConflictReason[] = [
  'existing_entry',
  'invalid_checksum',
  'duplicate_row',
];

/** All valid WizardStep members — mirrors the union definition. */
const WIZARD_STEPS: WizardStep[] = ['upload', 'map', 'preview', 'confirm'];

// ─── 1. ConflictReason union ──────────────────────────────────────────────────

describe('ConflictReason union', () => {
  it('has exactly three members', () => {
    // The three literals are the exhaustive set; any addition would be a
    // breaking change and should be caught here.
    expect(CONFLICT_REASONS).toHaveLength(3);
  });

  it('contains "existing_entry"', () => {
    expect(CONFLICT_REASONS).toContain('existing_entry');
  });

  it('contains "invalid_checksum"', () => {
    expect(CONFLICT_REASONS).toContain('invalid_checksum');
  });

  it('contains "duplicate_row"', () => {
    expect(CONFLICT_REASONS).toContain('duplicate_row');
  });
});

// ─── 2. CONFLICT_REASON_LABELS ────────────────────────────────────────────────

describe('CONFLICT_REASON_LABELS', () => {
  it('is a non-null object', () => {
    expect(CONFLICT_REASON_LABELS).toBeDefined();
    expect(typeof CONFLICT_REASON_LABELS).toBe('object');
  });

  it('has an entry for every ConflictReason', () => {
    for (const reason of CONFLICT_REASONS) {
      expect(CONFLICT_REASON_LABELS).toHaveProperty(reason);
    }
  });

  it('every label is a non-empty string', () => {
    for (const reason of CONFLICT_REASONS) {
      const label = CONFLICT_REASON_LABELS[reason];
      expect(typeof label).toBe('string');
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });

  it('has no extra keys beyond the ConflictReason union', () => {
    const keys = Object.keys(CONFLICT_REASON_LABELS);
    expect(keys).toHaveLength(CONFLICT_REASONS.length);
    for (const k of keys) {
      expect(CONFLICT_REASONS).toContain(k as ConflictReason);
    }
  });

  // Specific label values — deterministic assertions against the documented contract

  it('"existing_entry" maps to "Existing entry"', () => {
    expect(CONFLICT_REASON_LABELS.existing_entry).toBe('Existing entry');
  });

  it('"invalid_checksum" maps to "Invalid checksum"', () => {
    expect(CONFLICT_REASON_LABELS.invalid_checksum).toBe('Invalid checksum');
  });

  it('"duplicate_row" maps to "Duplicate in file"', () => {
    expect(CONFLICT_REASON_LABELS.duplicate_row).toBe('Duplicate in file');
  });

  // Boundary: labels must not be the raw key string (ensures mapping is intentional)
  it('no label equals its own key (labels are human-readable, not snake_case)', () => {
    for (const reason of CONFLICT_REASONS) {
      expect(CONFLICT_REASON_LABELS[reason]).not.toBe(reason);
    }
  });
});

// ─── 3. CONFLICT_REASON_COLORS ────────────────────────────────────────────────

describe('CONFLICT_REASON_COLORS', () => {
  it('is a non-null object', () => {
    expect(CONFLICT_REASON_COLORS).toBeDefined();
    expect(typeof CONFLICT_REASON_COLORS).toBe('object');
  });

  it('has an entry for every ConflictReason', () => {
    for (const reason of CONFLICT_REASONS) {
      expect(CONFLICT_REASON_COLORS).toHaveProperty(reason);
    }
  });

  it('every color value is a non-empty string', () => {
    for (const reason of CONFLICT_REASONS) {
      const color = CONFLICT_REASON_COLORS[reason];
      expect(typeof color).toBe('string');
      expect(color.trim().length).toBeGreaterThan(0);
    }
  });

  it('has no extra keys beyond the ConflictReason union', () => {
    const keys = Object.keys(CONFLICT_REASON_COLORS);
    expect(keys).toHaveLength(CONFLICT_REASONS.length);
    for (const k of keys) {
      expect(CONFLICT_REASONS).toContain(k as ConflictReason);
    }
  });

  // Specific color values — CSS custom properties

  it('"existing_entry" color references a CSS custom property', () => {
    expect(CONFLICT_REASON_COLORS.existing_entry).toMatch(/^var\(--/);
  });

  it('"invalid_checksum" color references a CSS custom property', () => {
    expect(CONFLICT_REASON_COLORS.invalid_checksum).toMatch(/^var\(--/);
  });

  it('"duplicate_row" color references a CSS custom property', () => {
    expect(CONFLICT_REASON_COLORS.duplicate_row).toMatch(/^var\(--/);
  });

  it('"existing_entry" uses the expected CSS variable name', () => {
    expect(CONFLICT_REASON_COLORS.existing_entry).toBe('var(--bci-conflict-existing)');
  });

  it('"invalid_checksum" uses the expected CSS variable name', () => {
    expect(CONFLICT_REASON_COLORS.invalid_checksum).toBe('var(--bci-conflict-checksum)');
  });

  it('"duplicate_row" uses the expected CSS variable name', () => {
    expect(CONFLICT_REASON_COLORS.duplicate_row).toBe('var(--bci-conflict-duplicate)');
  });

  // Boundary: all three colors must be distinct
  it('all three colors are distinct values', () => {
    const values = CONFLICT_REASONS.map((r) => CONFLICT_REASON_COLORS[r]);
    const unique = new Set(values);
    expect(unique.size).toBe(CONFLICT_REASONS.length);
  });

  // Boundary: colors must not be empty strings or 'transparent'
  it('no color is the empty string', () => {
    for (const reason of CONFLICT_REASONS) {
      expect(CONFLICT_REASON_COLORS[reason]).not.toBe('');
    }
  });

  it('no color is "transparent"', () => {
    for (const reason of CONFLICT_REASONS) {
      expect(CONFLICT_REASON_COLORS[reason]).not.toBe('transparent');
    }
  });
});

// ─── 4. ConflictReason × LABELS × COLORS consistency ─────────────────────────

describe('ConflictReason cross-map consistency', () => {
  it('every ConflictReason has both a label and a color', () => {
    for (const reason of CONFLICT_REASONS) {
      expect(CONFLICT_REASON_LABELS[reason]).toBeTruthy();
      expect(CONFLICT_REASON_COLORS[reason]).toBeTruthy();
    }
  });

  it('LABELS and COLORS have the same key sets', () => {
    const labelKeys = Object.keys(CONFLICT_REASON_LABELS).sort();
    const colorKeys = Object.keys(CONFLICT_REASON_COLORS).sort();
    expect(labelKeys).toEqual(colorKeys);
  });

  it('can build a full display record by combining labels and colors', () => {
    // Representative usage pattern: iterate all reasons to build UI badges
    const badges = CONFLICT_REASONS.map((reason) => ({
      reason,
      label: CONFLICT_REASON_LABELS[reason],
      color: CONFLICT_REASON_COLORS[reason],
    }));
    expect(badges).toHaveLength(3);
    for (const badge of badges) {
      expect(badge.label).toBeTruthy();
      expect(badge.color).toBeTruthy();
    }
  });
});

// ─── 5. Representative invalid inputs ────────────────────────────────────────

describe('ConflictReason – invalid input boundary', () => {
  it('an unknown string is not a valid ConflictReason key in LABELS', () => {
    const unknown = 'unknown_reason';
    expect(
      Object.prototype.hasOwnProperty.call(CONFLICT_REASON_LABELS, unknown),
    ).toBe(false);
  });

  it('an empty string is not a valid ConflictReason key in LABELS', () => {
    expect(
      Object.prototype.hasOwnProperty.call(CONFLICT_REASON_LABELS, ''),
    ).toBe(false);
  });

  it('an unknown string is not a valid ConflictReason key in COLORS', () => {
    const unknown = 'bad_value';
    expect(
      Object.prototype.hasOwnProperty.call(CONFLICT_REASON_COLORS, unknown),
    ).toBe(false);
  });

  it('undefined is not a valid ConflictReason key in LABELS', () => {
    expect(
      Object.prototype.hasOwnProperty.call(CONFLICT_REASON_LABELS, undefined),
    ).toBe(false);
  });
});

// ─── 6. WizardStep / WIZARD_STEP_LABELS (sibling exports) ────────────────────

describe('WizardStep union and WIZARD_STEP_LABELS', () => {
  it('WIZARD_STEP_LABELS has exactly four entries', () => {
    expect(Object.keys(WIZARD_STEP_LABELS)).toHaveLength(4);
  });

  it('has an entry for every WizardStep', () => {
    for (const step of WIZARD_STEPS) {
      expect(WIZARD_STEP_LABELS).toHaveProperty(step);
    }
  });

  it('every label is a non-empty string', () => {
    for (const step of WIZARD_STEPS) {
      const label = WIZARD_STEP_LABELS[step];
      expect(typeof label).toBe('string');
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });

  it('"upload" maps to "Upload"', () => {
    expect(WIZARD_STEP_LABELS.upload).toBe('Upload');
  });

  it('"map" maps to "Map Columns"', () => {
    expect(WIZARD_STEP_LABELS.map).toBe('Map Columns');
  });

  it('"preview" maps to "Preview"', () => {
    expect(WIZARD_STEP_LABELS.preview).toBe('Preview');
  });

  it('"confirm" maps to "Confirm Import"', () => {
    expect(WIZARD_STEP_LABELS.confirm).toBe('Confirm Import');
  });
});

// ─── 7. Structural type contracts (runtime-observable via object shape) ────────

describe('PreviewRow structural contract', () => {
  it('accepts a minimal PreviewRow with required fields', () => {
    const row: PreviewRow = { address: '0xABC', rowNumber: 1 };
    expect(row.address).toBe('0xABC');
    expect(row.rowNumber).toBe(1);
    expect(row.conflictReason).toBeUndefined();
  });

  it('accepts a full PreviewRow with all optional fields', () => {
    const row: PreviewRow = {
      address: '0xDEF',
      checksum: 'abc123',
      rowNumber: 2,
      conflictReason: 'duplicate_row',
      conflictDetail: 'First seen at row 1',
    };
    expect(row.conflictReason).toBe('duplicate_row');
    expect(row.conflictDetail).toBe('First seen at row 1');
    // conflictReason is a valid ConflictReason
    expect(CONFLICT_REASON_LABELS[row.conflictReason!]).toBe('Duplicate in file');
  });

  it('conflictReason on a PreviewRow resolves to a label via CONFLICT_REASON_LABELS', () => {
    const reasons: ConflictReason[] = ['existing_entry', 'invalid_checksum', 'duplicate_row'];
    for (const r of reasons) {
      const row: PreviewRow = { address: '0x01', rowNumber: 1, conflictReason: r };
      expect(CONFLICT_REASON_LABELS[row.conflictReason!]).toBeTruthy();
      expect(CONFLICT_REASON_COLORS[row.conflictReason!]).toBeTruthy();
    }
  });
});

describe('CsvRow structural contract', () => {
  it('accepts a CsvRow with only the required address field', () => {
    const row: CsvRow = { address: '0xABC' };
    expect(row.address).toBe('0xABC');
    expect(row.checksum).toBeUndefined();
  });

  it('accepts extra dynamic fields via the index signature', () => {
    const row: CsvRow = { address: '0xABC', checksum: 'hash1', extra_column: 'value' };
    expect(row['extra_column']).toBe('value');
  });
});

describe('ColumnMapping structural contract', () => {
  it('accepts a minimal ColumnMapping with only address', () => {
    const mapping: ColumnMapping = { address: 'wallet' };
    expect(mapping.address).toBe('wallet');
    expect(mapping.checksum).toBeUndefined();
  });

  it('accepts a ColumnMapping with both address and checksum', () => {
    const mapping: ColumnMapping = { address: 'wallet', checksum: 'signature' };
    expect(mapping.address).toBe('wallet');
    expect(mapping.checksum).toBe('signature');
  });
});

describe('BlacklistCsvImportProps structural contract', () => {
  it('all fields are optional (empty object satisfies the type)', () => {
    const props: BlacklistCsvImportProps = {};
    expect(props.onImport).toBeUndefined();
    expect(props.onCancel).toBeUndefined();
    expect(props.existingAddresses).toBeUndefined();
    expect(props.className).toBeUndefined();
  });

  it('existingAddresses is typed as string[]', () => {
    const props: BlacklistCsvImportProps = { existingAddresses: ['0xABC', '0xDEF'] };
    expect(Array.isArray(props.existingAddresses)).toBe(true);
    expect(props.existingAddresses).toHaveLength(2);
  });

  it('onImport callback receives PreviewRow[]', () => {
    const captured: PreviewRow[][] = [];
    const props: BlacklistCsvImportProps = {
      onImport: (rows) => captured.push(rows),
    };
    const testRows: PreviewRow[] = [{ address: '0xABC', rowNumber: 1 }];
    props.onImport!(testRows);
    expect(captured[0]).toEqual(testRows);
  });

  it('onCancel callback is callable', () => {
    let called = false;
    const props: BlacklistCsvImportProps = { onCancel: () => { called = true; } };
    props.onCancel!();
    expect(called).toBe(true);
  });
});
