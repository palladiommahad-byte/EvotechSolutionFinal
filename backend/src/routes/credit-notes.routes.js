const express = require('express');
const { query, getClient } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

const router = express.Router();

router.use(verifyToken);

/**
 * GET /api/credit-notes
 */
router.get('/', asyncHandler(async (req, res) => {
    const { status, clientId, invoiceId, startDate, endDate } = req.query;

    let sql = `
    SELECT cn.*, 
           c.id as client_id, c.name as client_name, c.company as client_company,
           c.email as client_email, c.phone as client_phone, c.ice as client_ice,
           c.if_number as client_if_number, c.rc as client_rc
    FROM credit_notes cn
    LEFT JOIN contacts c ON cn.client_id = c.id
    WHERE 1=1
  `;
    const params = [];
    let paramIndex = 1;

    if (status) { sql += ` AND cn.status = $${paramIndex++}`; params.push(status); }
    if (clientId) { sql += ` AND cn.client_id = $${paramIndex++}`; params.push(clientId); }
    if (invoiceId) { sql += ` AND cn.invoice_id = $${paramIndex++}`; params.push(invoiceId); }
    if (startDate) { sql += ` AND cn.date >= $${paramIndex++}`; params.push(startDate); }
    if (endDate) { sql += ` AND cn.date <= $${paramIndex++}`; params.push(endDate); }

    sql += ' ORDER BY cn.date DESC, cn.created_at DESC';

    const notesResult = await query(sql, params);

    const notes = await Promise.all(
        notesResult.rows.map(async (note) => {
            const itemsResult = await query(
                'SELECT * FROM credit_note_items WHERE credit_note_id = $1 ORDER BY created_at ASC',
                [note.id]
            );
            return {
                ...note,
                items: itemsResult.rows,
                client: note.client_name ? {
                    id: note.client_id, name: note.client_name, company: note.client_company,
                    email: note.client_email, phone: note.client_phone, ice: note.client_ice,
                    if_number: note.client_if_number, rc: note.client_rc,
                } : undefined,
            };
        })
    );

    res.json(notes);
}));

/**
 * GET /api/credit-notes/:id
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const noteResult = await query(
        `SELECT cn.*, c.id as client_id, c.name as client_name, c.company as client_company,
            c.email as client_email, c.phone as client_phone, c.ice as client_ice,
            c.if_number as client_if_number, c.rc as client_rc
     FROM credit_notes cn
     LEFT JOIN contacts c ON cn.client_id = c.id
     WHERE cn.id = $1`,
        [id]
    );

    if (noteResult.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Credit note not found' });
    }

    const note = noteResult.rows[0];
    const itemsResult = await query('SELECT * FROM credit_note_items WHERE credit_note_id = $1 ORDER BY created_at ASC', [id]);

    res.json({
        ...note,
        items: itemsResult.rows,
        client: note.client_name ? {
            id: note.client_id, name: note.client_name, company: note.client_company,
            email: note.client_email, phone: note.client_phone, ice: note.client_ice,
            if_number: note.client_if_number, rc: note.client_rc,
        } : undefined,
    });
}));

/**
 * POST /api/credit-notes
 */
router.post('/', asyncHandler(async (req, res) => {
    const { document_id, client_id, invoice_id, date, note, items } = req.body;

    if (!document_id || !client_id || !date || !items || items.length === 0) {
        return res.status(400).json({ error: 'Validation Error', message: 'document_id, client_id, date, and items are required' });
    }

    const client = await getClient();

    try {
        await client.query('BEGIN');

        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const vatRate = 20.0;
        const vatAmount = subtotal * (vatRate / 100);
        const total = subtotal + vatAmount;

        const noteResult = await client.query(
            `INSERT INTO credit_notes (document_id, client_id, invoice_id, date, subtotal, vat_rate, vat_amount, total, status, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9)
       RETURNING *`,
            [document_id, client_id, invoice_id || null, date, subtotal, vatRate, vatAmount, total, note || null]
        );

        const creditNote = noteResult.rows[0];

        for (const item of items) {
            await client.query(
                `INSERT INTO credit_note_items (credit_note_id, product_id, description, quantity, unit_price, total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [creditNote.id, item.product_id || null, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
            );
        }

        await client.query('COMMIT');

        const itemsResult = await query('SELECT * FROM credit_note_items WHERE credit_note_id = $1', [creditNote.id]);
        res.status(201).json({ ...creditNote, items: itemsResult.rows });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

/**
 * PUT /api/credit-notes/:id
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
            `UPDATE credit_notes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            params
        );

        if (updateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Not Found', message: 'Credit note not found' });
        }

        if (items) {
            await client.query('DELETE FROM credit_note_items WHERE credit_note_id = $1', [id]);
            for (const item of items) {
                await client.query(
                    `INSERT INTO credit_note_items (credit_note_id, product_id, description, quantity, unit_price, total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
                    [id, item.product_id || null, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
                );
            }
        }

        await client.query('COMMIT');

        const itemsResult = await query('SELECT * FROM credit_note_items WHERE credit_note_id = $1', [id]);
        res.json({ ...updateResult.rows[0], items: itemsResult.rows });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

/**
 * PATCH /api/credit-notes/:id/status
 */
router.patch('/:id/status', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const result = await query('UPDATE credit_notes SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [status, id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Credit note not found' });
    }

    res.json(result.rows[0]);
}));

/**
 * DELETE /api/credit-notes/:id
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await getClient();

    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM credit_note_items WHERE credit_note_id = $1', [id]);
        const result = await client.query('DELETE FROM credit_notes WHERE id = $1 RETURNING id', [id]);
        await client.query('COMMIT');

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'Credit note not found' });
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
