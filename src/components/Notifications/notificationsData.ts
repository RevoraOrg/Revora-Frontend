import {
  isCategoryDeliverable,
  type CategoryKey,
  type NotificationPreferencesValue,
} from './notificationPreferences';

export type NotificationCategory = CategoryKey;

// Define Notification type
export interface Notification {
  id: string;
  title: string;
  time: string;
  read: boolean;
  /** Older fixtures omit this; getNotificationCategory infers it from the title. */
  category?: NotificationCategory;
}

export const notificationsMock: Notification[] = [
  { id: '1', title: 'Payout received', time: '2h ago', read: false },
  { id: '2', title: 'Report due', time: '1d ago', read: false },
  { id: '3', title: 'Blacklist change', time: '3d ago', read: true },
];

export interface NotificationTemplate extends Notification {
  category: NotificationCategory;
}

/** Source used when generating a fresh mock feed; preference-aware. */
export const notificationTemplates: ReadonlyArray<NotificationTemplate> = [
  { id: '1', title: 'Payout received', time: '2h ago', read: false, category: 'distribution' },
  { id: '2', title: 'Report due', time: '1d ago', read: false, category: 'report' },
  { id: '3', title: 'Blacklist change', time: '3d ago', read: true, category: 'compliance' },
  { id: '4', title: 'Governance vote opened', time: '4h ago', read: false, category: 'governance' },
  { id: '5', title: 'Monthly statement ready', time: '5h ago', read: false, category: 'report' },
];

const TITLE_CATEGORY_PATTERNS: ReadonlyArray<[RegExp, NotificationCategory]> = [
  [/payout|revenue|distribution|investment/i, 'distribution'],
  [/report|statement|export/i, 'report'],
  [/compliance|blacklist|kyc|regulat|alert/i, 'compliance'],
  [/governance|vot|proposal/i, 'governance'],
];

export function getNotificationCategory(notification: Notification): NotificationCategory {
  if (notification.category) return notification.category;
  const match = TITLE_CATEGORY_PATTERNS.find(([pattern]) => pattern.test(notification.title));
  return match ? match[1] : 'governance';
}

/** Builds a new mock feed, honouring channel and quiet-hours preferences. */
export function createMockNotifications(
  preferences: NotificationPreferencesValue,
  now: Date = new Date(),
): Notification[] {
  return notificationTemplates
    .filter((template) => isCategoryDeliverable(template.category, preferences, now))
    .map((template) => ({ ...template }));
}
