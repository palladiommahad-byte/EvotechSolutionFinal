const express = require('express');
const { query, getClient } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');

const { asyncHandler } = require('../middleware/error.middleware');
const { generateDocumentNumber } = require('../services/document-generation.service');

const router = express.Router();

router.use(verifyToken);

/**
 * GET /api/estimates
 * Get all estimates with optional filters
 */
router.get('/', asyncHandler(async (req, res) => {
    const { status, clientId, startDate, endDate } = req.query;

    let sql = `
    SELECT e.*, 
           c.id as client_id, c.name as client_name, c.company as client_company,
           c.email as client_email, c.phone as client_phone, c.ice as client_ice,
           c.if_number as client_if_number, c.rc as client_rc
    FROM estimates e
    LEFT JOIN contacts c ON e.client_id = c.id
    WHERE 1=1
  `;
    const params = [];
    let paramIndex = 1;

    if (status) {
        sql += ` AND e.status = $${paramIndex++}`;
        params.push(status);
    }
    if (clientId) {
        sql += ` AND e.client_id = $${paramIndex++}`;
        params.push(clientId);
    }
    if (startDate) {
        sql += ` AND e.date >= $${paramIndex++}`;
        params.push(startDate);
    }
    if (endDate) {
        sql += ` AND e.date <= $${paramIndex++}`;
        params.push(endDate);
    }

    sql += ' ORDER BY e.date DESC, e.created_at DESC';

    const estimatesResult = await query(sql, params);

    const estimates = await Promise.all(
        estimatesResult.rows.map(async (estimate) => {
            const itemsResult = await query(
                'SELECT * FROM estimate_items WHERE estimate_id = $1 ORDER BY created_at ASC',
                [estimate.id]
            );

            return {
                ...estimate,
                items: itemsResult.rows,
                client: estimate.client_name ? {
                    id: estimate.client_id,
                    name: estimate.client_name,
                    company: estimate.client_company,
                    email: estimate.client_email,
                    phone: estimate.client_phone,
                    ice: estimate.client_ice,
                    if_number: estimate.client_if_number,
                    rc: estimate.client_rc,
                } : undefined,
            };
        })
    );

    res.json(estimates);
}));

/**
 * GET /api/estimates/:id
 * Get estimate by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const estimateResult = await query(
        `SELECT e.*, 
            c.id as client_id, c.name as client_name, c.company as client_company,
            c.email as client_email, c.phone as client_phone, c.ice as client_ice,
            c.if_number as client_if_number, c.rc as client_rc
     FROM estimates e
     LEFT JOIN contacts c ON e.client_id = c.id
     WHERE e.id = $1`,
        [id]
    );

    if (estimateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Estimate not found' });
    }

    const estimate = estimateResult.rows[0];
    const itemsResult = await query(
        'SELECT * FROM estimate_items WHERE estimate_id = $1 ORDER BY created_at ASC',
        [id]
    );

    res.json({
        ...estimate,
        items: itemsResult.rows,
        client: estimate.client_name ? {
            id: estimate.client_id,
            name: estimate.client_name,
            company: estimate.client_company,
            email: estimate.client_email,
            phone: estimate.client_phone,
            ice: estimate.client_ice,
            if_number: estimate.client_if_number,
            rc: estimate.client_rc,
        } : undefined,
    });
}));

/**
 * POST /api/estimates
 * Create a new estimate
 */
router.post('/', asyncHandler(async (req, res) => {
    let { document_id, client_id, date, note, items } = req.body;

    if (!client_id || !date || !items || items.length === 0) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'client_id, date, and items are required',
        });
    }

    // Auto-generate document_id if not provided
    if (!document_id) {
        try {
            document_id = await generateDocumentNumber('estimate', date);
        } catch (err) {
            console.error('Error generating document number:', err);
            return res.status(500).json({ error: 'Generation Error', message: 'Failed to generate document number' });
        }
    }

    const client = await getClient();

    try {
        await client.query('BEGIN');

        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const vatRate = 20.0;
        const vatAmount = subtotal * (vatRate / 100);
        const total = subtotal + vatAmount;

        const estimateResult = await client.query(
            `INSERT INTO estimates (document_id, client_id, date, subtotal, vat_rate, vat_amount, total, status, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8)
       RETURNING *`,
            [document_id, client_id, date, subtotal, vatRate, vatAmount, total, note || null]
        );

        const estimate = estimateResult.rows[0];

        for (const item of items) {
            await client.query(
                `INSERT INTO estimate_items (estimate_id, product_id, description, quantity, unit_price, total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [estimate.id, item.product_id || null, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
            );
        }

        await client.query('COMMIT');

        const itemsResult = await query('SELECT * FROM estimate_items WHERE estimate_id = $1', [estimate.id]);

        res.status(201).json({ ...estimate, items: itemsResult.rows });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

/**
 * PUT /api/estimates/:id
 * Update an estimate
 */
router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { date, status, note, items } = req.body;

    const client = await getClient();

    try {
        await client.query('BEGIN');

        let subtotal, vatAmount, total;
        if (items && items.length > 0) {
            subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
            vatAmount = subtotal * 0.2;
            total = subtotal + vatAmount;
        }

        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (date !== undefined) { updates.push(`date = $${paramIndex++}`); params.push(date); }
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
            `UPDATE estimates SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            params
        );

        if (updateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Not Found', message: 'Estimate not found' });
        }

        if (items) {
            await client.query('DELETE FROM estimate_items WHERE estimate_id = $1', [id]);
            for (const item of items) {
                await client.query(
                    `INSERT INTO estimate_items (estimate_id, product_id, description, quantity, unit_price, total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
                    [id, item.product_id || null, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
                );
            }
        }

        await client.query('COMMIT');

        const itemsResult = await query('SELECT * FROM estimate_items WHERE estimate_id = $1', [id]);
        res.json({ ...updateResult.rows[0], items: itemsResult.rows });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

/**
 * PATCH /api/estimates/:id/status
 * Update estimate status
 */
router.patch('/:id/status', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const result = await query(
        'UPDATE estimates SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Estimate not found' });
    }

    res.json(result.rows[0]);
}));

/**
 * DELETE /api/estimates/:id
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await getClient();

    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM estimate_items WHERE estimate_id = $1', [id]);
        const result = await client.query('DELETE FROM estimates WHERE id = $1 RETURNING id', [id]);
        await client.query('COMMIT');

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'Estimate not found' });
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
