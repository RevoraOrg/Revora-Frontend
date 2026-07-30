import React from 'react';
import './ActivityItem.css';

export interface ActivityItemProps {
  activity: {
    id?: string;
    type: 'payout' | 'governance' | 'document';
    title: string;
    description: string;
    timestamp: string;
    isRead?: boolean;
  };
  onMarkRead?: (id: string) => void;
}

const FALLBACK_ICON = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const iconMap: Record<string, React.ReactNode> = {
  payout: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  ),
  governance: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  document: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
};

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, onMarkRead }) => {
  const { id = '', type, title, description, timestamp, isRead = true } = activity;
  const icon = iconMap[type] || FALLBACK_ICON;
  const date = new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`activity-item glass-card-interactive ${!isRead ? 'unread' : ''}`}
      role="article"
      aria-current={!isRead ? 'true' : 'false'}
    >
      <div className="activity-item-indicator" aria-hidden="true">
        {!isRead && <span className="unread-dot" title="Unread" />}
      </div>
      <span className="activity-icon" aria-hidden="true">{icon}</span>
      <div className="activity-content">
        <h3 className="activity-title text-primary">{title}</h3>
        <p className="activity-description text-muted">{description}</p>
      </div>
      <div className="activity-meta">
        <time className="activity-time text-muted" dateTime={timestamp} aria-label={`Occurred at ${date}`}> {date} </time>
        {!isRead && onMarkRead && (
          <button
            className="mark-read-btn"
            onClick={() => onMarkRead(id)}
            aria-label="Mark item as read"
            title="Mark as read"
          >
            Mark read
          </button>
        )}
      </div>
    </div>
  );
};

export default ActivityItem;
