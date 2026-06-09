/**
 * RH — Leaves Routes
 * Manages leave requests: create, approve, reject, list.
 */

const express = require('express');
const { query } = require('../../config/database');
const { asyncHandler } = require('../../middleware/error.middleware');

const router = express.Router();

// GET /api/rh/leaves
router.get('/', asyncHandler(async (req, res) => {
  const { status, employee_id } = req.query;
  let sql = `SELECT l.*, e.full_name, e.job_title FROM leaves l
             JOIN employees e ON e.id = l.employee_id WHERE 1=1`;
  const params = [];
  let idx = 1;
  if (status)      { sql += ` AND l.status = $${idx++}`; params.push(status); }
  if (employee_id) { sql += ` AND l.employee_id = $${idx++}`; params.push(employee_id); }
  sql += ' ORDER BY l.created_at DESC';
  const result = await query(sql, params);
  res.json(result.rows);
}));

// GET /api/rh/leaves/:employeeId — leaves for one employee
router.get('/:employeeId', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT l.*, e.full_name FROM leaves l JOIN employees e ON e.id = l.employee_id
     WHERE l.employee_id = $1 ORDER BY l.start_date DESC`,
    [req.params.employeeId]
  );
  res.json(result.rows);
}));

// POST /api/rh/leaves
router.post('/', asyncHandler(async (req, res) => {
  const { employee_id, type, start_date, end_date, days_count, reason } = req.body;
  const result = await query(
    `INSERT INTO leaves (employee_id, type, start_date, end_date, days_count, reason, status)
     VALUES ($1,$2,$3,$4,$5,$6,'en attente') RETURNING *`,
    [employee_id, type, start_date, end_date, days_count, reason]
  );
  res.status(201).json(result.rows[0]);
}));

// PUT /api/rh/leaves/:id/approve
router.put('/:id/approve', asyncHandler(async (req, res) => {
  const result = await query(
    `UPDATE leaves SET status = 'approuvé', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Not Found' });
  res.json(result.rows[0]);
}));

// PUT /api/rh/leaves/:id/reject
router.put('/:id/reject', asyncHandler(async (req, res) => {
  const result = await query(
    `UPDATE leaves SET status = 'refusé', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Not Found' });
  res.json(result.rows[0]);
}));

module.exports = router;
