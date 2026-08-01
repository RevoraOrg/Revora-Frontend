/**
 * BlacklistFiltersPanel — Issue #431
 *
 * Orchestrates the blacklist filter chip bar, saved views, URL sharing
 * (`?blSource=…&blSeverity=…&blRegion=…&blCreated=…&blView=…`) and the
 * filtered blacklist result list.
 */

import type { FilterChipOption } from '../BlacklistFilterChips/BlacklistFilterChips.types';
import type { BlacklistSavedView } from '../BlacklistSavedViews/BlacklistSavedViews.types';

export type BlacklistEntrySource = 'Wallet' | 'IP' | 'Email' | 'Domain';
export type BlacklistEntrySeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface BlacklistEntry {
  id: string;
  /** The blocked value (address, IP, email, or domain). */
  value: string;
  source: BlacklistEntrySource;
  severity: BlacklistEntrySeverity;
  /** Matches the region chip id (e.g. `na`, `eu`). */
  regionId: string;
  regionLabel: string;
  /** ISO date string. */
  createdDate: string;
  /** Free-form note shown in the list. */
  reason: string;
}

export interface BlacklistFiltersPanelProps {
  /** Overrides the default mock entries (used by tests). */
  entries?: BlacklistEntry[];
  /** Overrides the default saved views (used by tests). */
  defaultViews?: BlacklistSavedView[];
  /** Simulates a saved-views fetch failure (used to show the error state). */
  simulateLoadError?: boolean;
}

export const STORAGE_KEY_BLACKLIST_VIEWS = 'revora_blacklist_saved_views';

export const BLACKLIST_FILTER_OPTIONS: FilterChipOption[] = [
  // Source
  { id: 'wallet', label: 'Wallet', group: 'source' },
  { id: 'ip', label: 'IP Address', group: 'source' },
  { id: 'email', label: 'Email', group: 'source' },
  { id: 'domain', label: 'Domain', group: 'source' },
  { id: 'legacy-wallet', label: 'Legacy Wallet', group: 'source', disabled: true, title: 'Deprecated source type' },
  // Severity
  { id: 'critical', label: 'Critical', group: 'severity' },
  { id: 'high', label: 'High', group: 'severity' },
  { id: 'medium', label: 'Medium', group: 'severity' },
  { id: 'low', label: 'Low', group: 'severity' },
  // Region
  { id: 'na', label: 'North America', group: 'region' },
  { id: 'eu', label: 'Europe', group: 'region' },
  { id: 'apac', label: 'Asia Pacific', group: 'region' },
  { id: 'latam', label: 'Latin America', group: 'region' },
  { id: 'mea', label: 'Middle East & Africa', group: 'region' },
  // Created date
  { id: 'today', label: 'Today', group: 'createdDate' },
  { id: '7d', label: 'Last 7 days', group: 'createdDate' },
  { id: '30d', label: 'Last 30 days', group: 'createdDate' },
  { id: '90d', label: 'Last 90 days', group: 'createdDate' },
];
