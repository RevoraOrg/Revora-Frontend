/**
 * BlacklistFilterChips — Issue #431
 *
 * Multi-select filter chip bar for the blacklist. Supports the chip states
 * defined in `docs/blacklist-filters-saved-views.md`:
 *   default, active (selected), disabled, overflow ("+N" menu).
 */

export type BlacklistFilterKey = 'source' | 'severity' | 'region' | 'createdDate';

/** Multi-select selection keyed by filter group. */
export type BlacklistFilterSelection = Record<BlacklistFilterKey, string[]>;

export const EMPTY_FILTER_SELECTION: BlacklistFilterSelection = {
  source: [],
  severity: [],
  region: [],
  createdDate: [],
};

export interface FilterChipOption {
  /** Stable identifier (used as the selected value). */
  id: string;
  /** Human-readable label shown on the chip. */
  label: string;
  /** Which filter group this chip belongs to. */
  group: BlacklistFilterKey;
  /** Renders the chip in the disabled state (e.g. deprecated source types). */
  disabled?: boolean;
  /** Optional count badge, e.g. the number of matching entries. */
  count?: number;
  /** Assistive hint shown as a native tooltip. */
  title?: string;
}

export const BLACKLIST_FILTER_GROUPS: ReadonlyArray<{
  key: BlacklistFilterKey;
  label: string;
}> = [
  { key: 'source', label: 'Source' },
  { key: 'severity', label: 'Severity' },
  { key: 'region', label: 'Region' },
  { key: 'createdDate', label: 'Created' },
];

export interface BlacklistFilterChipsProps {
  /** All chip options in display order. */
  options: FilterChipOption[];
  /** Current multi-select selection. */
  selection: BlacklistFilterSelection;
  /** Fired whenever a chip is toggled or removed. */
  onChange: (selection: BlacklistFilterSelection) => void;
  /** Chips beyond this count collapse into the "+N" overflow menu. */
  maxVisibleChips?: number;
  /** Disables every chip in the bar (e.g. while data is loading). */
  disabled?: boolean;
  /** Accessible label for the chip bar. */
  'aria-label'?: string;
}
