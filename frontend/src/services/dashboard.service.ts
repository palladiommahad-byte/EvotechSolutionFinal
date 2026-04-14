/**
 * Dashboard Service
 * Handles all API operations for dashboard statistics
 */

import { apiClient } from '@/lib/api-client';

export interface TopProduct {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  revenue: number;
  color: string;
}

export interface StockByCategory {
  category: string;
  stock: number;
  color: string;
}

export interface RecentActivity {
  type: 'invoice' | 'purchase';
  reference: string;
  amount: number;
  date: string;
  status: string;
  created_at: string;
}

export interface StockAlert {
  id: string;
  name: string;
  sku: string;
  stock: number;
  min_stock: number;
  status: string;
}

export interface DashboardData {
  kpis: {
    total_sales: number;
    total_earnings: number;
    total_orders: number;
    total_stock_value: number;
  };
  comparisons: {
    sales: { current: number; previous: number };
    earnings: { current: number; previous: number };
    orders: { current: number; previous: number };
  };
}

export interface SalesChartItem {
  label: string;
  value: number;
}

export interface RevenueChartItem {
  month: string;
  revenue: number;
  expenses: number;
}

export const dashboardService = {
  /**
   * Get dashboard statistics and comparisons
   */
  async getDashboardData(): Promise<DashboardData | null> {
    try {
      return await apiClient.get<DashboardData>('/dashboard/stats');
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return null;
    }
  },

  /**
   * Get sales chart data
   */
  async getSalesChartData(): Promise<SalesChartItem[]> {
    try {
      return await apiClient.get<SalesChartItem[]>('/dashboard/sales-chart');
    } catch (error) {
      console.error('Error fetching sales chart data:', error);
      return [];
    }
  },

  /**
   * Get revenue chart data
   */
  async getRevenueChartData(): Promise<RevenueChartItem[]> {
    try {
      return await apiClient.get<RevenueChartItem[]>('/dashboard/revenue-chart');
    } catch (error) {
      console.error('Error fetching revenue chart data:', error);
      return [];
    }
  },

  /**
   * Get stock by category distribution
   */
  async getStockByCategory(): Promise<StockByCategory[]> {
    try {
      return await apiClient.get<StockByCategory[]>('/dashboard/stock-by-category');
    } catch (error) {
      console.error('Error fetching stock by category:', error);
      return [];
    }
  },

  /**
   * Get top selling products
   */
  async getTopProducts(limit = 10): Promise<TopProduct[]> {
    try {
      return await apiClient.get<TopProduct[]>(`/dashboard/top-products?limit=${limit}`);
    } catch (error) {
      console.error('Error fetching top products:', error);
      return [];
    }
  },

  /**
   * Get stock alerts
   */
  async getLowStockAlerts(): Promise<StockAlert[]> {
    try {
      return await apiClient.get<StockAlert[]>('/dashboard/stock-alerts');
    } catch (error) {
      console.error('Error fetching stock alerts:', error);
      return [];
    }
  },

  /**
   * Get recent activity
   */
  async getRecentActivity(limit = 20): Promise<RecentActivity[]> {
    try {
      return await apiClient.get<RecentActivity[]>(`/dashboard/recent-activity?limit=${limit}`);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  },
};
