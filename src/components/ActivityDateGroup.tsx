import React from 'react';

interface Props {
  date: string;
}

const ActivityDateGroup: React.FC<Props> = ({ date }) => (
  <li className="activity-date-group" role="separator">
    <span className="date-label glass-card" aria-label={`Activities on ${date}`}>{date}</span>
  </li>
);

export default ActivityDateGroup;
