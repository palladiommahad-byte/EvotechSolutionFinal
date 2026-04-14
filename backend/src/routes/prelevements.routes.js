const express = require('express');
const { query, getClient } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');

const { asyncHandler } = require('../middleware/error.middleware');
const { generateDocumentNumber } = require('../services/document-generation.service');

const router = express.Router();

router.use(verifyToken);

/**
 * GET /api/prelevements
 * Get all prelevements with optional filters
 */
router.get('/', asyncHandler(async (req, res) => {
    const { status, clientId, startDate, endDate } = req.query;

    let sql = `
    SELECT p.*, 
           c.id as client_id, c.name as client_name, c.company as client_company,
           c.email as client_email, c.phone as client_phone, c.ice as client_ice,
           c.if_number as client_if_number, c.rc as client_rc
    FROM prelevements p
    LEFT JOIN contacts c ON p.client_id = c.id
    WHERE 1=1
  `;
    const params = [];
    let paramIndex = 1;

    if (status) {
        sql += ` AND p.status = $${paramIndex++}`;
        params.push(status);
    }
    if (clientId) {
        sql += ` AND p.client_id = $${paramIndex++}`;
        params.push(clientId);
    }
    if (startDate) {
        sql += ` AND p.date >= $${paramIndex++}`;
        params.push(startDate);
    }
    if (endDate) {
        sql += ` AND p.date <= $${paramIndex++}`;
        params.push(endDate);
    }

    sql += ' ORDER BY p.date DESC, p.created_at DESC';

    const result = await query(sql, params);

    const prelevements = await Promise.all(
        result.rows.map(async (doc) => {
            const itemsResult = await query(
                'SELECT * FROM prelevement_items WHERE prelevement_id = $1 ORDER BY created_at ASC',
                [doc.id]
            );

            return {
                ...doc,
                items: itemsResult.rows,
                client: doc.client_name ? {
                    id: doc.client_id,
                    name: doc.client_name,
                    company: doc.client_company,
                    email: doc.client_email,
                    phone: doc.client_phone,
                    ice: doc.client_ice,
                    if_number: doc.client_if_number,
                    rc: doc.client_rc,
                } : undefined,
            };
        })
    );

    res.json(prelevements);
}));

/**
 * GET /api/prelevements/:id
 * Get prelevement by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const docResult = await query(
        `SELECT p.*, 
            c.id as client_id, c.name as client_name, c.company as client_company,
            c.email as client_email, c.phone as client_phone, c.ice as client_ice,
            c.if_number as client_if_number, c.rc as client_rc
     FROM prelevements p
     LEFT JOIN contacts c ON p.client_id = c.id
     WHERE p.id = $1`,
        [id]
    );

    if (docResult.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Prelevement not found' });
    }

    const doc = docResult.rows[0];
    const itemsResult = await query(
        'SELECT * FROM prelevement_items WHERE prelevement_id = $1 ORDER BY created_at ASC',
        [id]
    );

    res.json({
        ...doc,
        items: itemsResult.rows,
        client: doc.client_name ? {
            id: doc.client_id,
            name: doc.client_name,
            company: doc.client_company,
            email: doc.client_email,
            phone: doc.client_phone,
            ice: doc.client_ice,
            if_number: doc.client_if_number,
            rc: doc.client_rc,
        } : undefined,
    });
}));

/**
 * POST /api/prelevements
 * Create a new prelevement
 */
router.post('/', asyncHandler(async (req, res) => {
    let { document_id, client_id, date, note, items } = req.body;

    if (!date || !items || items.length === 0) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'date and items are required',
        });
    }

    // Auto-generate document_id if not provided
    if (!document_id) {
        try {
            document_id = await generateDocumentNumber('prelevement', date);
        } catch (err) {
            console.error('Error generating document number:', err);
            return res.status(500).json({ error: 'Generation Error', message: 'Failed to generate document number' });
        }
    }

    const client = await getClient();

    try {
        await client.query('BEGIN');

        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

        const docResult = await client.query(
            `INSERT INTO prelevements (document_id, client_id, date, subtotal, status, note)
       VALUES ($1, $2, $3, $4, 'draft', $5)
       RETURNING *`,
            [document_id, client_id || null, date, subtotal, note || null]
        );

        const newDoc = docResult.rows[0];

        for (const item of items) {
            await client.query(
                `INSERT INTO prelevement_items (prelevement_id, product_id, description, quantity, unit_price, total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [newDoc.id, item.product_id || null, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
            );
        }

        await client.query('COMMIT');

        const itemsResult = await query('SELECT * FROM prelevement_items WHERE prelevement_id = $1', [newDoc.id]);

        res.status(201).json({ ...newDoc, items: itemsResult.rows });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

/**
 * PUT /api/prelevements/:id
 * Update a prelevement
 */
router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { date, status, note, items } = req.body;

    const client = await getClient();

    try {
        await client.query('BEGIN');

        let subtotal;
        if (items && items.length > 0) {
            subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        }

        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (date !== undefined) { updates.push(`date = $${paramIndex++}`); params.push(date); }
        if (status !== undefined) { updates.push(`status = $${paramIndex++}`); params.push(status); }
        if (note !== undefined) { updates.push(`note = $${paramIndex++}`); params.push(note); }
        if (subtotal !== undefined) { updates.push(`subtotal = $${paramIndex++}`); params.push(subtotal); }
        updates.push(`updated_at = NOW()`);
        params.push(id);

        const updateResult = await client.query(
            `UPDATE prelevements SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            params
        );

        if (updateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Not Found', message: 'Prelevement not found' });
        }

        if (items) {
            await client.query('DELETE FROM prelevement_items WHERE prelevement_id = $1', [id]);
            for (const item of items) {
                await client.query(
                    `INSERT INTO prelevement_items (prelevement_id, product_id, description, quantity, unit_price, total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
                    [id, item.product_id || null, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
                );
            }
        }

        await client.query('COMMIT');

        const itemsResult = await query('SELECT * FROM prelevement_items WHERE prelevement_id = $1', [id]);
        res.json({ ...updateResult.rows[0], items: itemsResult.rows });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

/**
 * DELETE /api/prelevements/:id
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await getClient();

    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM prelevement_items WHERE prelevement_id = $1', [id]);
        const result = await client.query('DELETE FROM prelevements WHERE id = $1 RETURNING id', [id]);
        await client.query('COMMIT');

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'Prelevement not found' });
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
