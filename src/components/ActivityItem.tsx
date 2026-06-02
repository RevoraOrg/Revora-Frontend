import React from 'react';
import payoutIcon from '../assets/icons/payout.svg';
import offeringIcon from '../assets/icons/offering.svg';
import blacklistIcon from '../assets/icons/blacklist.svg';

export interface ActivityItemProps {
  activity: {
    type: 'payout' | 'offering' | 'blacklist';
    title: string;
    description: string;
    timestamp: string;
  };
}

const iconMap: Record<string, string> = {
  payout: payoutIcon,
  offering: offeringIcon,
  blacklist: blacklistIcon,
};

const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const { type, title, description, timestamp } = activity;
  const Icon = iconMap[type];
  const date = new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <div className="activity-item glass-card-interactive" role="article">
      <img src={Icon} alt="" aria-hidden="true" className="activity-icon" />
      <div className="activity-content">
        <h3 className="activity-title text-primary">{title}</h3>
        <p className="activity-description text-muted">{description}</p>
      </div>
      <time className="activity-time text-muted" dateTime={timestamp} aria-label={`Occurred at ${date}`}> {date} </time>
    </div>
  );
};

export default ActivityItem;
