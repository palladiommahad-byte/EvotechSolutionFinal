/**
 * Custom hook for fetching dashboard data
 * Uses React Query for caching and automatic refetching
 */

import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard.service';

export const useDashboardData = () => {
  // Fetch Dashboard Stats (KPIs and Comparisons)
  const { data: dashboardData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats-comprehensive'],
    queryFn: () => dashboardService.getDashboardData(),
    staleTime: 60000,
  });

  // Fetch sales chart data
  const { data: salesChartData, isLoading: salesChartLoading } = useQuery({
    queryKey: ['dashboard', 'sales-chart'],
    queryFn: () => dashboardService.getSalesChartData(),
    staleTime: 300000,
  });

  // Fetch revenue chart data
  const { data: revenueChartData, isLoading: revenueChartLoading } = useQuery({
    queryKey: ['dashboard', 'revenue-chart'],
    queryFn: () => dashboardService.getRevenueChartData(),
    staleTime: 300000,
  });

  const { data: stockByCategory, isLoading: stockByCategoryLoading } = useQuery({
    queryKey: ['dashboard', 'stock-by-category'],
    queryFn: () => dashboardService.getStockByCategory(),
    staleTime: 300000,
  });

  const { data: topProducts, isLoading: topProductsLoading } = useQuery({
    queryKey: ['dashboard', 'top-products'],
    queryFn: () => dashboardService.getTopProducts(),
    staleTime: 300000,
  });

  const { data: stockAlerts, isLoading: stockAlertsLoading } = useQuery({
    queryKey: ['dashboard', 'stock-alerts'],
    queryFn: () => dashboardService.getLowStockAlerts(),
    staleTime: 60000,
  });

  return {
    kpis: dashboardData?.kpis || {
      total_sales: 0,
      total_earnings: 0,
      total_orders: 0,
      total_stock_value: 0,
    },
    salesComparison: dashboardData?.comparisons?.sales || { current: 0, previous: 0 },
    earningsComparison: dashboardData?.comparisons?.earnings || { current: 0, previous: 0 },
    ordersComparison: dashboardData?.comparisons?.orders || { current: 0, previous: 0 },
    salesChartData: salesChartData || [],
    revenueChartData: revenueChartData || [],
    stockByCategory: stockByCategory || [],
    topProducts: topProducts || [],
    stockAlerts: stockAlerts || [],
    isLoading:
      statsLoading ||
      salesChartLoading ||
      revenueChartLoading ||
      stockByCategoryLoading ||
      topProductsLoading ||
      stockAlertsLoading,
  };
};
