const express = require('express');
const { query, getClient } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

const router = express.Router();

router.use(verifyToken);

/**
 * GET /api/purchase-invoices
 */
router.get('/', asyncHandler(async (req, res) => {
    const { status, supplierId, startDate, endDate } = req.query;

    let sql = `
    SELECT pi.*, 
           s.id as supplier_id, s.name as supplier_name, s.company as supplier_company,
           s.email as supplier_email, s.phone as supplier_phone, s.ice as supplier_ice,
           s.if_number as supplier_if_number, s.rc as supplier_rc
    FROM purchase_invoices pi
    LEFT JOIN contacts s ON pi.supplier_id = s.id
    WHERE 1=1
  `;
    const params = [];
    let paramIndex = 1;

    if (status) { sql += ` AND pi.status = $${paramIndex++}`; params.push(status); }
    if (supplierId) { sql += ` AND pi.supplier_id = $${paramIndex++}`; params.push(supplierId); }
    if (startDate) { sql += ` AND pi.date >= $${paramIndex++}`; params.push(startDate); }
    if (endDate) { sql += ` AND pi.date <= $${paramIndex++}`; params.push(endDate); }

    sql += ' ORDER BY pi.date DESC, pi.created_at DESC';

    const invoicesResult = await query(sql, params);

    const invoices = await Promise.all(
        invoicesResult.rows.map(async (invoice) => {
            const itemsResult = await query(
                'SELECT * FROM purchase_invoice_items WHERE purchase_invoice_id = $1 ORDER BY created_at ASC',
                [invoice.id]
            );
            return {
                ...invoice,
                items: itemsResult.rows,
                supplier: invoice.supplier_name ? {
                    id: invoice.supplier_id, name: invoice.supplier_name, company: invoice.supplier_company,
                    email: invoice.supplier_email, phone: invoice.supplier_phone, ice: invoice.supplier_ice,
                    if_number: invoice.supplier_if_number, rc: invoice.supplier_rc,
                } : undefined,
            };
        })
    );

    res.json(invoices);
}));

/**
 * GET /api/purchase-invoices/:id
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const invoiceResult = await query(
        `SELECT pi.*, s.id as supplier_id, s.name as supplier_name, s.company as supplier_company,
            s.email as supplier_email, s.phone as supplier_phone, s.ice as supplier_ice,
            s.if_number as supplier_if_number, s.rc as supplier_rc
     FROM purchase_invoices pi
     LEFT JOIN contacts s ON pi.supplier_id = s.id
     WHERE pi.id = $1`,
        [id]
    );

    if (invoiceResult.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Purchase invoice not found' });
    }

    const invoice = invoiceResult.rows[0];
    const itemsResult = await query('SELECT * FROM purchase_invoice_items WHERE purchase_invoice_id = $1 ORDER BY created_at ASC', [id]);

    res.json({
        ...invoice,
        items: itemsResult.rows,
        supplier: invoice.supplier_name ? {
            id: invoice.supplier_id, name: invoice.supplier_name, company: invoice.supplier_company,
            email: invoice.supplier_email, phone: invoice.supplier_phone, ice: invoice.supplier_ice,
            if_number: invoice.supplier_if_number, rc: invoice.supplier_rc,
        } : undefined,
    });
}));

/**
 * POST /api/purchase-invoices
 */
router.post('/', asyncHandler(async (req, res) => {
    const { document_id, supplier_id, date, due_date, subtotal, vat_rate = 20, vat_amount, total, payment_method, check_number, status = 'draft', note, attachment_url, items } = req.body;

    if (!document_id || !supplier_id || !date || !items || items.length === 0) {
        return res.status(400).json({ error: 'Validation Error', message: 'document_id, supplier_id, date, and items are required' });
    }

    const client = await getClient();

    try {
        await client.query('BEGIN');

        const calculatedSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const calculatedVatAmount = calculatedSubtotal * (vat_rate / 100);
        const calculatedTotal = calculatedSubtotal + calculatedVatAmount;

        const invoiceResult = await client.query(
            `INSERT INTO purchase_invoices (document_id, supplier_id, date, due_date, subtotal, vat_rate, vat_amount, total, payment_method, check_number, status, note, attachment_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
            [document_id, supplier_id, date, due_date || null, subtotal || calculatedSubtotal, vat_rate, vat_amount || calculatedVatAmount, total || calculatedTotal, payment_method || null, check_number || null, status, note || null, attachment_url || null]
        );

        const invoice = invoiceResult.rows[0];

        for (const item of items) {
            await client.query(
                `INSERT INTO purchase_invoice_items (purchase_invoice_id, product_id, description, quantity, unit_price, total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [invoice.id, item.product_id || null, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
            );
        }

        await client.query('COMMIT');

        const itemsResult = await query('SELECT * FROM purchase_invoice_items WHERE purchase_invoice_id = $1', [invoice.id]);
        res.status(201).json({ ...invoice, items: itemsResult.rows });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

/**
 * PUT /api/purchase-invoices/:id
 */
router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { date, due_date, subtotal, vat_rate, vat_amount, total, payment_method, check_number, status, note, attachment_url, items } = req.body;

    const client = await getClient();

    try {
        await client.query('BEGIN');

        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (date !== undefined) { updates.push(`date = $${paramIndex++}`); params.push(date); }
        if (due_date !== undefined) { updates.push(`due_date = $${paramIndex++}`); params.push(due_date); }
        if (subtotal !== undefined) { updates.push(`subtotal = $${paramIndex++}`); params.push(subtotal); }
        if (vat_rate !== undefined) { updates.push(`vat_rate = $${paramIndex++}`); params.push(vat_rate); }
        if (vat_amount !== undefined) { updates.push(`vat_amount = $${paramIndex++}`); params.push(vat_amount); }
        if (total !== undefined) { updates.push(`total = $${paramIndex++}`); params.push(total); }
        if (payment_method !== undefined) { updates.push(`payment_method = $${paramIndex++}`); params.push(payment_method); }
        if (check_number !== undefined) { updates.push(`check_number = $${paramIndex++}`); params.push(check_number); }
        if (status !== undefined) { updates.push(`status = $${paramIndex++}`); params.push(status); }
        if (note !== undefined) { updates.push(`note = $${paramIndex++}`); params.push(note); }
        if (attachment_url !== undefined) { updates.push(`attachment_url = $${paramIndex++}`); params.push(attachment_url); }
        updates.push(`updated_at = NOW()`);
        params.push(id);

        const updateResult = await client.query(
            `UPDATE purchase_invoices SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            params
        );

        if (updateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Not Found', message: 'Purchase invoice not found' });
        }

        if (items) {
            await client.query('DELETE FROM purchase_invoice_items WHERE purchase_invoice_id = $1', [id]);
            for (const item of items) {
                await client.query(
                    `INSERT INTO purchase_invoice_items (purchase_invoice_id, product_id, description, quantity, unit_price, total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
                    [id, item.product_id || null, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
                );
            }
        }

        await client.query('COMMIT');

        const itemsResult = await query('SELECT * FROM purchase_invoice_items WHERE purchase_invoice_id = $1', [id]);
        res.json({ ...updateResult.rows[0], items: itemsResult.rows });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

/**
 * DELETE /api/purchase-invoices/:id
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await getClient();

    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM purchase_invoice_items WHERE purchase_invoice_id = $1', [id]);
        const result = await client.query('DELETE FROM purchase_invoices WHERE id = $1 RETURNING id', [id]);
        await client.query('COMMIT');

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'Purchase invoice not found' });
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
