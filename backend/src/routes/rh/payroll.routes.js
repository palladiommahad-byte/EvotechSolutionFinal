/**
 * RH — Payroll Routes
 * Handles payroll calculation, generation, status transitions, and PDF export.
 * Delegates calculation to payrollCalculator service.
 */

const express = require('express');
const { query } = require('../../config/database');
const { asyncHandler } = require('../../middleware/error.middleware');
const { calculatePayroll } = require('../../services/payrollCalculator');
const { generateBulletin } = require('../../services/bulletinGenerator');

const router = express.Router();

// Helper: load tax config for a given year (falls back to latest)
async function getTaxConfig(year) {
  const r = await query(
    'SELECT * FROM tax_config WHERE year = $1 OR year <= $1 ORDER BY year DESC LIMIT 1',
    [year]
  );
  if (r.rows.length === 0) throw new Error('Configuration fiscale introuvable');
  return r.rows[0];
}

// GET /api/rh/payroll — list all (with employee name)
router.get('/', asyncHandler(async (req, res) => {
  const { month, year, status } = req.query;
  let sql = `SELECT p.*, e.full_name, e.job_title FROM payroll p
             JOIN employees e ON e.id = p.employee_id WHERE 1=1`;
  const params = [];
  let idx = 1;
  if (month) { sql += ` AND p.month = $${idx++}`; params.push(month); }
  if (year)  { sql += ` AND p.year = $${idx++}`;  params.push(year); }
  if (status){ sql += ` AND p.status = $${idx++}`; params.push(status); }
  sql += ' ORDER BY p.year DESC, p.month DESC, e.full_name ASC';
  const result = await query(sql, params);
  res.json(result.rows);
}));

// GET /api/rh/payroll/export/cnss — CNSS declaration export (month + year as query params)
router.get('/export/cnss', asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) return res.status(400).json({ error: 'Paramètres month et year requis' });
  const result = await query(
    `SELECT p.*, e.full_name, e.cin, e.cnss_number, e.job_title
     FROM payroll p JOIN employees e ON e.id = p.employee_id
     WHERE p.month = $1 AND p.year = $2 AND p.status IN ('validé','payé')
     ORDER BY e.full_name ASC`,
    [month, year]
  );
  res.json({
    month: Number(month),
    year: Number(year),
    records: result.rows,
    total_brut: result.rows.reduce((s, r) => s + Number(r.brut || 0), 0),
    total_cnss_employee: result.rows.reduce((s, r) => s + Number(r.cnss_employee || 0), 0),
    total_cnss_employer: result.rows.reduce((s, r) => s + Number(r.cnss_employer || 0), 0),
  });
}));

// GET /api/rh/payroll/:employeeId — history for one employee
router.get('/:employeeId', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT p.*, e.full_name FROM payroll p JOIN employees e ON e.id = p.employee_id
     WHERE p.employee_id = $1 ORDER BY p.year DESC, p.month DESC`,
    [req.params.employeeId]
  );
  res.json(result.rows);
}));

// POST /api/rh/payroll/calculate — preview only (no save)
router.post('/calculate', asyncHandler(async (req, res) => {
  const { year = new Date().getFullYear(), ...inputs } = req.body;
  const taxConfig = await getTaxConfig(year);
  const result = calculatePayroll(inputs, taxConfig);
  res.json(result);
}));

// POST /api/rh/payroll/generate — calculate + save as brouillon
router.post('/generate', asyncHandler(async (req, res) => {
  const {
    employee_id, month, year,
    base_salary, days_worked = 26, overtime_hours = 0, overtime_type = 'weekday_25',
    prime_transport = 0, prime_rendement = 0, prime_anciennete = 0, other_bonus = 0,
    advance_deduction = 0, unjustified_absence_days = 0,
  } = req.body;

  const empResult = await query('SELECT * FROM employees WHERE id = $1', [employee_id]);
  if (empResult.rows.length === 0) return res.status(404).json({ error: 'Employé introuvable' });
  const emp = empResult.rows[0];

  const taxConfig = await getTaxConfig(year);

  const calc = calculatePayroll({
    base_salary: base_salary || emp.base_salary,
    days_worked,
    total_working_days: 26,
    overtime_hours,
    overtime_type,
    prime_transport,
    prime_rendement,
    prime_anciennete,
    other_bonus,
    advance_deduction,
    unjustified_absence_days,
    nb_dependents: emp.nb_dependents,
  }, taxConfig);

  const result = await query(
    `INSERT INTO payroll (
       employee_id, month, year, base_salary, days_worked,
       overtime_hours, overtime_type, prime_transport, prime_rendement,
       prime_anciennete, other_bonus, advance_deduction, unjustified_absence_days,
       daily_rate, absence_deduction, adjusted_base, overtime_pay,
       brut, cnss_employee, amo_employee, frais_pro_raw, frais_professionnels,
       net_imposable, igr_raw, charge_relief, igr, net_a_payer,
       cnss_employer, prestations_familiales, taxe_formation, amo_employer, total_employer_cost,
       status, generated_at
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
       $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,
       $28,$29,$30,$31,$32,'brouillon',NOW()
     ) RETURNING *`,
    [
      employee_id, month, year, base_salary || emp.base_salary, days_worked,
      overtime_hours, overtime_type, prime_transport, prime_rendement,
      prime_anciennete, other_bonus, advance_deduction, unjustified_absence_days,
      calc.daily_rate, calc.absence_deduction, calc.adjusted_base, calc.overtime_pay,
      calc.brut, calc.cnss_employee, calc.amo_employee, calc.frais_pro_raw, calc.frais_professionnels,
      calc.net_imposable, calc.igr_raw, calc.charge_relief, calc.igr, calc.net_a_payer,
      calc.cnss_employer, calc.prestations_familiales, calc.taxe_formation, calc.amo_employer, calc.total_employer_cost,
    ]
  );
  res.status(201).json(result.rows[0]);
}));

// PUT /api/rh/payroll/:id/validate — status → validé
router.put('/:id/validate', asyncHandler(async (req, res) => {
  const result = await query(
    `UPDATE payroll SET status = 'validé', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Not Found' });
  res.json(result.rows[0]);
}));

// PUT /api/rh/payroll/:id/pay — status → payé
router.put('/:id/pay', asyncHandler(async (req, res) => {
  const result = await query(
    `UPDATE payroll SET status = 'payé', paid_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Not Found' });
  res.json(result.rows[0]);
}));

// GET /api/rh/payroll/:id/bulletin — generate and return PDF
router.get('/:id/bulletin', asyncHandler(async (req, res) => {
  const payResult = await query('SELECT * FROM payroll WHERE id = $1', [req.params.id]);
  if (payResult.rows.length === 0) return res.status(404).json({ error: 'Fiche de paie introuvable' });
  const payroll = payResult.rows[0];

  const [empResult, compResult, taxResult] = await Promise.all([
    query('SELECT * FROM employees WHERE id = $1', [payroll.employee_id]),
    query('SELECT * FROM company_settings LIMIT 1'),
    query('SELECT * FROM tax_config WHERE year = $1 OR year <= $1 ORDER BY year DESC LIMIT 1', [payroll.year]),
  ]);

  const employee = empResult.rows[0];
  const company  = compResult.rows[0] || {};
  const taxConfig = taxResult.rows[0] || {};

  generateBulletin(payroll, employee, company, taxConfig, res);
}));

module.exports = router;
