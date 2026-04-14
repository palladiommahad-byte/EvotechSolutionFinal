import { Package, TrendingUp, AlertTriangle, Box } from 'lucide-react';
import { formatMAD } from '@/lib/moroccan-utils';
import { useProducts } from '@/contexts/ProductsContext';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export const InventoryStatsCard = () => {
  const { t } = useTranslation();
  const { products, isLoading } = useProducts();

  // Calculate inventory stats from real product data
  const inventoryStats = useMemo(() => {
    if (isLoading || products.length === 0) {
      return {
        totalProducts: 0,
        totalCategories: 0,
        totalStockValue: 0,
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
        totalUnits: 0,
      };
    }

    const categories = new Set(products.map(p => p.category));
    const totalStockValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
    const totalUnits = products.reduce((sum, p) => sum + p.stock, 0);

    const inStock = products.filter(p => p.status === 'in_stock').length;
    const lowStock = products.filter(p => p.status === 'low_stock').length;
    const outOfStock = products.filter(p => p.status === 'out_of_stock').length;

    return {
      totalProducts: products.length,
      totalCategories: categories.size,
      totalStockValue,
      inStock,
      lowStock,
      outOfStock,
      totalUnits,
    };
  }, [products, isLoading]);

  const stockStatusCount = inventoryStats.inStock + inventoryStats.lowStock + inventoryStats.outOfStock;
  const inStockPercentage = stockStatusCount > 0
    ? ((inventoryStats.inStock / stockStatusCount) * 100).toFixed(0)
    : '0';

  return (
    <div className="card-elevated p-6 animate-slide-up">
      <div className="mb-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-heading font-semibold text-foreground mb-1">{t('dashboard.inventoryStats')}</h3>
            <p className="text-sm text-muted-foreground">{t('dashboard.atWarehouse')}</p>
          </div>
          <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0 ml-4">
            <Box className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-section rounded-lg border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground">{t('inventory.allProducts')}</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{inventoryStats.totalProducts}</p>
        </div>
        <div className="p-4 bg-section rounded-lg border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <p className="text-xs font-medium text-muted-foreground">{t('inventory.inStock')}</p>
          </div>
          <p className="text-2xl font-bold text-success">{inventoryStats.inStock}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{inStockPercentage}% {t('status.available', 'Available')}</p>
        </div>
      </div>

      {/* Stock Status Breakdown */}
      <div className="space-y-3 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success"></div>
            <span className="text-sm text-foreground">{t('inventory.inStock')}</span>
          </div>
          <span className="text-sm font-semibold text-foreground">{inventoryStats.inStock}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-warning"></div>
            <span className="text-sm text-foreground">{t('inventory.lowStock')}</span>
          </div>
          <span className="text-sm font-semibold text-warning">{inventoryStats.lowStock}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-destructive"></div>
            <span className="text-sm text-foreground">{t('inventory.outOfStock')}</span>
          </div>
          <span className="text-sm font-semibold text-destructive">{inventoryStats.outOfStock}</span>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{t('dashboard.totalInventoryValue')}</span>
          <span className="text-lg font-bold text-foreground">{formatMAD(inventoryStats.totalStockValue)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('common.total')} {t('common.quantity')}</span>
          <span className="text-sm font-semibold text-foreground">{inventoryStats.totalUnits.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
