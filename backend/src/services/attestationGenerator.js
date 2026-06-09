/**
 * Attestation PDF Generator
 * Generates three types of Moroccan HR attestations using pdfkit:
 *   1. Attestation de Travail
 *   2. Attestation de Salaire
 *   3. Attestation de Congé
 * Uses company info from company_settings. Returns piped PDF to Express response.
 */

const PDFDocument = require('pdfkit');

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-MA');
}

function drawHeader(doc, company, title) {
  const W = 515;
  const primary = '#1a2035';

  doc.rect(40, 40, W, 60).fill(primary);
  doc.fillColor('white').fontSize(13).font('Helvetica-Bold')
    .text(company.name || 'ENTREPRISE', 55, 50, { width: 300 });
  doc.fontSize(8).font('Helvetica')
    .text(`ICE: ${company.ice || '-'}  |  CNSS: ${company.cnss || '-'}`, 55, 68)
    .text(company.address || '', 55, 80);

  doc.fillColor('#f5f5f5').fontSize(14).font('Helvetica-Bold')
    .text(title, 350, 55, { width: 200, align: 'right' });

  doc.moveTo(40, 110).lineTo(555, 110).strokeColor(primary).lineWidth(2).stroke();
  doc.moveDown(0.5);

  return 130;
}

function drawFooter(doc, y, company) {
  const W = 515;
  doc.fillColor('#444').fontSize(8).font('Helvetica-Oblique')
    .text(
      'La présente attestation est délivrée à l\'intéressé(e) pour servir et valoir ce que de droit.',
      40, y, { width: W, align: 'justify' }
    );
  y += 30;

  doc.fillColor('#333').fontSize(9).font('Helvetica')
    .text(`Fait à _____________________, le ${new Date().toLocaleDateString('fr-MA')}`, 40, y);
  y += 40;

  doc.moveTo(40, y).lineTo(220, y).strokeColor('#aaa').stroke();
  doc.moveTo(335, y).lineTo(555, y).stroke();
  doc.fillColor('#555').fontSize(8)
    .text('Cachet de l\'entreprise', 40, y + 4, { width: 180, align: 'center' })
    .text('Signature & Cachet Employeur', 335, y + 4, { width: 220, align: 'center' });
}

/**
 * Attestation de Travail (employment certificate)
 */
function generateAttestationTravail(employee, company, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition',
    `attachment; filename="attestation-travail-${employee.cin}.pdf"`);
  doc.pipe(res);

  let y = drawHeader(doc, company, 'ATTESTATION DE TRAVAIL');
  y += 10;

  doc.fillColor('#222').fontSize(11).font('Helvetica')
    .text(`Je soussigné(e), représentant légal de la société ${company.name || '____________________'},`, 40, y, { width: 515 });
  y += 30;
  doc.text('atteste par la présente que :', 40, y);
  y += 25;

  const fields = [
    ['Nom et Prénom', employee.full_name],
    ['N° CIN', employee.cin],
    ['Poste occupé', employee.job_title],
    ['Département', employee.department || '-'],
    ["Date d'embauche", formatDate(employee.hire_date)],
    ['Type de contrat', employee.contract_type],
  ];

  fields.forEach(([label, val]) => {
    doc.fillColor('#555').fontSize(10).font('Helvetica-Bold').text(`${label} : `, 60, y, { continued: true });
    doc.fillColor('#111').font('Helvetica').text(val || '-');
    y += 22;
  });

  y += 15;
  doc.fillColor('#222').fontSize(11).font('Helvetica')
    .text(
      `est employé(e) dans notre société depuis le ${formatDate(employee.hire_date)}, dans le cadre d'un contrat de type ${employee.contract_type}.`,
      40, y, { width: 515, align: 'justify' }
    );
  y += 60;

  drawFooter(doc, y, company);
  doc.end();
}

/**
 * Attestation de Salaire (salary certificate for banks)
 */
function generateAttestationSalaire(employee, latestPayroll, company, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition',
    `attachment; filename="attestation-salaire-${employee.cin}.pdf"`);
  doc.pipe(res);

  let y = drawHeader(doc, company, 'ATTESTATION DE SALAIRE');
  y += 10;

  const netSalary = latestPayroll ? latestPayroll.net_a_payer : employee.base_salary;
  const fmt = (n) => Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  doc.fillColor('#222').fontSize(11).font('Helvetica')
    .text(`Je soussigné(e), représentant légal de la société ${company.name || '____________________'},`, 40, y, { width: 515 });
  y += 30;
  doc.text('certifie que :', 40, y);
  y += 25;

  const fields = [
    ['Nom et Prénom', employee.full_name],
    ['N° CIN', employee.cin],
    ['Poste occupé', employee.job_title],
    ['Type de contrat', employee.contract_type],
    ["Date d'embauche", formatDate(employee.hire_date)],
  ];
  fields.forEach(([label, val]) => {
    doc.fillColor('#555').fontSize(10).font('Helvetica-Bold').text(`${label} : `, 60, y, { continued: true });
    doc.fillColor('#111').font('Helvetica').text(val || '-');
    y += 22;
  });

  y += 15;
  doc.fillColor('#222').fontSize(11).font('Helvetica')
    .text(
      `perçoit un salaire net mensuel de ${fmt(netSalary)} MAD (${netSalary} dirhams).`,
      40, y, { width: 515, align: 'justify' }
    );
  y += 30;
  doc.text(
    'Cette attestation est délivrée à la demande de l\'intéressé(e) pour présentation à tout organisme bancaire ou financier.',
    40, y, { width: 515, align: 'justify' }
  );
  y += 60;

  drawFooter(doc, y, company);
  doc.end();
}

/**
 * Attestation de Congé (leave certificate)
 */
function generateAttestationConge(employee, leave, company, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition',
    `attachment; filename="attestation-conge-${employee.cin}.pdf"`);
  doc.pipe(res);

  let y = drawHeader(doc, company, 'ATTESTATION DE CONGÉ');
  y += 10;

  doc.fillColor('#222').fontSize(11).font('Helvetica')
    .text(`Je soussigné(e), représentant légal de la société ${company.name || '____________________'},`, 40, y, { width: 515 });
  y += 30;
  doc.text('atteste que :', 40, y);
  y += 25;

  const fields = [
    ['Nom et Prénom', employee.full_name],
    ['N° CIN', employee.cin],
    ['Poste occupé', employee.job_title],
    ['Type de congé', leave.type],
    ['Date de début', formatDate(leave.start_date)],
    ['Date de fin', formatDate(leave.end_date)],
    ['Nombre de jours', String(leave.days_count)],
  ];
  fields.forEach(([label, val]) => {
    doc.fillColor('#555').fontSize(10).font('Helvetica-Bold').text(`${label} : `, 60, y, { continued: true });
    doc.fillColor('#111').font('Helvetica').text(val || '-');
    y += 22;
  });

  y += 25;
  drawFooter(doc, y, company);
  doc.end();
}

module.exports = { generateAttestationTravail, generateAttestationSalaire, generateAttestationConge };
