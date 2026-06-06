import { useEffect, useRef } from 'react';
import { useSales } from '@/contexts/SalesContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInDays, isPast, parseISO, isSameDay, format } from 'date-fns';
import { useTranslation } from 'react-i18next';

export const BusinessMonitors = () => {
    const { invoices, isLoading: isSalesLoading } = useSales();
    const { addNotification } = useNotifications();
    const { user } = useAuth();
    const { t } = useTranslation();

    // Session-level guard: tracks keys already notified this session
    // Prevents re-spam even when queries refetch with staleTime: 0
    const notifiedKeys = useRef<Set<string>>(new Set());

    // 1. Overdue Invoice Payment Alerts
    useEffect(() => {
        if (isSalesLoading || !user || !invoices.length) return;

        const timer = setTimeout(async () => {
            const today = new Date();

            for (const inv of invoices) {
                if (inv.status === 'paid' || inv.status === 'cancelled' || !inv.dueDate) continue;

                const dueDate = parseISO(inv.dueDate);

                // Overdue invoices
                if (isPast(dueDate) && !isSameDay(dueDate, today)) {
                    const daysOverdue = differenceInDays(today, dueDate);
                    const key = `overdue-${inv.id}`;
                    if (notifiedKeys.current.has(key)) continue;
                    notifiedKeys.current.add(key);

                    await addNotification({
                        title: t('notificationAlerts.billing.overdueTitle', { id: inv.documentId }),
                        message: t('notificationAlerts.billing.overdueMessage', {
                            client: inv.client,
                            amount: inv.total,
                            days: daysOverdue
                        }),
                        type: 'error',
                        actionLabel: t('notificationAlerts.actions.viewInvoice'),
                        actionUrl: '/sales?tab=invoice'
                    });
                    await new Promise(r => setTimeout(r, 300));
                }

                // Upcoming due in 3 days
                const daysUntilDue = differenceInDays(dueDate, today);
                if (daysUntilDue >= 0 && daysUntilDue <= 3) {
                    const key = `upcoming-${inv.id}`;
                    if (notifiedKeys.current.has(key)) continue;
                    notifiedKeys.current.add(key);

                    await addNotification({
                        title: `Facture à échéance dans ${daysUntilDue === 0 ? "aujourd'hui" : `${daysUntilDue}j`}`,
                        message: `La facture ${inv.documentId} (${inv.client}) de ${inv.total} DH est due le ${format(dueDate, 'dd/MM/yyyy')}.`,
                        type: 'warning',
                        actionLabel: t('notificationAlerts.actions.viewInvoice'),
                        actionUrl: '/sales?tab=invoice'
                    });
                    await new Promise(r => setTimeout(r, 300));
                }
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, [invoices, isSalesLoading, user]);

    // 2. Monthly VAT Declaration Reminder (due on the 20th of each month)
    useEffect(() => {
        if (!user) return;

        const timer = setTimeout(async () => {
            const today = new Date();
            const day = today.getDate();
            const monthYear = format(today, 'MM/yyyy');
            const key = `vat-reminder-${monthYear}`;

            // Warn between the 15th and 20th of each month
            if (day >= 15 && day <= 20 && !notifiedKeys.current.has(key)) {
                notifiedKeys.current.add(key);
                const daysLeft = 20 - day;

                await addNotification({
                    title: `Déclaration TVA — ${daysLeft === 0 ? "Échéance aujourd'hui !" : `${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}`}`,
                    message: `La déclaration de TVA mensuelle est due avant le 20 ${format(today, 'MMMM yyyy')}. Pensez à déposer votre déclaration.`,
                    type: daysLeft <= 1 ? 'error' : 'warning',
                    actionLabel: 'Voir Rapports Fiscaux',
                    actionUrl: '/tax-reports'
                });
            }
        }, 7000);

        return () => clearTimeout(timer);
    }, [user]);

    return null;
};
