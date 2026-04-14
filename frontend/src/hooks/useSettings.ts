/**
 * Custom hooks for settings data
 * Uses React Query for caching and automatic refetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService, CompanySettings, UserPreferences, Warehouse, User, Notification } from '@/services/settings.service';

// ============================================
// COMPANY SETTINGS HOOKS
// ============================================

/**
 * Hook to fetch company settings
 */
export const useCompanySettings = () => {
  return useQuery({
    queryKey: ['settings', 'company'],
    queryFn: () => settingsService.getCompanySettings(),
    staleTime: 300000, // 5 minutes
  });
};

/**
 * Hook to update company settings
 */
export const useUpdateCompanySettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Partial<CompanySettings>) =>
      settingsService.updateCompanySettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'company'] });
    },
  });
};

// ============================================
// USER PREFERENCES HOOKS
// ============================================

/**
 * Hook to fetch user preferences
 */
// Helper function to validate UUID format
const isValidUUID = (str: string): boolean => {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const useUserPreferences = (userId: string) => {
  return useQuery({
    queryKey: ['settings', 'user-preferences', userId],
    queryFn: () => settingsService.getUserPreferences(userId),
    staleTime: 300000, // 5 minutes
    enabled: !!userId && isValidUUID(userId), // Only fetch if userId is provided and is a valid UUID
  });
};

/**
 * Hook to update user preferences
 */
export const useUpdateUserPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, preferences }: { userId: string; preferences: Partial<UserPreferences> }) =>
      settingsService.updateUserPreferences(userId, preferences),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'user-preferences', variables.userId] });
    },
  });
};

// ============================================
// WAREHOUSES HOOKS
// ============================================

/**
 * Hook to fetch all warehouses
 */
export const useWarehouses = () => {
  return useQuery({
    queryKey: ['settings', 'warehouses'],
    queryFn: () => settingsService.getWarehouses(),
    staleTime: 300000, // 5 minutes
  });
};

/**
 * Hook to fetch warehouse by ID
 */
export const useWarehouse = (id: string) => {
  return useQuery({
    queryKey: ['settings', 'warehouses', id],
    queryFn: () => settingsService.getWarehouseById(id),
    staleTime: 300000,
    enabled: !!id,
  });
};

/**
 * Hook to create warehouse
 */
export const useCreateWarehouse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (warehouse: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>) =>
      settingsService.createWarehouse(warehouse),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'warehouses'] });
    },
  });
};

/**
 * Hook to update warehouse
 */
export const useUpdateWarehouse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, warehouse }: { id: string; warehouse: Partial<Omit<Warehouse, 'id' | 'created_at'>> }) =>
      settingsService.updateWarehouse(id, warehouse),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'warehouses', variables.id] });
    },
  });
};

/**
 * Hook to delete warehouse
 */
export const useDeleteWarehouse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => settingsService.deleteWarehouse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'warehouses'] });
    },
  });
};

// ============================================
// USERS HOOKS
// ============================================

/**
 * Hook to fetch all users
 */
export const useUsers = () => {
  return useQuery({
    queryKey: ['settings', 'users'],
    queryFn: () => settingsService.getUsers(),
    staleTime: 300000, // 5 minutes
  });
};

/**
 * Hook to fetch user by ID
 */
export const useUser = (id: string) => {
  return useQuery({
    queryKey: ['settings', 'users', id],
    queryFn: () => settingsService.getUserById(id),
    staleTime: 300000,
    enabled: !!id,
  });
};

/**
 * Hook to fetch user by email
 */
export const useUserByEmail = (email: string) => {
  return useQuery({
    queryKey: ['settings', 'users', 'email', email],
    queryFn: () => settingsService.getUserByEmail(email),
    staleTime: 300000,
    enabled: !!email,
  });
};

/**
 * Hook to create user
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (user: Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_login' | 'password_hash'> & { password: string }) =>
      settingsService.createUser(user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] });
    },
  });
};

/**
 * Hook to update user
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, user }: { id: string; user: Partial<Omit<User, 'id' | 'created_at'>> }) =>
      settingsService.updateUser(id, user),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'users', variables.id] });
    },
  });
};
/**
 * Hook to update current user profile
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profile: { name?: string; email?: string; password?: string }) =>
      settingsService.updateProfile(profile),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] });
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['settings', 'users', data.id] });
      }
    },
  });
};

/**
 * Hook to delete user
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => settingsService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] });
    },
  });
};

/**
 * Hook to update user last login
 */
export const useUpdateUserLastLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => settingsService.updateUserLastLogin(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'users', id] });
    },
  });
};

// ============================================
// NOTIFICATIONS HOOKS
// ============================================

/**
 * Hook to fetch notifications for a user
 */
export const useNotifications = (userId?: string | null) => {
  const validUserId = userId && isValidUUID(userId) ? userId : null;
  return useQuery({
    queryKey: ['settings', 'notifications', validUserId || 'all'],
    queryFn: () => settingsService.getNotifications(validUserId || undefined),
    staleTime: 30000, // 30 seconds (notifications change frequently)
    refetchInterval: 60000, // Refetch every minute
  });
};

/**
 * Hook to fetch unread notifications count
 */
export const useUnreadNotificationsCount = (userId?: string | null) => {
  const validUserId = userId && isValidUUID(userId) ? userId : null;
  return useQuery({
    queryKey: ['settings', 'notifications', 'unread-count', validUserId || 'all'],
    queryFn: () => settingsService.getUnreadNotificationsCount(validUserId || undefined),
    staleTime: 30000,
    refetchInterval: 60000,
  });
};

/**
 * Hook to create notification
 */
export const useCreateNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notification: Omit<Notification, 'id' | 'created_at' | 'read_at'>) =>
      settingsService.createNotification(notification),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'notifications', 'unread-count'] });
    },
  });
};

/**
 * Hook to mark notification as read
 */
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => settingsService.markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'notifications', 'unread-count'] });
    },
  });
};

/**
 * Hook to mark all notifications as read
 */
export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId?: string | null) => settingsService.markAllNotificationsAsRead(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'notifications', 'unread-count'] });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['settings', 'notifications', userId] });
      }
    },
  });
};

/**
 * Hook to delete notification
 */
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => settingsService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'notifications', 'unread-count'] });
    },
  });
};

/**
 * Hook to delete all notifications
 */
export const useDeleteAllNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId?: string | null) => settingsService.deleteAllNotifications(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'notifications', 'unread-count'] });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['settings', 'notifications', userId] });
      }
    },
  });
};
