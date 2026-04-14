import { useEffect } from 'react';
import { useSales } from '@/contexts/SalesContext';
import { useTreasury } from '@/contexts/TreasuryContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInDays, isPast, parseISO, isSameDay } from 'date-fns';
import { useTranslation } from 'react-i18next';

export const BusinessMonitors = () => {
    const { invoices, deliveryNotes, isLoading: isSalesLoading } = useSales();
    const { realTimeBalance, isLoading: isTreasuryLoading } = useTreasury();
    const { notifications, addNotification } = useNotifications();
    const { user } = useAuth();
    const { t } = useTranslation();

    // 1. Overdue Invoices Monitor
    useEffect(() => {
        if (isSalesLoading || !user || !invoices.length) return;

        const checkOverdue = async () => {
            const today = new Date();

            for (const inv of invoices) {
                if (inv.status === 'paid' || inv.status === 'cancelled' || !inv.dueDate) continue;

                const dueDate = parseISO(inv.dueDate);

                if (isPast(dueDate) && !isSameDay(dueDate, today)) {
                    const daysOverdue = differenceInDays(today, dueDate);
                    const title = t('notificationAlerts.billing.overdueTitle', { id: inv.documentId });
                    const message = t('notificationAlerts.billing.overdueMessage', {
                        client: inv.client,
                        amount: inv.total,
                        days: daysOverdue
                    });

                    // Check existing
                    const alreadyExists = notifications.some(n => n.title === title && !n.read);

                    if (!alreadyExists) {
                        await addNotification({
                            title,
                            message,
                            type: 'error',
                            actionLabel: t('notificationAlerts.actions.viewInvoice'),
                            actionUrl: '/sales?tab=invoice'
                        });
                        await new Promise(r => setTimeout(r, 500));
                    }
                }
            }
        };

        // Delay check
        const timer = setTimeout(checkOverdue, 5000);
        return () => clearTimeout(timer);
    }, [invoices, isSalesLoading, user, t]);

    // 2. Pending Orders (Delivery Notes) Monitor
    // Alerts for pending items that might need processing
    useEffect(() => {
        if (isSalesLoading || !user || !deliveryNotes.length) return;

        const checkPendingOrders = async () => {
            const pendingCount = deliveryNotes.filter(dn => dn.status === 'pending').length;

            if (pendingCount > 0) {
                const title = t('notificationAlerts.sales.pendingTitle');
                // Only notify if we haven't notified about this specific count recently,
                // OR simply check if there is an unread alert for "Pending Orders Alert"
                // To avoid spam, we might only notify if count > X or just once per login session?
                // Current logic: If unread notification exists, do nothing.

                const alreadyExists = notifications.some(n => n.title === title && !n.read);

                if (!alreadyExists) {
                    await addNotification({
                        title,
                        message: t('notificationAlerts.sales.pendingMessage', { count: pendingCount }),
                        type: 'info',
                        actionLabel: t('notificationAlerts.actions.viewOrders'),
                        actionUrl: '/sales?tab=delivery_note'
                    });
                }
            }
        };

        const timer = setTimeout(checkPendingOrders, 10000);
        return () => clearTimeout(timer);
    }, [deliveryNotes, isSalesLoading, user, t]);

    // 3. Low Cash Flow Monitor
    useEffect(() => {
        if (isTreasuryLoading || !user) return;

        const checkCashFlow = async () => {
            const balance = realTimeBalance;
            const title = t('notificationAlerts.treasury.lowCashTitle');

            let type: 'error' | 'warning' | null = null;
            let message = '';

            if (balance < 0) {
                type = 'error';
                message = t('notificationAlerts.treasury.criticalCashMessage', { amount: balance.toFixed(2) });
            } else if (balance < 5000) { // Threshold
                type = 'warning';
                message = t('notificationAlerts.treasury.lowCashMessage', { amount: balance.toFixed(2) });
            }

            if (type) {
                // Unique check to handle updating severity?
                // For now, simple check
                const alreadyExists = notifications.some(n => n.title === title && !n.read);

                if (!alreadyExists) {
                    await addNotification({
                        title,
                        message,
                        type,
                        actionLabel: t('notificationAlerts.actions.viewTreasury'),
                        actionUrl: '/treasury'
                    });
                }
            }
        };

        const timer = setTimeout(checkCashFlow, 8000);
        return () => clearTimeout(timer);
    }, [realTimeBalance, isTreasuryLoading, user, t]);

    return null;
};
