import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StockAlert } from '@/services/dashboard.service';
import { useTranslation } from 'react-i18next';

interface StockAlertCardProps {
  data?: StockAlert[];
}

const getStockStatus = (stock: number, threshold: number, t: any) => {
  const ratio = stock / threshold;
  if (ratio <= 0.2) return { label: t('status.critical', 'Critical'), color: 'bg-destructive text-destructive-foreground' };
  if (ratio <= 0.5) return { label: t('status.lowStock', 'Low Stock'), color: 'bg-warning text-warning-foreground' };
  if (ratio <= 0.8) return { label: t('status.medium', 'Medium'), color: 'bg-info text-info-foreground' };
  return { label: t('status.good', 'Good'), color: 'bg-success text-success-foreground' };
};

export const StockAlertCard = ({ data: stockItems = [] }: StockAlertCardProps) => {
  const { t } = useTranslation();
  const criticalCount = stockItems.filter(item => item.stock / (item.min_stock || 1) <= 0.2).length;

  return (
    <div className="card-elevated p-6 animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0 overflow-visible">
          <h3 className="text-lg font-heading font-semibold text-foreground">{t('dashboard.stockAlerts')}</h3>
          <p className="text-xl sm:text-2xl font-bold text-foreground mt-1 break-words overflow-visible whitespace-normal leading-tight">{stockItems.length} {t('dashboard.products')}</p>
          <p className="text-sm text-warning">{t('dashboard.inventoryStatus')}</p>
        </div>
        {criticalCount > 0 && (
          <div className="p-2 bg-destructive/10 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground pb-3 w-[40%]">{t('dashboard.products')}</th>
              <th className="text-left text-xs font-medium text-muted-foreground pb-3 w-[25%]">{t('inventory.sku')}</th>
              <th className="text-center text-xs font-medium text-muted-foreground pb-3 w-[20%]">{t('inventory.stockQuantity')}</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-3 w-[15%]">{t('common.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {stockItems.map((item, index) => {
              const status = getStockStatus(item.stock, item.min_stock || 1, t);
              return (
                <tr key={index}>
                  <td className="py-3 overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        item.stock / (item.min_stock || 1) <= 0.2 ? 'bg-destructive' :
                          item.stock / (item.min_stock || 1) <= 0.5 ? 'bg-warning' :
                            item.stock / (item.min_stock || 1) <= 0.8 ? 'bg-info' : 'bg-success'
                      )} />
                      <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-sm text-muted-foreground truncate">{item.sku}</td>
                  <td className="py-3 text-center overflow-hidden">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-sm whitespace-nowrap">
                      <span className="font-medium text-foreground">{item.stock}</span>
                      <span className="text-muted-foreground">/{item.min_stock}</span>
                    </div>
                  </td>
                  <td className="py-3 text-right overflow-hidden">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
                      status.color
                    )}>
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
