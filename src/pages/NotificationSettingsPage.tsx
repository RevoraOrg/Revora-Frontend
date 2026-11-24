import React from 'react';
import NotificationPreferences from '../components/Notifications/NotificationPreferences';
import { useNotifications } from '../components/Notifications/NotificationProvider';

/** Route page for /settings/notifications (Issue #998). */
const NotificationSettingsPage: React.FC = () => {
  const { preferences, setPreferences } = useNotifications();

  return (
    <div className="placeholder-container">
      <div className="placeholder-card glass-card" style={{ maxWidth: '64rem' }}>
        <h1 className="placeholder-title">Notification settings</h1>
        <p className="placeholder-text">
          Changes are saved automatically for this account.
        </p>
        <NotificationPreferences value={preferences} onChange={setPreferences} />
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
