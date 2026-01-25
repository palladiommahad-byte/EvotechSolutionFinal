import { useNotifications, NotificationType } from '@/contexts/NotificationContext';

/**
 * Helper hook to add notifications easily
 * Usage: const { notify } = useNotificationHelpers();
 * notify.success('Operation completed', 'Your changes have been saved.');
 */
export const useNotificationHelpers = () => {
  const { addNotification } = useNotifications();

  const notify = {
    info: (title: string, message: string, options?: { actionUrl?: string; actionLabel?: string }) => {
      addNotification({
        title,
        message,
        type: 'info',
        ...options,
      });
    },
    success: (title: string, message: string, options?: { actionUrl?: string; actionLabel?: string }) => {
      addNotification({
        title,
        message,
        type: 'success',
        ...options,
      });
    },
    warning: (title: string, message: string, options?: { actionUrl?: string; actionLabel?: string }) => {
      addNotification({
        title,
        message,
        type: 'warning',
        ...options,
      });
    },
    error: (title: string, message: string, options?: { actionUrl?: string; actionLabel?: string }) => {
      addNotification({
        title,
        message,
        type: 'error',
        ...options,
      });
    },
  };

  return { notify };
};

/**
 * Standalone function to add notifications (for use outside React components)
 * Note: This requires the NotificationProvider to be set up in the app
 */
export const createNotificationHelper = (addNotification: (notification: Omit<import('@/contexts/NotificationContext').Notification, 'id' | 'timestamp' | 'read'>) => void) => {
  return {
    info: (title: string, message: string, options?: { actionUrl?: string; actionLabel?: string }) => {
      addNotification({
        title,
        message,
        type: 'info',
        ...options,
      });
    },
    success: (title: string, message: string, options?: { actionUrl?: string; actionLabel?: string }) => {
      addNotification({
        title,
        message,
        type: 'success',
        ...options,
      });
    },
    warning: (title: string, message: string, options?: { actionUrl?: string; actionLabel?: string }) => {
      addNotification({
        title,
        message,
        type: 'warning',
        ...options,
      });
    },
    error: (title: string, message: string, options?: { actionUrl?: string; actionLabel?: string }) => {
      addNotification({
        title,
        message,
        type: 'error',
        ...options,
      });
    },
  };
};
