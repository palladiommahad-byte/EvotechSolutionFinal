const express = require('express');
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

const router = express.Router();

router.use(verifyToken);

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics
 */
router.get('/stats', asyncHandler(async (req, res) => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    // Previous month range
    const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
    const endOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];

    // --- CURRENT MONTH ---
    // Total revenue (paid invoices this month)
    const revenueResult = await query(
        `SELECT COALESCE(SUM(total), 0) as total FROM invoices 
     WHERE status = 'paid' AND date >= $1 AND date <= $2`,
        [startOfMonth, endOfMonth]
    );

    // Total expenses (paid purchase invoices this month)
    const expensesResult = await query(
        `SELECT COALESCE(SUM(total), 0) as total FROM purchase_invoices 
     WHERE status = 'paid' AND date >= $1 AND date <= $2`,
        [startOfMonth, endOfMonth]
    );

    // Total orders (paid invoices this month)
    const ordersResult = await query(
        `SELECT COUNT(*) as count FROM invoices 
     WHERE status = 'paid' AND date >= $1 AND date <= $2`,
        [startOfMonth, endOfMonth]
    );

    // --- PREVIOUS MONTH ---
    const prevRevenueResult = await query(
        `SELECT COALESCE(SUM(total), 0) as total FROM invoices 
     WHERE status = 'paid' AND date >= $1 AND date <= $2`,
        [startOfPrevMonth, endOfPrevMonth]
    );

    const prevExpensesResult = await query(
        `SELECT COALESCE(SUM(total), 0) as total FROM purchase_invoices 
     WHERE status = 'paid' AND date >= $1 AND date <= $2`,
        [startOfPrevMonth, endOfPrevMonth]
    );

    const prevOrdersResult = await query(
        `SELECT COUNT(*) as count FROM invoices 
     WHERE status = 'paid' AND date >= $1 AND date <= $2`,
        [startOfPrevMonth, endOfPrevMonth]
    );

    // --- GLOBAL STATS ---
    // Total stock value (SUM(stock * price) - using price since purchase_price might not exist)
    const stockValueResult = await query(
        `SELECT COALESCE(SUM(stock * price), 0) as total FROM products WHERE is_deleted = false`
    );

    const currentRevenue = parseFloat(revenueResult.rows[0].total);
    const currentExpenses = parseFloat(expensesResult.rows[0].total);
    const prevRevenue = parseFloat(prevRevenueResult.rows[0].total);
    const prevExpenses = parseFloat(prevExpensesResult.rows[0].total);

    res.json({
        kpis: {
            total_sales: currentRevenue,
            total_earnings: currentRevenue - currentExpenses,
            total_orders: parseInt(ordersResult.rows[0].count),
            total_stock_value: parseFloat(stockValueResult.rows[0].total),
        },
        comparisons: {
            sales: {
                current: currentRevenue,
                previous: prevRevenue
            },
            earnings: {
                current: currentRevenue - currentExpenses,
                previous: prevRevenue - prevExpenses
            },
            orders: {
                current: parseInt(ordersResult.rows[0].count),
                previous: parseInt(prevOrdersResult.rows[0].count)
            }
        }
    });
}));

/**
 * GET /api/dashboard/sales-chart
 * Get daily sales for current month
 */
router.get('/sales-chart', asyncHandler(async (req, res) => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

    const result = await query(
        `SELECT TO_CHAR(date, 'DD') as label, COALESCE(SUM(total), 0) as value
     FROM invoices 
     WHERE status = 'paid' AND date >= $1
     GROUP BY date
     ORDER BY date`,
        [startOfMonth]
    );

    res.json(result.rows);
}));

/**
 * GET /api/dashboard/revenue-chart
 * Get monthly revenue and expenses for last 12 months
 */
router.get('/revenue-chart', asyncHandler(async (req, res) => {
    const result = await query(
        `WITH months AS (
        SELECT generate_series(
          date_trunc('month', current_date - interval '11 months'),
          date_trunc('month', current_date),
          interval '1 month'
        )::date as month_date
      ),
      monthly_revenue AS (
        SELECT date_trunc('month', date)::date as month_date, SUM(total) as revenue
        FROM invoices WHERE status = 'paid'
        GROUP BY 1
      ),
      monthly_expenses AS (
        SELECT date_trunc('month', date)::date as month_date, SUM(total) as expenses
        FROM purchase_invoices WHERE status = 'paid'
        GROUP BY 1
      )
      SELECT 
        TO_CHAR(m.month_date, 'Mon') as month,
        COALESCE(r.revenue, 0) as revenue,
        COALESCE(e.expenses, 0) as expenses
      FROM months m
      LEFT JOIN monthly_revenue r ON m.month_date = r.month_date
      LEFT JOIN monthly_expenses e ON m.month_date = e.month_date
      ORDER BY m.month_date`
    );

    res.json(result.rows);
}));

/**
 * GET /api/dashboard/top-products
 */
router.get('/top-products', asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    const result = await query(
        `SELECT p.id, p.name, p.sku, 
             COALESCE(SUM(ii.quantity), 0) as quantity, 
             COALESCE(SUM(ii.total), 0) as revenue
      FROM products p
      LEFT JOIN invoice_items ii ON p.id = ii.product_id
      LEFT JOIN invoices i ON ii.invoice_id = i.id AND i.status = 'paid'
      WHERE p.is_deleted = false
      GROUP BY p.id, p.name, p.sku
      ORDER BY quantity DESC
      LIMIT $1`,
        [limit]
    );

    res.json(result.rows.map((r, i) => ({
        ...r,
        quantity: parseFloat(r.quantity),
        revenue: parseFloat(r.revenue),
        color: colors[i % colors.length]
    })));
}));

/**
 * GET /api/dashboard/recent-activity
 * Get recent activity
 */
router.get('/recent-activity', asyncHandler(async (req, res) => {
    const { limit = 20 } = req.query;

    const invoices = await query(
        `SELECT 'invoice' as type, document_id as reference, total as amount, date, status, created_at
     FROM invoices ORDER BY created_at DESC LIMIT $1`,
        [parseInt(limit)]
    );

    const purchases = await query(
        `SELECT 'purchase' as type, document_id as reference, total as amount, date, status, created_at
     FROM purchase_invoices ORDER BY created_at DESC LIMIT $1`,
        [parseInt(limit)]
    );

    const activity = [...invoices.rows, ...purchases.rows]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, parseInt(limit));

    res.json(activity);
}));

/**
 * GET /api/dashboard/stock-by-category
 */
router.get('/stock-by-category', asyncHandler(async (req, res) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const result = await query(
        `SELECT category, SUM(stock) as stock 
     FROM products 
     WHERE is_deleted = false AND category IS NOT NULL
     GROUP BY category
     ORDER BY stock DESC`
    );

    res.json(result.rows.map((r, i) => ({
        ...r,
        stock: parseInt(r.stock),
        color: colors[i % colors.length]
    })));
}));

/**
 * GET /api/dashboard/stock-alerts
 * Get stock alerts
 */
router.get('/stock-alerts', asyncHandler(async (req, res) => {
    const result = await query(
        `SELECT id, name, sku, stock, min_stock
     FROM products
     WHERE is_deleted = false AND stock <= min_stock
     ORDER BY stock ASC
     LIMIT 10`
    );

    res.json(result.rows.map(p => ({
        ...p,
        stock: parseInt(p.stock),
        min_stock: parseInt(p.min_stock),
        status: p.stock <= 0 ? 'out_of_stock' : 'low_stock'
    })));
}));

module.exports = router;
