const express = require('express');
const { query, getClient } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

const router = express.Router();

router.use(verifyToken);

/**
 * GET /api/delivery-notes
 * Get all delivery notes with optional filters
 */
router.get('/', asyncHandler(async (req, res) => {
    const { status, clientId, supplierId, documentType, startDate, endDate } = req.query;

    let sql = `
    SELECT dn.*, 
           c.id as client_id, c.name as client_name, c.company as client_company,
           c.email as client_email, c.phone as client_phone, c.ice as client_ice,
           c.if_number as client_if_number, c.rc as client_rc,
           s.id as supplier_id_val, s.name as supplier_name, s.company as supplier_company,
           s.email as supplier_email, s.phone as supplier_phone, s.ice as supplier_ice,
           s.if_number as supplier_if_number, s.rc as supplier_rc
    FROM delivery_notes dn
    LEFT JOIN contacts c ON dn.client_id = c.id
    LEFT JOIN contacts s ON dn.supplier_id = s.id
    WHERE 1=1
  `;
    const params = [];
    let paramIndex = 1;

    if (status) {
        sql += ` AND dn.status = $${paramIndex++}`;
        params.push(status);
    }
    if (clientId) {
        sql += ` AND dn.client_id = $${paramIndex++}`;
        params.push(clientId);
    }
    if (supplierId) {
        sql += ` AND dn.supplier_id = $${paramIndex++}`;
        params.push(supplierId);
    }
    if (documentType) {
        sql += ` AND dn.document_type = $${paramIndex++}`;
        params.push(documentType);
    }
    if (startDate) {
        sql += ` AND dn.date >= $${paramIndex++}`;
        params.push(startDate);
    }
    if (endDate) {
        sql += ` AND dn.date <= $${paramIndex++}`;
        params.push(endDate);
    }

    sql += ' ORDER BY dn.date DESC, dn.created_at DESC';

    const notesResult = await query(sql, params);

    const notes = await Promise.all(
        notesResult.rows.map(async (note) => {
            const itemsResult = await query(
                'SELECT * FROM delivery_note_items WHERE delivery_note_id = $1 ORDER BY created_at ASC',
                [note.id]
            );

            return {
                ...note,
                items: itemsResult.rows,
                client: note.client_name ? {
                    id: note.client_id,
                    name: note.client_name,
                    company: note.client_company,
                    email: note.client_email,
                    phone: note.client_phone,
                    ice: note.client_ice,
                    if_number: note.client_if_number,
                    rc: note.client_rc,
                } : undefined,
                supplier: note.supplier_name ? {
                    id: note.supplier_id_val,
                    name: note.supplier_name,
                    company: note.supplier_company,
                    email: note.supplier_email,
                    phone: note.supplier_phone,
                    ice: note.supplier_ice,
                    if_number: note.supplier_if_number,
                    rc: note.supplier_rc,
                } : undefined,
            };
        })
    );

    res.json(notes);
}));

/**
 * GET /api/delivery-notes/:id
 * Get delivery note by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const noteResult = await query(
        `SELECT dn.*, 
            c.id as client_id, c.name as client_name, c.company as client_company,
            c.email as client_email, c.phone as client_phone, c.ice as client_ice,
            c.if_number as client_if_number, c.rc as client_rc,
            s.id as supplier_id_val, s.name as supplier_name, s.company as supplier_company,
            s.email as supplier_email, s.phone as supplier_phone, s.ice as supplier_ice,
            s.if_number as supplier_if_number, s.rc as supplier_rc
     FROM delivery_notes dn
     LEFT JOIN contacts c ON dn.client_id = c.id
     LEFT JOIN contacts s ON dn.supplier_id = s.id
     WHERE dn.id = $1`,
        [id]
    );

    if (noteResult.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Delivery note not found' });
    }

    const note = noteResult.rows[0];
    const itemsResult = await query(
        'SELECT * FROM delivery_note_items WHERE delivery_note_id = $1 ORDER BY created_at ASC',
        [id]
    );

    res.json({
        ...note,
        items: itemsResult.rows,
        client: note.client_name ? {
            id: note.client_id,
            name: note.client_name,
            company: note.client_company,
            email: note.client_email,
            phone: note.client_phone,
            ice: note.client_ice,
            if_number: note.client_if_number,
            rc: note.client_rc,
        } : undefined,
        supplier: note.supplier_name ? {
            id: note.supplier_id_val,
            name: note.supplier_name,
            company: note.supplier_company,
            email: note.supplier_email,
            phone: note.supplier_phone,
            ice: note.supplier_ice,
            if_number: note.supplier_if_number,
            rc: note.supplier_rc,
        } : undefined,
    });
}));

/**
 * POST /api/delivery-notes
 * Create a new delivery note
 */
router.post('/', asyncHandler(async (req, res) => {
    const { document_id, client_id, supplier_id, warehouse_id, date, document_type = 'delivery_note', note, items } = req.body;

    if (!document_id || !date || !items || items.length === 0) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'document_id, date, and items are required',
        });
    }

    const client = await getClient();

    try {
        await client.query('BEGIN');

        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

        const noteResult = await client.query(
            `INSERT INTO delivery_notes (document_id, client_id, supplier_id, warehouse_id, date, subtotal, status, note, document_type)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8)
       RETURNING *`,
            [document_id, client_id || null, supplier_id || null, warehouse_id || null, date, subtotal, note || null, document_type]
        );

        const deliveryNote = noteResult.rows[0];

        // Determine movement direction:
        // Sales BL (client_id present) or Divers (document_type='divers') -> negative (out)
        // Purchase BL (supplier_id present) -> positive (in)
        const isOut = client_id || document_type === 'divers';
        const movementType = isOut ? 'out' : 'in';

        for (const item of items) {
            // 1. Insert into delivery_note_items
            await client.query(
                `INSERT INTO delivery_note_items (delivery_note_id, product_id, description, quantity, unit_price, total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [deliveryNote.id, item.product_id || null, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
            );

            // 2. Update product stock if product_id is provided
            if (item.product_id) {
                const quantityChange = isOut ? -Math.abs(item.quantity) : Math.abs(item.quantity);

                // Update products table (total stock and status)
                const productUpdateResult = await client.query(
                    `UPDATE products 
                     SET stock = stock + $1,
                         status = CASE 
                            WHEN stock + $1 <= 0 THEN 'out_of_stock'
                            WHEN min_stock > 0 AND stock + $1 <= min_stock THEN 'low_stock'
                            ELSE 'in_stock'
                         END,
                         last_movement = CURRENT_DATE,
                         updated_at = NOW()
                     WHERE id = $2
                     RETURNING *`,
                    [quantityChange, item.product_id]
                );

                // NOTIFICATION: Low Stock Warning
                if (productUpdateResult.rows.length > 0) {
                    const p = productUpdateResult.rows[0];
                    if (p.status === 'low_stock' && p.min_stock > 0) {
                        // Check for recent duplicate prevents spam in same transaction? No, per item is fine, or debounce?
                        // Let's just insert. User needs to know.
                        await client.query(
                            `INSERT INTO notifications(title, message, type, action_url, action_label, created_at)
                             VALUES($1, $2, 'warning', $3, 'View Product', NOW())`,
                            [
                                'Low Stock Alert',
                                `Product "${p.name}" is running low after Delivery Note #${document_id}.Current: ${p.stock}, Min: ${p.min_stock}`,
                                `/ inventory / products / ${p.id}`
                            ]
                        );
                    }
                }

                // Update warehouse-specific stock (stock_items) if warehouse_id is provided
                if (warehouse_id) {
                    await client.query(
                        `INSERT INTO stock_items(product_id, warehouse_id, quantity, last_updated)
                         VALUES($1, $2, $3, NOW())
                         ON CONFLICT(product_id, warehouse_id) 
                         DO UPDATE SET quantity = stock_items.quantity + $3, last_updated = NOW()`,
                        [item.product_id, warehouse_id, quantityChange]
                    );
                }

                // Log movement in history (stock_movements)
                await client.query(
                    `INSERT INTO stock_movements(product_id, quantity, type, reference_id, description, created_at)
                     VALUES($1, $2, $3, $4, $5, NOW())`,
                    [
                        item.product_id,
                        item.quantity,
                        movementType,
                        deliveryNote.id,
                        `${document_type === 'delivery_note' ? 'Bon de Livraison' : 'Divers'} #${document_id} `
                    ]
                );
            }
        }

        await client.query('COMMIT');

        const itemsResult = await query('SELECT * FROM delivery_note_items WHERE delivery_note_id = $1', [deliveryNote.id]);

        res.status(201).json({ ...deliveryNote, items: itemsResult.rows });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

/**
 * PUT /api/delivery-notes/:id
 * Update a delivery note
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

        if (date !== undefined) { updates.push(`date = $${paramIndex++} `); params.push(date); }
        if (status !== undefined) { updates.push(`status = $${paramIndex++} `); params.push(status); }
        if (note !== undefined) { updates.push(`note = $${paramIndex++} `); params.push(note); }
        if (subtotal !== undefined) { updates.push(`subtotal = $${paramIndex++} `); params.push(subtotal); }
        updates.push(`updated_at = NOW()`);
        params.push(id);

        const updateResult = await client.query(
            `UPDATE delivery_notes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING * `,
            params
        );

        if (updateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Not Found', message: 'Delivery note not found' });
        }

        const updatedNote = updateResult.rows[0];

        if (items) {
            // 1. REVERT OLD STOCK
            const oldItemsResult = await client.query('SELECT * FROM delivery_note_items WHERE delivery_note_id = $1', [id]);
            // Get ORIGINAL direction (based on pre-update note state, but for simplicity assuming direction type didn't change drastically or we use updatedNote if valid)
            // Ideally we check old note state, but usually document_type/client doesn't change on simple edit. 
            // Let's rely on updatedNote direction for simplicity, or we should have fetched it before UPDATE.
            // CAUTION: If client_id changed from null to value, direction changes.
            // Better to use the SAME direction logic as POST for the new state, and for Revert use the OLD state.
            // However, we didn't fetch old state.
            // FIX: Let's assume direction is consistent with the current record state (updatedNote).

            const isOut = updatedNote.client_id || updatedNote.document_type === 'divers';

            for (const item of oldItemsResult.rows) {
                if (item.product_id) {
                    const originalQuantity = Math.abs(item.quantity);
                    const revertChange = isOut ? originalQuantity : -originalQuantity;

                    await client.query(
                        `UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id = $2`,
                        [revertChange, item.product_id]
                    );

                    if (updatedNote.warehouse_id) {
                        await client.query(
                            `UPDATE stock_items SET quantity = quantity + $3, last_updated = NOW() 
                             WHERE product_id = $1 AND warehouse_id = $2`,
                            [item.product_id, updatedNote.warehouse_id, revertChange]
                        );
                    }
                }
            }

            // 2. DELETE OLD ITEMS
            await client.query('DELETE FROM delivery_note_items WHERE delivery_note_id = $1', [id]);

            // 3. INSERT NEW ITEMS & APPLY NEW STOCK
            for (const item of items) {
                await client.query(
                    `INSERT INTO delivery_note_items (delivery_note_id, product_id, description, quantity, unit_price, total)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [id, item.product_id || null, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
                );

                if (item.product_id) {
                    const quantityChange = isOut ? -Math.abs(item.quantity) : Math.abs(item.quantity);

                    // Update products
                    const productUpdateResult = await client.query(
                        `UPDATE products 
                         SET stock = stock + $1,
                             status = CASE 
                                WHEN stock + $1 <= 0 THEN 'out_of_stock'
                                WHEN min_stock > 0 AND stock + $1 <= min_stock THEN 'low_stock'
                                ELSE 'in_stock'
                             END,
                             last_movement = CURRENT_DATE,
                             updated_at = NOW()
                         WHERE id = $2
                         RETURNING *`,
                        [quantityChange, item.product_id]
                    );

                    // WARN: Notification Logic for Low Stock (re-using logic from POST)
                    if (productUpdateResult.rows.length > 0) {
                        const p = productUpdateResult.rows[0];
                        if (p.status === 'low_stock' && p.min_stock > 0) {
                            await client.query(
                                `INSERT INTO notifications (title, message, type, action_url, action_label, created_at)
                                 VALUES ($1, $2, 'warning', $3, 'View Product', NOW())`,
                                [
                                    'Low Stock Alert',
                                    `Product "${p.name}" is running low after Update to Delivery Note #${updatedNote.document_id}. Current: ${p.stock}, Min: ${p.min_stock}`,
                                    `/inventory/products/${p.id}`
                                ]
                            );
                        }
                    }

                    if (updatedNote.warehouse_id) {
                        await client.query(
                            `INSERT INTO stock_items (product_id, warehouse_id, quantity, last_updated)
                                VALUES ($1, $2, $3, NOW())
                                ON CONFLICT (product_id, warehouse_id) 
                                DO UPDATE SET quantity = stock_items.quantity + $3, last_updated = NOW()`,
                            [item.product_id, updatedNote.warehouse_id, quantityChange]
                        );
                    }

                    // Log movement
                    await client.query(
                        `INSERT INTO stock_movements (product_id, quantity, type, reference_id, description, created_at)
                         VALUES ($1, $2, 'adjustment', $3, $4, NOW())`,
                        [
                            item.product_id,
                            quantityChange,
                            id,
                            `Update: ${updatedNote.document_type} #${updatedNote.document_id}`
                        ]
                    );
                }
            }
        }

        await client.query('COMMIT');

        const itemsResult = await query('SELECT * FROM delivery_note_items WHERE delivery_note_id = $1', [id]);
        res.json({ ...updateResult.rows[0], items: itemsResult.rows });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

/**
 * PATCH /api/delivery-notes/:id/status
 */
router.patch('/:id/status', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const result = await query(
        'UPDATE delivery_notes SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Delivery note not found' });
    }

    res.json(result.rows[0]);
}));

/**
 * DELETE /api/delivery-notes/:id
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await getClient();

    try {
        await client.query('BEGIN');

        // 1. Fetch note to determine direction (Client=OUT, Supplier=IN)
        const noteCheck = await client.query('SELECT * FROM delivery_notes WHERE id = $1', [id]);
        if (noteCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Not Found', message: 'Delivery note not found' });
        }
        const note = noteCheck.rows[0];
        // Determine original movement direction
        const isOut = note.client_id || note.document_type === 'divers';

        // 2. Fetch items to revert stock
        const itemsResult = await client.query('SELECT * FROM delivery_note_items WHERE delivery_note_id = $1', [id]);

        for (const item of itemsResult.rows) {
            if (item.product_id) {
                // Revert logic:
                // If original was OUT (negative stock change), we ADD it back (positive quantity).
                // If original was IN (positive stock change), we SUBTRACT it (negative quantity).
                const originalQuantity = Math.abs(item.quantity);
                const revertChange = isOut ? originalQuantity : -originalQuantity;

                // Update products table
                await client.query(
                    `UPDATE products 
                      SET stock = stock + $1, updated_at = NOW() 
                      WHERE id = $2`,
                    [revertChange, item.product_id]
                );

                // Update warehouse stock if applicable (we need to know which warehouse, it's on the note)
                if (note.warehouse_id) {
                    await client.query(
                        `INSERT INTO stock_items (product_id, warehouse_id, quantity, last_updated)
                         VALUES ($1, $2, $3, NOW())
                         ON CONFLICT (product_id, warehouse_id) 
                         DO UPDATE SET quantity = stock_items.quantity + $3, last_updated = NOW()`,
                        [item.product_id, note.warehouse_id, revertChange]
                    );
                }

                // Log the reversion movement
                await client.query(
                    `INSERT INTO stock_movements (product_id, quantity, type, reference_id, description, created_at)
                     VALUES ($1, $2, 'correction', $3, $4, NOW())`,
                    [
                        item.product_id,
                        revertChange,
                        note.id,
                        `Revert: Deletion of ${note.document_type} #${note.document_id}`
                    ]
                );
            }
        }

        await client.query('DELETE FROM delivery_note_items WHERE delivery_note_id = $1', [id]);
        const result = await client.query('DELETE FROM delivery_notes WHERE id = $1 RETURNING id', [id]);
        await client.query('COMMIT');

        // We already checked if it exists above
        res.status(204).send();
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

module.exports = router;
