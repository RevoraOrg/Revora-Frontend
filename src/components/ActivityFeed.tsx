/**
 * ActivityFeed — Audit Trail Viewer
 *
 * Filterable event timeline with:
 * - Actor / action-type / date-range filter chips
 * - Inline diff/state-change disclosures
 * - Permalink per event
 * - Full ARIA feed semantics and keyboard navigation
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Calendar, Moon, Bell, ChevronDown, ChevronUp, Link2, X, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import ActivityItem from './ActivityItem';
import ActivityDateGroup from './ActivityDateGroup';
import { EmptyState } from './designSystem/EmptyState';
import './ActivityFeed.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionType = 'payout' | 'offering' | 'blacklist' | 'compliance' | 'kyc';

export interface DiffEntry {
  field: string;
  from: string;
  to: string;
}

export interface Activity {
  id: string;
  type: ActionType;
  actor: string;          // display name of who performed the action
  actorId: string;        // stable id for filtering
  timestamp: string;      // ISO string
  title: string;
  description: string;
  isRead?: boolean;
  diff?: DiffEntry[];     // optional state-change diff
}

export interface FilterState {
  actor: string;          // actorId or '' for any
  actionType: ActionType | '';
  dateFrom: string;       // ISO date string YYYY-MM-DD or ''
  dateTo: string;
}

const EMPTY_FILTERS: FilterState = {
  actor: '',
  actionType: '',
  dateFrom: '',
  dateTo: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const groupByDate = (items: Activity[]): Record<string, Activity[]> => {
  const groups: Record<string, Activity[]> = {};
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  items.forEach(item => {
    const d = new Date(item.timestamp);
    d.setHours(0, 0, 0, 0);
    const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000);

    let key: string;
    if (diff === 0) key = 'Today';
    else if (diff === 1) key = 'Yesterday';
    else if (diff <= 7) key = 'This Week';
    else key = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

    (groups[key] ??= []).push(item);
  });
  return groups;
};

const isActiveFilters = (f: FilterState) =>
  f.actor !== '' || f.actionType !== '' || f.dateFrom !== '' || f.dateTo !== '';

// ─── Sub-components ───────────────────────────────────────────────────────────

const EmptyDayDivider: React.FC<{ count: number }> = ({ count }) => (
  <div
    className="empty-day-divider"
    role="separator"
    aria-label={`${count} ${count === 1 ? 'day' : 'days'} with no activity`}
  >
    <div className="divider-line" aria-hidden="true" />
    <div className="divider-content">
      <Calendar size={14} aria-hidden="true" />
      <span>{count} {count === 1 ? 'day' : 'days'} with no activity</span>
    </div>
    <div className="divider-line" aria-hidden="true" />
  </div>
);

const QuietWeekSummaryCard: React.FC = () => (
  <div className="quiet-week-card glass-card" role="region" aria-label="Quiet week summary">
    <div className="icon-wrapper" aria-hidden="true"><Moon size={24} /></div>
    <h3>It's been a quiet week</h3>
    <p>There was no activity to report during this period. You're all caught up!</p>
    <Link to="/settings/notifications" className="btn btn-secondary">
      <Bell size={16} aria-hidden="true" />
      <span>Manage Notification Settings</span>
    </Link>
  </div>
);

// Inline diff disclosure
const DiffDisclosure: React.FC<{ diff: DiffEntry[]; eventId: string }> = ({ diff, eventId }) => {
  const [open, setOpen] = useState(false);
  const id = `diff-${eventId}`;

  return (
    <div className="diff-disclosure">
      <button
        className="diff-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(o => !o)}
      >
        {open ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
        <span>{open ? 'Hide changes' : `Show changes (${diff.length})`}</span>
      </button>
      {open && (
        <dl id={id} className="diff-table" role="list" aria-label="Field changes">
          {diff.map(({ field, from, to }) => (
            <div key={field} className="diff-row" role="listitem">
              <dt className="diff-field">{field}</dt>
              <dd className="diff-from">
                <span className="diff-label">From</span>
                <span className="diff-value diff-value--old">{from}</span>
              </dd>
              <dd className="diff-to">
                <span className="diff-label">To</span>
                <span className="diff-value diff-value--new">{to}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};

// Permalink button
const PermalinkButton: React.FC<{ eventId: string }> = ({ eventId }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const url = `${window.location.href.split('#')[0]}#event-${eventId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback: nothing to do in test env
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [eventId]);

  return (
    <button
      className="permalink-btn"
      onClick={handleCopy}
      aria-label={copied ? 'Link copied!' : `Copy permalink for this event`}
      title={copied ? 'Copied!' : 'Copy link to this event'}
    >
      <Link2 size={14} aria-hidden="true" />
      {copied && <span className="permalink-copied">Copied!</span>}
    </button>
  );
};

// Filter bar
interface FilterBarProps {
  filters: FilterState;
  actors: { id: string; name: string }[];
  actionTypes: ActionType[];
  onChange: (f: FilterState) => void;
  onClear: () => void;
}

const ACTION_LABELS: Record<ActionType, string> = {
  payout: 'Payout',
  offering: 'Offering',
  blacklist: 'Blacklist',
  compliance: 'Compliance',
  kyc: 'KYC',
};

const FilterBar: React.FC<FilterBarProps> = ({ filters, actors, actionTypes, onChange, onClear }) => {
  const active = isActiveFilters(filters);

  return (
    <div className="filter-bar" role="group" aria-label="Audit trail filters">
      <div className="filter-bar__icon" aria-hidden="true">
        <Filter size={16} />
      </div>

      {/* Actor filter */}
      <label className="filter-label" htmlFor="af-actor">Actor</label>
      <select
        id="af-actor"
        className="filter-select"
        value={filters.actor}
        onChange={e => onChange({ ...filters, actor: e.target.value })}
        aria-label="Filter by actor"
      >
        <option value="">All actors</option>
        {actors.map(a => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>

      {/* Action type filter */}
      <label className="filter-label" htmlFor="af-type">Type</label>
      <select
        id="af-type"
        className="filter-select"
        value={filters.actionType}
        onChange={e => onChange({ ...filters, actionType: e.target.value as ActionType | '' })}
        aria-label="Filter by action type"
      >
        <option value="">All types</option>
        {actionTypes.map(t => (
          <option key={t} value={t}>{ACTION_LABELS[t]}</option>
        ))}
      </select>

      {/* Date range */}
      <label className="filter-label" htmlFor="af-from">From</label>
      <input
        id="af-from"
        type="date"
        className="filter-date"
        value={filters.dateFrom}
        max={filters.dateTo || undefined}
        onChange={e => onChange({ ...filters, dateFrom: e.target.value })}
        aria-label="Filter from date"
      />

      <label className="filter-label" htmlFor="af-to">To</label>
      <input
        id="af-to"
        type="date"
        className="filter-date"
        value={filters.dateTo}
        min={filters.dateFrom || undefined}
        onChange={e => onChange({ ...filters, dateTo: e.target.value })}
        aria-label="Filter to date"
      />

      {/* Clear all */}
      {active && (
        <button
          className="filter-clear-btn"
          onClick={onClear}
          aria-label="Clear all filters"
        >
          <X size={14} aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );
};

// ─── Mock data generator (deterministic) ─────────────────────────────────────

const ACTORS = [
  { id: 'usr-1', name: 'Alice Johnson' },
  { id: 'usr-2', name: 'Bob Smith' },
  { id: 'usr-3', name: 'Carol White' },
];

const ACTION_TYPES: ActionType[] = ['payout', 'offering', 'blacklist', 'compliance', 'kyc'];

const generateMockActivities = (): Activity[] =>
  Array.from({ length: 35 }, (_, i) => {
    const type = ACTION_TYPES[i % ACTION_TYPES.length];
    const actor = ACTORS[i % ACTORS.length];
    const now = new Date();
    let daysAgo = 0;
    if (i < 5) daysAgo = i;
    else if (i < 10) daysAgo = i + 2;
    else if (i < 15) daysAgo = i + 10;
    else daysAgo = i + 15;
    now.setDate(now.getDate() - daysAgo);

    const hasDiff = i % 3 === 0;
    return {
      id: `act-${i}`,
      type,
      actor: actor.name,
      actorId: actor.id,
      timestamp: now.toISOString(),
      title: `${ACTION_LABELS[type]} Event ${i}`,
      description: `${actor.name} performed a ${type} action on record #${1000 + i}.`,
      isRead: i > 4,
      diff: hasDiff
        ? [
            { field: 'Status', from: 'Pending', to: 'Approved' },
            { field: 'Amount', from: `$${i * 100}`, to: `$${i * 110}` },
          ]
        : undefined,
    };
  });

// ─── Main component ───────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const ActivityFeed: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [announcement, setAnnouncement] = useState('');
  const [showUndo, setShowUndo] = useState(false);
  const previousActivitiesRef = useRef<Activity[]>([]);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      await new Promise(r => setTimeout(r, 500));
      if (!cancelled) {
        setActivities(generateMockActivities());
        setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    };
  }, []);

  // Derive unique actors/types for filter dropdowns
  const actors = useMemo(
    () => Array.from(new Map(activities.map(a => [a.actorId, { id: a.actorId, name: a.actor }])).values()),
    [activities],
  );
  const actionTypes = useMemo(
    () => [...new Set(activities.map(a => a.type))] as ActionType[],
    [activities],
  );

  // Apply filters
  const filtered = useMemo(() => {
    return activities.filter(a => {
      if (filters.actor && a.actorId !== filters.actor) return false;
      if (filters.actionType && a.type !== filters.actionType) return false;
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        from.setHours(0, 0, 0, 0);
        if (new Date(a.timestamp) < from) return false;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(a.timestamp) > to) return false;
      }
      return true;
    });
  }, [activities, filters]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const grouped = groupByDate(paginated);
  const dates = Object.keys(grouped);

  const handleFiltersChange = useCallback((f: FilterState) => {
    setFilters(f);
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setAnnouncement('Filters cleared.');
  }, []);

  const loadMore = () => setPage(p => p + 1);

  const handleMarkAllRead = () => {
    previousActivitiesRef.current = activities;
    setActivities(acts => acts.map(a => ({ ...a, isRead: true })));
    setShowUndo(true);
    setAnnouncement('All activities marked as read.');
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = setTimeout(() => setShowUndo(false), 10_000);
  };

  const handleUndo = () => {
    if (previousActivitiesRef.current.length > 0) {
      setActivities(previousActivitiesRef.current);
      setShowUndo(false);
      setAnnouncement('Mark all read undone.');
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    }
  };

  const handleMarkRead = (id: string) => {
    setActivities(acts => acts.map(a => (a.id === id ? { ...a, isRead: true } : a)));
    setAnnouncement('Activity marked as read.');
    setShowUndo(false);
  };

  const hasUnread = activities.some(a => !a.isRead);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="activity-feed-loading" aria-live="polite" aria-busy="true">
        Loading activity feed…
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <EmptyState
        variant="audit-trail"
        title="No audit trail entries"
        description="Activity logs will appear here as transactions and events occur on the platform."
        primaryAction={{ label: 'Refresh', onClick: () => window.location.reload() }}
        size={80}
      />
    );
  }

  return (
    <section className="activity-feed" aria-label="Audit trail event timeline">
      {/* Live region for screen-reader announcements */}
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Header */}
      <div className="activity-feed-header">
        <h2 className="activity-feed-title">Audit Trail</h2>
        {hasUnread && (
          <button className="mark-all-read-btn" onClick={handleMarkAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      {/* Undo banner */}
      {showUndo && (
        <div className="undo-banner" role="status" aria-live="polite">
          <span>All activities marked as read.</span>
          <button className="undo-btn" onClick={handleUndo}>Undo</button>
        </div>
      )}

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        actors={actors}
        actionTypes={actionTypes}
        onChange={handleFiltersChange}
        onClear={handleClearFilters}
      />

      {/* Active filter summary for screen readers */}
      {isActiveFilters(filters) && (
        <p className="visually-hidden" aria-live="polite">
          Filters active. {filtered.length} {filtered.length === 1 ? 'result' : 'results'} shown.
        </p>
      )}

      {/* Empty filtered state */}
      {filtered.length === 0 && (
        <EmptyState
          variant="audit-trail"
          title="No matching events"
          description="Try adjusting or clearing your filters to see more events."
          primaryAction={{ label: 'Clear filters', onClick: handleClearFilters }}
          size={80}
        />
      )}

      {/* Timeline feed */}
      {filtered.length > 0 && (
        <ol
          className="activity-list"
          role="feed"
          aria-label="Audit trail events"
          aria-busy={loading}
        >
          {dates.map((date, index) => {
            // Compute empty-day divider between groups
            let emptyState: React.ReactNode = null;
            if (index < dates.length - 1) {
              const curr = new Date(grouped[date][0].timestamp);
              const next = new Date(grouped[dates[index + 1]][0].timestamp);
              curr.setHours(0, 0, 0, 0);
              next.setHours(0, 0, 0, 0);
              const gap = Math.floor((curr.getTime() - next.getTime()) / 86_400_000) - 1;
              if (gap >= 7) emptyState = <QuietWeekSummaryCard />;
              else if (gap > 0) emptyState = <EmptyDayDivider count={gap} />;
            }

            return (
              <React.Fragment key={date}>
                <ActivityDateGroup date={date} />
                {grouped[date].map(item => (
                  <li
                    key={item.id}
                    id={`event-${item.id}`}
                    role="article"
                    aria-label={`${item.title} by ${item.actor}`}
                    aria-setsize={filtered.length}
                    className="activity-feed__event"
                  >
                    <div className="activity-feed__event-header">
                      <ActivityItem
                        activity={item}
                        onMarkRead={handleMarkRead}
                      />
                      <PermalinkButton eventId={item.id} />
                    </div>
                    {item.diff && item.diff.length > 0 && (
                      <DiffDisclosure diff={item.diff} eventId={item.id} />
                    )}
                  </li>
                ))}
                {emptyState && (
                  <li role="presentation">{emptyState}</li>
                )}
              </React.Fragment>
            );
          })}
        </ol>
      )}

      {/* Load more */}
      {page * PAGE_SIZE < filtered.length && (
        <button
          className="btn btn-primary load-more"
          onClick={loadMore}
          aria-label={`Load more events (${filtered.length - page * PAGE_SIZE} remaining)`}
        >
          Load more
        </button>
      )}
    </section>
  );
};

export default ActivityFeed;
export { ACTORS, ACTION_TYPES, generateMockActivities };
