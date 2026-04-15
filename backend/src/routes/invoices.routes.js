const express = require('express');
const { query, getClient } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');

const { asyncHandler } = require('../middleware/error.middleware');
const {
    generateDocumentNumber,
    generateInvoiceNumberSafe,
} = require('../services/document-generation.service');

const router = express.Router();

router.use(verifyToken);

/**
 * GET /api/invoices
 * Get all invoices with optional filters
 */
router.get('/', asyncHandler(async (req, res) => {
    const { status, clientId, startDate, endDate } = req.query;

    let sql = `
    SELECT i.*, i.amount_paid,
           c.id as client_id, c.name as client_name, c.company as client_company,
           c.email as client_email, c.phone as client_phone, c.ice as client_ice,
           c.if_number as client_if_number, c.rc as client_rc,
           ba.id as bank_account_id, ba.name as bank_account_name, 
           ba.bank as bank_account_bank, ba.account_number as bank_account_number
    FROM invoices i
    LEFT JOIN contacts c ON i.client_id = c.id
    LEFT JOIN treasury_bank_accounts ba ON i.bank_account_id = ba.id
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

    // Get items and linked BLs for each invoice
    const invoices = await Promise.all(
        invoicesResult.rows.map(async (invoice) => {
            const itemsResult = await query(
                'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at ASC',
                [invoice.id]
            );

            const linkedBLsResult = await query(
                `SELECT dn.id, dn.document_id, dn.date
                   FROM invoice_bls ib
                   JOIN delivery_notes dn ON dn.id = ib.bl_id
                  WHERE ib.invoice_id = $1
                  ORDER BY dn.date ASC`,
                [invoice.id]
            );

            return {
                ...invoice,
                items: itemsResult.rows,
                linked_bls: linkedBLsResult.rows,
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
                bank_account: invoice.bank_account_id ? {
                    id: invoice.bank_account_id,
                    name: invoice.bank_account_name,
                    bank: invoice.bank_account_bank,
                    account_number: invoice.bank_account_number,
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
        `SELECT i.*, i.amount_paid,
            c.id as client_id, c.name as client_name, c.company as client_company,
            c.email as client_email, c.phone as client_phone, c.ice as client_ice,
            c.if_number as client_if_number, c.rc as client_rc,
            ba.id as bank_account_id, ba.name as bank_account_name, 
            ba.bank as bank_account_bank, ba.account_number as bank_account_number
     FROM invoices i
     LEFT JOIN contacts c ON i.client_id = c.id
     LEFT JOIN treasury_bank_accounts ba ON i.bank_account_id = ba.id
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
    const linkedBLsResult = await query(
        `SELECT dn.id, dn.document_id, dn.date, dn.billing_status
           FROM invoice_bls ib
           JOIN delivery_notes dn ON dn.id = ib.bl_id
          WHERE ib.invoice_id = $1
          ORDER BY dn.date ASC`,
        [id]
    );

    res.json({
        ...invoice,
        items: itemsResult.rows,
        linked_bls: linkedBLsResult.rows,
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
        bank_account: invoice.bank_account_id ? {
            id: invoice.bank_account_id,
            name: invoice.bank_account_name,
            bank: invoice.bank_account_bank,
            account_number: invoice.bank_account_number,
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
        `SELECT i.*, i.amount_paid,
            c.id as client_id, c.name as client_name, c.company as client_company,
            c.email as client_email, c.phone as client_phone, c.ice as client_ice,
            c.if_number as client_if_number, c.rc as client_rc,
            ba.id as bank_account_id, ba.name as bank_account_name, 
            ba.bank as bank_account_bank, ba.account_number as bank_account_number
     FROM invoices i
     LEFT JOIN contacts c ON i.client_id = c.id
     LEFT JOIN treasury_bank_accounts ba ON i.bank_account_id = ba.id
     WHERE i.id = $1`,
        [result.rows[0].id]
    );

    const invoice = invoiceResult.rows[0];
    const itemsResult = await query(
        'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at ASC',
        [result.rows[0].id]
    );
    const linkedBLsResult = await query(
        `SELECT dn.id, dn.document_id, dn.date, dn.billing_status
           FROM invoice_bls ib
           JOIN delivery_notes dn ON dn.id = ib.bl_id
          WHERE ib.invoice_id = $1
          ORDER BY dn.date ASC`,
        [result.rows[0].id]
    );

    res.json({
        ...invoice,
        items: itemsResult.rows,
        linked_bls: linkedBLsResult.rows,
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
        bank_account: invoice.bank_account_id ? {
            id: invoice.bank_account_id,
            name: invoice.bank_account_name,
            bank: invoice.bank_account_bank,
            account_number: invoice.bank_account_number,
        } : undefined,
    });
}));

/**
 * POST /api/invoices/from-bls
 * Create a single invoice from one or more BLs (grouped invoicing).
 * All BLs must share the same client and not yet be invoiced.
 * Invoice number is generated with row-level locking (no duplicates).
 */
router.post('/from-bls', asyncHandler(async (req, res) => {
    const {
        bl_ids,
        date,
        due_date,
        payment_method,
        check_number,
        bank_account_id,
        payment_warehouse_id,
        note,
    } = req.body;

    // ── Basic input validation ──────────────────────────────────────────────
    if (!bl_ids || !Array.isArray(bl_ids) || bl_ids.length === 0) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'bl_ids must be a non-empty array of delivery note UUIDs.',
        });
    }
    if (!date) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'date is required.',
        });
    }

    const client = await getClient();

    try {
        await client.query('BEGIN');

        // ── Fetch all selected BLs with row-lock ───────────────────────────
        const blResult = await client.query(
            `SELECT dn.id, dn.document_id, dn.client_id, dn.billing_status, dn.document_type, dn.tax_enabled,
                    c.name AS client_name, c.company AS client_company
               FROM delivery_notes dn
               LEFT JOIN contacts c ON dn.client_id = c.id
              WHERE dn.id = ANY($1::uuid[])
              FOR UPDATE OF dn`,
            [bl_ids]
        );

        // ── Validate: all BLs found ────────────────────────────────────────
        if (blResult.rows.length !== bl_ids.length) {
            const foundIds = blResult.rows.map(r => r.id);
            const missingIds = bl_ids.filter(id => !foundIds.includes(id));
            await client.query('ROLLBACK');
            return res.status(422).json({
                error: 'Validation Error',
                message: `The following BL IDs were not found: ${missingIds.join(', ')}`,
            });
        }

        const bls = blResult.rows;

        // ── Validate: all BLs are sales BLs (not divers, not purchase BLs) ─
        const nonSalesBLs = bls.filter(bl => bl.document_type !== 'delivery_note' || !bl.client_id);
        if (nonSalesBLs.length > 0) {
            await client.query('ROLLBACK');
            return res.status(422).json({
                error: 'Validation Error',
                message: `Only sales Bons de Livraison can be invoiced. The following are not valid: ${nonSalesBLs.map(b => b.document_id).join(', ')}`,
            });
        }

        // ── Validate: all same client ──────────────────────────────────────
        const uniqueClientIds = [...new Set(bls.map(bl => bl.client_id))];
        if (uniqueClientIds.length > 1) {
            await client.query('ROLLBACK');
            return res.status(422).json({
                error: 'Validation Error',
                message: 'All selected BLs must belong to the same client. Found multiple clients in selection.',
            });
        }

        // ── Validate: none already invoiced ───────────────────────────────
        const alreadyInvoiced = bls.filter(bl => bl.billing_status === 'invoiced');
        if (alreadyInvoiced.length > 0) {
            await client.query('ROLLBACK');
            return res.status(422).json({
                error: 'Validation Error',
                message: `The following BLs are already invoiced and cannot be included: ${alreadyInvoiced.map(b => b.document_id).join(', ')}`,
            });
        }

        // ── Validate: same tax mode ────────────────────────────────────────
        const uniqueTaxModes = [...new Set(bls.map(bl => bl.tax_enabled))];
        if (uniqueTaxModes.length > 1) {
            await client.query('ROLLBACK');
            return res.status(422).json({
                error: 'Validation Error',
                message: 'All selected BLs must have the same TVA mode (all with TVA or all without TVA).',
            });
        }

        const taxEnabled = bls[0].tax_enabled;
        const clientId = uniqueClientIds[0];
        const clientName = bls[0].client_company || bls[0].client_name || 'Unknown Client';

        // ── Generate safe unique invoice number ────────────────────────────
        const document_id = await generateInvoiceNumberSafe(client, date);

        // ── Fetch all line items from all BLs ─────────────────────────────
        const itemsResult = await client.query(
            `SELECT product_id, description, quantity, unit, unit_price, total
               FROM delivery_note_items
              WHERE delivery_note_id = ANY($1::uuid[])`,
            [bl_ids]
        );
        const allItems = itemsResult.rows;

        if (allItems.length === 0) {
            await client.query('ROLLBACK');
            return res.status(422).json({
                error: 'Validation Error',
                message: 'Selected BLs contain no line items. Cannot create empty invoice.',
            });
        }

        // ── Calculate totals ───────────────────────────────────────────────
        // Always derive item totals from quantity × unit_price (never trust
        // the stored total column which may be 0 from older BL records)
        const allItemsWithTotals = allItems.map(item => ({
            ...item,
            computed_total: parseFloat(item.quantity) * parseFloat(item.unit_price),
        }));

        const subtotal = allItemsWithTotals.reduce((sum, item) => sum + item.computed_total, 0);
        const vatRate   = taxEnabled ? 20.0 : 0.0;
        const vatAmount = subtotal * (vatRate / 100);
        const total     = subtotal + vatAmount;

        // ── Create invoice header ──────────────────────────────────────────
        const invoiceResult = await client.query(
            `INSERT INTO invoices
               (document_id, client_id, date, due_date, subtotal, vat_rate, vat_amount, total,
                payment_method, check_number, bank_account_id, status, note)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'draft',$12)
             RETURNING *`,
            [
                document_id,
                clientId,
                date,
                due_date || null,
                subtotal,
                vatRate,
                vatAmount,
                total,
                payment_method || null,
                payment_method === 'check' ? check_number : null,
                bank_account_id || null,
                note || null,
            ]
        );
        const invoice = invoiceResult.rows[0];

        // ── Insert invoice line items ──────────────────────────────────────
        for (const item of allItemsWithTotals) {
            await client.query(
                `INSERT INTO invoice_items
                   (invoice_id, product_id, description, quantity, unit, unit_price, total)
                 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [
                    invoice.id,
                    item.product_id || null,
                    item.description,
                    item.quantity,
                    item.unit || null,
                    item.unit_price,
                    item.computed_total,   // ← always quantity × unit_price
                ]
            );
        }

        // ── Link BLs to invoice via pivot table ───────────────────────────
        for (const blId of bl_ids) {
            await client.query(
                `INSERT INTO invoice_bls (invoice_id, bl_id) VALUES ($1,$2)
                 ON CONFLICT (invoice_id, bl_id) DO NOTHING`,
                [invoice.id, blId]
            );
        }

        // ── Mark all BLs as invoiced ──────────────────────────────────────
        await client.query(
            `UPDATE delivery_notes
                SET billing_status = 'invoiced',
                    invoice_id     = $1,
                    updated_at     = NOW()
              WHERE id = ANY($2::uuid[])`,
            [invoice.id, bl_ids]
        );

        // ── Commit ────────────────────────────────────────────────────────
        await client.query('COMMIT');

        // Return new invoice with items and linked BL info
        const finalItems = await query(
            'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at ASC',
            [invoice.id]
        );
        const linkedBLs = await query(
            `SELECT dn.id, dn.document_id, dn.date
               FROM invoice_bls ib
               JOIN delivery_notes dn ON dn.id = ib.bl_id
              WHERE ib.invoice_id = $1`,
            [invoice.id]
        );

        return res.status(201).json({
            ...invoice,
            items: finalItems.rows,
            linked_bls: linkedBLs.rows,
            client_name: clientName,
        });

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

/**
 * POST /api/invoices
 * Create a new invoice with items (manual creation, not from BLs)
 */
router.post('/', asyncHandler(async (req, res) => {
    let {
        document_id,
        client_id,
        date,
        due_date,
        payment_method,
        check_number,
        bank_account_id,
        payment_warehouse_id,
        note,
        items,
        status = 'draft'
    } = req.body;

    if (!client_id || !date || !items || items.length === 0) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'client_id, date, and items are required',
        });
    }

    const client = await getClient();

    try {
        await client.query('BEGIN');

        // Generate document_id inside the transaction using the safe sequencer
        if (!document_id) {
            document_id = await generateInvoiceNumberSafe(client, date);
        }

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const vatRate = 20.0;
        const vatAmount = subtotal * (vatRate / 100);
        const total = subtotal + vatAmount;

        // Insert invoice
        const invoiceResult = await client.query(
            `INSERT INTO invoices (document_id, client_id, date, due_date, subtotal, vat_rate, vat_amount, total, payment_method, check_number, bank_account_id, status, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
            [document_id, client_id, date, due_date || null, subtotal, vatRate, vatAmount, total, payment_method || null, payment_method === 'check' ? check_number : null, bank_account_id || null, status, note || null]
        );

        const invoice = invoiceResult.rows[0];

        // Insert items
        for (const item of items) {
            await client.query(
                `INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, total)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [invoice.id, item.product_id || null, item.description, item.quantity, item.unit || null, item.unit_price, item.quantity * item.unit_price]
            );
        }

        // Handle Treasury Payment if status is PAID
        if (status === 'paid') {
            let paymentStatus = 'in-hand';
            if (payment_method === 'cash' || payment_method === 'bank_transfer') {
                paymentStatus = 'cleared';
            }

            // Create Treasury Payment
            const paymentResult = await client.query(
                `INSERT INTO treasury_payments 
                (invoice_id, invoice_number, entity, amount, payment_method, bank, check_number, maturity_date, status, payment_date, payment_type, bank_account_id, warehouse_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), 'sales', $10, $11)
                RETURNING *`,
                [
                    invoice.id,
                    invoice.document_id,
                    'Client', // Placeholder
                    invoice.total,
                    payment_method || 'bank_transfer',
                    null,
                    check_number,
                    null,
                    paymentStatus,
                    bank_account_id || null,
                    payment_warehouse_id || null
                ]
            );

            // Update Entity with real Client Name
            const clientResult = await client.query('SELECT name, company FROM contacts WHERE id = $1', [client_id]);
            const clientName = clientResult.rows.length > 0 ? (clientResult.rows[0].company || clientResult.rows[0].name) : 'Unknown Client';
            await client.query('UPDATE treasury_payments SET entity = $1 WHERE id = $2', [clientName, paymentResult.rows[0].id]);

            // Update Balance if cleared
            if (paymentStatus === 'cleared') {
                if (bank_account_id) {
                    await client.query(
                        'UPDATE treasury_bank_accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
                        [invoice.total, bank_account_id]
                    );
                } else if (payment_warehouse_id) {
                    await client.query(
                        `INSERT INTO treasury_warehouse_cash (warehouse_id, amount, created_at, updated_at) 
                         VALUES ($1, $2, NOW(), NOW())
                         ON CONFLICT (warehouse_id) 
                         DO UPDATE SET amount = treasury_warehouse_cash.amount + EXCLUDED.amount, updated_at = NOW()`,
                        [payment_warehouse_id, invoice.total]
                    );
                }
            }
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
    const { date, due_date, payment_method, check_number, bank_account_id, status, note, items, amount_paid } = req.body;

    const client = await getClient();

    try {
        await client.query('BEGIN');

        // Fetch existing invoice to get current amount_paid and total
        const existingInvoiceResult = await client.query('SELECT * FROM invoices WHERE id = $1', [id]);
        if (existingInvoiceResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Not Found', message: 'Invoice not found' });
        }
        const existingInvoice = existingInvoiceResult.rows[0];

        // Calculate new totals if items provided
        let subtotal, vatAmount, total;
        if (items && items.length > 0) {
            subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
            vatAmount = subtotal * 0.2;
            total = subtotal + vatAmount;
        } else {
            // Use existing totals
            total = existingInvoice.total;
        }

        // Determine the new amount_paid and auto-calculate status
        let newAmountPaid = amount_paid !== undefined ? parseFloat(amount_paid) : existingInvoice.amount_paid;
        let calculatedStatus = status; // Use provided status if given

        // Auto-calculate status based on amount_paid if not explicitly provided
        if (amount_paid !== undefined && !status) {
            if (newAmountPaid >= total) {
                calculatedStatus = 'paid';
            } else if (newAmountPaid > 0 && newAmountPaid < total) {
                calculatedStatus = 'partially_paid';
            } else if (newAmountPaid === 0) {
                calculatedStatus = existingInvoice.status === 'paid' || existingInvoice.status === 'partially_paid'
                    ? 'sent'
                    : existingInvoice.status;
            }
        }

        // Build update query dynamically
        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (date !== undefined) { updates.push(`date = $${paramIndex++}`); params.push(date); }
        if (due_date !== undefined) { updates.push(`due_date = $${paramIndex++}`); params.push(due_date); }
        if (payment_method !== undefined) { updates.push(`payment_method = $${paramIndex++}`); params.push(payment_method); }
        if (check_number !== undefined) { updates.push(`check_number = $${paramIndex++}`); params.push(payment_method === 'check' ? check_number : null); }
        if (bank_account_id !== undefined) { updates.push(`bank_account_id = $${paramIndex++}`); params.push(bank_account_id); }
        if (calculatedStatus !== undefined) { updates.push(`status = $${paramIndex++}`); params.push(calculatedStatus); }
        if (note !== undefined) { updates.push(`note = $${paramIndex++}`); params.push(note); }
        if (amount_paid !== undefined) { updates.push(`amount_paid = $${paramIndex++}`); params.push(newAmountPaid); }
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

        const updatedInvoice = updateResult.rows[0];

        // Update items if provided
        if (items) {
            await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);

            for (const item of items) {
                await client.query(
                    `INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, total)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [id, item.product_id || null, item.description, item.quantity, item.unit || null, item.unit_price, item.quantity * item.unit_price]
                );
            }
        }

        // Treasury Integration: Handle payment difference
        if (amount_paid !== undefined) {
            const paymentDifference = newAmountPaid - existingInvoice.amount_paid;

            if (paymentDifference > 0) {
                // Payment increased - record in treasury
                let paymentStatus = 'in-hand';
                const invoicePaymentMethod = payment_method || existingInvoice.payment_method;
                if (invoicePaymentMethod === 'cash' || invoicePaymentMethod === 'bank_transfer') {
                    paymentStatus = 'cleared';
                }

                // Get client name for treasury record
                const clientResult = await client.query('SELECT name, company FROM contacts WHERE id = $1', [updatedInvoice.client_id]);
                const clientName = clientResult.rows.length > 0 ? (clientResult.rows[0].company || clientResult.rows[0].name) : 'Unknown Client';

                // Create treasury payment for the difference
                const paymentResult = await client.query(
                    `INSERT INTO treasury_payments 
                    (invoice_id, invoice_number, entity, amount, payment_method, bank, check_number, maturity_date, status, payment_date, payment_type, bank_account_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), 'sales', $10)
                    RETURNING *`,
                    [
                        updatedInvoice.id,
                        updatedInvoice.document_id,
                        clientName,
                        paymentDifference,
                        invoicePaymentMethod || 'bank_transfer',
                        null,
                        updatedInvoice.check_number,
                        null,
                        paymentStatus,
                        updatedInvoice.bank_account_id
                    ]
                );

                // Update bank account balance if payment is cleared
                if (paymentStatus === 'cleared' && updatedInvoice.bank_account_id) {
                    await client.query(
                        'UPDATE treasury_bank_accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
                        [paymentDifference, updatedInvoice.bank_account_id]
                    );
                }
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

    const client = await getClient();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            'UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Not Found', message: 'Invoice not found' });
        }

        const invoice = result.rows[0];

        // NOTIFICATION: If invoice marked as PAID, notify user
        if (status === 'paid') {
            await client.query(
                `INSERT INTO notifications (title, message, type, action_url, action_label, created_at)
                 VALUES ($1, $2, 'success', $3, 'View Invoice', NOW())`,
                [
                    'Payment Received',
                    `Invoice ${invoice.document_id} has been marked as PAID.`,
                    `/sales/invoices/${id}`
                ]
            );
        }

        // If invoice is marked as PAID, create a treasury payment if it doesn't exist
        if (status === 'paid') {
            const existingPaymentFn = await client.query(
                'SELECT id FROM treasury_payments WHERE invoice_id = $1',
                [id]
            );

            if (existingPaymentFn.rows.length === 0) {
                // Determine payment status based on method
                // Cash/Bank Transfer -> Cleared (money received)
                // Check -> In-Hand (needs deposit)
                let paymentStatus = 'in-hand';
                if (invoice.payment_method === 'cash' || invoice.payment_method === 'bank_transfer') {
                    paymentStatus = 'cleared';
                }

                // Create Treasury Payment
                const paymentResult = await client.query(
                    `INSERT INTO treasury_payments 
                    (invoice_id, invoice_number, entity, amount, payment_method, bank, check_number, maturity_date, status, payment_date, payment_type, bank_account_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), 'sales', $10)
                    RETURNING *`,
                    [
                        invoice.id,
                        invoice.document_id, // invoice_number
                        'Client', // entity (placeholder, usually client name but we might not have it joined here easily without another query, or keep it generic)
                        invoice.total,
                        invoice.payment_method || 'bank_transfer', // Default if missing?
                        null, // bank (client bank name, often not stored in invoice)
                        invoice.check_number,
                        null, // maturity_date
                        paymentStatus,
                        invoice.bank_account_id
                    ]
                );

                // Update Entity with real Client Name
                // We do a sub-query update or fetch client first. 
                // Let's fetch client name for better data
                const clientResult = await client.query('SELECT name, company FROM contacts WHERE id = $1', [invoice.client_id]);
                const clientName = clientResult.rows.length > 0 ? (clientResult.rows[0].company || clientResult.rows[0].name) : 'Unknown Client';

                await client.query('UPDATE treasury_payments SET entity = $1 WHERE id = $2', [clientName, paymentResult.rows[0].id]);


                // If payment is cleared and linked to a bank account, update the balance immediately
                if (paymentStatus === 'cleared' && invoice.bank_account_id) {
                    await client.query(
                        'UPDATE treasury_bank_accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
                        [invoice.total, invoice.bank_account_id]
                    );
                }
            }
        }

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
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

        // Check if there are linked treasury payments to clean up
        const paymentsCheck = await client.query('SELECT * FROM treasury_payments WHERE invoice_id = $1', [id]);

        for (const payment of paymentsCheck.rows) {
            // If payment was cleared (money added to bank), revert the balance
            if (payment.status === 'cleared' && payment.bank_account_id) {
                // For Sales, cleared payload added to balance, so we subtract it
                await client.query(
                    'UPDATE treasury_bank_accounts SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
                    [payment.amount, payment.bank_account_id]
                );
            }
            // Delete the treasury payment record
            await client.query('DELETE FROM treasury_payments WHERE id = $1', [payment.id]);
        }

        await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
        const result = await client.query('DELETE FROM invoices WHERE id = $1 RETURNING id', [id]);
        await client.query('COMMIT');

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'Invoice not found' });
        }

        // Also unlink any BLs that were attached to this invoice
        await client.query(
            `UPDATE delivery_notes
                SET billing_status = 'not_invoiced',
                    invoice_id     = NULL,
                    updated_at     = NOW()
              WHERE invoice_id = $1`,
            [id]
        );
        // Delete pivot rows
        await client.query('DELETE FROM invoice_bls WHERE invoice_id = $1', [id]);

        res.status(204).send();
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

module.exports = router;
