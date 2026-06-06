import { useEffect, useRef } from 'react';
import { useProducts } from '@/contexts/ProductsContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export const StockMonitor = () => {
    const { products, isLoading } = useProducts();
    const { addNotification } = useNotifications();
    const { user } = useAuth();
    const { t } = useTranslation();

    // Session-level guard: each product stock alert fires only once per session
    // Prevents spam when staleTime: 0 causes frequent query refetches
    const notifiedKeys = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (isLoading || !user || !products.length) return;

        const timer = setTimeout(async () => {
            for (const product of products) {
                const currentStock = product.stock;
                const minStock = product.minStock || 0;

                if (currentStock <= 0) {
                    const key = `out-of-stock-${product.id}`;
                    if (notifiedKeys.current.has(key)) continue;
                    notifiedKeys.current.add(key);

                    await addNotification({
                        title: t('notificationAlerts.stock.outTitle', { product: product.name }),
                        message: t('notificationAlerts.stock.outMessage', { product: product.name }),
                        type: 'error',
                        actionLabel: t('notificationAlerts.actions.viewInventory'),
                        actionUrl: '/inventory'
                    });
                    await new Promise(r => setTimeout(r, 300));

                } else if (currentStock <= minStock) {
                    const key = `low-stock-${product.id}`;
                    if (notifiedKeys.current.has(key)) continue;
                    notifiedKeys.current.add(key);

                    await addNotification({
                        title: t('notificationAlerts.stock.lowTitle', { product: product.name }),
                        message: t('notificationAlerts.stock.lowMessage', {
                            product: product.name,
                            current: currentStock,
                            min: minStock
                        }),
                        type: 'warning',
                        actionLabel: t('notificationAlerts.actions.viewInventory'),
                        actionUrl: '/inventory'
                    });
                    await new Promise(r => setTimeout(r, 300));
                }
            }
        }, 2000);

        return () => clearTimeout(timer);

    }, [products, isLoading, user]);

    return null;
};
