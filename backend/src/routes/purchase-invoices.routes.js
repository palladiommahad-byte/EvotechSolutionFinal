const express = require('express');
const { query, getClient } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');

const { asyncHandler } = require('../middleware/error.middleware');
const { generateDocumentNumber } = require('../services/document-generation.service');

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
           s.if_number as supplier_if_number, s.rc as supplier_rc,
           ba.id as bank_account_id, ba.name as bank_account_name, 
           ba.bank as bank_account_bank, ba.account_number as bank_account_number
    FROM purchase_invoices pi
    LEFT JOIN contacts s ON pi.supplier_id = s.id
    LEFT JOIN treasury_bank_accounts ba ON pi.bank_account_id = ba.id
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
 * GET /api/purchase-invoices/:id
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const invoiceResult = await query(
        `SELECT pi.*, s.id as supplier_id, s.name as supplier_name, s.company as supplier_company,
            s.email as supplier_email, s.phone as supplier_phone, s.ice as supplier_ice,
            s.if_number as supplier_if_number, s.rc as supplier_rc,
            ba.id as bank_account_id, ba.name as bank_account_name, 
            ba.bank as bank_account_bank, ba.account_number as bank_account_number
     FROM purchase_invoices pi
     LEFT JOIN contacts s ON pi.supplier_id = s.id
     LEFT JOIN treasury_bank_accounts ba ON pi.bank_account_id = ba.id
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
        bank_account: invoice.bank_account_id ? {
            id: invoice.bank_account_id,
            name: invoice.bank_account_name,
            bank: invoice.bank_account_bank,
            account_number: invoice.bank_account_number,
        } : undefined,
    });
}));

/**
 * POST /api/purchase-invoices
 */
router.post('/', asyncHandler(async (req, res) => {
    let { document_id, supplier_id, date, due_date, subtotal, vat_rate = 20, vat_amount, total, payment_method, check_number, bank_account_id, status = 'draft', note, attachment_url, items, delivery_note_id } = req.body;

    if (!supplier_id || !date || !items || items.length === 0) {
        return res.status(400).json({ error: 'Validation Error', message: 'supplier_id, date, and items are required' });
    }

    // Auto-generate document_id if not provided
    if (!document_id) {
        try {
            document_id = await generateDocumentNumber('purchase_invoice', date);
        } catch (err) {
            console.error('Error generating document number:', err);
            return res.status(500).json({ error: 'Generation Error', message: 'Failed to generate document number' });
        }
    }

    const client = await getClient();

    try {
        await client.query('BEGIN');

        // Check if invoice already exists for this delivery note (if provided)
        if (delivery_note_id) {
            const existingInvoiceResult = await client.query(
                `SELECT id, document_id FROM purchase_invoices 
                 WHERE delivery_note_id = $1 AND status != 'cancelled'`,
                [delivery_note_id]
            );

            if (existingInvoiceResult.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: 'Duplicate Invoice',
                    message: `An invoice (${existingInvoiceResult.rows[0].document_id}) already exists for this Delivery Note.`,
                    errorCode: 'DUPLICATE_INVOICE_FROM_BL',
                    existingDocumentId: existingInvoiceResult.rows[0].document_id
                });
            }
        }

        const calculatedSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const calculatedVatAmount = calculatedSubtotal * (vat_rate / 100);
        const calculatedTotal = calculatedSubtotal + calculatedVatAmount;

        const invoiceResult = await client.query(
            `INSERT INTO purchase_invoices (document_id, supplier_id, date, due_date, subtotal, vat_rate, vat_amount, total, payment_method, check_number, bank_account_id, status, note, attachment_url, delivery_note_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
            [document_id, supplier_id, date, due_date || null, subtotal || calculatedSubtotal, vat_rate, vat_amount || calculatedVatAmount, total || calculatedTotal, payment_method || null, check_number || null, bank_account_id || null, status, note || null, attachment_url || null, delivery_note_id || null]
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
    const { date, due_date, subtotal, vat_rate, vat_amount, total, payment_method, check_number, bank_account_id, status, note, attachment_url, items, amount_paid } = req.body;

    const client = await getClient();

    try {
        await client.query('BEGIN');

        // Fetch existing invoice to calculate payment difference
        const existingResult = await client.query(
            'SELECT amount_paid, total, payment_method, bank_account_id FROM purchase_invoices WHERE id = $1',
            [id]
        );

        if (existingResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Not Found', message: 'Purchase invoice not found' });
        }

        const existing = existingResult.rows[0];
        const oldAmountPaid = parseFloat(existing.amount_paid) || 0;
        const newAmountPaid = amount_paid !== undefined ? parseFloat(amount_paid) : oldAmountPaid;
        const invoiceTotal = total !== undefined ? parseFloat(total) : parseFloat(existing.total);
        const paymentDifference = newAmountPaid - oldAmountPaid;

        // Auto-calculate status based on amount_paid
        let autoStatus = status;
        if (amount_paid !== undefined) {
            if (newAmountPaid >= invoiceTotal) {
                autoStatus = 'paid';
            } else if (newAmountPaid > 0 && newAmountPaid < invoiceTotal) {
                autoStatus = 'partially_paid';
            } else if (newAmountPaid === 0) {
                autoStatus = 'received';
            }
        }

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
        if (bank_account_id !== undefined) { updates.push(`bank_account_id = $${paramIndex++}`); params.push(bank_account_id); }
        if (amount_paid !== undefined) { updates.push(`amount_paid = $${paramIndex++}`); params.push(newAmountPaid); }
        if (autoStatus !== undefined) { updates.push(`status = $${paramIndex++}`); params.push(autoStatus); }
        if (note !== undefined) { updates.push(`note = $${paramIndex++}`); params.push(note); }
        if (attachment_url !== undefined) { updates.push(`attachment_url = $${paramIndex++}`); params.push(attachment_url); }
        updates.push(`updated_at = NOW()`);
        params.push(id);

        const updateResult = await client.query(
            `UPDATE purchase_invoices SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            params
        );

        // Treasury integration: if payment increased, record it
        if (paymentDifference > 0) {
            const finalPaymentMethod = payment_method || existing.payment_method || 'cash';
            const finalBankAccountId = bank_account_id !== undefined ? bank_account_id : existing.bank_account_id;

            // Get supplier name
            const supplierResult = await client.query(
                'SELECT name FROM contacts WHERE id = $1',
                [updateResult.rows[0].supplier_id]
            );
            const supplierName = supplierResult.rows[0]?.name || 'Unknown Supplier';

            // Insert treasury payment record
            await client.query(
                `INSERT INTO treasury_payments (
                    invoice_id, invoice_number, entity, amount, payment_method, 
                    check_number, payment_date, payment_type, bank_account_id, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    id,
                    updateResult.rows[0].document_id,
                    supplierName,
                    paymentDifference,
                    finalPaymentMethod,
                    check_number || null,
                    date || new Date().toISOString().split('T')[0],
                    'purchase',
                    finalBankAccountId,
                    finalPaymentMethod === 'check' ? 'in-hand' : 'cleared'
                ]
            );

            // Update bank account balance if payment is cleared (cash or bank_transfer)
            if ((finalPaymentMethod === 'cash' || finalPaymentMethod === 'bank_transfer') && finalBankAccountId) {
                // For purchases, payment DECREASES the bank balance
                await client.query(
                    'UPDATE treasury_bank_accounts SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
                    [paymentDifference, finalBankAccountId]
                );
            }
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

        // Check if there are linked treasury payments to clean up
        const paymentsCheck = await client.query('SELECT * FROM treasury_payments WHERE invoice_id = $1', [id]);

        for (const payment of paymentsCheck.rows) {
            // If payment was cleared (money removed from bank), revert the balance
            if (payment.status === 'cleared' && payment.bank_account_id) {
                // For Purchases, cleared payload subtracted balance, so we add it back
                await client.query(
                    'UPDATE treasury_bank_accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
                    [payment.amount, payment.bank_account_id]
                );
            }
            // Delete the treasury payment record
            await client.query('DELETE FROM treasury_payments WHERE id = $1', [payment.id]);
        }

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
