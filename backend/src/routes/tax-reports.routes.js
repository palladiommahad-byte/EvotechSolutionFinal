const express = require('express');
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

const router = express.Router();

router.use(verifyToken);

/**
 * GET /api/tax-reports
 * Get all tax reports
 */
router.get('/', asyncHandler(async (req, res) => {
    const { year } = req.query;
    let sql = 'SELECT * FROM tax_reports WHERE 1=1';
    const params = [];

    if (year) {
        sql += ' AND year = $1';
        params.push(year);
    }

    sql += ' ORDER BY year DESC, quarter DESC';

    const result = await query(sql, params);
    res.json(result.rows);
}));

/**
 * GET /api/tax-reports/:id
 * Get tax report by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await query('SELECT * FROM tax_reports WHERE id = $1', [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Tax report not found' });
    }

    res.json(result.rows[0]);
}));

/**
 * POST /api/tax-reports
 * Create or update a tax report
 */
router.post('/', asyncHandler(async (req, res) => {
    const { year, quarter, data, status } = req.body;

    if (!year || !quarter || !data) {
        return res.status(400).json({ error: 'Validation Error', message: 'Year, quarter and data are required' });
    }

    // Check if report exists
    const existing = await query(
        'SELECT id FROM tax_reports WHERE year = $1 AND quarter = $2',
        [year, quarter]
    );

    let result;
    if (existing.rows.length > 0) {
        // Update
        result = await query(
            'UPDATE tax_reports SET data = $1, status = $2, updated_at = NOW() WHERE year = $3 AND quarter = $4 RETURNING *',
            [data, status || 'draft', year, quarter]
        );
    } else {
        // Insert
        result = await query(
            'INSERT INTO tax_reports (year, quarter, data, status) VALUES ($1, $2, $3, $4) RETURNING *',
            [year, quarter, data, status || 'draft']
        );
    }

    res.status(200).json(result.rows[0]);
}));

module.exports = router;
