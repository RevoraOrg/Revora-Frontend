import { describe, it, expect } from 'vitest';
import { KEYBOARD_SHORTCUT_GROUPS, Shortcut, ShortcutGroup } from './shortcutsData';

describe('shortcutsData', () => {
  describe('KEYBOARD_SHORTCUT_GROUPS', () => {
    it('is an array of shortcut groups', () => {
      expect(Array.isArray(KEYBOARD_SHORTCUT_GROUPS)).toBe(true);
      expect(KEYBOARD_SHORTCUT_GROUPS.length).toBeGreaterThan(0);
    });

    it('contains correctly formatted shortcut groups', () => {
      KEYBOARD_SHORTCUT_GROUPS.forEach((group) => {
        expect(group).toHaveProperty('title');
        expect(typeof group.title).toBe('string');
        expect(group.title.length).toBeGreaterThan(0);
        
        expect(group).toHaveProperty('shortcuts');
        expect(Array.isArray(group.shortcuts)).toBe(true);
        expect(group.shortcuts.length).toBeGreaterThan(0);
      });
    });

    it('contains valid shortcuts within each group', () => {
      KEYBOARD_SHORTCUT_GROUPS.forEach((group) => {
        group.shortcuts.forEach((shortcut) => {
          expect(shortcut).toHaveProperty('label');
          expect(typeof shortcut.label).toBe('string');
          expect(shortcut.label.length).toBeGreaterThan(0);

          expect(shortcut).toHaveProperty('keys');
          expect(Array.isArray(shortcut.keys)).toBe(true);
          expect(shortcut.keys.length).toBeGreaterThan(0);
          shortcut.keys.forEach(key => {
            expect(typeof key).toBe('string');
            expect(key.length).toBeGreaterThan(0);
          });
        });
      });
    });

    it('should have a navigation group', () => {
      const navGroup = KEYBOARD_SHORTCUT_GROUPS.find(g => g.title === 'Navigation');
      expect(navGroup).toBeDefined();
      expect(navGroup?.shortcuts.length).toBeGreaterThan(0);
    });
  });

  describe('Type assignments (Shortcut and ShortcutGroup)', () => {
    it('allows constructing valid Shortcut objects', () => {
      const validShortcut: Shortcut = {
        label: 'Test Shortcut',
        keys: ['mod', 't']
      };
      expect(validShortcut.label).toBe('Test Shortcut');
      expect(validShortcut.keys).toEqual(['mod', 't']);
    });

    it('allows constructing valid ShortcutGroup objects', () => {
      const validGroup: ShortcutGroup = {
        title: 'Test Group',
        shortcuts: [
          { label: 'A', keys: ['a'] }
        ]
      };
      expect(validGroup.title).toBe('Test Group');
      expect(validGroup.shortcuts.length).toBe(1);
    });

    it('handles boundary conditions (empty keys list)', () => {
      const emptyKeysShortcut: Shortcut = {
        label: 'Empty',
        keys: []
      };
      expect(emptyKeysShortcut.keys).toEqual([]);
      expect(emptyKeysShortcut.keys.length).toBe(0);
    });
  });
});
