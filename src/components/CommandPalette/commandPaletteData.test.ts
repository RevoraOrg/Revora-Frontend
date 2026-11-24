import {
  COMMAND_GROUPS,
  ALL_COMMANDS,
  groupSearchResults,
  searchCommands,
  type CommandGroup,
  type CommandGroupKey,
  type CommandItem,
} from './commandPaletteData';

describe('ranked fuzzy command search', () => {
  const originalLength = ALL_COMMANDS.length;
  afterEach(() => { ALL_COMMANDS.length = originalLength; });

  function add(labels: string[]) {
    const items: CommandItem[] = labels.map((label, index) => ({
      id: `test:${index}`, label, group: 'actions',
    }));
    ALL_COMMANDS.push(...items);
    return items;
  }

  it('finds Ledger by abbreviation and returns original half-open match ranges', () => {
    const result = searchCommands('  LGR  ').find((item) => item.id === 'action:export-ledger');
    expect(result?.matches).toEqual({
      label: [{ start: 7, end: 8 }, { start: 10, end: 11 }, { start: 12, end: 13 }],
      description: [],
    });
    expect(searchCommands('ledger')[0].matches.label).toEqual([{ start: 7, end: 13 }]);
  });

  it('ranks prefix, word-start, substring and subsequence matches in order', () => {
    add(['xqab', 'q---a---b', 'go qab', 'qab']);
    expect(searchCommands('qab').map((item) => item.label)).toEqual([
      'qab', 'go qab', 'xqab', 'q---a---b',
    ]);
  });

  it('prefers compact and earlier matches and breaks equal scores by registry order', () => {
    add(['xxqab', 'xqab', 'q---a---b', 'q-ab', 'xqab']);
    const results = searchCommands('qab');
    expect(results.map((item) => item.id)).toEqual(['test:1', 'test:4', 'test:0', 'test:3', 'test:2']);
    expect(searchCommands('qab')).toEqual(results);
  });

  it('scores descriptions independently and never matches across field boundaries', () => {
    ALL_COMMANDS.push({ id: 'test:desc', group: 'actions', label: 'zzq', description: 'qab' });
    expect(searchCommands('qab')[0]).toMatchObject({
      id: 'test:desc', matches: { label: [], description: [{ start: 0, end: 3 }] },
    });
    expect(searchCommands('zzqqab')).toEqual([]);
    expect(searchCommands('qq')).toEqual([]);
  });

  it('keeps ranges aligned with original Unicode text and merges adjacent matches', () => {
    add(['İ 😀 Qab', '😀qab']);
    expect(searchCommands('qab').find((item) => item.id === 'test:0')?.matches.label)
      .toEqual([{ start: 5, end: 8 }]);
    expect(searchCommands('😀q')[0].matches.label).toEqual([{ start: 0, end: 3 }]);
    expect(searchCommands('i')[0].matches.label).toEqual([{ start: 0, end: 1 }]);
  });

  it('preserves the highest-ranked results and their metadata under group limits', () => {
    add(['q---a---b', 'q--a--b', 'q-a-b', 'xxqab', 'xqab', 'go qab', 'qab']);
    const ranked = searchCommands('qab');
    const [group] = groupSearchResults(ranked);
    expect(group.group.key).toBe('actions');
    expect(group.items).toEqual(ranked.slice(0, 5));
    expect(group.items[0].label).toBe('qab');
    expect(group.items[0].matches.label).toEqual([{ start: 0, end: 3 }]);
  });

  it('ignores malformed registry entries without mutating valid commands', () => {
    const before = JSON.stringify(ALL_COMMANDS);
    searchCommands('ledger');
    expect(JSON.stringify(ALL_COMMANDS)).toBe(before);
    ALL_COMMANDS.push(null as any, { label: 123 } as any,
      { id: 'test:bad-desc', label: 'qab', description: 42, group: 'actions' } as any);
    expect(searchCommands('qab')[0]).toMatchObject({ id: 'test:bad-desc', matches: { description: [] } });
  });
});

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
    expect(searchCommands('/settings')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'nav:settings', group: 'navigate' }),
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
