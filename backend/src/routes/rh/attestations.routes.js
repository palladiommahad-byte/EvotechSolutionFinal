/**
 * RH — Attestations Routes
 * Generates and streams PDF attestations for employees.
 * Uses company_settings from DB as the letterhead source.
 */

const express = require('express');
const { query } = require('../../config/database');
const { asyncHandler } = require('../../middleware/error.middleware');
const {
  generateAttestationTravail,
  generateAttestationSalaire,
  generateAttestationConge,
} = require('../../services/attestationGenerator');

const router = express.Router();

async function getEmployeeOrFail(id, res) {
  const r = await query('SELECT * FROM employees WHERE id = $1', [id]);
  if (r.rows.length === 0) { res.status(404).json({ error: 'Employé introuvable' }); return null; }
  return r.rows[0];
}

async function getCompany() {
  const r = await query('SELECT * FROM company_settings LIMIT 1');
  return r.rows[0] || {};
}

// GET /api/rh/attestations/:employeeId/travail
router.get('/:employeeId/travail', asyncHandler(async (req, res) => {
  const employee = await getEmployeeOrFail(req.params.employeeId, res);
  if (!employee) return;
  const company = await getCompany();
  generateAttestationTravail(employee, company, res);
}));

// GET /api/rh/attestations/:employeeId/salaire
router.get('/:employeeId/salaire', asyncHandler(async (req, res) => {
  const employee = await getEmployeeOrFail(req.params.employeeId, res);
  if (!employee) return;
  const company = await getCompany();
  // Get latest validated payroll for salary amount
  const payResult = await query(
    `SELECT * FROM payroll WHERE employee_id = $1 AND status IN ('validé','payé')
     ORDER BY year DESC, month DESC LIMIT 1`,
    [req.params.employeeId]
  );
  const latestPayroll = payResult.rows[0] || null;
  generateAttestationSalaire(employee, latestPayroll, company, res);
}));

// GET /api/rh/attestations/:employeeId/conge/:leaveId
router.get('/:employeeId/conge/:leaveId', asyncHandler(async (req, res) => {
  const employee = await getEmployeeOrFail(req.params.employeeId, res);
  if (!employee) return;
  const company = await getCompany();
  const leaveResult = await query('SELECT * FROM leaves WHERE id = $1 AND employee_id = $2', [req.params.leaveId, req.params.employeeId]);
  if (leaveResult.rows.length === 0) return res.status(404).json({ error: 'Congé introuvable' });
  generateAttestationConge(employee, leaveResult.rows[0], company, res);
}));

module.exports = router;
