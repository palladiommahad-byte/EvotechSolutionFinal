/**
 * RH — Tax Config Routes
 * Read and update the fiscal configuration per year (CNSS, AMO, IGR, SMIG, etc.)
 */

const express = require('express');
const { query } = require('../../config/database');
const { asyncHandler } = require('../../middleware/error.middleware');

const router = express.Router();

// GET /api/rh/tax-config/:year
router.get('/:year', asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT * FROM tax_config WHERE year = $1',
    [req.params.year]
  );
  if (result.rows.length === 0) {
    // Fall back to the latest available config
    const fallback = await query('SELECT * FROM tax_config ORDER BY year DESC LIMIT 1');
    if (fallback.rows.length === 0) return res.status(404).json({ error: 'Configuration fiscale introuvable' });
    return res.json(fallback.rows[0]);
  }
  res.json(result.rows[0]);
}));

// PUT /api/rh/tax-config/:year
router.put('/:year', asyncHandler(async (req, res) => {
  const {
    cnss_employee_rate, cnss_employer_rate, cnss_ceiling,
    prestations_familiales_rate, taxe_formation_rate,
    amo_employee_rate, amo_employer_rate,
    frais_pro_rate, frais_pro_ceiling_monthly,
    igr_brackets, charge_deduction_per_dependent, max_dependents, smig_monthly,
  } = req.body;

  const existing = await query('SELECT id FROM tax_config WHERE year = $1', [req.params.year]);

  if (existing.rows.length === 0) {
    const result = await query(
      `INSERT INTO tax_config (year, cnss_employee_rate, cnss_employer_rate, cnss_ceiling,
         prestations_familiales_rate, taxe_formation_rate, amo_employee_rate, amo_employer_rate,
         frais_pro_rate, frais_pro_ceiling_monthly, igr_brackets,
         charge_deduction_per_dependent, max_dependents, smig_monthly)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [req.params.year, cnss_employee_rate, cnss_employer_rate, cnss_ceiling,
        prestations_familiales_rate, taxe_formation_rate, amo_employee_rate, amo_employer_rate,
        frais_pro_rate, frais_pro_ceiling_monthly,
        JSON.stringify(igr_brackets), charge_deduction_per_dependent, max_dependents, smig_monthly]
    );
    return res.status(201).json(result.rows[0]);
  }

  const result = await query(
    `UPDATE tax_config SET
       cnss_employee_rate = COALESCE($1, cnss_employee_rate),
       cnss_employer_rate = COALESCE($2, cnss_employer_rate),
       cnss_ceiling = COALESCE($3, cnss_ceiling),
       prestations_familiales_rate = COALESCE($4, prestations_familiales_rate),
       taxe_formation_rate = COALESCE($5, taxe_formation_rate),
       amo_employee_rate = COALESCE($6, amo_employee_rate),
       amo_employer_rate = COALESCE($7, amo_employer_rate),
       frais_pro_rate = COALESCE($8, frais_pro_rate),
       frais_pro_ceiling_monthly = COALESCE($9, frais_pro_ceiling_monthly),
       igr_brackets = COALESCE($10::jsonb, igr_brackets),
       charge_deduction_per_dependent = COALESCE($11, charge_deduction_per_dependent),
       max_dependents = COALESCE($12, max_dependents),
       smig_monthly = COALESCE($13, smig_monthly),
       updated_at = NOW()
     WHERE year = $14 RETURNING *`,
    [
      cnss_employee_rate, cnss_employer_rate, cnss_ceiling,
      prestations_familiales_rate, taxe_formation_rate,
      amo_employee_rate, amo_employer_rate,
      frais_pro_rate, frais_pro_ceiling_monthly,
      igr_brackets ? JSON.stringify(igr_brackets) : null,
      charge_deduction_per_dependent, max_dependents, smig_monthly,
      req.params.year,
    ]
  );
  res.json(result.rows[0]);
}));

module.exports = router;
