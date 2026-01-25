const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

const router = express.Router();

router.use(verifyToken);

// ============================================
// COMPANY SETTINGS
// ============================================

router.get('/company', asyncHandler(async (req, res) => {
    const result = await query('SELECT * FROM company_settings LIMIT 1');
    res.json(result.rows[0] || null);
}));

router.put('/company', asyncHandler(async (req, res) => {
    const { name, legal_form, email, phone, address, ice, if_number, rc, tp, cnss, logo, footer_text } = req.body;

    const existing = await query('SELECT id FROM company_settings LIMIT 1');

    if (existing.rows.length === 0) {
        const result = await query(
            `INSERT INTO company_settings (name, legal_form, email, phone, address, ice, if_number, rc, tp, cnss, logo, footer_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [name || 'Company', legal_form, email, phone, address, ice, if_number, rc, tp, cnss, logo, footer_text]
        );
        return res.status(201).json(result.rows[0]);
    }

    const result = await query(
        `UPDATE company_settings SET 
     name = COALESCE($1, name), legal_form = COALESCE($2, legal_form), email = COALESCE($3, email),
     phone = COALESCE($4, phone), address = COALESCE($5, address), ice = COALESCE($6, ice),
     if_number = COALESCE($7, if_number), rc = COALESCE($8, rc), tp = COALESCE($9, tp),
     cnss = COALESCE($10, cnss), logo = COALESCE($11, logo), footer_text = COALESCE($12, footer_text),
     updated_at = NOW()
     WHERE id = $13 RETURNING *`,
        [name, legal_form, email, phone, address, ice, if_number, rc, tp, cnss, logo, footer_text, existing.rows[0].id]
    );
    res.json(result.rows[0]);
}));

// ============================================
// USER PREFERENCES
// ============================================

router.get('/preferences/:userId', asyncHandler(async (req, res) => {
    const result = await query('SELECT * FROM user_preferences WHERE user_id = $1', [req.params.userId]);
    res.json(result.rows[0] || null);
}));

router.put('/preferences/:userId', asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { theme_color, language, active_warehouse_id, browser_notifications_enabled, low_stock_alerts_enabled, order_updates_enabled } = req.body;

    const result = await query(
        `INSERT INTO user_preferences (user_id, theme_color, language, active_warehouse_id, browser_notifications_enabled, low_stock_alerts_enabled, order_updates_enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id) DO UPDATE SET 
       theme_color = COALESCE($2, user_preferences.theme_color),
       language = COALESCE($3, user_preferences.language),
       active_warehouse_id = COALESCE($4, user_preferences.active_warehouse_id),
       browser_notifications_enabled = COALESCE($5, user_preferences.browser_notifications_enabled),
       low_stock_alerts_enabled = COALESCE($6, user_preferences.low_stock_alerts_enabled),
       order_updates_enabled = COALESCE($7, user_preferences.order_updates_enabled),
       updated_at = NOW()
     RETURNING *`,
        [userId, theme_color, language, active_warehouse_id, browser_notifications_enabled, low_stock_alerts_enabled, order_updates_enabled]
    );
    res.json(result.rows[0]);
}));

// ============================================
// PROFILE
// ============================================

router.put('/profile', asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { name, email, password } = req.body;

    const updates = [];
    const params = [];
    let idx = 1;

    if (name) {
        updates.push(`name = $${idx++}`);
        params.push(name);
    }
    if (email) {
        // Check if email is already taken by another user
        const existing = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
        if (existing.rows.length > 0) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Email address is already in use'
            });
        }
        updates.push(`email = $${idx++}`);
        params.push(email);
    }
    if (password) {
        const hash = await bcrypt.hash(password, 10);
        updates.push(`password_hash = $${idx++}`);
        params.push(hash);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(userId);

    const result = await query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, name, role_id, status`,
        params
    );

    res.json(result.rows[0]);
}));

// ============================================
// WAREHOUSES
// ============================================

router.get('/warehouses', asyncHandler(async (req, res) => {
    const result = await query('SELECT * FROM warehouses ORDER BY name ASC');
    res.json(result.rows);
}));

router.get('/warehouses/:id', asyncHandler(async (req, res) => {
    const result = await query('SELECT * FROM warehouses WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not Found' });
    res.json(result.rows[0]);
}));

router.post('/warehouses', asyncHandler(async (req, res) => {
    const { name, city, address, phone, email } = req.body;
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const result = await query(
        'INSERT INTO warehouses (id, name, city, address, phone, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [id, name, city, address, phone, email]
    );
    res.status(201).json(result.rows[0]);
}));

router.put('/warehouses/:id', asyncHandler(async (req, res) => {
    const { name, city, address, phone, email } = req.body;
    const result = await query(
        `UPDATE warehouses SET name = COALESCE($1, name), city = COALESCE($2, city), 
     address = COALESCE($3, address), phone = COALESCE($4, phone), email = COALESCE($5, email), updated_at = NOW()
     WHERE id = $6 RETURNING *`,
        [name, city, address, phone, email, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not Found' });
    res.json(result.rows[0]);
}));

router.delete('/warehouses/:id', asyncHandler(async (req, res) => {
    const result = await query('DELETE FROM warehouses WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not Found' });
    res.status(204).send();
}));

// ============================================
// USERS
// ============================================

router.get('/users', requireRole('admin', 'manager'), asyncHandler(async (req, res) => {
    const result = await query('SELECT id, email, name, role_id, status, last_login, created_at FROM users ORDER BY name ASC');
    res.json(result.rows);
}));

router.get('/users/:id', asyncHandler(async (req, res) => {
    const result = await query('SELECT id, email, name, role_id, status, last_login, created_at FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not Found' });
    res.json(result.rows[0]);
}));

router.post('/users', requireRole('admin'), asyncHandler(async (req, res) => {
    const { email, name, password, role_id, status = 'active', created_by } = req.body;

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    const result = await query(
        'INSERT INTO users (email, name, password_hash, role_id, status, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, name, role_id, status, created_at',
        [email, name, password_hash, role_id, status, created_by || req.user.id]
    );
    res.status(201).json(result.rows[0]);
}));

router.put('/users/:id', requireRole('admin'), asyncHandler(async (req, res) => {
    const { email, name, password, role_id, status } = req.body;

    const updates = [];
    const params = [];
    let idx = 1;

    if (email) { updates.push(`email = $${idx++}`); params.push(email); }
    if (name) { updates.push(`name = $${idx++}`); params.push(name); }
    if (password) {
        const hash = await bcrypt.hash(password, 10);
        updates.push(`password_hash = $${idx++}`);
        params.push(hash);
    }
    if (role_id) { updates.push(`role_id = $${idx++}`); params.push(role_id); }
    if (status) { updates.push(`status = $${idx++}`); params.push(status); }
    updates.push(`updated_at = NOW()`);
    params.push(req.params.id);

    const result = await query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, name, role_id, status, last_login`,
        params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not Found' });
    res.json(result.rows[0]);
}));

router.delete('/users/:id', requireRole('admin'), asyncHandler(async (req, res) => {
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not Found' });
    res.status(204).send();
}));

// ============================================
// NOTIFICATIONS
// ============================================

router.get('/notifications', asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await query(
        'SELECT * FROM notifications WHERE user_id = $1 OR user_id IS NULL ORDER BY created_at DESC',
        [userId]
    );
    res.json(result.rows);
}));

router.get('/notifications/unread/count', asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await query(
        'SELECT COUNT(*) FROM notifications WHERE (user_id = $1 OR user_id IS NULL) AND read = false',
        [userId]
    );
    res.json({ count: parseInt(result.rows[0].count) });
}));

router.post('/notifications', asyncHandler(async (req, res) => {
    const { user_id, title, message, type = 'info', action_url, action_label } = req.body;
    const result = await query(
        'INSERT INTO notifications (user_id, title, message, type, action_url, action_label) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [user_id, title, message, type, action_url, action_label]
    );
    res.status(201).json(result.rows[0]);
}));

router.patch('/notifications/:id/read', asyncHandler(async (req, res) => {
    const result = await query(
        'UPDATE notifications SET read = true, read_at = NOW() WHERE id = $1 RETURNING *',
        [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not Found' });
    res.json(result.rows[0]);
}));

router.patch('/notifications/read-all', asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await query(
        'UPDATE notifications SET read = true, read_at = NOW() WHERE (user_id = $1 OR user_id IS NULL) AND read = false',
        [userId]
    );
    res.json({ message: 'All notifications marked as read' });
}));

router.delete('/notifications/:id', asyncHandler(async (req, res) => {
    const result = await query('DELETE FROM notifications WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not Found' });
    res.status(204).send();
}));

module.exports = router;
