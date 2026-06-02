import React from 'react';
import { Notification } from './notificationsData';

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ notifications, onClose }) => {
  const handleMarkAllRead = () => {
    // In a real app, this would update state/store; here we just log.
    console.log('Mark all as read');
  };

  return (
    <div
      className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
      role="dialog"
      aria-modal="true"
    >
      <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Notifications</h3>
        <button
          className="text-sm text-primary hover:underline focus-visible:outline-none"
          onClick={handleMarkAllRead}
        >
          Mark all as read
        </button>
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {notifications.map((n) => (
          <li key={n.id} className="p-3 flex items-start space-x-3">
            <div className="flex-shrink-0">
              {/* Placeholder icon */}
              <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: n.read ? '#6b7280' : '#ef4444' }}></span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.time}</p>
            </div>
          </li>
        ))}
        {notifications.length === 0 && (
          <li className="p-4 text-center text-gray-500 dark:text-gray-400">No notifications</li>
        )}
      </ul>
      <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex justify-end">
        <button
          className="text-sm text-primary hover:underline focus-visible:outline-none"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default NotificationPanel;
