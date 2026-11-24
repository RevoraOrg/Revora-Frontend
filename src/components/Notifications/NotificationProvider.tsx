/**
 * NotificationProvider — Issue #998
 *
 * Owns the notification feed and preferences for the current user so the
 * header bell works on every route. Both the feed and the preferences are
 * persisted to localStorage under per-user keys; a missing or corrupt payload
 * falls back to the shipped defaults.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  createDefaultNotificationPreferences,
  isNotificationVisible,
  sanitizePreferences,
  type NotificationPreferencesValue,
} from './notificationPreferences';
import {
  createMockNotifications,
  getNotificationCategory,
  notificationsMock,
  type Notification,
} from './notificationsData';

export const DEFAULT_USER_ID = 'local-user';
const NOTIFICATIONS_PREFIX = 'revora:notifications';
const PREFERENCES_PREFIX = 'revora:notification-preferences';

export function notificationsStorageKey(userId: string = DEFAULT_USER_ID): string {
  return `${NOTIFICATIONS_PREFIX}:${userId}`;
}

export function notificationPreferencesStorageKey(userId: string = DEFAULT_USER_ID): string {
  return `${PREFERENCES_PREFIX}:${userId}`;
}

function isStoredNotification(value: unknown): value is Notification {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.title === 'string' &&
    candidate.title.length > 0 &&
    typeof candidate.time === 'string' &&
    candidate.time.length > 0 &&
    typeof candidate.read === 'boolean' &&
    (candidate.category === undefined ||
      ['distribution', 'report', 'compliance', 'governance'].includes(candidate.category as string))
  );
}

function defaultNotifications(): Notification[] {
  return notificationsMock.map((notification) => ({ ...notification }));
}

function readNotifications(userId: string): Notification[] {
  try {
    const raw = localStorage.getItem(notificationsStorageKey(userId));
    if (raw === null) return defaultNotifications();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultNotifications();
    return parsed.filter(isStoredNotification);
  } catch {
    return defaultNotifications();
  }
}

function readPreferences(userId: string): NotificationPreferencesValue {
  try {
    const raw = localStorage.getItem(notificationPreferencesStorageKey(userId));
    if (raw === null) return createDefaultNotificationPreferences();
    const parsed = sanitizePreferences(JSON.parse(raw));
    return parsed ?? createDefaultNotificationPreferences();
  } catch {
    return createDefaultNotificationPreferences();
  }
}

function persistNotifications(userId: string, notifications: Notification[]): void {
  try {
    localStorage.setItem(notificationsStorageKey(userId), JSON.stringify(notifications));
  } catch {
    // Storage unavailable — keep the in-memory feed for this session.
  }
}

function persistPreferences(userId: string, preferences: NotificationPreferencesValue): void {
  try {
    localStorage.setItem(notificationPreferencesStorageKey(userId), JSON.stringify(preferences));
  } catch {
    // Storage unavailable — keep the in-memory preferences for this session.
  }
}

export interface NotificationContextValue {
  /** Notifications the user has opted into (what the bell renders). */
  notifications: Notification[];
  /** The full feed, including categories hidden by preferences. */
  allNotifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  /** Generate a fresh mock feed using the current preferences. */
  generateNotifications: () => void;
  preferences: NotificationPreferencesValue;
  setPreferences: (next: NotificationPreferencesValue) => void;
  userId: string;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);

export interface NotificationProviderProps {
  children: React.ReactNode;
  userId?: string;
}

export function NotificationProvider({ children, userId = DEFAULT_USER_ID }: NotificationProviderProps) {
  const [activeUserId, setActiveUserId] = useState(userId);
  const [allNotifications, setAllNotifications] = useState<Notification[]>(() => readNotifications(userId));
  const [preferences, setPreferencesState] = useState<NotificationPreferencesValue>(() => readPreferences(userId));

  useEffect(() => {
    if (activeUserId === userId) return;
    setActiveUserId(userId);
    setAllNotifications(readNotifications(userId));
    setPreferencesState(readPreferences(userId));
  }, [activeUserId, userId]);

  useEffect(() => {
    persistNotifications(activeUserId, allNotifications);
  }, [activeUserId, allNotifications]);

  useEffect(() => {
    persistPreferences(activeUserId, preferences);
  }, [activeUserId, preferences]);

  const notifications = useMemo(
    () => allNotifications.filter((notification) =>
      isNotificationVisible(getNotificationCategory(notification), preferences),
    ),
    [allNotifications, preferences],
  );

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const markRead = useCallback((id: string) => {
    setAllNotifications((previous) =>
      previous.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setAllNotifications((previous) => previous.map((notification) => ({ ...notification, read: true })));
  }, []);

  const dismiss = useCallback((id: string) => {
    setAllNotifications((previous) => previous.filter((notification) => notification.id !== id));
  }, []);

  const generateNotifications = useCallback(() => {
    const generated = createMockNotifications(preferences);
    setAllNotifications((previous) => {
      const existingIds = new Set(previous.map((notification) => notification.id));
      const additions = generated
        .filter((notification) => !existingIds.has(notification.id))
        .map((notification) => ({ ...notification, read: false }));
      return [...additions, ...previous];
    });
  }, [preferences]);

  const setPreferences = useCallback((next: NotificationPreferencesValue) => {
    setPreferencesState(next);
  }, []);

  const value = useMemo<NotificationContextValue>(() => ({
    notifications,
    allNotifications,
    unreadCount,
    markRead,
    markAllRead,
    dismiss,
    generateNotifications,
    preferences,
    setPreferences,
    userId: activeUserId,
  }), [
    notifications,
    allNotifications,
    unreadCount,
    markRead,
    markAllRead,
    dismiss,
    generateNotifications,
    preferences,
    setPreferences,
    activeUserId,
  ]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used inside <NotificationProvider>');
  }
  return context;
}

/** For components that also support standalone use (e.g. the legacy bell props). */
export function useOptionalNotifications(): NotificationContextValue | null {
  return useContext(NotificationContext);
}
