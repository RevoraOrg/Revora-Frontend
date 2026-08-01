import React from 'react';
import './ActivityDateGroup.css';

interface Props {
  date: string; // ISO date string
}

/**
 * Formats a date into a human-friendly label.
 * - Today / Yesterday for recent dates
 * - Day name for dates within this week
 * - Full date for older dates
 */
function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  
  // Reset time parts for date comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - target.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  if (diffDays < 14) return 'Last Week';
  if (diffDays < 30) return 'This Month';
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

const ActivityDateGroup: React.FC<Props> = ({ date }) => {
  const formattedDate = formatDateLabel(date);
  
  return (
    <li 
      className="activity-date-group" 
      role="separator" 
      aria-label={`Activities from ${formattedDate}`}
      data-date={date}
    >
      <span className="date-label glass-card">{formattedDate}</span>
    </li>
  );
};

export { formatDateLabel };
export default ActivityDateGroup;
