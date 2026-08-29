import React from 'react';
import { DollarSign, FileText, Shield, CheckCircle2, User } from 'lucide-react';
import './ActivityItem.css';

export interface ActivityItemProps {
  activity: {
    id?: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    isRead?: boolean;
    actor?: string;
  };
  onMarkRead?: (id: string) => void;
}

const typeIcon: Record<string, React.ReactNode> = {
  payout:     <DollarSign size={20} aria-hidden="true" />,
  offering:   <FileText  size={20} aria-hidden="true" />,
  blacklist:  <Shield    size={20} aria-hidden="true" />,
  compliance: <CheckCircle2 size={20} aria-hidden="true" />,
  kyc:        <User      size={20} aria-hidden="true" />,
};

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, onMarkRead }) => {
  const { id = '', type, title, description, timestamp, isRead = true, actor } = activity;
  const icon = typeIcon[type] ?? <FileText size={20} aria-hidden="true" />;
  const time = new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`activity-item glass-card-interactive ${!isRead ? 'unread' : ''}`}
      aria-current={!isRead ? 'true' : 'false'}
    >
      <div className="activity-item-indicator" aria-hidden="true">
        {!isRead && <span className="unread-dot" title="Unread" />}
      </div>
      <div className="activity-icon">{icon}</div>
      <div className="activity-content">
        <h3 className="activity-title text-primary">{title}</h3>
        {actor && <p className="activity-actor text-muted">{actor}</p>}
        <p className="activity-description text-muted">{description}</p>
      </div>
      <div className="activity-meta">
        <time
          className="activity-time text-muted"
          dateTime={timestamp}
          aria-label={`Occurred at ${time}`}
        >
          {time}
        </time>
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
