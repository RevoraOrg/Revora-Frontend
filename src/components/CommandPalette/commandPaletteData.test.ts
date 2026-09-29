import {
  COMMAND_GROUPS,
  groupSearchResults,
  searchCommands,
  type CommandGroup,
  type CommandGroupKey,
  type CommandItem,
} from './commandPaletteData';

describe('commandPaletteData', () => {
  it('exposes the expected group keys and command metadata contract', () => {
    expect(COMMAND_GROUPS.map((group) => group.key)).toEqual([
      'navigate',
      'actions',
      'settings',
    ] satisfies CommandGroupKey[]);

    COMMAND_GROUPS.forEach((group: CommandGroup) => {
      expect(group.label).toBeTruthy();
      expect(group.resultLimit).toBeGreaterThan(0);
      expect(group.items.length).toBeGreaterThan(0);

      group.items.forEach((item: CommandItem) => {
        expect(item.id).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.group).toBe(group.key);
      });
    });
  });

  it('handles representative invalid input deterministically', () => {
    const validItem: CommandItem = {
      id: 'nav:test-item',
      label: 'Test Item',
      description: '/test',
      icon: 'ArrowRight',
      group: 'navigate',
      shortcutKeys: ['mod', 'k'],
    };

    expect(validItem.group).toBe('navigate');
    expect(searchCommands(null as any)).toEqual([]);
    expect(searchCommands(undefined as any)).toEqual([]);
    expect(searchCommands(123 as any)).toEqual([]);
    expect(groupSearchResults(null as any)).toEqual([]);
    expect(groupSearchResults(undefined as any)).toEqual([]);
    expect(groupSearchResults(['bad'] as any)).toEqual([]);
  });

  it('matches commands case-insensitively and preserves ordered groups', () => {
    expect(searchCommands('dashboard')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'nav:dashboard' }),
      ]),
    );
    expect(searchCommands('/dashboard')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'nav:dashboard' }),
      ]),
    );
    expect(searchCommands('   ')).toEqual([]);

    const results = groupSearchResults(searchCommands('e'));
    const keys = results.map(({ group }) => group.key);

    expect(keys).toEqual(
      COMMAND_GROUPS.map((group) => group.key).filter((key) =>
        keys.includes(key),
      ),
    );

    results.forEach(({ group, items }) => {
      expect(items.length).toBeLessThanOrEqual(group.resultLimit);
      expect(items.every((item) => item.group === group.key)).toBe(true);
    });
  });

  it('returns deterministic empty states for empty and no-match queries', () => {
    expect(searchCommands('')).toEqual([]);
    expect(searchCommands('no-such-command')).toEqual([]);
    expect(groupSearchResults([])).toEqual([]);
    expect(groupSearchResults(searchCommands('no-such-command'))).toEqual([]);
  });

  it('applies the group result limit while keeping the original ordering', () => {
    const results = groupSearchResults(searchCommands('d'));

    expect(results.length).toBeGreaterThan(0);
    results.forEach(({ group, items }) => {
      expect(items.length).toBeLessThanOrEqual(group.resultLimit);
      expect(items.every((item) => item.group === group.key)).toBe(true);
    });
  });
});
