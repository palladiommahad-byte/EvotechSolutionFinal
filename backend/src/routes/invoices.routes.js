const express = require('express');
const { query, getClient } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

const router = express.Router();

router.use(verifyToken);

/**
 * GET /api/invoices
 * Get all invoices with optional filters
 */
router.get('/', asyncHandler(async (req, res) => {
    const { status, clientId, startDate, endDate } = req.query;

    let sql = `
    SELECT i.*, 
           c.id as client_id, c.name as client_name, c.company as client_company,
           c.email as client_email, c.phone as client_phone, c.ice as client_ice,
           c.if_number as client_if_number, c.rc as client_rc
    FROM invoices i
    LEFT JOIN contacts c ON i.client_id = c.id
    WHERE 1=1
  `;
    const params = [];
    let paramIndex = 1;

    if (status) {
        sql += ` AND i.status = $${paramIndex++}`;
        params.push(status);
    }
    if (clientId) {
        sql += ` AND i.client_id = $${paramIndex++}`;
        params.push(clientId);
    }
    if (startDate) {
        sql += ` AND i.date >= $${paramIndex++}`;
        params.push(startDate);
    }
    if (endDate) {
        sql += ` AND i.date <= $${paramIndex++}`;
        params.push(endDate);
    }

    sql += ' ORDER BY i.date DESC, i.created_at DESC';

    const invoicesResult = await query(sql, params);

    // Get items for each invoice
    const invoices = await Promise.all(
        invoicesResult.rows.map(async (invoice) => {
            const itemsResult = await query(
                'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at ASC',
                [invoice.id]
            );

            return {
                ...invoice,
                items: itemsResult.rows,
                client: invoice.client_name ? {
                    id: invoice.client_id,
                    name: invoice.client_name,
                    company: invoice.client_company,
                    email: invoice.client_email,
                    phone: invoice.client_phone,
                    ice: invoice.client_ice,
                    if_number: invoice.client_if_number,
                    rc: invoice.client_rc,
                } : undefined,
            };
        })
    );

    res.json(invoices);
}));

/**
 * GET /api/invoices/:id
 * Get invoice by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const invoiceResult = await query(
        `SELECT i.*, 
            c.id as client_id, c.name as client_name, c.company as client_company,
            c.email as client_email, c.phone as client_phone, c.ice as client_ice,
            c.if_number as client_if_number, c.rc as client_rc
     FROM invoices i
     LEFT JOIN contacts c ON i.client_id = c.id
     WHERE i.id = $1`,
        [id]
    );

    if (invoiceResult.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];
    const itemsResult = await query(
        'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at ASC',
        [id]
    );

    res.json({
        ...invoice,
        items: itemsResult.rows,
        client: invoice.client_name ? {
            id: invoice.client_id,
            name: invoice.client_name,
            company: invoice.client_company,
            email: invoice.client_email,
            phone: invoice.client_phone,
            ice: invoice.client_ice,
            if_number: invoice.client_if_number,
            rc: invoice.client_rc,
        } : undefined,
    });
}));

/**
 * GET /api/invoices/document/:documentId
 * Get invoice by document ID
 */
router.get('/document/:documentId', asyncHandler(async (req, res) => {
    const { documentId } = req.params;

    const result = await query('SELECT id FROM invoices WHERE document_id = $1', [documentId]);

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Invoice not found' });
    }

    // Redirect to the main get by ID endpoint logic
    req.params.id = result.rows[0].id;

    const invoiceResult = await query(
        `SELECT i.*, 
            c.id as client_id, c.name as client_name, c.company as client_company,
            c.email as client_email, c.phone as client_phone, c.ice as client_ice,
            c.if_number as client_if_number, c.rc as client_rc
     FROM invoices i
     LEFT JOIN contacts c ON i.client_id = c.id
     WHERE i.id = $1`,
        [result.rows[0].id]
    );

    const invoice = invoiceResult.rows[0];
    const itemsResult = await query(
        'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at ASC',
        [result.rows[0].id]
    );

    res.json({
        ...invoice,
        items: itemsResult.rows,
        client: invoice.client_name ? {
            id: invoice.client_id,
            name: invoice.client_name,
            company: invoice.client_company,
            email: invoice.client_email,
            phone: invoice.client_phone,
            ice: invoice.client_ice,
            if_number: invoice.client_if_number,
            rc: invoice.client_rc,
        } : undefined,
    });
}));

/**
 * POST /api/invoices
 * Create a new invoice with items
 */
router.post('/', asyncHandler(async (req, res) => {
    const {
        document_id,
        client_id,
        date,
        due_date,
        payment_method,
        check_number,
        note,
        items,
    } = req.body;

    if (!document_id || !client_id || !date || !items || items.length === 0) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'document_id, client_id, date, and items are required',
        });
    }

    const client = await getClient();

    try {
        await client.query('BEGIN');

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const vatRate = 20.0;
        const vatAmount = subtotal * (vatRate / 100);
        const total = subtotal + vatAmount;

        // Insert invoice
        const invoiceResult = await client.query(
            `INSERT INTO invoices (document_id, client_id, date, due_date, subtotal, vat_rate, vat_amount, total, payment_method, check_number, status, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', $11)
       RETURNING *`,
            [document_id, client_id, date, due_date || null, subtotal, vatRate, vatAmount, total, payment_method || null, payment_method === 'check' ? check_number : null, note || null]
        );

        const invoice = invoiceResult.rows[0];

        // Insert items
        for (const item of items) {
            await client.query(
                `INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [invoice.id, item.product_id || null, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
            );
        }

        await client.query('COMMIT');

        // Fetch complete invoice with items
        const itemsResult = await query('SELECT * FROM invoice_items WHERE invoice_id = $1', [invoice.id]);

        res.status(201).json({
            ...invoice,
            items: itemsResult.rows,
        });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

/**
 * PUT /api/invoices/:id
 * Update an invoice
 */
router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { date, due_date, payment_method, check_number, status, note, items } = req.body;

    const client = await getClient();

    try {
        await client.query('BEGIN');

        // Calculate new totals if items provided
        let subtotal, vatAmount, total;
        if (items && items.length > 0) {
            subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
            vatAmount = subtotal * 0.2;
            total = subtotal + vatAmount;
        }

        // Build update query dynamically
        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (date !== undefined) { updates.push(`date = $${paramIndex++}`); params.push(date); }
        if (due_date !== undefined) { updates.push(`due_date = $${paramIndex++}`); params.push(due_date); }
        if (payment_method !== undefined) { updates.push(`payment_method = $${paramIndex++}`); params.push(payment_method); }
        if (check_number !== undefined) { updates.push(`check_number = $${paramIndex++}`); params.push(payment_method === 'check' ? check_number : null); }
        if (status !== undefined) { updates.push(`status = $${paramIndex++}`); params.push(status); }
        if (note !== undefined) { updates.push(`note = $${paramIndex++}`); params.push(note); }
        if (subtotal !== undefined) {
            updates.push(`subtotal = $${paramIndex++}`); params.push(subtotal);
            updates.push(`vat_amount = $${paramIndex++}`); params.push(vatAmount);
            updates.push(`total = $${paramIndex++}`); params.push(total);
        }
        updates.push(`updated_at = NOW()`);
        params.push(id);

        const updateResult = await client.query(
            `UPDATE invoices SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            params
        );

        if (updateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Not Found', message: 'Invoice not found' });
        }

        // Update items if provided
        if (items) {
            await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);

            for (const item of items) {
                await client.query(
                    `INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
                    [id, item.product_id || null, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
                );
            }
        }

        await client.query('COMMIT');

        // Fetch complete invoice
        const itemsResult = await query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);

        res.json({
            ...updateResult.rows[0],
            items: itemsResult.rows,
        });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

/**
 * PATCH /api/invoices/:id/status
 * Update invoice status
 */
router.patch('/:id/status', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const result = await query(
        'UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Invoice not found' });
    }

    res.json(result.rows[0]);
}));

/**
 * DELETE /api/invoices/:id
 * Delete an invoice
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const client = await getClient();

    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
        const result = await client.query('DELETE FROM invoices WHERE id = $1 RETURNING id', [id]);
        await client.query('COMMIT');

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'Invoice not found' });
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
