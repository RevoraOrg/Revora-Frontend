import React, { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RotateCcw, SearchX } from 'lucide-react';
import { BlacklistFilterChips } from '../BlacklistFilterChips/BlacklistFilterChips';
import {
  EMPTY_FILTER_SELECTION,
  type BlacklistFilterSelection,
} from '../BlacklistFilterChips/BlacklistFilterChips.types';
import { BlacklistSavedViews } from '../BlacklistSavedViews/BlacklistSavedViews';
import type { BlacklistSavedView } from '../BlacklistSavedViews/BlacklistSavedViews.types';
import {
  BLACKLIST_FILTER_OPTIONS,
  STORAGE_KEY_BLACKLIST_VIEWS,
  type BlacklistEntry,
  type BlacklistFiltersPanelProps,
} from './BlacklistFiltersPanel.types';
import './BlacklistFiltersPanel.css';

const daysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

export const MOCK_BLACKLIST_ENTRIES: BlacklistEntry[] = [
  { id: 'bl-1', value: '0x3f5C…9aB1', source: 'Wallet', severity: 'Critical', regionId: 'eu', regionLabel: 'Europe', createdDate: daysAgo(0), reason: 'Suspected laundering pattern' },
  { id: 'bl-2', value: '203.0.113.42', source: 'IP', severity: 'High', regionId: 'na', regionLabel: 'North America', createdDate: daysAgo(1), reason: 'Repeated brute-force login attempts' },
  { id: 'bl-3', value: 'fraud-actor@example.com', source: 'Email', severity: 'High', regionId: 'latam', regionLabel: 'Latin America', createdDate: daysAgo(3), reason: 'Chargeback abuse' },
  { id: 'bl-4', value: 'bad-pool.example.com', source: 'Domain', severity: 'Medium', regionId: 'apac', regionLabel: 'Asia Pacific', createdDate: daysAgo(6), reason: 'Known scam infrastructure' },
  { id: 'bl-5', value: '0x7Bc2…dD44', source: 'Wallet', severity: 'Medium', regionId: 'na', regionLabel: 'North America', createdDate: daysAgo(9), reason: 'Tornado Cash exposure' },
  { id: 'bl-6', value: '198.51.100.77', source: 'IP', severity: 'Low', regionId: 'mea', regionLabel: 'Middle East & Africa', createdDate: daysAgo(15), reason: 'Spam traffic source' },
  { id: 'bl-7', value: 'phish-site.example.org', source: 'Domain', severity: 'Critical', regionId: 'eu', regionLabel: 'Europe', createdDate: daysAgo(22), reason: 'Active credential phishing' },
  { id: 'bl-8', value: 'suspicious@test.io', source: 'Email', severity: 'Medium', regionId: 'apac', regionLabel: 'Asia Pacific', createdDate: daysAgo(34), reason: 'Synthetic identity cluster' },
  { id: 'bl-9', value: '0x9d12…0fC7', source: 'Wallet', severity: 'Low', regionId: 'na', regionLabel: 'North America', createdDate: daysAgo(58), reason: 'Sanctions-list overlap' },
  { id: 'bl-10', value: '192.0.2.15', source: 'IP', severity: 'Low', regionId: 'eu', regionLabel: 'Europe', createdDate: daysAgo(81), reason: 'Legacy blocked range' },
];

const DEFAULT_SAVED_VIEWS: BlacklistSavedView[] = [
  {
    id: 'view-critical',
    name: 'Critical & High',
    isDefault: true,
    createdAt: daysAgo(5),
    filters: { source: [], severity: ['critical', 'high'], region: [], createdDate: [] },
  },
  {
    id: 'view-na-90d',
    name: 'North America · 90d',
    createdAt: daysAgo(12),
    filters: { source: [], severity: [], region: ['na'], createdDate: ['90d'] },
  },
];

const readSelectionFromUrl = (searchParams: URLSearchParams): BlacklistFilterSelection => {
  const read = (key: string) => searchParams.getAll(key);
  return {
    source: read('blSource'),
    severity: read('blSeverity'),
    region: read('blRegion'),
    createdDate: read('blCreated'),
  };
};

const writeSelectionToUrl = (
  searchParams: URLSearchParams,
  selection: BlacklistFilterSelection,
  viewId: string | null
): URLSearchParams => {
  const next = new URLSearchParams(searchParams);
  const groups: Array<[string, string[]]> = [
    ['blSource', selection.source],
    ['blSeverity', selection.severity],
    ['blRegion', selection.region],
    ['blCreated', selection.createdDate],
  ];
  groups.forEach(([key, values]) => {
    next.delete(key);
    values.forEach((value) => next.append(key, value));
  });
  if (viewId) {
    next.set('blView', viewId);
  } else {
    next.delete('blView');
  }
  return next;
};

const isWithinCreatedRange = (isoDate: string, rangeId: string): boolean => {
  const createdAt = new Date(isoDate).getTime();
  const now = Date.now();
  const dayMs = 86_400_000;
  switch (rangeId) {
    case 'today':
      return new Date(isoDate).toDateString() === new Date(now).toDateString();
    case '7d':
      return createdAt >= now - 7 * dayMs;
    case '30d':
      return createdAt >= now - 30 * dayMs;
    case '90d':
      return createdAt >= now - 90 * dayMs;
    default:
      return false;
  }
};

const buildShareUrl = (view: BlacklistSavedView): string => {
  const params = new URLSearchParams();
  const groups: Array<[string, string[]]> = [
    ['blSource', view.filters.source],
    ['blSeverity', view.filters.severity],
    ['blRegion', view.filters.region],
    ['blCreated', view.filters.createdDate],
  ];
  groups.forEach(([key, values]) => {
    values.forEach((value) => params.append(key, value));
  });
  params.set('blView', view.id);
  const query = params.toString();
  return `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ''}`;
};

export const BlacklistFiltersPanel: React.FC<BlacklistFiltersPanelProps> = ({
  entries = MOCK_BLACKLIST_ENTRIES,
  defaultViews,
  simulateLoadError = false,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [selection, setSelection] = useState<BlacklistFilterSelection>(() =>
    readSelectionFromUrl(searchParams)
  );
  const [activeViewId, setActiveViewId] = useState<string | null>(() =>
    searchParams.get('blView')
  );
  const [savedViews, setSavedViews] = useState<BlacklistSavedView[]>(() => {
    if (simulateLoadError) return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_BLACKLIST_VIEWS);
      if (raw) return JSON.parse(raw) as BlacklistSavedView[];
    } catch {
      // Fall back to defaults below.
    }
    return defaultViews ?? DEFAULT_SAVED_VIEWS;
  });
  const [viewsLoadFailed, setViewsLoadFailed] = useState<boolean>(simulateLoadError);

  const hasActiveFilters = useMemo(
    () => Object.values(selection).some((ids) => ids.length > 0),
    [selection]
  );

  const persistViews = useCallback((views: BlacklistSavedView[]) => {
    setSavedViews(views);
    try {
      window.localStorage.setItem(STORAGE_KEY_BLACKLIST_VIEWS, JSON.stringify(views));
    } catch {
      // Storage may be unavailable (e.g. private mode); ignore.
    }
  }, []);

  const applySelection = useCallback(
    (nextSelection: BlacklistFilterSelection, viewId: string | null) => {
      setSelection(nextSelection);
      setActiveViewId(viewId);
      setSearchParams(writeSelectionToUrl(searchParams, nextSelection, viewId));
    },
    [searchParams, setSearchParams]
  );

  const handleFilterChange = useCallback(
    (nextSelection: BlacklistFilterSelection) => {
      // Manually editing filters detaches the applied saved view.
      applySelection(nextSelection, null);
    },
    [applySelection]
  );

  const handleResetFilters = useCallback(() => {
    applySelection(EMPTY_FILTER_SELECTION, null);
  }, [applySelection]);

  const handleApplyView = useCallback(
    (view: BlacklistSavedView) => {
      applySelection(view.filters, view.id);
    },
    [applySelection]
  );

  const handleSaveView = useCallback(
    (name: string, filters: BlacklistFilterSelection) => {
      const newView: BlacklistSavedView = {
        id: `view-${Date.now()}`,
        name,
        filters: {
          source: [...filters.source],
          severity: [...filters.severity],
          region: [...filters.region],
          createdDate: [...filters.createdDate],
        },
        createdAt: new Date().toISOString(),
      };
      persistViews([...savedViews, newView]);
    },
    [savedViews, persistViews]
  );

  const handleRenameView = useCallback(
    (id: string, name: string) => {
      persistViews(savedViews.map((view) => (view.id === id ? { ...view, name } : view)));
    },
    [savedViews, persistViews]
  );

  const handleDeleteView = useCallback(
    (id: string) => {
      persistViews(savedViews.filter((view) => view.id !== id));
      if (activeViewId === id) {
        setActiveViewId(null);
        setSearchParams((params) => {
          const next = new URLSearchParams(params);
          next.delete('blView');
          return next;
        });
      }
    },
    [savedViews, persistViews, activeViewId, setSearchParams]
  );

  const handleSetDefaultView = useCallback(
    (id: string) => {
      const target = savedViews.find((view) => view.id === id);
      if (!target) return;
      const willBeDefault = !target.isDefault;
      persistViews(
        savedViews.map((view) => ({
          ...view,
          isDefault: view.id === id ? willBeDefault : false,
        }))
      );
    },
    [savedViews, persistViews]
  );

  const handleShareView = useCallback(async (view: BlacklistSavedView) => {
    const url = buildShareUrl(view);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for older browsers / non-secure contexts.
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }, []);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (selection.source.length && !selection.source.includes(entry.source.toLowerCase())) {
        return false;
      }
      if (selection.severity.length && !selection.severity.includes(entry.severity.toLowerCase())) {
        return false;
      }
      if (selection.region.length && !selection.region.includes(entry.regionId)) {
        return false;
      }
      if (
        selection.createdDate.length &&
        !selection.createdDate.some((range) => isWithinCreatedRange(entry.createdDate, range))
      ) {
        return false;
      }
      return true;
    });
  }, [entries, selection]);

  return (
    <div className="blacklist-panel" data-testid="blacklist-filters-panel">
      <div className="blacklist-panel-header">
        <h2 className="blacklist-panel-heading" id="blacklist-panel-heading">
          Blacklist
        </h2>
        <div className="blacklist-panel-actions">
          <button
            type="button"
            className="blacklist-reset-btn"
            onClick={handleResetFilters}
            disabled={!hasActiveFilters}
            data-testid="blacklist-reset-btn"
          >
            <RotateCcw size={13} aria-hidden="true" />
            Reset filters
          </button>
          <BlacklistSavedViews
            views={savedViews}
            activeViewId={activeViewId}
            currentFilters={selection}
            hasActiveFilters={hasActiveFilters}
            hasError={viewsLoadFailed}
            onApplyView={handleApplyView}
            onSaveView={handleSaveView}
            onRenameView={handleRenameView}
            onDeleteView={handleDeleteView}
            onSetDefaultView={handleSetDefaultView}
            onShareView={handleShareView}
          />
        </div>
      </div>

      <BlacklistFilterChips
        options={BLACKLIST_FILTER_OPTIONS}
        selection={selection}
        onChange={handleFilterChange}
        maxVisibleChips={10}
      />

      <div className="blacklist-results-meta">
        <p>
          Showing <span className="blacklist-results-count">{filteredEntries.length}</span> of{' '}
          {entries.length} entries
          {activeViewId && savedViews.find((view) => view.id === activeViewId)
            ? ` · View: ${savedViews.find((view) => view.id === activeViewId)!.name}`
            : ''}
        </p>
        {hasActiveFilters && (
          <p data-testid="blacklist-active-view-hint">
            Filters are shareable — use the saved-view link icon.
          </p>
        )}
      </div>

      {filteredEntries.length === 0 ? (
        <div className="blacklist-empty" data-testid="blacklist-empty">
          <SearchX size={28} aria-hidden="true" />
          <p className="blacklist-empty-title">No matching blacklist entries</p>
          <p className="blacklist-empty-hint">
            No entries match the active filter chips. Try removing a chip or resetting the
            filters.
          </p>
        </div>
      ) : (
        <ul className="blacklist-entries" aria-label="Blacklist entries" data-testid="blacklist-entries">
          {filteredEntries.map((entry) => (
            <li key={entry.id} className="blacklist-entry" data-testid={`blacklist-entry-${entry.id}`}>
              <span className="blacklist-entry-value" title={entry.value}>
                {entry.value}
              </span>
              <span className="blacklist-entry-source">{entry.source}</span>
              <span
                className="blacklist-severity-badge"
                data-severity={entry.severity}
                data-testid={`severity-${entry.id}`}
              >
                {entry.severity}
              </span>
              <span className="blacklist-entry-region">{entry.regionLabel}</span>
              <span className="blacklist-entry-date">
                {new Date(entry.createdDate).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
