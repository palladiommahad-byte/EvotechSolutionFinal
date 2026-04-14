const express = require('express');
const { query, getClient } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

const router = express.Router();

router.use(verifyToken);

// ============================================
// BANK ACCOUNTS
// ============================================

router.get('/bank-accounts', asyncHandler(async (req, res) => {
    const result = await query('SELECT * FROM treasury_bank_accounts ORDER BY name ASC');
    const accounts = result.rows.map(a => ({ ...a, accountNumber: a.account_number }));
    res.json(accounts);
}));

router.get('/bank-accounts/:id', asyncHandler(async (req, res) => {
    const result = await query('SELECT * FROM treasury_bank_accounts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not Found' });
    const a = result.rows[0];
    res.json({ ...a, accountNumber: a.account_number });
}));

router.post('/bank-accounts', asyncHandler(async (req, res) => {
    const { name, bank, account_number, accountNumber, balance = 0 } = req.body;
    const result = await query(
        'INSERT INTO treasury_bank_accounts (name, bank, account_number, balance) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, bank, account_number || accountNumber, balance]
    );
    const a = result.rows[0];
    res.status(201).json({ ...a, accountNumber: a.account_number });
}));

router.put('/bank-accounts/:id', asyncHandler(async (req, res) => {
    const { name, bank, account_number, accountNumber, balance } = req.body;
    const result = await query(
        `UPDATE treasury_bank_accounts 
     SET name = COALESCE($1, name), bank = COALESCE($2, bank), 
         account_number = COALESCE($3, account_number), balance = COALESCE($4, balance), updated_at = NOW()
     WHERE id = $5 RETURNING *`,
        [name, bank, account_number || accountNumber, balance, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not Found' });
    const a = result.rows[0];
    res.json({ ...a, accountNumber: a.account_number });
}));

router.delete('/bank-accounts/:id', asyncHandler(async (req, res) => {
    const result = await query('DELETE FROM treasury_bank_accounts WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not Found' });
    res.status(204).send();
}));

// ============================================
// WAREHOUSE CASH
// ============================================

router.get('/warehouse-cash', asyncHandler(async (req, res) => {
    const result = await query('SELECT * FROM treasury_warehouse_cash ORDER BY warehouse_id ASC');
    const cash = result.rows.map(c => ({ ...c, warehouseId: c.warehouse_id }));
    res.json(cash);
}));

router.put('/warehouse-cash/:warehouseId', asyncHandler(async (req, res) => {
    const { warehouseId } = req.params;
    const { amount } = req.body;

    const result = await query(
        `INSERT INTO treasury_warehouse_cash (warehouse_id, amount) VALUES ($1, $2)
     ON CONFLICT (warehouse_id) DO UPDATE SET amount = $2, updated_at = NOW()
     RETURNING *`,
        [warehouseId, amount]
    );

    const c = result.rows[0];
    res.json({ ...c, warehouseId: c.warehouse_id });
}));

// ============================================
// PAYMENTS
// ============================================

router.get('/payments', asyncHandler(async (req, res) => {
    const { paymentType } = req.query;
    let sql = 'SELECT * FROM treasury_payments WHERE 1=1';
    const params = [];

    if (paymentType) {
        sql += ' AND payment_type = $1';
        params.push(paymentType);
    }

    sql += ' ORDER BY payment_date DESC';
    const result = await query(sql, params);

    const payments = result.rows.map(p => ({
        ...p,
        invoiceId: p.invoice_id,
        invoiceNumber: p.invoice_number,
        paymentMethod: p.payment_method,
        checkNumber: p.check_number,
        maturityDate: p.maturity_date,
        paymentType: p.payment_type,
        date: p.payment_date,
        warehouse: p.warehouse_id,
    }));

    res.json(payments);
}));

router.get('/payments/:id', asyncHandler(async (req, res) => {
    const result = await query('SELECT * FROM treasury_payments WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not Found' });
    const p = result.rows[0];
    res.json({
        ...p,
        invoiceId: p.invoice_id,
        invoiceNumber: p.invoice_number,
        paymentMethod: p.payment_method,
        checkNumber: p.check_number,
        maturityDate: p.maturity_date,
        paymentType: p.payment_type,
        date: p.payment_date,
        warehouse: p.warehouse_id,
    });
}));

router.get('/payments/invoice/:invoiceNumber', asyncHandler(async (req, res) => {
    const { paymentType } = req.query;
    let sql = 'SELECT * FROM treasury_payments WHERE invoice_number = $1';
    const params = [req.params.invoiceNumber];

    if (paymentType) {
        sql += ' AND payment_type = $2';
        params.push(paymentType);
    }

    const result = await query(sql, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not Found' });
    const p = result.rows[0];
    res.json({
        ...p,
        invoiceId: p.invoice_id,
        invoiceNumber: p.invoice_number,
        paymentMethod: p.payment_method,
        checkNumber: p.check_number,
        maturityDate: p.maturity_date,
        paymentType: p.payment_type,
        date: p.payment_date,
        warehouse: p.warehouse_id,
    });
}));

router.post('/payments', asyncHandler(async (req, res) => {
    const {
        invoice_id, invoiceId, invoice_number, invoiceNumber, entity, amount,
        payment_method, paymentMethod, bank, check_number, checkNumber,
        maturity_date, maturityDate, status = 'in-hand',
        date, payment_date, warehouse, warehouse_id, notes, payment_type, paymentType,
        bank_account_id, bankAccountId
    } = req.body;

    const client = await getClient(); // Need transaction for atomic balance update

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO treasury_payments 
            (invoice_id, invoice_number, entity, amount, payment_method, bank, check_number, maturity_date, status, payment_date, warehouse_id, notes, payment_type, bank_account_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *`,
            [
                invoice_id || invoiceId, invoice_number || invoiceNumber, entity, amount,
                payment_method || paymentMethod, bank, check_number || checkNumber,
                maturity_date || maturityDate, status, date || payment_date,
                warehouse || warehouse_id, notes, payment_type || paymentType,
                bank_account_id || bankAccountId
            ]
        );

        const p = result.rows[0];

        // If payment is cleared and linked to a bank account, update the balance
        if (p.status === 'cleared' && p.bank_account_id) {
            const amountChange = p.payment_type === 'purchase' ? -Math.abs(p.amount) : Math.abs(p.amount);
            await client.query(
                'UPDATE treasury_bank_accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
                [amountChange, p.bank_account_id]
            );
        }

        await client.query('COMMIT');

        res.status(201).json({
            ...p,
            invoiceId: p.invoice_id,
            invoiceNumber: p.invoice_number,
            paymentMethod: p.payment_method,
            checkNumber: p.check_number,
            maturityDate: p.maturity_date,
            paymentType: p.payment_type,
            date: p.payment_date,
            warehouse: p.warehouse_id,
            bankAccountId: p.bank_account_id
        });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

router.put('/payments/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        invoice_id, invoiceId, invoice_number, invoiceNumber, entity, amount,
        payment_method, paymentMethod, bank, check_number, checkNumber,
        maturity_date, maturityDate, status, date, payment_date, warehouse, warehouse_id, notes,
        bank_account_id, bankAccountId
    } = req.body;

    const client = await getClient();

    try {
        await client.query('BEGIN');

        // Get current payment state to check for status changes
        const currentPaymentResult = await client.query('SELECT * FROM treasury_payments WHERE id = $1', [id]);
        if (currentPaymentResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Not Found' });
        }
        const currentPayment = currentPaymentResult.rows[0];

        const updates = [];
        const params = [];
        let idx = 1;

        if (invoice_id || invoiceId) { updates.push(`invoice_id = $${idx++}`); params.push(invoice_id || invoiceId); }
        if (invoice_number || invoiceNumber) { updates.push(`invoice_number = $${idx++}`); params.push(invoice_number || invoiceNumber); }
        if (entity) { updates.push(`entity = $${idx++}`); params.push(entity); }
        if (amount !== undefined) { updates.push(`amount = $${idx++}`); params.push(amount); }
        if (payment_method || paymentMethod) { updates.push(`payment_method = $${idx++}`); params.push(payment_method || paymentMethod); }
        if (bank !== undefined) { updates.push(`bank = $${idx++}`); params.push(bank); }
        if (check_number !== undefined || checkNumber !== undefined) { updates.push(`check_number = $${idx++}`); params.push(check_number || checkNumber); }
        if (maturity_date !== undefined || maturityDate !== undefined) { updates.push(`maturity_date = $${idx++}`); params.push(maturity_date || maturityDate); }
        if (status) { updates.push(`status = $${idx++}`); params.push(status); }
        if (date || payment_date) { updates.push(`payment_date = $${idx++}`); params.push(date || payment_date); }
        if (warehouse !== undefined || warehouse_id !== undefined) { updates.push(`warehouse_id = $${idx++}`); params.push(warehouse || warehouse_id); }
        if (notes !== undefined) { updates.push(`notes = $${idx++}`); params.push(notes); }
        if (bank_account_id !== undefined || bankAccountId !== undefined) { updates.push(`bank_account_id = $${idx++}`); params.push(bank_account_id || bankAccountId); }
        updates.push(`updated_at = NOW()`);
        params.push(id);

        const result = await client.query(`UPDATE treasury_payments SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params);
        const p = result.rows[0];

        // Handle Balance Updates
        // 1. If status changed TO cleared
        if (status === 'cleared' && currentPayment.status !== 'cleared') {
            const targetBankAccount = p.bank_account_id || currentPayment.bank_account_id;
            if (targetBankAccount) {
                const amountChange = p.payment_type === 'purchase' ? -Math.abs(p.amount) : Math.abs(p.amount);
                await client.query('UPDATE treasury_bank_accounts SET balance = balance + $1 WHERE id = $2', [amountChange, targetBankAccount]);
            }
        }
        // 2. If status changed FROM cleared
        else if (status && status !== 'cleared' && currentPayment.status === 'cleared') {
            const targetBankAccount = currentPayment.bank_account_id;
            if (targetBankAccount) {
                const amountChange = currentPayment.payment_type === 'purchase' ? -Math.abs(currentPayment.amount) : Math.abs(currentPayment.amount);
                // Subtract the previously added amount (which was negative for purchases, so it adds it back)
                await client.query('UPDATE treasury_bank_accounts SET balance = balance - $1 WHERE id = $2', [amountChange, targetBankAccount]);
            }
        }

        await client.query('COMMIT');

        res.json({
            ...p,
            invoiceId: p.invoice_id,
            invoiceNumber: p.invoice_number,
            paymentMethod: p.payment_method,
            checkNumber: p.check_number,
            maturityDate: p.maturity_date,
            paymentType: p.payment_type,
            date: p.payment_date,
            warehouse: p.warehouse_id,
            bankAccountId: p.bank_account_id
        });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

router.patch('/payments/:id/status', asyncHandler(async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;

    const client = await getClient();

    try {
        await client.query('BEGIN');

        const currentPaymentResult = await client.query('SELECT * FROM treasury_payments WHERE id = $1', [id]);
        if (currentPaymentResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Not Found' });
        }
        const currentPayment = currentPaymentResult.rows[0];

        const result = await client.query('UPDATE treasury_payments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [status, id]);
        const p = result.rows[0];

        // Handle Balance Updates
        // 1. If status changed TO cleared
        if (status === 'cleared' && currentPayment.status !== 'cleared') {
            const targetBankAccount = currentPayment.bank_account_id;
            if (targetBankAccount) {
                const amountChange = currentPayment.payment_type === 'purchase' ? -Math.abs(currentPayment.amount) : Math.abs(currentPayment.amount);
                await client.query('UPDATE treasury_bank_accounts SET balance = balance + $1 WHERE id = $2', [amountChange, targetBankAccount]);
            }
        }
        // 2. If status changed FROM cleared
        else if (status !== 'cleared' && currentPayment.status === 'cleared') {
            const targetBankAccount = currentPayment.bank_account_id;
            if (targetBankAccount) {
                const amountChange = currentPayment.payment_type === 'purchase' ? -Math.abs(currentPayment.amount) : Math.abs(currentPayment.amount);
                await client.query('UPDATE treasury_bank_accounts SET balance = balance - $1 WHERE id = $2', [amountChange, targetBankAccount]);
            }
        }

        await client.query('COMMIT');
        res.json(p);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

router.delete('/payments/:id', asyncHandler(async (req, res) => {
    const result = await query('DELETE FROM treasury_payments WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not Found' });
    res.status(204).send();
}));

router.delete('/payments/invoice/:invoiceNumber', asyncHandler(async (req, res) => {
    const { paymentType } = req.query;
    let sql = 'DELETE FROM treasury_payments WHERE invoice_number = $1';
    const params = [req.params.invoiceNumber];

    if (paymentType) {
        sql += ' AND payment_type = $2';
        params.push(paymentType);
    }

    await query(sql, params);
    res.status(204).send();
}));

module.exports = router;
