const cron = require('node-cron');
const { query } = require('../config/database');

/**
 * Clean up old notifications
 * Deletes notifications older than 30 days
 */
async function cleanupOldNotifications() {
    try {
        await query("DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days'");
        console.log('Cleaned up old notifications');
    } catch (error) {
        console.error('Error cleaning up notifications:', error);
    }
}

/**
 * Check for overdue invoices
 * Runs daily at 9:00 AM
 */
async function checkOverdueInvoices() {
    try {
        // Find unpaid invoices that are past their due date
        const result = await query(
            "SELECT id, document_id, due_date, client_id, total FROM invoices WHERE status != 'paid' AND due_date < CURRENT_DATE"
        );

        for (const invoice of result.rows) {
            const daysOverdue = Math.floor((new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24));

            // Avoid spamming: Check if we recently sent a notification for this (optional enhancement, skipping for simplicity now)
            // For now, we'll just insert. A better approach would be to check if a notification exists for this invoice recently.

            // Get client name
            const clientResult = await query('SELECT name, company FROM contacts WHERE id = $1', [invoice.client_id]);
            const clientName = clientResult.rows[0]?.company || clientResult.rows[0]?.name || 'Unknown Client';

            await query(
                `INSERT INTO notifications (title, message, type, action_url, action_label, created_at)
         VALUES ($1, $2, 'warning', $3, 'View Invoice', NOW())`,
                [
                    'Overdue Invoice',
                    `Invoice ${invoice.document_id} for ${clientName} is overdue by ${daysOverdue} days.`,
                    `/sales/invoices/${invoice.id}`
                ]
            );
        }
        console.log(`Checked overdue invoices: found ${result.rows.length}`);
    } catch (error) {
        console.error('Error checking overdue invoices:', error);
    }
}

/**
 * Check for upcoming due dates (Reminders)
 * Runs daily at 9:00 AM
 */
async function checkUpcomingDueDates() {
    try {
        // Find unpaid invoices due in exactly 3 days
        const result = await query(
            "SELECT id, document_id, due_date, client_id, total FROM invoices WHERE status != 'paid' AND due_date = CURRENT_DATE + INTERVAL '3 days'"
        );

        for (const invoice of result.rows) {
            // Get client name
            const clientResult = await query('SELECT name, company FROM contacts WHERE id = $1', [invoice.client_id]);
            const clientName = clientResult.rows[0]?.company || clientResult.rows[0]?.name || 'Unknown Client';

            await query(
                `INSERT INTO notifications (title, message, type, action_url, action_label, created_at)
         VALUES ($1, $2, 'info', $3, 'View Invoice', NOW())`,
                [
                    'Upcoming Due Date',
                    `Invoice ${invoice.document_id} for ${clientName} is due in 3 days.`,
                    `/sales/invoices/${invoice.id}`
                ]
            );
        }
        console.log(`Checked upcoming due dates: found ${result.rows.length}`);
    } catch (error) {
        console.error('Error checking upcoming due dates:', error);
    }
}

/**
 * Check for low stock products
 * Runs daily at 9:00 AM (and can be triggered on product update)
 */
async function checkLowStock() {
    try {
        // Find products where current stock is less than or equal to min_stock
        // Only check if min_stock is set (> 0)
        const result = await query(
            "SELECT id, name, sku, stock, min_stock FROM products WHERE is_deleted = false AND min_stock > 0 AND stock <= min_stock"
        );

        for (const product of result.rows) {
            // Check if we already have an unread notification for this product to avoid spam
            const existing = await query(
                "SELECT id FROM notifications WHERE title = 'Low Stock Alert' AND message LIKE $1 AND read = false",
                [`%${product.name}%`]
            );

            if (existing.rows.length === 0) {
                await query(
                    `INSERT INTO notifications (title, message, type, action_url, action_label, created_at)
           VALUES ($1, $2, 'warning', $3, 'Update Stock', NOW())`,
                    [
                        'Low Stock Alert',
                        `Product "${product.name}" (${product.sku}) is running low. Current: ${product.stock}, Min: ${product.min_stock}`,
                        `/inventory/products/${product.id}`
                    ]
                );
            }
        }
        console.log(`Checked low stock: found ${result.rows.length}`);
    } catch (error) {
        console.error('Error checking low stock:', error);
    }
}

/**
 * Initialize all cron jobs
 */
function initCronJobs() {
    console.log('Initializing cron jobs...');

    // Run every day at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('Running daily jobs...');
        await checkOverdueInvoices();
        await checkUpcomingDueDates();
        await checkLowStock();
        await cleanupOldNotifications();
    });

    // Run immediately on startup for testing (optional, maybe remove for production)
    // setTimeout(async () => {
    //   console.log('Running startup checks...');
    //   await checkOverdueInvoices();
    //   await checkLowStock();
    // }, 10000);
}

module.exports = {
    initCronJobs,
    checkLowStock, // Exported to be called manually if needed (e.g., after stock update)
    checkOverdueInvoices // Exported for manual trigger testing
};
