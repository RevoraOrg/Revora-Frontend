import { describe, it, expect } from 'vitest';
import { formatKeyLabels, shortcutAriaLabel } from './keyLabels';

describe('formatKeyLabels', () => {
  it('formats mod as ⌘ on Mac', () => {
    expect(formatKeyLabels(['mod'], true)).toEqual(['\u2318']);
  });

  it('formats mod as Ctrl on non-Mac', () => {
    expect(formatKeyLabels(['mod'], false)).toEqual(['Ctrl']);
  });

  it('formats shift key correctly', () => {
    expect(formatKeyLabels(['shift'], true)).toEqual(['\u21E7']);
    expect(formatKeyLabels(['shift'], false)).toEqual(['Shift']);
  });

  it('formats alt key correctly', () => {
    expect(formatKeyLabels(['alt'], true)).toEqual(['\u2325']);
    expect(formatKeyLabels(['alt'], false)).toEqual(['Alt']);
  });

  it('formats escape key correctly', () => {
    expect(formatKeyLabels(['escape'], true)).toEqual(['\u238B']);
    expect(formatKeyLabels(['escape'], false)).toEqual(['Esc']);
  });

  it('formats enter key correctly', () => {
    expect(formatKeyLabels(['enter'], true)).toEqual(['\u21B5']);
    expect(formatKeyLabels(['enter'], false)).toEqual(['\u21B5']);
  });

  it('capitalizes single letters', () => {
    expect(formatKeyLabels(['d'], true)).toEqual(['D']);
    expect(formatKeyLabels(['h'], false)).toEqual(['H']);
  });

  it('formats complex shortcut combinations', () => {
    expect(formatKeyLabels(['mod', 'shift', 'd'], true)).toEqual([
      '\u2318',
      '\u21E7',
      'D',
    ]);
    expect(formatKeyLabels(['mod', 'shift', 'd'], false)).toEqual([
      'Ctrl',
      'Shift',
      'D',
    ]);
  });

  it('passes through unknown keys as-is', () => {
    expect(formatKeyLabels(['?'], true)).toEqual(['?']);
    expect(formatKeyLabels(['/'], false)).toEqual(['/']);
  });

  it('handles empty keys array', () => {
    expect(formatKeyLabels([], true)).toEqual([]);
    expect(formatKeyLabels([], false)).toEqual([]);
  });

  it('is case insensitive for known key identifiers', () => {
    expect(formatKeyLabels(['MOD', 'Shift', 'ALT'], true)).toEqual([
      '\u2318',
      '\u21E7',
      '\u2325',
    ]);
    expect(formatKeyLabels(['MOD', 'Shift', 'ALT'], false)).toEqual([
      'Ctrl',
      'Shift',
      'Alt',
    ]);
  });

  it('passes through numeric keys as-is', () => {
    expect(formatKeyLabels(['1', '2', '3'], true)).toEqual(['1', '2', '3']);
  });
});

describe('shortcutAriaLabel', () => {
  it('builds screen-reader label for Mac', () => {
    expect(shortcutAriaLabel(['mod', 'shift', 'd'], true)).toBe(
      'Command Shift D',
    );
  });

  it('builds screen-reader label for non-Mac', () => {
    expect(shortcutAriaLabel(['mod', 'shift', 'd'], false)).toBe(
      'Control Shift D',
    );
  });

  it('handles single key shortcuts', () => {
    expect(shortcutAriaLabel(['?'], true)).toBe('?');
    expect(shortcutAriaLabel(['n'], false)).toBe('N');
  });

  it('handles alt key', () => {
    expect(shortcutAriaLabel(['alt', 'f'], true)).toBe('Option F');
    expect(shortcutAriaLabel(['alt', 'f'], false)).toBe('Alt F');
  });

  it('handles escape key', () => {
    expect(shortcutAriaLabel(['escape'], true)).toBe('Escape');
    expect(shortcutAriaLabel(['escape'], false)).toBe('Escape');
  });

  it('handles enter key', () => {
    expect(shortcutAriaLabel(['enter'], true)).toBe('Enter');
  });

  it('handles empty keys array', () => {
    expect(shortcutAriaLabel([], true)).toBe('');
  });

  it('is case insensitive for known keys', () => {
    expect(shortcutAriaLabel(['MOD', 'shift'], true)).toBe('Command Shift');
  });

  it('passes through unknown keys uppercased', () => {
    expect(shortcutAriaLabel(['?'], true)).toBe('?');
    expect(shortcutAriaLabel(['/'], false)).toBe('/');
  });
});
