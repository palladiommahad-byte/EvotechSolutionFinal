import * as XLSX from 'xlsx';
import { formatMADFull } from './moroccan-utils';

// Helper to download file
const downloadFile = (data: Blob, filename: string) => {
  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Generate Excel for single document
export const generateDocumentExcel = (document: {
  id: string;
  client?: string;
  supplier?: string;
  date: string;
  items: number;
  total: number;
  paymentMethod?: string;
  status?: string;
  type?: string;
}, documentType: string) => {
  const workbook = XLSX.utils.book_new();

  const documentTitle = documentType === 'invoice' ? 'Facture' :
    documentType === 'estimate' ? 'Devis' :
      documentType === 'purchase_order' ? 'Bon de Commande' :
        documentType === 'delivery_note' ? 'Bon de Livraison' :
          documentType === 'credit_note' ? 'Avoir' :
            'Relevé';

  const data = [
    [documentTitle],
    [''],
    ['Numéro:', document.id],
    ['Date:', document.date],
    document.client ? ['Client:', document.client] : ['Fournisseur:', document.supplier || ''],
    ['Nombre d\'articles:', document.items],
    ['Total:', formatMADFull(document.total)],
    document.paymentMethod ? ['Méthode de paiement:',
      document.paymentMethod === 'cash' ? 'Espèces' :
        document.paymentMethod === 'check' ? 'Chèque' :
          'Virement bancaire'] : null,
    document.status ? ['Statut:', document.status] : null,
  ].filter(row => row !== null);

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet['!cols'] = [{ wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, documentTitle);

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadFile(blob, `${document.id}.xlsx`);
};

// Generate Excel for multiple documents
export const generateBulkDocumentsExcel = (documents: Array<{
  id: string;
  client?: string;
  supplier?: string;
  date: string;
  items: number;
  total: number;
  paymentMethod?: string;
  status?: string;
  type?: string;
}>, documentType: string) => {
  const workbook = XLSX.utils.book_new();

  const headers = [
    'Numéro',
    documentType === 'purchase_order' ? 'Fournisseur' : 'Client',
    'Date',
    'Articles',
    'Total',
    'Méthode de paiement',
    'Statut'
  ];

  const rows = documents.map(doc => [
    doc.id,
    doc.client || doc.supplier || '',
    doc.date,
    doc.items,
    doc.total,
    doc.paymentMethod === 'cash' ? 'Espèces' :
      doc.paymentMethod === 'check' ? 'Chèque' :
        doc.paymentMethod === 'bank_transfer' ? 'Virement bancaire' : '',
    doc.status || ''
  ]);

  const data = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Style header row
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    worksheet[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'E0E0E0' } }
    };
  }

  worksheet['!cols'] = [
    { wch: 15 }, // ID
    { wch: 25 }, // Client/Supplier
    { wch: 12 }, // Date
    { wch: 10 }, // Items
    { wch: 15 }, // Total
    { wch: 20 }, // Payment Method
    { wch: 15 }, // Status
  ];

  const documentTitle = documentType === 'invoice' ? 'Factures' :
    documentType === 'estimate' ? 'Devis' :
      documentType === 'purchase_order' ? 'Bons de Commande' :
        documentType === 'delivery_note' ? 'Bons de Livraison' :
          documentType === 'credit_note' ? 'Avoirs' :
            'Relevés';

  XLSX.utils.book_append_sheet(workbook, worksheet, documentTitle);

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadFile(blob, `${documentTitle}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Generate Excel for inventory
export const generateInventoryExcel = (products: Array<{
  sku: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  status?: string;
}>) => {
  const workbook = XLSX.utils.book_new();

  const headers = ['SKU', 'Nom du Produit', 'Catégorie', 'Stock', 'Stock Minimum', 'Prix Unitaire', 'Valeur Totale', 'Statut'];

  const rows = products.map(product => [
    product.sku,
    product.name,
    product.category,
    product.stock,
    product.minStock,
    product.price,
    product.stock * product.price,
    product.status === 'in_stock' ? 'En stock' :
      product.status === 'low_stock' ? 'Stock faible' :
        'Rupture de stock'
  ]);

  const data = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 12 }, // SKU
    { wch: 30 }, // Name
    { wch: 15 }, // Category
    { wch: 10 }, // Stock
    { wch: 12 }, // Min Stock
    { wch: 15 }, // Price
    { wch: 15 }, // Total Value
    { wch: 15 }, // Status
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventaire');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadFile(blob, `inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Generate Excel for tax report
export const generateTaxReportExcel = (data: {
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
  const workbook = XLSX.utils.book_new();

  const reportData = [
    ['RAPPORT FISCAL'],
    [''],
    ...(data.period ? [[`Période: ${data.period.quarter} ${data.period.year}`], ['']] : []),
    ...(data.vatCollected !== undefined ? [
      ['TVA (Taxe sur la Valeur Ajoutée)'],
      ['TVA Collectée', formatMADFull(data.vatCollected)],
      ['TVA Déductible', formatMADFull(data.vatPaid || 0)],
      [(data.vatDue || 0) >= 0 ? 'TVA à Payer' : 'Crédit de TVA', formatMADFull(Math.abs(data.vatDue || 0))],
      [''],
    ] : []),
    ['Résumé Financier'],
    ['Revenus bruts', formatMADFull(data.grossRevenue)],
    ['Dépenses totales', formatMADFull(data.expenses)],
    ['Bénéfice net', formatMADFull(data.netProfit)],
    [''],
    ...(data.salesCount !== undefined ? [
      ['Transactions'],
      ['Nombre de ventes', data.salesCount],
      ['Nombre d\'achats', data.purchasesCount || 0],
      [''],
    ] : []),
    ['Impôt sur les Sociétés (IS)'],
    ['IS estimé', formatMADFull(data.estimatedIS)],
    [''],
    [`Généré le ${new Date().toLocaleDateString('fr-MA')}`]
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(reportData);
  worksheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rapport Fiscal');

  const periodSuffix = data.period ? `_${data.period.year}_${data.period.quarter}` : '';
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadFile(blob, `tax_report${periodSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Generate comprehensive ledger Excel for accountants
export const generateLedgerExcel = (data: {
  salesInvoices: Array<{
    id: string;
    documentId: string;
    client: string;
    date: string;
    items: number;
    total: number;
    status: string;
    paymentMethod?: string;
  }>;
  purchaseInvoices: Array<{
    id: string;
    documentId: string;
    supplier: string;
    date: string;
    items: number;
    total: number;
    status: string;
    paymentMethod?: string;
  }>;
  summary: {
    grossRevenue: number;
    expenses: number;
    netProfit: number;
    vatCollected: number;
    vatPaid: number;
    vatDue: number;
    period: { year: number; quarter: string };
  };
}) => {
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ['GRAND LIVRE - RÉSUMÉ'],
    [''],
    [`Période: ${data.summary.period.quarter} ${data.summary.period.year}`],
    [''],
    ['RÉSUMÉ FINANCIER'],
    ['Revenus bruts', data.summary.grossRevenue],
    ['Dépenses totales', data.summary.expenses],
    ['Bénéfice net', data.summary.netProfit],
    [''],
    ['TVA'],
    ['TVA Collectée', data.summary.vatCollected],
    ['TVA Déductible', data.summary.vatPaid],
    ['TVA Nette', data.summary.vatDue],
    [''],
    ['STATISTIQUES'],
    ['Nombre de factures ventes', data.salesInvoices.length],
    ['Total ventes', data.salesInvoices.reduce((sum, inv) => sum + inv.total, 0)],
    ['Nombre de factures achats', data.purchaseInvoices.length],
    ['Total achats', data.purchaseInvoices.reduce((sum, inv) => sum + inv.total, 0)],
    [''],
    [`Généré le ${new Date().toLocaleDateString('fr-MA')}`]
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');

  // Sales Invoices Sheet
  const salesHeaders = ['N° Document', 'Client', 'Date', 'Articles', 'Total (DH)', 'Statut', 'Mode de Paiement'];
  const salesRows = data.salesInvoices.map(inv => [
    inv.documentId,
    inv.client,
    inv.date,
    inv.items,
    inv.total,
    inv.status,
    inv.paymentMethod === 'cash' ? 'Espèces' :
      inv.paymentMethod === 'check' ? 'Chèque' :
        inv.paymentMethod === 'bank_transfer' ? 'Virement' : ''
  ]);

  const salesSheet = XLSX.utils.aoa_to_sheet([salesHeaders, ...salesRows]);
  salesSheet['!cols'] = [
    { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(workbook, salesSheet, 'Ventes');

  // Purchase Invoices Sheet
  const purchaseHeaders = ['N° Document', 'Fournisseur', 'Date', 'Articles', 'Total (DH)', 'Statut', 'Mode de Paiement'];
  const purchaseRows = data.purchaseInvoices.map(inv => [
    inv.documentId,
    inv.supplier,
    inv.date,
    inv.items,
    inv.total,
    inv.status,
    inv.paymentMethod === 'cash' ? 'Espèces' :
      inv.paymentMethod === 'check' ? 'Chèque' :
        inv.paymentMethod === 'bank_transfer' ? 'Virement' : ''
  ]);

  const purchaseSheet = XLSX.utils.aoa_to_sheet([purchaseHeaders, ...purchaseRows]);
  purchaseSheet['!cols'] = [
    { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(workbook, purchaseSheet, 'Achats');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadFile(blob, `ledger_${data.summary.period.year}_${data.summary.period.quarter}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
