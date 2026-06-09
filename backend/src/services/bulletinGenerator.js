/**
 * Bulletin de Paie PDF Generator
 * Generates the official Moroccan pay slip as a PDF stream using pdfkit.
 * Returns a pdfkit document piped to the HTTP response.
 */

const PDFDocument = require('pdfkit');

// Converts a decimal number to French words (MAD format)
function numberToFrenchWords(amount) {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

  function below100(n) {
    if (n < 20) return units[n];
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (t === 7) return u === 0 ? 'soixante-dix' : `soixante-${units[10 + u]}`;
    if (t === 9) return u === 0 ? 'quatre-vingt' : `quatre-vingt-${units[10 + u]}`;
    return tens[t] + (u ? (t === 8 ? '-' : '-') + units[u] : (t === 8 ? 's' : ''));
  }

  function below1000(n) {
    if (n < 100) return below100(n);
    const h = Math.floor(n / 100);
    const r = n % 100;
    const hStr = h === 1 ? 'cent' : `${units[h]} cent`;
    return r === 0 ? (h === 1 ? 'cent' : `${units[h]} cents`) : `${hStr} ${below100(r)}`;
  }

  if (amount === 0) return 'zéro dirham';
  const intPart = Math.floor(amount);
  const centPart = Math.round((amount - intPart) * 100);

  let result = '';
  if (intPart >= 1000) {
    const thousands = Math.floor(intPart / 1000);
    const rem = intPart % 1000;
    result = (thousands === 1 ? 'mille' : `${below1000(thousands)} mille`) + (rem > 0 ? ` ${below1000(rem)}` : '');
  } else {
    result = below1000(intPart);
  }
  result += intPart <= 1 ? ' dirham' : ' dirhams';
  if (centPart > 0) result += ` et ${centPart} centimes`;
  return result;
}

function formatMAD(n) {
  return Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthName(m) {
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  return months[m - 1] || '';
}

const overtimeLabels = {
  weekday_25:  'Heures sup. semaine +25%',
  weekday_50:  'Heures sup. semaine +50%',
  restday_100: 'Heures sup. repos +100%',
  restday_150: 'Heures sup. repos +150%',
};

/**
 * Generate bulletin de paie PDF and pipe it to the response.
 * @param {Object} payroll     - Payroll record (all calculated fields)
 * @param {Object} employee    - Employee record
 * @param {Object} company     - Company settings (name, ice, address, cnss)
 * @param {Object} taxConfig   - Tax rates for the payroll year
 * @param {Object} res         - Express response object
 */
function generateBulletin(payroll, employee, company, taxConfig, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition',
    `attachment; filename="bulletin-${employee.full_name.replace(/\s+/g, '-')}-${payroll.month}-${payroll.year}.pdf"`);
  doc.pipe(res);

  const W = 515; // usable width
  const COL = W / 2;
  const lineH = 18;
  const primary = '#1a2035';
  const light = '#f5f7fa';

  // ── HEADER ──────────────────────────────────────────────────────────────────
  doc.rect(40, 40, W, 60).fill(primary);
  doc.fillColor('white').fontSize(14).font('Helvetica-Bold')
    .text(company.name || 'ENTREPRISE', 55, 52, { width: 300 });
  doc.fontSize(8).font('Helvetica')
    .text(`ICE: ${company.ice || '-'}  |  CNSS: ${company.cnss || '-'}`, 55, 70)
    .text(company.address || '', 55, 82);

  doc.fillColor(primary).fontSize(16).font('Helvetica-Bold')
    .text('BULLETIN DE PAIE', 350, 52, { width: 200, align: 'right' });
  doc.fontSize(10).font('Helvetica')
    .text(`Mois de ${monthName(payroll.month)} ${payroll.year}`, 350, 72, { width: 200, align: 'right' });

  let y = 115;

  // ── EMPLOYEE INFO BLOCK ──────────────────────────────────────────────────────
  doc.rect(40, y, W, 14).fill(primary);
  doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
    .text('INFORMATIONS EMPLOYÉ', 45, y + 3);
  y += 18;

  const empFields = [
    ['Nom complet', employee.full_name],
    ['Poste', employee.job_title],
    ['CIN', employee.cin],
    ['N° CNSS', employee.cnss_number],
    ["Date d'embauche", employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('fr-MA') : '-'],
    ['Type de contrat', employee.contract_type],
    ['Personnes à charge', String(employee.nb_dependents || 0)],
  ];

  doc.fillColor('#333');
  for (let i = 0; i < empFields.length; i += 2) {
    const bg = Math.floor(i / 2) % 2 === 0 ? light : 'white';
    doc.rect(40, y, W, lineH).fill(bg);
    doc.fillColor('#555').fontSize(8).font('Helvetica-Bold')
      .text(empFields[i][0] + ':', 45, y + 4, { width: COL - 10 });
    doc.font('Helvetica').fillColor('#222')
      .text(empFields[i][1] || '-', 45 + COL * 0.4, y + 4, { width: COL * 0.55 });
    if (empFields[i + 1]) {
      doc.fillColor('#555').font('Helvetica-Bold')
        .text(empFields[i + 1][0] + ':', 45 + COL, y + 4, { width: COL * 0.4 });
      doc.font('Helvetica').fillColor('#222')
        .text(empFields[i + 1][1] || '-', 45 + COL + COL * 0.4, y + 4, { width: COL * 0.55 });
    }
    y += lineH;
  }
  y += 8;

  // ── GAINS TABLE ──────────────────────────────────────────────────────────────
  doc.rect(40, y, W, 14).fill(primary);
  doc.fillColor('white').fontSize(9).font('Helvetica-Bold').text('GAINS', 45, y + 3);
  doc.text('MONTANT (MAD)', 450, y + 3, { width: 100, align: 'right' });
  y += 16;

  const gains = [
    ['Salaire de base', payroll.base_salary],
  ];
  if (payroll.overtime_hours > 0) {
    gains.push([`${overtimeLabels[payroll.overtime_type] || 'Heures supplémentaires'} (${payroll.overtime_hours}h)`, payroll.overtime_pay]);
  }
  if (payroll.prime_transport > 0)   gains.push(['Prime de transport', payroll.prime_transport]);
  if (payroll.prime_rendement > 0)   gains.push(['Prime de rendement', payroll.prime_rendement]);
  if (payroll.prime_anciennete > 0)  gains.push(["Prime d'ancienneté", payroll.prime_anciennete]);
  if (payroll.other_bonus > 0)       gains.push(['Autres primes', payroll.other_bonus]);
  if (payroll.unjustified_absence_days > 0) {
    gains.push([`Absence non justifiée (${payroll.unjustified_absence_days} j) — déduction`, -Math.abs(payroll.absence_deduction)]);
  }

  gains.forEach(([label, val], idx) => {
    const bg = idx % 2 === 0 ? light : 'white';
    doc.rect(40, y, W, lineH).fill(bg);
    doc.fillColor('#333').fontSize(8).font('Helvetica').text(label, 45, y + 4, { width: 380 });
    doc.text(formatMAD(val), 430, y + 4, { width: 120, align: 'right' });
    y += lineH;
  });

  // TOTAL BRUT row
  doc.rect(40, y, W, lineH + 2).fill('#dce3ef');
  doc.fillColor(primary).fontSize(9).font('Helvetica-Bold')
    .text('TOTAL BRUT', 45, y + 4, { width: 380 });
  doc.text(formatMAD(payroll.brut), 430, y + 4, { width: 120, align: 'right' });
  y += lineH + 6;

  // ── RETENUES TABLE ───────────────────────────────────────────────────────────
  doc.rect(40, y, W, 14).fill(primary);
  doc.fillColor('white').fontSize(9).font('Helvetica-Bold').text('RETENUES', 45, y + 3);
  doc.text('MONTANT (MAD)', 450, y + 3, { width: 100, align: 'right' });
  y += 16;

  const cnssRate = (Number(taxConfig.cnss_employee_rate) * 100).toFixed(2);
  const amoRate  = (Number(taxConfig.amo_employee_rate) * 100).toFixed(2);
  const retenues = [
    [`CNSS salarié ${cnssRate}% (plafonné à ${formatMAD(taxConfig.cnss_ceiling)} MAD)`, payroll.cnss_employee],
    [`AMO salarié ${amoRate}%`, payroll.amo_employee],
    ['Frais professionnels (20%, plaf. 2 500 MAD)', payroll.frais_professionnels],
    ['IGR (Impôt Général sur le Revenu)', payroll.igr],
  ];
  if (payroll.advance_deduction > 0) retenues.push(['Avance sur salaire', payroll.advance_deduction]);

  retenues.forEach(([label, val], idx) => {
    const bg = idx % 2 === 0 ? light : 'white';
    doc.rect(40, y, W, lineH).fill(bg);
    doc.fillColor('#333').fontSize(8).font('Helvetica').text(label, 45, y + 4, { width: 380 });
    doc.text(formatMAD(val), 430, y + 4, { width: 120, align: 'right' });
    y += lineH;
  });

  const totalRetenues = (Number(payroll.cnss_employee) + Number(payroll.amo_employee)
    + Number(payroll.frais_professionnels) + Number(payroll.igr) + Number(payroll.advance_deduction || 0));
  doc.rect(40, y, W, lineH + 2).fill('#dce3ef');
  doc.fillColor(primary).fontSize(9).font('Helvetica-Bold')
    .text('TOTAL RETENUES', 45, y + 4, { width: 380 });
  doc.text(formatMAD(totalRetenues), 430, y + 4, { width: 120, align: 'right' });
  y += lineH + 10;

  // ── NET À PAYER (highlighted box) ────────────────────────────────────────────
  doc.rect(40, y, W, 36).fill(primary);
  doc.fillColor('white').fontSize(14).font('Helvetica-Bold')
    .text('NET À PAYER', 55, y + 9);
  doc.fontSize(16).text(`${formatMAD(payroll.net_a_payer)} MAD`, 300, y + 7, { width: 250, align: 'right' });
  y += 46;

  // Amount in words
  doc.fillColor('#444').fontSize(8).font('Helvetica-Oblique')
    .text(
      `Arrêté le présent bulletin de paie à la somme de : ${numberToFrenchWords(Number(payroll.net_a_payer) || 0)}`,
      40, y, { width: W }
    );
  y += 20;

  // ── SIGNATURE ZONES ──────────────────────────────────────────────────────────
  y += 20;
  doc.moveTo(40, y).lineTo(220, y).strokeColor('#aaa').stroke();
  doc.moveTo(335, y).lineTo(555, y).stroke();
  doc.fillColor('#555').fontSize(8).font('Helvetica')
    .text('Signature Employeur', 40, y + 4, { width: 180, align: 'center' })
    .text('Signature Employé', 335, y + 4, { width: 220, align: 'center' });

  doc.end();
}

module.exports = { generateBulletin };
