/**
 * Typed URL filter, sort, and pagination schema for InvestorDiscovery.
 *
 * Mirrors filter state to URL search params so filtered views are shareable,
 * survive page reloads, and integrate cleanly with browser Back/Forward.
 */

export const DISCOVERY_SORT_OPTIONS = [
  'default',
  'name-asc',
  'name-desc',
  'revenue-desc',
  'funding-desc',
] as const;

export type DiscoverySortOption = (typeof DISCOVERY_SORT_OPTIONS)[number];

export interface DiscoveryFilterState {
  /** Free-text search over offering name / category. */
  query: string;
  /** Whether the quick-filter toggle is active. */
  filtersActive: boolean;
  /** Active sort order for offerings. */
  sort: DiscoverySortOption;
  /** 1-based page index. */
  page: number;
}

export const DEFAULT_DISCOVERY_FILTERS: DiscoveryFilterState = {
  query: '',
  filtersActive: false,
  sort: 'default',
  page: 1,
};

export const DISCOVERY_PAGE_SIZE = 6;
export const DISCOVERY_SEARCH_DEBOUNCE_MS = 250;

const VALID_SORT_SET = new Set<string>(DISCOVERY_SORT_OPTIONS);
const POSITIVE_INT_PATTERN = /^[1-9]\d*$/;
const OWNED_PARAMS = ['q', 'filters', 'sort', 'page'] as const;

export function isDiscoverySortOption(value: string): value is DiscoverySortOption {
  return VALID_SORT_SET.has(value);
}

/**
 * Serialize discovery filters into URLSearchParams, omitting default values.
 * If `existing` is provided, unrelated params (e.g. `entry`) are preserved.
 */
export function filtersToSearchParams(
  filters: DiscoveryFilterState,
  existing?: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(existing);
  for (const key of OWNED_PARAMS) {
    params.delete(key);
  }

  const trimmedQuery = filters.query.trim();
  if (trimmedQuery) {
    params.set('q', trimmedQuery);
  }
  if (filters.filtersActive) {
    params.set('filters', '1');
  }
  if (filters.sort !== 'default' && isDiscoverySortOption(filters.sort)) {
    params.set('sort', filters.sort);
  }
  if (Number.isInteger(filters.page) && filters.page > 1) {
    params.set('page', String(filters.page));
  }

  return params;
}

/**
 * Parse and validate discovery filters from URLSearchParams.
 * Unknown parameters and invalid values are safely ignored.
 */
export function filtersFromSearchParams(params: URLSearchParams): DiscoveryFilterState {
  const rawQuery = params.get('q');
  const rawFilters = params.get('filters');
  const rawSort = params.get('sort');
  const rawPage = params.get('page');

  const query = rawQuery ?? '';
  const filtersActive = rawFilters === '1' || rawFilters === 'true';
  const sort: DiscoverySortOption =
    rawSort && isDiscoverySortOption(rawSort) ? rawSort : 'default';
  const page =
    rawPage && POSITIVE_INT_PATTERN.test(rawPage) ? Number.parseInt(rawPage, 10) : 1;

  return { query, filtersActive, sort, page };
}

/** Build a relative URL string with the discovery filter params applied. */
export function buildUrlWithDiscoveryFilters(
  filters: DiscoveryFilterState,
  location: Pick<Location, 'pathname' | 'search' | 'hash'> = window.location,
): string {
  const nextParams = filtersToSearchParams(filters, new URLSearchParams(location.search));
  const qs = nextParams.toString();
  return `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`;
}

/**
 * Mirror discovery filters into `window.history` using `pushState` or
 * `replaceState`. No-ops when the target URL matches the current URL.
 */
export function syncDiscoveryFiltersToUrl(
  filters: DiscoveryFilterState,
  mode: 'push' | 'replace',
): void {
  if (typeof window === 'undefined' || !window.history) return;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const nextUrl = buildUrlWithDiscoveryFilters(filters, window.location);
  if (nextUrl === currentUrl) return;
  if (mode === 'push') {
    window.history.pushState(null, '', nextUrl);
  } else {
    window.history.replaceState(null, '', nextUrl);
  }
}
