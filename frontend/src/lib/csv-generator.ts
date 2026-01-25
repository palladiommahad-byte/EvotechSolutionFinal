import { formatMADFull } from './moroccan-utils';

// Helper to download CSV file
const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel compatibility
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Escape CSV field
const escapeCSV = (field: string | number): string => {
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// Generate CSV for single document
export const generateDocumentCSV = (document: {
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
  const documentTitle = documentType === 'invoice' ? 'Facture' :
                        documentType === 'estimate' ? 'Devis' :
                        documentType === 'purchase_order' ? 'Bon de Commande' :
                        documentType === 'delivery_note' ? 'Bon de Livraison' :
                        documentType === 'credit_note' ? 'Avoir' :
                        'Relevé';

  const rows = [
    [documentTitle, ''],
    ['Numéro', document.id],
    ['Date', document.date],
    [document.client ? 'Client' : 'Fournisseur', document.client || document.supplier || ''],
    ['Nombre d\'articles', document.items.toString()],
    ['Total', formatMADFull(document.total)],
    ...(document.paymentMethod ? [['Méthode de paiement', 
      document.paymentMethod === 'cash' ? 'Espèces' :
      document.paymentMethod === 'check' ? 'Chèque' :
      'Virement bancaire']] : []),
    ...(document.status ? [['Statut', document.status]] : []),
  ];

  const csvContent = rows.map(row => row.map(escapeCSV).join(',')).join('\n');
  downloadCSV(csvContent, `${document.id}.csv`);
};

// Generate CSV for multiple documents
export const generateBulkDocumentsCSV = (documents: Array<{
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
    doc.items.toString(),
    doc.total.toString(),
    doc.paymentMethod === 'cash' ? 'Espèces' :
    doc.paymentMethod === 'check' ? 'Chèque' :
    doc.paymentMethod === 'bank_transfer' ? 'Virement bancaire' : '',
    doc.status || ''
  ]);

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  const documentTitle = documentType === 'invoice' ? 'Factures' :
                        documentType === 'estimate' ? 'Devis' :
                        documentType === 'purchase_order' ? 'Bons_de_Commande' :
                        documentType === 'delivery_note' ? 'Bons_de_Livraison' :
                        documentType === 'credit_note' ? 'Avoirs' :
                        'Relevés';

  downloadCSV(csvContent, `${documentTitle}_${new Date().toISOString().split('T')[0]}.csv`);
};

// Generate CSV for inventory
export const generateInventoryCSV = (products: Array<{
  sku: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  status?: string;
}>) => {
  const headers = ['SKU', 'Nom du Produit', 'Catégorie', 'Stock', 'Stock Minimum', 'Prix Unitaire', 'Valeur Totale', 'Statut'];
  
  const rows = products.map(product => [
    product.sku,
    product.name,
    product.category,
    product.stock.toString(),
    product.minStock.toString(),
    product.price.toString(),
    (product.stock * product.price).toString(),
    product.status === 'in_stock' ? 'En stock' :
    product.status === 'low_stock' ? 'Stock faible' :
    'Rupture de stock'
  ]);

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  downloadCSV(csvContent, `inventory_${new Date().toISOString().split('T')[0]}.csv`);
};

// Generate CSV for tax report
export const generateTaxReportCSV = (data: {
  grossRevenue: number;
  expenses: number;
  netProfit: number;
  estimatedIS: number;
}) => {
  const rows = [
    ['RAPPORT FISCAL', ''],
    ['', ''],
    ['Résumé Financier', ''],
    ['Revenus bruts', formatMADFull(data.grossRevenue)],
    ['Dépenses totales', formatMADFull(data.expenses)],
    ['Bénéfice net', formatMADFull(data.netProfit)],
    ['', ''],
    ['Impôt sur les Sociétés (IS)', ''],
    ['IS estimé', formatMADFull(data.estimatedIS)],
    ['', ''],
    [`Généré le ${new Date().toLocaleDateString('fr-MA')}`, '']
  ];

  const csvContent = rows.map(row => row.map(escapeCSV).join(',')).join('\n');
  downloadCSV(csvContent, `tax_report_${new Date().toISOString().split('T')[0]}.csv`);
};
