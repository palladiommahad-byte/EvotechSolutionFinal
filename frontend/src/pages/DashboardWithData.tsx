/**
 * DashboardWithData - Wrapper Component
 * 
 * This is a wrapper around the existing Dashboard component that fetches
 * real data from the database and passes it as props.
 * 
 * USAGE: Replace <Dashboard /> with <DashboardWithData /> in your routes
 * 
 * This file is a SAFE WRAPPER - it doesn't modify the original Dashboard.tsx
 */

import { useMemo } from 'react';
import { TrendingUp, DollarSign, ShoppingCart, Package, AlertCircle, FileText } from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { StockByCategoryChart } from '@/components/dashboard/StockByCategoryChart';
import { TopProductsChart } from '@/components/dashboard/TopProductsChart';
import { StockAlertCard } from '@/components/dashboard/StockAlertCard';
import { InventoryStatsCard } from '@/components/dashboard/InventoryStatsCard';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { formatMAD } from '@/lib/moroccan-utils';
import { useDashboardData } from '@/hooks/useDashboardData';

export const DashboardWithData = () => {
  const { warehouseInfo, isAllWarehouses } = useWarehouse();

  // Fetch real data from database
  const {
    kpis,
    salesComparison,
    earningsComparison,
    ordersComparison,
    isLoading,
  } = useDashboardData();

  // Calculate KPI data with real database values
  const kpiData = useMemo(() => {
    if (isLoading) {
      // Return loading state with zeros
      return {
        totalSales: {
          value: formatMAD(0),
          numericValue: 0,
          change: 0,
          label: 'vs Last Month'
        },
        totalEarnings: {
          value: formatMAD(0),
          numericValue: 0,
          change: 0,
          label: 'vs Last Month'
        },
        totalOrders: {
          value: '0',
          change: 0,
          label: 'New Orders This Month'
        },
        totalStockValue: {
          value: formatMAD(0),
          numericValue: 0,
          change: 0,
          label: 'Total Inventory Value'
        }
      };
    }

    // Helper to safely parse numbers
    const parseNumber = (val: any) => {
      if (typeof val === "number") return val;
      if (typeof val === "string") {
        // Remove 'MAD' or other non-numeric chars if present, but keep dots
        const cleanVal = val.replace(/[^0-9.-]/g, '');
        const n = parseFloat(cleanVal);
        return isNaN(n) ? 0 : n;
      }
      return 0;
    };

    const totalSales = parseNumber(kpis.total_sales);
    const totalEarnings = parseNumber(kpis.total_earnings);
    const totalOrders = parseNumber(kpis.total_orders); // Using parseNumber handles both int and float safely
    const totalStockValue = parseNumber(kpis.total_stock_value);

    // Calculate percentage changes
    const salesPrev = parseNumber(salesComparison?.previous);
    const salesCurr = parseNumber(salesComparison?.current);
    const salesChange = salesPrev > 0
      ? ((salesCurr - salesPrev) / salesPrev * 100)
      : 0;

    const earningsPrev = parseNumber(earningsComparison?.previous);
    const earningsCurr = parseNumber(earningsComparison?.current);
    const earningsChange = earningsPrev > 0
      ? ((earningsCurr - earningsPrev) / earningsPrev * 100)
      : 0;

    const ordersPrev = parseNumber(ordersComparison?.previous);
    const ordersCurr = parseNumber(ordersComparison?.current);
    const ordersChange = ordersPrev > 0
      ? ((ordersCurr - ordersPrev) / ordersPrev * 100)
      : 0;

    return {
      totalSales: {
        value: formatMAD(totalSales),
        numericValue: totalSales,
        change: parseFloat(salesChange.toFixed(1)),
        label: 'vs Last Month'
      },
      totalEarnings: {
        value: formatMAD(totalEarnings),
        numericValue: totalEarnings,
        change: parseFloat(earningsChange.toFixed(1)),
        label: 'vs Last Month'
      },
      totalOrders: {
        value: totalOrders.toString(),
        change: parseFloat(ordersChange.toFixed(1)),
        label: 'New Orders This Month'
      },
      totalStockValue: {
        value: formatMAD(totalStockValue),
        numericValue: totalStockValue,
        change: 0,
        label: 'Total Inventory Value'
      }
    };
  }, [kpis, salesComparison, earningsComparison, ordersComparison, isLoading]);

  return (
    <div className="space-y-6 pb-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-primary">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here's what's happening {isAllWarehouses ? 'across all warehouses' : `at ${warehouseInfo?.name}`}
        </p>
        {isLoading && (
          <p className="text-sm text-muted-foreground mt-2">Loading data...</p>
        )}
      </div>

      {/* KPI Cards - Using real database data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Sales"
          value={kpiData.totalSales.value}
          valueAsNumber={kpiData.totalSales.numericValue}
          change={kpiData.totalSales.change}
          changeLabel={kpiData.totalSales.label}
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
        />
        <KPICard
          title="Total Earnings"
          value={kpiData.totalEarnings.value}
          valueAsNumber={kpiData.totalEarnings.numericValue}
          change={kpiData.totalEarnings.change}
          changeLabel={kpiData.totalEarnings.label}
          icon={<DollarSign className="w-5 h-5 text-success" />}
          iconBg="bg-success/10"
        />
        <KPICard
          title="Total Orders"
          value={kpiData.totalOrders.value}
          change={kpiData.totalOrders.change}
          changeLabel={kpiData.totalOrders.label}
          icon={<ShoppingCart className="w-5 h-5 text-info" />}
          iconBg="bg-info/10"
        />
        <KPICard
          title="Stock Value"
          value={kpiData.totalStockValue.value}
          valueAsNumber={kpiData.totalStockValue.numericValue}
          change={kpiData.totalStockValue.change}
          changeLabel={kpiData.totalStockValue.label}
          icon={<Package className="w-5 h-5 text-warning" />}
          iconBg="bg-warning/10"
        />
      </div>

      {/* Charts Row - Main Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart />
        <RevenueChart />
      </div>

      {/* Charts Row - Secondary Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StockByCategoryChart />
        <TopProductsChart />
        <StockAlertCard />
        <InventoryStatsCard />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-elevated p-4 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Create Sale</p>
              <p className="text-xs text-muted-foreground">New order</p>
            </div>
          </div>
        </div>
        <div className="card-elevated p-4 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10 group-hover:bg-success/20 transition-colors">
              <Package className="w-5 h-5 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Add Product</p>
              <p className="text-xs text-muted-foreground">Inventory</p>
            </div>
          </div>
        </div>
        <div className="card-elevated p-4 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10 group-hover:bg-info/20 transition-colors">
              <FileText className="w-5 h-5 text-info" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">New Invoice</p>
              <p className="text-xs text-muted-foreground">Billing</p>
            </div>
          </div>
        </div>
        <div className="card-elevated p-4 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10 group-hover:bg-warning/20 transition-colors">
              <AlertCircle className="w-5 h-5 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Low Stock</p>
              <p className="text-xs text-muted-foreground">Check alerts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
