// UC42: Manage Notifications & UC43: View Notifications
export type NotificationType = 'system' | 'promotion' | 'order' | 'movie';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  targetUser: string;
  readBy?: string[];
  isRead?: boolean;
  link?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationMutationPayload {
  title: string;
  message: string;
  type: NotificationType;
  targetUser?: string;
  link?: string;
}

