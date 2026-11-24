/**
 * commandPaletteData.ts
 *
 * Registry of all commands surfaced in the command palette.
 *
 * Groups (rendered in this order):
 *   1. Navigate  – route changes (max 5 results shown per group)
 *   2. Actions   – functional operations (max 5)
 *   3. Settings  – configuration (max 5)
 *
 * The "Recent" group is synthesised at runtime from the
 * useCommandPalette hook and does NOT appear in this file.
 *
 * Adding a command:
 *   1. Pick (or create) a group in COMMAND_GROUPS.
 *   2. Add a CommandItem — give it a globally-unique `id`.
 *   3. Provide an `onExecute` callback; it is called when the user
 *      activates the item (Enter or click) and BEFORE the palette closes.
 */

export type CommandGroupKey = 'navigate' | 'actions' | 'settings';

export interface CommandItem {
  /** Globally unique identifier — used for deduplication in recent list. */
  id: string;
  /** Human-readable label shown in the result row. */
  label: string;
  /** Optional secondary hint (e.g. path, shortcut hint). */
  description?: string;
  /** Lucide icon name string — resolved in the component. */
  icon?: string;
  /** Called when the command is activated. */
  onExecute?: () => void;
  /** Group this item belongs to (used for filtering). */
  group: CommandGroupKey;
  /** Optional keyboard shortcut hint shown on the trailing end of the row. */
  shortcutKeys?: string[];
  /**
   * Whether this command is destructive. When true, the palette swaps the row
   * into an inline confirm/cancel state instead of executing immediately.
   */
  destructive?: boolean;
  /**
   * Label for the confirm button (e.g. "Delete offering", "Revoke session").
   * Required when `destructive` is true.
   */
  confirmLabel?: string;
  /**
   * Additional context shown in the confirm row beneath the confirm label.
   * e.g. "This will permanently delete the offering and all associated data."
   */
  confirmDescription?: string;
}

export interface CommandGroup {
  key: CommandGroupKey;
  /** Display label for the group header. */
  label: string;
  /** Maximum number of results shown per group when query is non-empty. */
  resultLimit: number;
  items: CommandItem[];
}

// ---------------------------------------------------------------------------
// Command registry
// ---------------------------------------------------------------------------

export const COMMAND_GROUPS: CommandGroup[] = [
  {
    key: 'navigate',
    label: 'Navigate',
    resultLimit: 5,
    items: [
      {
        id: 'nav:home',
        group: 'navigate',
        label: 'Go to Home',
        description: '/',
        icon: 'Home',
        shortcutKeys: ['mod', 'shift', 'h'],
      },
      {
        id: 'nav:dashboard',
        group: 'navigate',
        label: 'Go to Dashboard',
        description: '/startup/dashboard',
        icon: 'LayoutDashboard',
        shortcutKeys: ['mod', 'shift', 'd'],
      },
      {
        id: 'nav:discovery',
        group: 'navigate',
        label: 'Investor Discovery',
        description: '/investor/portal',
        icon: 'Search',
        shortcutKeys: ['mod', 'shift', 'i'],
      },
      {
        id: 'nav:compare-issuers',
        group: 'navigate',
        label: 'Compare Issuers',
        description: '/investor/compare',
        icon: 'BarChart2',
      },
      {
        id: 'nav:revenue',
        group: 'navigate',
        label: 'Report Revenue',
        description: '/startup/report-revenue',
        icon: 'BarChart2',
        shortcutKeys: ['mod', 'shift', 'r'],
      },
      {
        id: 'nav:payout-schedule',
        group: 'navigate',
        label: 'Payout Schedule',
        description: '/investor/payouts',
        icon: 'Calendar',
      },
      {
        id: 'nav:ledger',
        group: 'navigate',
        label: 'Investor Ledger',
        description: '/investor/ledger',
        icon: 'ClipboardList',
      },
      {
        id: 'nav:admin-alerts',
        group: 'navigate',
        label: 'Admin Alerts Inbox',
        description: '/admin/alerts',
        icon: 'ClipboardList',
      },
      {
        id: 'nav:backup-codes',
        group: 'navigate',
        label: '2FA Backup Codes',
        description: '/settings/2fa/backup-codes',
        icon: 'Monitor',
      },
      {
        id: 'nav:settings',
        group: 'navigate',
        label: 'Go to Settings',
        description: '/settings',
        icon: 'Settings',
      },
    ],
  },
  {
    key: 'actions',
    label: 'Actions',
    resultLimit: 5,
    items: [
      {
        id: 'action:toggle-notifications',
        group: 'actions',
        label: 'Toggle Notifications',
        icon: 'Bell',
        shortcutKeys: ['n'],
      },
      {
        id: 'action:toggle-shortcuts',
        group: 'actions',
        label: 'Open Keyboard Shortcuts',
        icon: 'Keyboard',
        shortcutKeys: ['?'],
      },
      {
        id: 'action:new-distribution',
        group: 'actions',
        label: 'Create New Distribution',
        description: 'Initiate a distribution round',
        icon: 'PlusCircle',
      },
      {
        id: 'action:export-ledger',
        group: 'actions',
        label: 'Export Ledger',
        description: 'Download CSV / PDF',
        icon: 'Download',
      },
      {
        id: 'action:sign-out',
        group: 'actions',
        label: 'Sign Out',
        icon: 'LogOut',
      },
      {
        id: 'action:delete-offering',
        group: 'actions',
        label: 'Delete Offering',
        description: 'Permanently delete an offering',
        icon: 'X',
        destructive: true,
        confirmLabel: 'Delete Offering',
        confirmDescription:
          'This will permanently delete the offering and all associated data. This action cannot be undone.',
      },
      {
        id: 'action:revoke-session',
        group: 'actions',
        label: 'Revoke Session',
        description: 'Force-logout a user session',
        icon: 'LogOut',
        destructive: true,
        confirmLabel: 'Revoke Session',
        confirmDescription:
          'The user will be immediately logged out and must re-authenticate. This action is audit-logged.',
      },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    resultLimit: 5,
    items: [
      {
        id: 'settings:density-comfortable',
        group: 'settings',
        label: 'Density: Comfortable',
        icon: 'AlignJustify',
      },
      {
        id: 'settings:density-cozy',
        group: 'settings',
        label: 'Density: Cozy',
        icon: 'AlignJustify',
      },
      {
        id: 'settings:density-compact',
        group: 'settings',
        label: 'Density: Compact',
        icon: 'AlignJustify',
      },
      {
        id: 'settings:profile',
        group: 'settings',
        label: 'Edit Profile',
        description: '/settings/profile',
        icon: 'UserCog',
      },
      {
        id: 'settings:security',
        group: 'settings',
        label: 'Security & 2FA',
        description: '/settings/security',
        icon: 'ShieldCheck',
      },
      {
        id: 'settings:network',
        group: 'settings',
        label: 'Switch Network',
        icon: 'Globe',
      },
    ],
  },
];

// Flat list of all items — useful for search
export const ALL_COMMANDS: CommandItem[] = COMMAND_GROUPS.flatMap(
  (g) => g.items,
);

/** Map from id → item for O(1) lookup when hydrating the recent list. */
export const COMMAND_BY_ID: Map<string, CommandItem> = new Map(
  ALL_COMMANDS.map((item) => [item.id, item]),
);

/** Half-open UTF-16 offsets into the original display text. */
export type MatchRange = { start: number; end: number };

export interface CommandSearchResult extends CommandItem {
  score: number;
  matches: { label: MatchRange[]; description: MatchRange[] };
}

/** Prefix > word-start > substring > subsequence; compact matches win ties. */
function scoreText(text: string, query: string) {
  // Keep offsets in the original string even when lowercasing expands a character.
  let normalized = '';
  const offsets: MatchRange[] = [];
  let offset = 0;
  for (const character of text) {
    const lower = character.toLowerCase();
    normalized += lower;
    for (let i = 0; i < lower.length; i++) {
      offsets.push({ start: offset, end: offset + character.length });
    }
    offset += character.length;
  }

  const contiguous = normalized.indexOf(query);
  const positions: number[] = [];
  let tier: number;
  if (contiguous !== -1) {
    for (let i = 0; i < query.length; i++) positions.push(contiguous + i);
    tier = contiguous === 0
      ? 4
      : /[\s/_:&-]/.test(normalized[contiguous - 1]) ? 3 : 2;
  } else {
    let cursor = 0;
    for (const character of query) {
      const position = normalized.indexOf(character, cursor);
      if (position === -1) return { score: 0, ranges: [] };
      for (let i = 0; i < character.length; i++) positions.push(position + i);
      cursor = position + character.length;
    }
    tier = 1;
  }

  const ranges: MatchRange[] = [];
  for (const position of positions) {
    const range = offsets[position];
    const previous = ranges[ranges.length - 1];
    if (previous && range.start <= previous.end) previous.end = range.end;
    else ranges.push({ ...range });
  }
  const span = positions[positions.length - 1] - positions[0] + 1;
  return {
    score: tier * 1000 + 100 / (1 + span - query.length) + 1 / (1 + positions[0]),
    ranges,
  };
}

/** Rank matches without mutating the registry. Registry order breaks score ties. */
export function searchCommands(query: string): CommandSearchResult[] {
  if (typeof query !== 'string') return [];

  const q = query.toLowerCase().trim();
  if (!q) return [];

  return ALL_COMMANDS.flatMap((item, index) => {
    if (!item || typeof item.label !== 'string') return [];
    const label = scoreText(item.label, q);
    const description = scoreText(
      typeof item.description === 'string' ? item.description : '', q,
    );
    const score = Math.max(label.score, description.score);
    if (!score) return [];
    return [{
      ...item,
      score,
      matches: { label: label.ranges, description: description.ranges },
      index,
    }];
  })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ index, ...result }) => result);
}

/** Apply per-group result limits and return groups that have results. */
export function groupSearchResults<T extends CommandItem>(
  items: T[],
): { group: CommandGroup; items: T[] }[] {
  if (!Array.isArray(items)) return [];

  return COMMAND_GROUPS.reduce<{ group: CommandGroup; items: T[] }[]>(
    (acc, group) => {
      const matching = items
        .filter((i) => i && i.group === group.key)
        .slice(0, group.resultLimit);
      if (matching.length > 0) {
        acc.push({ group, items: matching });
      }
      return acc;
    },
    [],
  );
}
