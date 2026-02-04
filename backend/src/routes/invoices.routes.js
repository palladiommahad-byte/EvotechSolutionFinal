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
        `SELECT i.*, 
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
        `SELECT i.*, 
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
        bank_account: invoice.bank_account_id ? {
            id: invoice.bank_account_id,
            name: invoice.bank_account_name,
            bank: invoice.bank_account_bank,
            account_number: invoice.bank_account_number,
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
        bank_account_id,
        payment_warehouse_id,
        note,
        items,
        status = 'draft'
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
            `INSERT INTO invoices (document_id, client_id, date, due_date, subtotal, vat_rate, vat_amount, total, payment_method, check_number, bank_account_id, status, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
            [document_id, client_id, date, due_date || null, subtotal, vatRate, vatAmount, total, payment_method || null, payment_method === 'check' ? check_number : null, bank_account_id || null, status, note || null]
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
    const { date, due_date, payment_method, check_number, bank_account_id, status, note, items } = req.body;

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
        if (bank_account_id !== undefined) { updates.push(`bank_account_id = $${paramIndex++}`); params.push(bank_account_id); }
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

        // Check if invoice is now PAID and handle treasury payment
        if (status === 'paid') {
            const existingPaymentFn = await client.query(
                'SELECT id FROM treasury_payments WHERE invoice_id = $1',
                [id]
            );

            if (existingPaymentFn.rows.length === 0) {
                // Fetch full invoice data to ensure we have totals and methods
                const fullInvoiceRes = await client.query('SELECT * FROM invoices WHERE id = $1', [id]);
                const fullInvoice = fullInvoiceRes.rows[0];

                let paymentStatus = 'in-hand';
                if (fullInvoice.payment_method === 'cash' || fullInvoice.payment_method === 'bank_transfer') {
                    paymentStatus = 'cleared';
                }

                // Create Treasury Payment
                const paymentResult = await client.query(
                    `INSERT INTO treasury_payments 
                    (invoice_id, invoice_number, entity, amount, payment_method, bank, check_number, maturity_date, status, payment_date, payment_type, bank_account_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), 'sales', $10)
                    RETURNING *`,
                    [
                        fullInvoice.id,
                        fullInvoice.document_id,
                        'Client',
                        fullInvoice.total,
                        fullInvoice.payment_method || 'bank_transfer',
                        null,
                        fullInvoice.check_number,
                        null,
                        paymentStatus,
                        fullInvoice.bank_account_id
                    ]
                );

                // Update Entity
                const clientResult = await client.query('SELECT name, company FROM contacts WHERE id = $1', [fullInvoice.client_id]);
                const clientName = clientResult.rows.length > 0 ? (clientResult.rows[0].company || clientResult.rows[0].name) : 'Unknown Client';
                await client.query('UPDATE treasury_payments SET entity = $1 WHERE id = $2', [clientName, paymentResult.rows[0].id]);

                // Update Balance
                if (paymentStatus === 'cleared' && fullInvoice.bank_account_id) {
                    await client.query(
                        'UPDATE treasury_bank_accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
                        [fullInvoice.total, fullInvoice.bank_account_id]
                    );
                }
            }
        }

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

        res.status(204).send();
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

module.exports = router;
