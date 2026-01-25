import { useEffect } from 'react';
import { useProducts } from '@/contexts/ProductsContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export const StockMonitor = () => {
    const { products, isLoading } = useProducts();
    const { notifications, addNotification } = useNotifications();
    const { user } = useAuth();
    const { t } = useTranslation();

    // Use a ref to track if we've already checked this session/batch to avoid endless loops
    // However, we want it to react to product updates.
    // We can track "last checked timestamp" or just rely on existing notification check.

    useEffect(() => {
        if (isLoading || !user || !products.length) return;

        const checkStock = async () => {
            // 1. Identify Low Stock Items
            // We only want to notify about critical or low stock

            for (const product of products) {
                // Calculate total stock across all warehouses (assuming global alert for now)
                // Or if we want warehouse specific, we'd need to check product.stock (which is total)
                // The Product interface usually has `stock` (number) and `minStock` (number).

                const currentStock = product.stock;
                const minStock = product.minStock || 0;

                let shouldNotify = false;
                let type: 'warning' | 'error' = 'warning';
                let title = '';
                let message = '';

                if (currentStock <= 0) {
                    shouldNotify = true;
                    type = 'error';
                    title = t('notificationAlerts.stock.outTitle', { product: product.name });
                    message = t('notificationAlerts.stock.outMessage', { product: product.name });
                } else if (currentStock <= minStock) {
                    shouldNotify = true;
                    type = 'warning';
                    title = t('notificationAlerts.stock.lowTitle', { product: product.name });
                    message = t('notificationAlerts.stock.lowMessage', {
                        product: product.name,
                        current: currentStock,
                        min: minStock
                    });
                }

                if (shouldNotify) {
                    // Check if we already have an UNREAD notification for this product to avoid spam
                    // We look for a similar title.
                    const alreadyExists = notifications.some(
                        n => n.title === title && !n.read
                    );

                    if (!alreadyExists) {
                        // Create notification
                        await addNotification({
                            title,
                            message,
                            type,
                            actionLabel: t('notificationAlerts.actions.viewInventory'),
                            actionUrl: '/inventory'
                        });
                        // Add a small delay to avoid hammering the API if many items are low
                        await new Promise(r => setTimeout(r, 500));
                    }
                }
            }
        };

        // Defer the check slightly to ensure app is settled
        const timer = setTimeout(() => {
            checkStock();
        }, 2000);

        return () => clearTimeout(timer);

    }, [products, isLoading, user, t]); // Re-run when products change

    return null; // Renderless component
};
