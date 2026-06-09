/**
 * Payroll Calculator Service
 * Pure function — no database calls. Implements Moroccan Labour Law payroll rules.
 * All rates and brackets come from the taxConfig object (loaded from DB).
 */

const overtimeRates = {
  weekday_25:  1.25,
  weekday_50:  1.50,
  restday_100: 2.00,
  restday_150: 2.50,
};

/**
 * Calculate full payroll breakdown for one employee/month.
 * @param {Object} inputs
 * @param {Object} taxConfig  - Row from tax_config table (rates as decimals)
 * @returns {Object}          - All intermediate + final values
 */
function calculatePayroll(inputs, taxConfig) {
  const {
    base_salary,
    days_worked,
    total_working_days = 26,
    overtime_hours = 0,
    overtime_type = 'weekday_25',
    prime_transport = 0,
    prime_rendement = 0,
    prime_anciennete = 0,
    other_bonus = 0,
    advance_deduction = 0,
    unjustified_absence_days = 0,
    nb_dependents = 0,
  } = inputs;

  const {
    cnss_employee_rate,
    cnss_employer_rate,
    cnss_ceiling,
    prestations_familiales_rate,
    taxe_formation_rate,
    amo_employee_rate,
    amo_employer_rate,
    frais_pro_rate,
    frais_pro_ceiling_monthly,
    igr_brackets,
    charge_deduction_per_dependent,
    max_dependents,
  } = taxConfig;

  // STEP 1 — Daily rate
  const daily_rate = base_salary / total_working_days;

  // STEP 2 — Absence deduction
  const absence_deduction = daily_rate * unjustified_absence_days;

  // STEP 3 — Adjusted base
  const adjusted_base = base_salary - absence_deduction;

  // STEP 4 — Overtime pay
  const hourly_rate = base_salary / (total_working_days * 8);
  const multiplier = overtimeRates[overtime_type] || 1.25;
  const overtime_pay = hourly_rate * overtime_hours * multiplier;

  // STEP 5 — Gross (BRUT)
  const brut = adjusted_base + overtime_pay + Number(prime_transport)
    + Number(prime_rendement) + Number(prime_anciennete) + Number(other_bonus);

  // STEP 6 — CNSS employee (capped at cnss_ceiling)
  const cnss_base = Math.min(brut, Number(cnss_ceiling));
  const cnss_employee = cnss_base * Number(cnss_employee_rate);

  // STEP 7 — AMO employee
  const amo_employee = brut * Number(amo_employee_rate);

  // STEP 8 — Frais professionnels
  const frais_pro_raw = (brut - cnss_employee - amo_employee) * Number(frais_pro_rate);
  const frais_professionnels = Math.min(frais_pro_raw, Number(frais_pro_ceiling_monthly));

  // STEP 9 — Net imposable
  const net_imposable = brut - cnss_employee - amo_employee - frais_professionnels;

  // STEP 10 — IGR (find bracket then apply dependents relief)
  const brackets = Array.isArray(igr_brackets) ? igr_brackets : JSON.parse(igr_brackets);
  let bracket = brackets[brackets.length - 1]; // default to highest bracket
  for (const b of brackets) {
    const inBracket = net_imposable >= b.min && (b.max === null || net_imposable <= b.max);
    if (inBracket) { bracket = b; break; }
  }
  const igr_raw = Math.max(0, (net_imposable * bracket.rate) - bracket.deduction);
  const effective_dep = Math.min(Number(nb_dependents), Number(max_dependents));
  const charge_relief = effective_dep * (Number(charge_deduction_per_dependent) / 12);
  const igr = Math.max(0, igr_raw - charge_relief);

  // STEP 11 — Net à payer
  const net_a_payer = net_imposable - igr - Number(advance_deduction);

  // STEP 12 — Employer cost
  const cnss_employer = Math.min(brut, Number(cnss_ceiling)) * Number(cnss_employer_rate);
  const prestations_familiales = brut * Number(prestations_familiales_rate);
  const taxe_formation = brut * Number(taxe_formation_rate);
  const amo_employer = brut * Number(amo_employer_rate);
  const total_employer_cost = brut + cnss_employer + prestations_familiales + taxe_formation + amo_employer;

  const round2 = (n) => Math.round(n * 100) / 100;

  return {
    daily_rate:           round2(daily_rate),
    absence_deduction:    round2(absence_deduction),
    adjusted_base:        round2(adjusted_base),
    overtime_pay:         round2(overtime_pay),
    brut:                 round2(brut),
    cnss_employee:        round2(cnss_employee),
    amo_employee:         round2(amo_employee),
    frais_pro_raw:        round2(frais_pro_raw),
    frais_professionnels: round2(frais_professionnels),
    net_imposable:        round2(net_imposable),
    igr_raw:              round2(igr_raw),
    charge_relief:        round2(charge_relief),
    igr:                  round2(igr),
    net_a_payer:          round2(net_a_payer),
    cnss_employer:        round2(cnss_employer),
    prestations_familiales: round2(prestations_familiales),
    taxe_formation:       round2(taxe_formation),
    amo_employer:         round2(amo_employer),
    total_employer_cost:  round2(total_employer_cost),
  };
}

module.exports = { calculatePayroll };
