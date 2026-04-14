import { useMemo } from 'react';
import { Package, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { StockByCategoryChart } from '@/components/dashboard/StockByCategoryChart';
import { TopProductsChart } from '@/components/dashboard/TopProductsChart';
import { StockAlertCard } from '@/components/dashboard/StockAlertCard';
import { InventoryStatsCard } from '@/components/dashboard/InventoryStatsCard';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { formatMAD } from '@/lib/moroccan-utils';
import { useTranslation } from 'react-i18next';
import { useDashboardData } from '@/hooks/useDashboardData';

export const Dashboard = () => {
  const { t } = useTranslation();
  const { warehouseInfo, isAllWarehouses } = useWarehouse();

  // Fetch real data from database
  const {
    kpis,
    salesComparison,
    earningsComparison,
    ordersComparison,
    salesChartData,
    revenueChartData,
    stockByCategory,
    topProducts,
    stockAlerts,
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
          label: t('dashboard.vsLastMonth')
        },
        totalEarnings: {
          value: formatMAD(0),
          numericValue: 0,
          change: 0,
          label: t('dashboard.vsLastMonth')
        },
        totalOrders: {
          value: '0',
          change: 0,
          label: t('dashboard.newOrdersThisMonth')
        },
        totalStockValue: {
          value: formatMAD(0),
          numericValue: 0,
          change: 0,
          label: t('dashboard.totalInventoryValue')
        }
      };
    }

    const totalSales = kpis.total_sales || 0;
    const totalEarnings = kpis.total_earnings || 0;
    const totalOrders = kpis.total_orders || 0;
    const totalStockValueNum = kpis.total_stock_value || 0;

    // Calculate percentage changes
    const calcChange = (curr: number, prev: number) => {
      if (prev <= 0) return 0;
      return parseFloat(((curr - prev) / prev * 100).toFixed(1));
    };

    return {
      totalSales: {
        value: formatMAD(totalSales),
        numericValue: totalSales,
        change: calcChange(salesComparison.current, salesComparison.previous),
        label: t('dashboard.vsLastMonth')
      },
      totalEarnings: {
        value: formatMAD(totalEarnings),
        numericValue: totalEarnings,
        change: calcChange(earningsComparison.current, earningsComparison.previous),
        label: t('dashboard.vsLastMonth')
      },
      totalOrders: {
        value: totalOrders.toString(),
        change: calcChange(ordersComparison.current, ordersComparison.previous),
        label: t('dashboard.newOrdersThisMonth')
      },
      totalStockValue: {
        value: formatMAD(totalStockValueNum),
        numericValue: totalStockValueNum,
        change: 0,
        label: t('dashboard.totalInventoryValue')
      }
    };
  }, [kpis, salesComparison, earningsComparison, ordersComparison, isLoading, t]);

  // Format chart data
  const formattedSalesData = useMemo(() => {
    if (!salesChartData || salesChartData.length === 0) return undefined;

    return salesChartData.map(item => ({
      label: item.label,
      value: item.value,
      originalDate: item.label
    }));
  }, [salesChartData]);

  const formattedRevenueData = useMemo(() => {
    if (!revenueChartData || revenueChartData.length === 0) return undefined;

    return revenueChartData.map(item => ({
      month: item.month,
      revenue: item.revenue,
      expenses: item.expenses
    }));
  }, [revenueChartData]);

  return (
    <div className="space-y-6 pb-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-primary">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('dashboard.welcomeBack')} {isAllWarehouses ? t('dashboard.acrossAllWarehouses') : `${t('dashboard.atWarehouse')} ${warehouseInfo?.name}`}
        </p>
      </div>

      {/* KPI Cards - Optimized grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={t('dashboard.totalSales')}
          value={kpiData.totalSales.value}
          valueAsNumber={kpiData.totalSales.numericValue}
          change={kpiData.totalSales.change}
          changeLabel={kpiData.totalSales.label}
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
        />
        <KPICard
          title={t('dashboard.totalEarnings')}
          value={kpiData.totalEarnings.value}
          valueAsNumber={kpiData.totalEarnings.numericValue}
          change={kpiData.totalEarnings.change}
          changeLabel={kpiData.totalEarnings.label}
          icon={<DollarSign className="w-5 h-5 text-success" />}
          iconBg="bg-success/10"
        />
        <KPICard
          title={t('dashboard.totalOrders')}
          value={kpiData.totalOrders.value}
          change={kpiData.totalOrders.change}
          changeLabel={kpiData.totalOrders.label}
          icon={<ShoppingCart className="w-5 h-5 text-info" />}
          iconBg="bg-info/10"
        />
        <KPICard
          title={t('dashboard.stockValue')}
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
        <SalesChart data={formattedSalesData} />
        <RevenueChart data={formattedRevenueData} />
      </div>

      {/* Charts Row - Secondary Analytics - 2 columns per row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StockByCategoryChart data={stockByCategory} />
        <TopProductsChart data={topProducts} />
        <StockAlertCard data={stockAlerts} />
        <InventoryStatsCard />
      </div>

    </div>
  );
};
