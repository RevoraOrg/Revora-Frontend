import React, { useEffect, useState } from 'react';
import ActivityItem from './ActivityItem';
import ActivityDateGroup from './ActivityDateGroup';
import { EmptyState } from './designSystem/EmptyState';

// Mock data type
export interface Activity {
  id: string;
  type: 'payout' | 'offering' | 'blacklist';
  timestamp: string; // ISO string
  title: string;
  description: string;
}

// Helper to group by date (YYYY-MM-DD)
const groupByDate = (items: Activity[]) => {
  const groups: Record<string, Activity[]> = {};
  items.forEach(item => {
    const date = new Date(item.timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(item);
  });
  return groups;
};

const PAGE_SIZE = 10;

const ActivityFeed: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Simulate fetching data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // In a real app replace with API call
      const mock: Activity[] = Array.from({ length: 35 }, (_, i) => {
        const types = ['payout', 'offering', 'blacklist'] as const;
        const type = types[i % types.length];
        const now = new Date();
        now.setDate(now.getDate() - Math.floor(i / 5));
        return {
          id: `act-${i}`,
          type,
          timestamp: now.toISOString(),
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} Event ${i}`,
          description: `Description for ${type} event ${i}`,
        };
      });
      // Simulate network latency
      await new Promise(r => setTimeout(r, 500));
      setActivities(mock);
      setLoading(false);
    };
    fetchData();
  }, []);

  const grouped = groupByDate(activities.slice(0, page * PAGE_SIZE));
  const dates = Object.keys(grouped);

  const loadMore = () => setPage(prev => prev + 1);

  if (loading) {
    return <div className="activity-feed-loading" aria-live="polite">Loading activity feed…</div>;
  }

  if (activities.length === 0) {
    return (
      <EmptyState
        variant="audit-trail"
        title="No audit trail entries"
        description="Activity logs will appear here as transactions and events occur on the platform."
        primaryAction={{
          label: 'Refresh',
          onClick: () => window.location.reload(),
        }}
        size={80}
      />
    );
  }

  return (
    <section className="activity-feed" aria-label="In‑app activity feed">
      <ul role="list" className="activity-list">
        {dates.map(date => (
          <React.Fragment key={date}>
            <ActivityDateGroup date={date} />
            {grouped[date].map(item => (
              <li role="listitem" key={item.id}>
                <ActivityItem activity={item} />
              </li>
            ))}
          </React.Fragment>
        ))}
      </ul>
      {page * PAGE_SIZE < activities.length && (
        <button className="btn-primary load-more" onClick={loadMore}>Load more</button>
      )}
    </section>
  );
};

export default ActivityFeed;
