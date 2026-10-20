// Define Notification type
export interface Notification {
  id: string;
  title: string;
  time: string;
  read: boolean;
}

export const notificationsMock: Notification[] = [
  { id: '1', title: 'Payout received', time: '2h ago', read: false },
  { id: '2', title: 'Report due', time: '1d ago', read: false },
  { id: '3', title: 'Blacklist change', time: '3d ago', read: true },
];
