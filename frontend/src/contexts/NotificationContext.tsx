import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  useNotifications as useDbNotifications,
  useUnreadNotificationsCount,
  useCreateNotification,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  useDeleteAllNotifications,
} from '@/hooks/useSettings';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

// Helper function to validate UUID format
const isValidUUID = (str: string | undefined | null): boolean => {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const { user } = useAuth();
  
  // Only use userId if it's a valid UUID
  const userId = user?.id && isValidUUID(user.id) ? user.id : undefined;
  
  // Fetch notifications from database
  const { data: dbNotifications = [], isLoading: isLoadingNotifications } = useDbNotifications(userId);
  const { data: unreadCount = 0 } = useUnreadNotificationsCount(userId);
  
  // Mutations
  const createMutation = useCreateNotification();
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const deleteMutation = useDeleteNotification();
  const deleteAllMutation = useDeleteAllNotifications();

  // Convert database notifications to UI format
  const notifications: Notification[] = useMemo(() => {
    return dbNotifications.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type as NotificationType,
      timestamp: n.created_at ? new Date(n.created_at) : new Date(),
      read: n.read,
      actionUrl: n.action_url,
      actionLabel: n.action_label,
    }));
  }, [dbNotifications]);

  const addNotification = async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    try {
      await createMutation.mutateAsync({
        user_id: user?.id || null,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: false,
        action_url: notification.actionUrl,
        action_label: notification.actionLabel,
      });
    } catch (error) {
      console.error('Error adding notification:', error);
      throw error;
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await markAsReadMutation.mutateAsync(id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync(user?.id || null);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  };

  const clearAllNotifications = async () => {
    try {
      await deleteAllMutation.mutateAsync(user?.id || null);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      throw error;
    }
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    isLoading: isLoadingNotifications,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
