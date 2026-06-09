/**
 * RH — Employees Routes
 * CRUD for employee records. Soft delete sets status to 'terminé'.
 * Validates base_salary >= SMIG from tax_config on create/update.
 */

const express = require('express');
const { query } = require('../../config/database');
const { asyncHandler } = require('../../middleware/error.middleware');

const router = express.Router();

// GET /api/rh/employees
router.get('/', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT * FROM employees ORDER BY full_name ASC`
  );
  res.json(result.rows);
}));

// GET /api/rh/employees/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Not Found', message: 'Employé introuvable' });
  res.json(result.rows[0]);
}));

// POST /api/rh/employees
router.post('/', asyncHandler(async (req, res) => {
  const {
    full_name, cin, phone, address, email,
    hire_date, job_title, department, contract_type,
    status = 'actif', base_salary, cnss_number, nb_dependents = 0,
  } = req.body;

  // SMIG validation
  const taxResult = await query('SELECT smig_monthly FROM tax_config ORDER BY year DESC LIMIT 1');
  const smig = taxResult.rows.length > 0 ? Number(taxResult.rows[0].smig_monthly) : 3111.39;
  if (Number(base_salary) < smig) {
    return res.status(400).json({
      error: 'Validation',
      message: `Le salaire saisi est inférieur au SMIG en vigueur (${smig.toFixed(2)} MAD)`,
    });
  }

  const result = await query(
    `INSERT INTO employees (full_name, cin, phone, address, email, hire_date, job_title, department, contract_type, status, base_salary, cnss_number, nb_dependents)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [full_name, cin, phone, address, email, hire_date, job_title, department, contract_type, status, base_salary, cnss_number, nb_dependents]
  );
  res.status(201).json(result.rows[0]);
}));

// PUT /api/rh/employees/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const {
    full_name, cin, phone, address, email,
    hire_date, job_title, department, contract_type,
    status, base_salary, cnss_number, nb_dependents,
  } = req.body;

  if (base_salary !== undefined) {
    const taxResult = await query('SELECT smig_monthly FROM tax_config ORDER BY year DESC LIMIT 1');
    const smig = taxResult.rows.length > 0 ? Number(taxResult.rows[0].smig_monthly) : 3111.39;
    if (Number(base_salary) < smig) {
      return res.status(400).json({
        error: 'Validation',
        message: `Le salaire saisi est inférieur au SMIG en vigueur (${smig.toFixed(2)} MAD)`,
      });
    }
  }

  const result = await query(
    `UPDATE employees SET
       full_name = COALESCE($1, full_name),
       cin = COALESCE($2, cin),
       phone = COALESCE($3, phone),
       address = COALESCE($4, address),
       email = COALESCE($5, email),
       hire_date = COALESCE($6, hire_date),
       job_title = COALESCE($7, job_title),
       department = COALESCE($8, department),
       contract_type = COALESCE($9, contract_type),
       status = COALESCE($10, status),
       base_salary = COALESCE($11, base_salary),
       cnss_number = COALESCE($12, cnss_number),
       nb_dependents = COALESCE($13, nb_dependents),
       updated_at = NOW()
     WHERE id = $14 RETURNING *`,
    [full_name, cin, phone, address, email, hire_date, job_title, department, contract_type, status, base_salary, cnss_number, nb_dependents, req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Not Found', message: 'Employé introuvable' });
  res.json(result.rows[0]);
}));

// DELETE /api/rh/employees/:id — soft delete
router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await query(
    `UPDATE employees SET status = 'terminé', updated_at = NOW() WHERE id = $1 RETURNING id`,
    [req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Not Found', message: 'Employé introuvable' });
  res.status(204).send();
}));

module.exports = router;
