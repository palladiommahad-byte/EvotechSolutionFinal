const express = require('express');
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

const router = express.Router();

// Apply authentication to all routes
router.use(verifyToken);

/**
 * GET /api/contacts
 * Get all contacts with optional filters
 */
router.get('/', asyncHandler(async (req, res) => {
    const { contactType, status, search } = req.query;

    let sql = 'SELECT * FROM contacts WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (contactType) {
        sql += ` AND contact_type = $${paramIndex++}`;
        params.push(contactType);
    }

    if (status) {
        sql += ` AND status = $${paramIndex++}`;
        params.push(status);
    }

    if (search) {
        sql += ` AND (name ILIKE $${paramIndex} OR company ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
    }

    sql += ' ORDER BY name ASC';

    const result = await query(sql, params);

    // Map to include camelCase aliases
    const contacts = result.rows.map(contact => ({
        ...contact,
        ifNumber: contact.if_number,
        totalTransactions: contact.total_transactions || 0,
    }));

    res.json(contacts);
}));

/**
 * GET /api/contacts/clients
 * Get all clients
 */
router.get('/clients', asyncHandler(async (req, res) => {
    const { status, search } = req.query;

    let sql = "SELECT * FROM contacts WHERE contact_type = 'client'";
    const params = [];
    let paramIndex = 1;

    if (status) {
        sql += ` AND status = $${paramIndex++}`;
        params.push(status);
    }

    if (search) {
        sql += ` AND (name ILIKE $${paramIndex} OR company ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
    }

    sql += ' ORDER BY name ASC';

    const result = await query(sql, params);

    const contacts = result.rows.map(contact => ({
        ...contact,
        ifNumber: contact.if_number,
        totalTransactions: contact.total_transactions || 0,
    }));

    res.json(contacts);
}));

/**
 * GET /api/contacts/suppliers
 * Get all suppliers
 */
router.get('/suppliers', asyncHandler(async (req, res) => {
    const { status, search } = req.query;

    let sql = "SELECT * FROM contacts WHERE contact_type = 'supplier'";
    const params = [];
    let paramIndex = 1;

    if (status) {
        sql += ` AND status = $${paramIndex++}`;
        params.push(status);
    }

    if (search) {
        sql += ` AND (name ILIKE $${paramIndex} OR company ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
    }

    sql += ' ORDER BY name ASC';

    const result = await query(sql, params);

    const contacts = result.rows.map(contact => ({
        ...contact,
        ifNumber: contact.if_number,
        totalTransactions: contact.total_transactions || 0,
    }));

    res.json(contacts);
}));

/**
 * GET /api/contacts/:id
 * Get contact by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await query('SELECT * FROM contacts WHERE id = $1', [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Contact not found',
        });
    }

    const contact = result.rows[0];
    res.json({
        ...contact,
        ifNumber: contact.if_number,
        totalTransactions: contact.total_transactions || 0,
    });
}));

/**
 * POST /api/contacts
 * Create a new contact
 */
router.post('/', asyncHandler(async (req, res) => {
    const {
        name,
        company,
        email,
        phone,
        city,
        address,
        ice,
        if_number,
        ifNumber,
        rc,
        contact_type,
        status = 'active',
    } = req.body;

    if (!name || !contact_type) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Name and contact_type are required',
        });
    }

    const result = await query(
        `INSERT INTO contacts (name, company, email, phone, city, address, ice, if_number, rc, contact_type, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
        [name, company, email, phone, city, address, ice, if_number || ifNumber, rc, contact_type, status]
    );

    const contact = result.rows[0];
    res.status(201).json({
        ...contact,
        ifNumber: contact.if_number,
        totalTransactions: contact.total_transactions || 0,
    });
}));

/**
 * PUT /api/contacts/:id
 * Update a contact
 */
router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        name,
        company,
        email,
        phone,
        city,
        address,
        ice,
        if_number,
        ifNumber,
        rc,
        contact_type,
        status,
        total_transactions,
        totalTransactions,
    } = req.body;

    const result = await query(
        `UPDATE contacts 
     SET name = COALESCE($1, name),
         company = COALESCE($2, company),
         email = COALESCE($3, email),
         phone = COALESCE($4, phone),
         city = COALESCE($5, city),
         address = COALESCE($6, address),
         ice = COALESCE($7, ice),
         if_number = COALESCE($8, if_number),
         rc = COALESCE($9, rc),
         contact_type = COALESCE($10, contact_type),
         status = COALESCE($11, status),
         total_transactions = COALESCE($12, total_transactions),
         updated_at = NOW()
     WHERE id = $13
     RETURNING *`,
        [name, company, email, phone, city, address, ice, if_number || ifNumber, rc, contact_type, status, total_transactions || totalTransactions, id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Contact not found',
        });
    }

    const contact = result.rows[0];
    res.json({
        ...contact,
        ifNumber: contact.if_number,
        totalTransactions: contact.total_transactions || 0,
    });
}));

/**
 * DELETE /api/contacts/:id
 * Delete a contact
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await query('DELETE FROM contacts WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Contact not found',
        });
    }

    res.status(204).send();
}));

module.exports = router;
