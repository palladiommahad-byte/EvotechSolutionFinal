/**
 * Settings Service
 * Handles all API operations for settings (company, users, warehouses, notifications)
 */

import { apiClient } from '@/lib/api-client';

// ============================================
// COMPANY SETTINGS
// ============================================

export interface CompanySettings {
  id: string;
  name: string;
  legal_form?: string;
  email?: string;
  phone?: string;
  address?: string;
  ice?: string;
  if_number?: string;
  rc?: string;
  tp?: string;
  patente?: string;
  cnss?: string;
  logo?: string | null;
  footer_text?: string;
  auto_number_documents?: boolean;
  pdf_primary_color?: string;
  pdf_title_color?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// USER PREFERENCES
// ============================================

export interface UserPreferences {
  id: string;
  user_id: string;
  theme_color?: 'navy' | 'indigo' | 'blue' | 'sky' | 'teal' | 'slate' | 'rose' | 'cyan' | 'yellow';
  language?: 'en' | 'fr';
  active_warehouse_id?: string | null;
  browser_notifications_enabled?: boolean;
  low_stock_alerts_enabled?: boolean;
  order_updates_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// WAREHOUSES
// ============================================

export interface Warehouse {
  id: string;
  name: string;
  city: string;
  address?: string;
  phone?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// USERS
// ============================================

export interface User {
  id: string;
  email?: string;
  name: string;
  password_hash: string;
  role_id: 'admin' | 'manager' | 'accountant' | 'staff';
  status: 'active' | 'inactive';
  last_login?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

// ============================================
// NOTIFICATIONS
// ============================================

export interface Notification {
  id: string;
  user_id?: string | null;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  action_url?: string;
  action_label?: string;
  created_at?: string;
  read_at?: string;
}

// ============================================
// SETTINGS SERVICE
// ============================================

export const settingsService = {
  // Company Settings
  async getCompanySettings(): Promise<CompanySettings | null> {
    try {
      return await apiClient.get<CompanySettings>('/settings/company');
    } catch (error) {
      console.error('Error fetching company settings:', error);
      return null;
    }
  },

  async updateCompanySettings(settings: Partial<CompanySettings>): Promise<CompanySettings | null> {
    try {
      return await apiClient.put<CompanySettings>('/settings/company', settings);
    } catch (error) {
      console.error('Error updating company settings:', error);
      throw error;
    }
  },

  // User Preferences
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      return await apiClient.get<UserPreferences>(`/settings/preferences/${userId}`);
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return null;
    }
  },

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences | null> {
    try {
      return await apiClient.put<UserPreferences>(`/settings/preferences/${userId}`, preferences);
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return null;
    }
  },

  // Warehouses
  async getWarehouses(): Promise<Warehouse[]> {
    try {
      return await apiClient.get<Warehouse[]>('/settings/warehouses');
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      return [];
    }
  },

  async getWarehouseById(id: string): Promise<Warehouse | null> {
    try {
      return await apiClient.get<Warehouse>(`/settings/warehouses/${id}`);
    } catch (error) {
      console.error('Error fetching warehouse:', error);
      return null;
    }
  },

  async createWarehouse(warehouse: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>): Promise<Warehouse | null> {
    try {
      return await apiClient.post<Warehouse>('/settings/warehouses', warehouse);
    } catch (error) {
      console.error('Error creating warehouse:', error);
      return null;
    }
  },

  async updateWarehouse(id: string, warehouse: Partial<Omit<Warehouse, 'id' | 'created_at'>>): Promise<Warehouse | null> {
    try {
      return await apiClient.put<Warehouse>(`/settings/warehouses/${id}`, warehouse);
    } catch (error) {
      console.error('Error updating warehouse:', error);
      return null;
    }
  },

  async deleteWarehouse(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/settings/warehouses/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      return false;
    }
  },

  // Users
  async getUsers(): Promise<User[]> {
    try {
      return await apiClient.get<User[]>('/settings/users');
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  async getUserById(id: string): Promise<User | null> {
    try {
      return await apiClient.get<User>(`/settings/users/${id}`);
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  },

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      // This is handled via auth route for security
      return await apiClient.get<User>(`/settings/users/email/${email}`);
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  },

  async createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_login' | 'password_hash'> & { password: string }): Promise<User | null> {
    try {
      return await apiClient.post<User>('/settings/users', user);
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  },

  async updateUser(id: string, user: Partial<Omit<User, 'id' | 'created_at'>> & { password?: string }): Promise<User | null> {
    try {
      return await apiClient.put<User>(`/settings/users/${id}`, user);
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  },

  async updateProfile(profile: { name?: string; email?: string; password?: string }): Promise<User | null> {
    try {
      return await apiClient.put<User>('/settings/profile', profile);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  async deleteUser(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/settings/users/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  },

  async updateUserLastLogin(id: string): Promise<boolean> {
    try {
      await apiClient.patch(`/settings/users/${id}/last-login`, {});
      return true;
    } catch (error) {
      console.error('Error updating user last login:', error);
      return false;
    }
  },

  // Notifications
  async getNotifications(userId?: string | null): Promise<Notification[]> {
    try {
      return await apiClient.get<Notification[]>('/settings/notifications');
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  async getUnreadNotificationsCount(userId?: string | null): Promise<number> {
    try {
      const result = await apiClient.get<{ count: number }>('/settings/notifications/unread/count');
      return result.count;
    } catch (error) {
      console.error('Error fetching unread notifications count:', error);
      return 0;
    }
  },

  async createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'read_at'>): Promise<Notification | null> {
    try {
      return await apiClient.post<Notification>('/settings/notifications', notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  },

  async markNotificationAsRead(id: string): Promise<boolean> {
    try {
      await apiClient.patch(`/settings/notifications/${id}/read`, {});
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  },

  async markAllNotificationsAsRead(userId?: string | null): Promise<boolean> {
    try {
      await apiClient.patch('/settings/notifications/read-all', {});
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  },

  async deleteNotification(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/settings/notifications/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  },

  async deleteAllNotifications(userId?: string | null): Promise<boolean> {
    try {
      await apiClient.delete('/settings/notifications');
      return true;
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      return false;
    }
  },
};
