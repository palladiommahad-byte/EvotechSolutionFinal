const express = require('express');
const { query, getClient } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

const router = express.Router();

router.use(verifyToken);

/**
 * GET /api/purchase-orders
 */
router.get('/', asyncHandler(async (req, res) => {
    const { status, supplierId, startDate, endDate } = req.query;

    let sql = `
    SELECT po.*, 
           s.id as supplier_id, s.name as supplier_name, s.company as supplier_company,
           s.email as supplier_email, s.phone as supplier_phone, s.ice as supplier_ice,
           s.if_number as supplier_if_number, s.rc as supplier_rc
    FROM purchase_orders po
    LEFT JOIN contacts s ON po.supplier_id = s.id
    WHERE 1=1
  `;
    const params = [];
    let paramIndex = 1;

    if (status) { sql += ` AND po.status = $${paramIndex++}`; params.push(status); }
    if (supplierId) { sql += ` AND po.supplier_id = $${paramIndex++}`; params.push(supplierId); }
    if (startDate) { sql += ` AND po.date >= $${paramIndex++}`; params.push(startDate); }
    if (endDate) { sql += ` AND po.date <= $${paramIndex++}`; params.push(endDate); }

    sql += ' ORDER BY po.date DESC, po.created_at DESC';

    const ordersResult = await query(sql, params);

    const orders = await Promise.all(
        ordersResult.rows.map(async (order) => {
            const itemsResult = await query(
                'SELECT * FROM purchase_order_items WHERE purchase_order_id = $1 ORDER BY created_at ASC',
                [order.id]
            );
            return {
                ...order,
                items: itemsResult.rows,
                supplier: order.supplier_name ? {
                    id: order.supplier_id, name: order.supplier_name, company: order.supplier_company,
                    email: order.supplier_email, phone: order.supplier_phone, ice: order.supplier_ice,
                    if_number: order.supplier_if_number, rc: order.supplier_rc,
                } : undefined,
            };
        })
    );

    res.json(orders);
}));

/**
 * GET /api/purchase-orders/:id
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const orderResult = await query(
        `SELECT po.*, s.id as supplier_id, s.name as supplier_name, s.company as supplier_company,
            s.email as supplier_email, s.phone as supplier_phone, s.ice as supplier_ice,
            s.if_number as supplier_if_number, s.rc as supplier_rc
     FROM purchase_orders po
     LEFT JOIN contacts s ON po.supplier_id = s.id
     WHERE po.id = $1`,
        [id]
    );

    if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Purchase order not found' });
    }

    const order = orderResult.rows[0];
    const itemsResult = await query('SELECT * FROM purchase_order_items WHERE purchase_order_id = $1 ORDER BY created_at ASC', [id]);

    res.json({
        ...order,
        items: itemsResult.rows,
        supplier: order.supplier_name ? {
            id: order.supplier_id, name: order.supplier_name, company: order.supplier_company,
            email: order.supplier_email, phone: order.supplier_phone, ice: order.supplier_ice,
            if_number: order.supplier_if_number, rc: order.supplier_rc,
        } : undefined,
    });
}));

/**
 * POST /api/purchase-orders
 */
router.post('/', asyncHandler(async (req, res) => {
    const { document_id, supplier_id, date, subtotal, status = 'draft', note, items } = req.body;

    if (!document_id || !supplier_id || !date || !items || items.length === 0) {
        return res.status(400).json({ error: 'Validation Error', message: 'document_id, supplier_id, date, and items are required' });
    }

    const client = await getClient();

    try {
        await client.query('BEGIN');

        const calculatedSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

        const orderResult = await client.query(
            `INSERT INTO purchase_orders (document_id, supplier_id, date, subtotal, status, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [document_id, supplier_id, date, subtotal || calculatedSubtotal, status, note || null]
        );

        const order = orderResult.rows[0];

        for (const item of items) {
            await client.query(
                `INSERT INTO purchase_order_items (purchase_order_id, product_id, description, quantity, unit_price, total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [order.id, item.product_id || null, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
            );
        }

        await client.query('COMMIT');

        const itemsResult = await query('SELECT * FROM purchase_order_items WHERE purchase_order_id = $1', [order.id]);
        res.status(201).json({ ...order, items: itemsResult.rows });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

/**
 * PUT /api/purchase-orders/:id
 */
router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { date, subtotal, status, note, items } = req.body;

    const client = await getClient();

    try {
        await client.query('BEGIN');

        // Get current order status before update
        const currentOrderResult = await client.query(
            'SELECT status, document_id FROM purchase_orders WHERE id = $1',
            [id]
        );

        if (currentOrderResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Not Found', message: 'Purchase order not found' });
        }

        const previousStatus = currentOrderResult.rows[0].status;
        const documentId = currentOrderResult.rows[0].document_id;

        let calculatedSubtotal;
        if (items && items.length > 0) {
            calculatedSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        }

        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (date !== undefined) { updates.push(`date = $${paramIndex++}`); params.push(date); }
        if (subtotal !== undefined || calculatedSubtotal !== undefined) { updates.push(`subtotal = $${paramIndex++}`); params.push(subtotal || calculatedSubtotal); }
        if (status !== undefined) { updates.push(`status = $${paramIndex++}`); params.push(status); }
        if (note !== undefined) { updates.push(`note = $${paramIndex++}`); params.push(note); }
        updates.push(`updated_at = NOW()`);
        params.push(id);

        const updateResult = await client.query(
            `UPDATE purchase_orders SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            params
        );

        if (items) {
            await client.query('DELETE FROM purchase_order_items WHERE purchase_order_id = $1', [id]);
            for (const item of items) {
                await client.query(
                    `INSERT INTO purchase_order_items (purchase_order_id, product_id, description, quantity, unit_price, total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
                    [id, item.product_id || null, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
                );
            }
        }

        // If status is changing to 'received' and wasn't 'received' before, update stock
        if (status === 'received' && previousStatus !== 'received') {
            // Get all items for this purchase order
            const orderItems = await client.query(
                'SELECT * FROM purchase_order_items WHERE purchase_order_id = $1',
                [id]
            );

            for (const item of orderItems.rows) {
                if (item.product_id) {
                    const quantityToAdd = Math.floor(Number(item.quantity));

                    // Update product stock (add quantity)
                    await client.query(
                        `UPDATE products 
                         SET stock = stock + $1, 
                             last_movement = NOW(),
                             status = CASE 
                                 WHEN stock + $1 <= 0 THEN 'out_of_stock'
                                 WHEN stock + $1 <= min_stock THEN 'low_stock'
                                 ELSE 'in_stock'
                             END,
                             updated_at = NOW()
                         WHERE id = $2`,
                        [quantityToAdd, item.product_id]
                    );

                    // Log stock movement
                    await client.query(
                        `INSERT INTO stock_movements (product_id, quantity, type, reference_id, description, created_at)
                         VALUES ($1, $2, $3, $4, $5, NOW())`,
                        [
                            item.product_id,
                            quantityToAdd,
                            'purchase_received',
                            id,
                            `Stock added from Purchase Order ${documentId}`
                        ]
                    );
                }
            }
        }

        await client.query('COMMIT');

        const itemsResult = await query('SELECT * FROM purchase_order_items WHERE purchase_order_id = $1', [id]);
        res.json({ ...updateResult.rows[0], items: itemsResult.rows });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));


/**
 * DELETE /api/purchase-orders/:id
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await getClient();

    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM purchase_order_items WHERE purchase_order_id = $1', [id]);
        const result = await client.query('DELETE FROM purchase_orders WHERE id = $1 RETURNING id', [id]);
        await client.query('COMMIT');

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'Purchase order not found' });
        }

        res.status(204).send();
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

module.exports = router;
