import jsPDF from 'jspdf';
import { formatMADFull, InvoiceItem } from './moroccan-utils';
import { generatePDFFromTemplate, createFallbackItems } from './pdf-template-generator';
import i18n from '@/i18n/config';

// CompanyInfo type for PDF generation
interface CompanyInfo {
  name: string;
  legalForm: string;
  email: string;
  phone: string;
  address: string;
  ice: string;
  ifNumber: string;
  rc: string;
  tp: string;
  cnss: string;
  logo?: string | null;
  footerText?: string;
}

// Helper to add text with wrapping
const addWrappedText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number = 5): number => {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + (lines.length * lineHeight);
};

// Generate Invoice PDF using new template
export const generateInvoicePDF = async (document: {
  id: string;
  client?: string;
  supplier?: string;
  clientData?: any;
  supplierData?: any;
  date: string;
  items: number | InvoiceItem[];
  total: number;
  paymentMethod?: string;
  status?: string;
  type?: string;
  dueDate?: string;
  note?: string;
  companyInfo?: CompanyInfo;
}) => {
  const items: InvoiceItem[] = Array.isArray(document.items)
    ? document.items
    : createFallbackItems(document.items, document.total);

  await generatePDFFromTemplate({
    type: 'invoice',
    documentId: document.id,
    date: document.date,
    client: document.client,
    supplier: document.supplier,
    clientData: document.clientData,
    supplierData: document.supplierData,
    items,
    paymentMethod: document.paymentMethod as 'cash' | 'check' | 'bank_transfer' | undefined,
    dueDate: document.dueDate,
    note: document.note,
    language: i18n.language || 'en',
    companyInfo: document.companyInfo,
  });
};

// Legacy function for backwards compatibility
export const generateInvoicePDFLegacy = (document: {
  id: string;
  client?: string;
  supplier?: string;
  date: string;
  items: number;
  total: number;
  paymentMethod?: string;
  status?: string;
}) => {
  const doc = new jsPDF();
  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', 105, yPos, { align: 'center' });
  yPos += 10;

  // Invoice Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  yPos = addWrappedText(doc, `Facture N°: ${document.id}`, 20, yPos, 90, 5);
  yPos = addWrappedText(doc, `Date: ${document.date}`, 20, yPos, 90, 5);
  if (document.client) {
    yPos = addWrappedText(doc, `Client: ${document.client}`, 20, yPos, 90, 5);
  }
  if (document.supplier) {
    yPos = addWrappedText(doc, `Fournisseur: ${document.supplier}`, 20, yPos, 90, 5);
  }

  // Items section
  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Résumé', 20, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre d'articles: ${document.items}`, 20, yPos);
  yPos += 5;

  // Total
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total: ${formatMADFull(document.total)}`, 20, yPos);
  yPos += 5;

  if (document.paymentMethod) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const paymentMethodText = document.paymentMethod === 'cash' ? 'Espèces' :
      document.paymentMethod === 'check' ? 'Chèque' :
        'Virement bancaire';
    doc.text(`Méthode de paiement: ${paymentMethodText}`, 20, yPos);
  }

  // Footer
  yPos = 270;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Merci de votre confiance!', 105, yPos, { align: 'center' });

  // Save
  doc.save(`${document.id}.pdf`);
};

// Legacy function for backwards compatibility
export const generatePurchaseOrderPDFLegacy = (document: {
  id: string;
  supplier?: string;
  date: string;
  items: number;
  total: number;
  status?: string;
}) => {
  const doc = new jsPDF();
  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('BON DE COMMANDE', 105, yPos, { align: 'center' });
  yPos += 10;

  // Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  yPos = addWrappedText(doc, `Commande N°: ${document.id}`, 20, yPos, 90, 5);
  yPos = addWrappedText(doc, `Date: ${document.date}`, 20, yPos, 90, 5);
  if (document.supplier) {
    yPos = addWrappedText(doc, `Fournisseur: ${document.supplier}`, 20, yPos, 90, 5);
  }

  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Résumé', 20, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre d'articles: ${document.items}`, 20, yPos);
  yPos += 5;

  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total: ${formatMADFull(document.total)}`, 20, yPos);

  // Footer
  yPos = 270;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Bon de commande', 105, yPos, { align: 'center' });

  doc.save(`${document.id}.pdf`);
};

// Legacy function for backwards compatibility
export const generateDeliveryNotePDFLegacy = (document: {
  id: string;
  client?: string;
  supplier?: string;
  date: string;
  items: number;
  total: number;
  status?: string;
}) => {
  const doc = new jsPDF();
  let yPos = 20;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('BON DE LIVRAISON', 105, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  yPos = addWrappedText(doc, `Bon de livraison N°: ${document.id}`, 20, yPos, 90, 5);
  yPos = addWrappedText(doc, `Date: ${document.date}`, 20, yPos, 90, 5);
  if (document.client) {
    yPos = addWrappedText(doc, `Client: ${document.client}`, 20, yPos, 90, 5);
  }
  if (document.supplier) {
    yPos = addWrappedText(doc, `Fournisseur: ${document.supplier}`, 20, yPos, 90, 5);
  }

  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Résumé', 20, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre d'articles: ${document.items}`, 20, yPos);
  yPos += 5;

  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total: ${formatMADFull(document.total)}`, 20, yPos);

  yPos = 270;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Bon de livraison', 105, yPos, { align: 'center' });

  doc.save(`${document.id}.pdf`);
};

// Generate Purchase Order PDF using new template
export const generatePurchaseOrderPDF = async (document: {
  id: string;
  client?: string;
  supplier?: string;
  clientData?: any;
  supplierData?: any;
  date: string;
  items: number | InvoiceItem[];
  total: number;
  status?: string;
  dueDate?: string;
  companyInfo?: CompanyInfo;
}) => {
  const items: InvoiceItem[] = Array.isArray(document.items)
    ? document.items
    : createFallbackItems(document.items, document.total);

  await generatePDFFromTemplate({
    type: 'purchase_order',
    documentId: document.id,
    date: document.date,
    client: document.client,
    supplier: document.supplier,
    clientData: document.clientData,
    supplierData: document.supplierData,
    items,
    dueDate: document.dueDate,
    language: i18n.language || 'en',
    companyInfo: document.companyInfo,
  });
};

// Generate Delivery Note PDF using new template
export const generateDeliveryNotePDF = async (document: {
  id: string;
  client?: string;
  supplier?: string;
  clientData?: any;
  supplierData?: any;
  date: string;
  items: number | InvoiceItem[];
  total: number;
  status?: string;
  dueDate?: string;
  note?: string;
  companyInfo?: CompanyInfo;
}) => {
  const items: InvoiceItem[] = Array.isArray(document.items)
    ? document.items
    : createFallbackItems(document.items, document.total);

  await generatePDFFromTemplate({
    type: 'delivery_note',
    documentId: document.id,
    date: document.date,
    client: document.client,
    supplier: document.supplier,
    clientData: document.clientData,
    supplierData: document.supplierData,
    items,
    dueDate: document.dueDate,
    note: document.note,
    language: i18n.language || 'en',
    companyInfo: document.companyInfo,
  });
};

// Generate Prélèvement PDF using new template
export const generatePrelevementPDF = async (document: {
  id: string;
  client?: string;
  clientData?: any;
  date: string;
  items: number | InvoiceItem[];
  total: number;
  status?: string;
  note?: string;
  companyInfo?: CompanyInfo;
}) => {
  const items: InvoiceItem[] = Array.isArray(document.items)
    ? document.items
    : createFallbackItems(document.items, document.total);

  await generatePDFFromTemplate({
    type: 'prelevement',
    documentId: document.id,
    date: document.date,
    client: document.client,
    clientData: document.clientData,
    items,
    note: document.note,
    language: i18n.language || 'en',
    companyInfo: document.companyInfo,
  });
};

// Generate Estimate PDF using new template
export const generateEstimatePDF = async (document: {
  id: string;
  client?: string;
  supplier?: string;
  clientData?: any;
  supplierData?: any;
  date: string;
  items: number | InvoiceItem[];
  total: number;
  status?: string;
  dueDate?: string;
  note?: string;
  companyInfo?: CompanyInfo;
}) => {
  const items: InvoiceItem[] = Array.isArray(document.items)
    ? document.items
    : createFallbackItems(document.items, document.total);

  await generatePDFFromTemplate({
    type: 'estimate',
    documentId: document.id,
    date: document.date,
    client: document.client,
    supplier: document.supplier,
    clientData: document.clientData,
    supplierData: document.supplierData,
    items,
    dueDate: document.dueDate,
    note: document.note,
    language: i18n.language || 'en',
    companyInfo: document.companyInfo,
  });
};

// Legacy function for backwards compatibility
export const generateEstimatePDFLegacy = (document: {
  id: string;
  client?: string;
  date: string;
  items: number;
  total: number;
  status?: string;
}) => {
  const doc = new jsPDF();
  let yPos = 20;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DEVIS', 105, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  yPos = addWrappedText(doc, `Devis N°: ${document.id}`, 20, yPos, 90, 5);
  yPos = addWrappedText(doc, `Date: ${document.date}`, 20, yPos, 90, 5);
  if (document.client) {
    yPos = addWrappedText(doc, `Client: ${document.client}`, 20, yPos, 90, 5);
  }

  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Résumé', 20, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre d'articles: ${document.items}`, 20, yPos);
  yPos += 5;

  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total: ${formatMADFull(document.total)}`, 20, yPos);

  yPos = 270;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Devis - Valable 30 jours', 105, yPos, { align: 'center' });

  doc.save(`${document.id}.pdf`);
};

// Generate Credit Note PDF
export const generateCreditNotePDF = (document: {
  id: string;
  client: string;
  date: string;
  items: number;
  total: number;
  status?: string;
}) => {
  const doc = new jsPDF();
  let yPos = 20;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('AVOIR', 105, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  yPos = addWrappedText(doc, `Avoir N°: ${document.id}`, 20, yPos, 90, 5);
  yPos = addWrappedText(doc, `Date: ${document.date}`, 20, yPos, 90, 5);
  yPos = addWrappedText(doc, `Client: ${document.client}`, 20, yPos, 90, 5);

  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Résumé', 20, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre d'articles: ${document.items}`, 20, yPos);
  yPos += 5;

  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total: ${formatMADFull(document.total)}`, 20, yPos);

  yPos = 270;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Avoir', 105, yPos, { align: 'center' });

  doc.save(`${document.id}.pdf`);
};

// Generate Statement PDF
export const generateStatementPDF = (document: {
  id: string;
  client?: string;
  supplier?: string;
  clientData?: any;
  supplierData?: any;
  date: string;
  items: number;
  total: number;
  status?: string;
  transactions?: Array<{
    date: string;
    ref: string;
    type: string;
    amount: number; // Total amount of invoice
    paid: number;   // Amount paid
    balance: number; // Running balance
  }>;
  period?: { start: string; end: string };
  companyInfo?: CompanyInfo;
}) => {
  const doc = new jsPDF();
  let yPos = 20;

  // Header Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('RELEVÉ DE COMPTE', 105, yPos, { align: 'center' });
  yPos += 10;

  // Company Info (Left)
  if (document.companyInfo) {
    const ci = document.companyInfo;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text((ci.name || '').toUpperCase(), 20, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (ci.address) {
      yPos = addWrappedText(doc, ci.address, 20, yPos, 80, 4);
    }
    if (ci.phone) {
      doc.text(`Tél: ${ci.phone}`, 20, yPos);
      yPos += 4;
    }
    if (ci.email) {
      doc.text(`Email: ${ci.email}`, 20, yPos);
      yPos += 4;
    }
  }

  // Client/Supplier Info (Right)
  // Reset Y if company info was long, or just use fixed position
  let rightColX = 120;
  let rightColY = 30;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ADRESSÉ À:', rightColX, rightColY);
  rightColY += 5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const entityName = document.client || document.supplier || '-';
  const entityData = document.clientData || document.supplierData;

  doc.text(entityName, rightColX, rightColY);
  rightColY += 5;

  if (entityData) {
    doc.setFontSize(9);
    if (entityData.address) {
      rightColY = addWrappedText(doc, entityData.address, rightColX, rightColY, 70, 4);
    }
    if (entityData.ice) {
      doc.text(`ICE: ${entityData.ice}`, rightColX, rightColY);
      rightColY += 4;
    }
  }

  // Align Y pos to max of both columns
  yPos = Math.max(yPos, rightColY) + 10;

  // Statement Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Relevé N°: ${document.id}`, 20, yPos);

  // Date / Period
  const dateText = document.period
    ? `Période: Du ${document.period.start} au ${document.period.end}`
    : `Date: ${document.date}`;
  doc.text(dateText, 120, yPos);

  yPos += 15;

  // Transaction Table Header
  if (document.transactions && document.transactions.length > 0) {
    doc.setFillColor(59, 130, 246); // Blue header
    doc.rect(20, yPos - 5, 170, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);

    doc.text('Date', 22, yPos);
    doc.text('Référence', 50, yPos);
    doc.text('Débit (TTC)', 100, yPos); // Invoiced
    doc.text('Crédit (Payé)', 135, yPos); // Paid
    doc.text('Solde', 170, yPos); // Balance

    doc.setTextColor(0, 0, 0); // Reset text color
    yPos += 5;

    // Table Content
    doc.setFont('helvetica', 'normal');

    document.transactions.forEach((tx, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
        // Draw header again on new page? (Optional, skip for brevity)
      }

      yPos += 6;

      // Striping
      if (index % 2 === 1) {
        doc.setFillColor(241, 245, 249); // Light gray
        doc.rect(20, yPos - 4, 170, 6, 'F');
      }

      doc.text(tx.date, 22, yPos);
      doc.text(tx.ref, 50, yPos);

      // Align numbers right (approximate approach by adjusting X)
      // Helper to right align:
      // doc.text(str, x, y, { align: 'right' }); // jsPDF supports align: 'right'

      doc.text(formatMADFull(tx.amount), 115, yPos, { align: 'right' });
      doc.text(formatMADFull(tx.paid), 150, yPos, { align: 'right' });
      doc.text(formatMADFull(tx.balance), 185, yPos, { align: 'right' });
    });

    yPos += 10;
  }

  // Summary at bottom
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  const totalLabel = 'Solde à Payer:';
  doc.text(totalLabel, 130, yPos);
  doc.setFontSize(12);
  doc.text(formatMADFull(document.total), 185, yPos, { align: 'right' });

  // Footer
  yPos = 280;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Relevé généré le ' + new Date().toLocaleDateString('fr-MA'), 105, yPos, { align: 'center' });

  doc.save(`${document.id}.pdf`);
};

// Generate Inventory List PDF
export const generateInventoryPDF = (products: Array<{
  sku: string;
  name: string;
  category: string;
  stock: number;
  price: number;
}>) => {
  const doc = new jsPDF();
  let yPos = 20;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('LISTE DES PRODUITS', 105, yPos, { align: 'center' });
  yPos += 15;

  // Table header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SKU', 20, yPos);
  doc.text('Nom', 50, yPos);
  doc.text('Catégorie', 100, yPos);
  doc.text('Stock', 140, yPos);
  doc.text('Prix', 160, yPos);
  yPos += 8;
  doc.line(20, yPos, 190, yPos);
  yPos += 5;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  products.forEach((product, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    doc.text(product.sku, 20, yPos);
    const nameLines = doc.splitTextToSize(product.name, 40);
    doc.text(nameLines, 50, yPos);
    yPos += nameLines.length * 5;
    doc.text(product.category, 100, yPos - nameLines.length * 5);
    doc.text(product.stock.toString(), 140, yPos - nameLines.length * 5);
    doc.text(formatMADFull(product.price), 160, yPos - nameLines.length * 5);
    yPos += 8;

    if (index < products.length - 1) {
      doc.line(20, yPos, 190, yPos);
      yPos += 2;
    }
  });

  doc.save(`inventory_${new Date().toISOString().split('T')[0]}.pdf`);
};

// Generate Tax Report PDF
export const generateTaxReportPDF = (data: {
  grossRevenue: number;
  expenses: number;
  netProfit: number;
  estimatedIS: number;
  vatCollected?: number;
  vatPaid?: number;
  vatDue?: number;
  period?: { year: number; quarter: string };
  salesCount?: number;
  purchasesCount?: number;
}) => {
  const doc = new jsPDF();
  let yPos = 20;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('RAPPORT FISCAL', 105, yPos, { align: 'center' });
  yPos += 10;

  // Period info
  if (data.period) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Période: ${data.period.quarter} ${data.period.year}`, 105, yPos, { align: 'center' });
    yPos += 10;
  }
  yPos += 5;

  // VAT Section (if data available)
  if (data.vatCollected !== undefined) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TVA (Taxe sur la Valeur Ajoutée)', 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`TVA Collectée: ${formatMADFull(data.vatCollected)}`, 20, yPos);
    yPos += 6;
    doc.text(`TVA Déductible: ${formatMADFull(data.vatPaid || 0)}`, 20, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'bold');
    const vatDueLabel = (data.vatDue || 0) >= 0 ? 'TVA à Payer' : 'Crédit de TVA';
    doc.text(`${vatDueLabel}: ${formatMADFull(Math.abs(data.vatDue || 0))}`, 20, yPos);
    yPos += 15;
  }

  // Financial Summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Résumé Financier', 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Revenus bruts: ${formatMADFull(data.grossRevenue)}`, 20, yPos);
  yPos += 6;
  doc.text(`Dépenses totales: ${formatMADFull(data.expenses)}`, 20, yPos);
  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`Bénéfice net: ${formatMADFull(data.netProfit)}`, 20, yPos);
  yPos += 15;

  // Transaction counts
  if (data.salesCount !== undefined || data.purchasesCount !== undefined) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre de transactions ventes: ${data.salesCount || 0}`, 20, yPos);
    yPos += 6;
    doc.text(`Nombre de transactions achats: ${data.purchasesCount || 0}`, 20, yPos);
    yPos += 15;
  }

  // IS Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Impôt sur les Sociétés (IS)', 20, yPos);
  yPos += 8;
  doc.setFontSize(14);
  doc.text(`IS estimé: ${formatMADFull(data.estimatedIS)}`, 20, yPos);

  yPos = 270;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-MA')}`, 105, yPos, { align: 'center' });

  const periodSuffix = data.period ? `_${data.period.year}_${data.period.quarter}` : '';
  doc.save(`tax_report${periodSuffix}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// Generate detailed VAT Report PDF
export const generateVATReportPDF = (data: {
  vatCollected: number;
  vatPaid: number;
  vatDue: number;
  period: { year: number; quarter: string };
  salesInvoices: Array<{ id: string; client: string; date: string; total: number; vat: number }>;
  purchaseInvoices: Array<{ id: string; supplier: string; date: string; total: number; vat: number }>;
}) => {
  const doc = new jsPDF();
  let yPos = 20;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DÉCLARATION DE TVA', 105, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Période: ${data.period.quarter} ${data.period.year}`, 105, yPos, { align: 'center' });
  yPos += 15;

  // VAT Summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Résumé TVA', 20, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`TVA Collectée (sur ventes): ${formatMADFull(data.vatCollected)}`, 25, yPos);
  yPos += 7;
  doc.text(`TVA Déductible (sur achats): ${formatMADFull(data.vatPaid)}`, 25, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  const vatDueLabel = data.vatDue >= 0 ? 'TVA Nette à Payer' : 'Crédit de TVA';
  doc.text(`${vatDueLabel}: ${formatMADFull(Math.abs(data.vatDue))}`, 25, yPos);
  yPos += 15;

  // Sales invoices section
  if (data.salesInvoices.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Factures de Vente', 20, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('N°', 20, yPos);
    doc.text('Client', 45, yPos);
    doc.text('Date', 100, yPos);
    doc.text('Total HT', 130, yPos);
    doc.text('TVA', 165, yPos);
    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    data.salesInvoices.slice(0, 10).forEach((inv) => {
      if (yPos > 250) return;
      doc.text(inv.id.substring(0, 12), 20, yPos);
      doc.text(inv.client.substring(0, 25), 45, yPos);
      doc.text(inv.date, 100, yPos);
      doc.text(formatMADFull(inv.total), 130, yPos);
      doc.text(formatMADFull(inv.vat), 165, yPos);
      yPos += 6;
    });
    if (data.salesInvoices.length > 10) {
      doc.text(`... et ${data.salesInvoices.length - 10} autres factures`, 20, yPos);
      yPos += 6;
    }
    yPos += 10;
  }

  // Purchase invoices section
  if (data.purchaseInvoices.length > 0 && yPos < 230) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Factures d\'Achat', 20, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('N°', 20, yPos);
    doc.text('Fournisseur', 45, yPos);
    doc.text('Date', 100, yPos);
    doc.text('Total HT', 130, yPos);
    doc.text('TVA', 165, yPos);
    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    data.purchaseInvoices.slice(0, 8).forEach((inv) => {
      if (yPos > 260) return;
      doc.text(inv.id.substring(0, 12), 20, yPos);
      doc.text(inv.supplier.substring(0, 25), 45, yPos);
      doc.text(inv.date, 100, yPos);
      doc.text(formatMADFull(inv.total), 130, yPos);
      doc.text(formatMADFull(inv.vat), 165, yPos);
      yPos += 6;
    });
    if (data.purchaseInvoices.length > 8) {
      doc.text(`... et ${data.purchaseInvoices.length - 8} autres factures`, 20, yPos);
    }
  }

  yPos = 280;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-MA')}`, 105, yPos, { align: 'center' });

  doc.save(`vat_report_${data.period.year}_${data.period.quarter}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// Generate Purchase Invoice PDF using new template
export const generatePurchaseInvoicePDF = async (document: {
  id: string;
  client?: string;
  supplier?: string;
  clientData?: any;
  supplierData?: any;
  date: string;
  items: number | InvoiceItem[];
  total: number;
  paymentMethod?: string;
  status?: string;
  type?: string;
  dueDate?: string;
  note?: string;
  companyInfo?: CompanyInfo;
}) => {
  const items: InvoiceItem[] = Array.isArray(document.items)
    ? document.items
    : createFallbackItems(document.items, document.total);

  await generatePDFFromTemplate({
    type: 'purchase_invoice',
    documentId: document.id,
    date: document.date,
    client: document.client,
    supplier: document.supplier,
    clientData: document.clientData,
    supplierData: document.supplierData,
    items,
    paymentMethod: document.paymentMethod as 'cash' | 'check' | 'bank_transfer' | undefined,
    dueDate: document.dueDate,
    note: document.note,
    language: i18n.language || 'en',
    companyInfo: document.companyInfo,
  });
};

// Generate Purchase Delivery Note PDF using new template
export const generatePurchaseDeliveryNotePDF = async (document: {
  id: string;
  client?: string;
  supplier?: string;
  clientData?: any;
  supplierData?: any;
  date: string;
  items: number | InvoiceItem[];
  total: number;
  paymentMethod?: string;
  status?: string;
  type?: string;
  dueDate?: string;
  note?: string;
  companyInfo?: CompanyInfo;
}) => {
  const items: InvoiceItem[] = Array.isArray(document.items)
    ? document.items
    : createFallbackItems(document.items, document.total);

  await generatePDFFromTemplate({
    type: 'purchase_delivery_note',
    documentId: document.id,
    date: document.date,
    client: document.client,
    supplier: document.supplier,
    clientData: document.clientData,
    supplierData: document.supplierData,
    items,
    paymentMethod: document.paymentMethod as 'cash' | 'check' | 'bank_transfer' | undefined,
    dueDate: document.dueDate,
    note: document.note,
    language: i18n.language || 'en',
    companyInfo: document.companyInfo,
  });
};
