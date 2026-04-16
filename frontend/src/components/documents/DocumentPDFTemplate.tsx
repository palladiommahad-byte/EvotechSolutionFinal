import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';
import { CompanyInfo } from '@/contexts/CompanyContext';
import { formatMADFull, VAT_RATE, calculateInvoiceTotals } from '@/lib/moroccan-utils';
import { InvoiceItem } from '@/lib/moroccan-utils';
import i18n from '@/i18n/config';
import { amountToFrenchWords } from '@/lib/number-to-words';

interface DocumentPDFTemplateProps {
  type: 'invoice' | 'estimate' | 'delivery_note' | 'purchase_order' | 'credit_note' | 'statement' | 'purchase_invoice' | 'purchase_delivery_note' | 'prelevement';
  documentId: string;
  date: string;
  client?: string;
  supplier?: string;
  clientData?: any;
  supplierData?: any;
  items: InvoiceItem[];
  paymentMethod?: 'cash' | 'check' | 'bank_transfer';
  dueDate?: string;
  note?: string;
  taxEnabled?: boolean;  // For BL/Divers: whether to show and compute VAT
  clientPoNumber?: string; // Bon de commande client reference
  linkedBLs?: { id?: string; document_id: string; date: string; items?: { id: string; description: string; quantity: number; unit?: string; unit_price: number; total: number }[] }[]; // Linked BLs for invoices
  companyInfo: CompanyInfo;
  language?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
}

// Register Inter font if available (with error handling)
try {
  Font.register({
    family: 'Inter',
    src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2',
  });
} catch (error) {
  // Font registration failed, will use Helvetica fallback
  console.warn('Failed to register Inter font:', error);
}

const styles = StyleSheet.create({
  page: {
    padding: '10px 56px 48px 56px',
    fontSize: 12,
    fontFamily: 'Helvetica',
    color: '#1F2937',
    lineHeight: 1.6,
    flexDirection: 'column',
  },
  header: {
    marginBottom: 12,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 18,
    borderTop: '1px solid #E5E7EB',
    width: '100%',
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'column',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  companyInfo: {
    flex: 1,
    paddingRight: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  logo: {
    height: 72,
    maxWidth: 144,
    flexShrink: 0,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 6,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.3,
    letterSpacing: -0.01,
  },
  website: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 0,
    lineHeight: 1.5,
    letterSpacing: 0.03,
  },
  documentTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#3b82f6',
    marginBottom: 14,
    letterSpacing: 0.03,
    lineHeight: 1,
    width: 'auto',
  },
  invoiceDetails: {
    backgroundColor: '#3b82f6',
    padding: '8px 14px',
    borderRadius: 6,
    width: 'auto',
    alignSelf: 'flex-end',
  },
  invoiceDetailRow: {
    marginBottom: 0,
  },
  invoiceDetailLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: '#FFFFFF',
    letterSpacing: 0.01,
  },
  invoiceDetailValue: {
    fontSize: 9,
    fontWeight: 700,
    color: '#FFFFFF',
  },
  invoiceToSection: {
    marginTop: 0,
    marginBottom: 12,
  },
  invoiceToLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: '#374151',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
    lineHeight: 1.3,
  },
  invoiceToBox: {
    backgroundColor: '#F9FAFB',
    padding: '8px 10px',
    borderRadius: 5,
    border: '1px solid #E5E7EB',
  },
  clientName: {
    fontSize: 9,
    fontWeight: 600,
    color: '#111827',
    lineHeight: 1.3,
    marginBottom: 3,
  },
  table: {
    marginBottom: 16,
    border: '1px solid #3b82f6',
    borderRadius: 4,
  },
  tableHeader: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
  },
  tableHeaderCell: {
    padding: '6px 8px',
    fontSize: 8,
    fontWeight: 700,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.05,
    lineHeight: 1.2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #E5E7EB',
  },
  tableCell: {
    padding: '6px 8px',
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.3,
    flexWrap: 'nowrap',
  },
  tableCellCenter: {
    textAlign: 'center',
  },
  tableCellRight: {
    textAlign: 'right',
  },
  tableCellBold: {
    fontWeight: 600,
  },
  rowEven: {
    backgroundColor: '#FFFFFF',
  },
  rowOdd: {
    backgroundColor: '#f1f5f9',
  },
  summaryBox: {
    backgroundColor: '#3b82f6',
    padding: '12px 18px',
    borderRadius: 6,
    minWidth: 240,
    marginBottom: 0,
    marginTop: 10,
    marginLeft: 'auto',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: '1px solid #FFFFFF',
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '8px 0 0 0',
    marginTop: 5,
    borderTop: '1px solid #FFFFFF',
  },
  summaryText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 500,
    letterSpacing: 0.01,
    lineHeight: 1.4,
  },
  summaryTextBold: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 700,
    letterSpacing: 0.01,
    lineHeight: 1.4,
  },
  summaryTotalText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 700,
    letterSpacing: 0.02,
    lineHeight: 1.3,
  },
  paymentMethod: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
    lineHeight: 1.4,
  },
  sectionText: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 0,
    fontWeight: 600,
    lineHeight: 1.5,
  },
  thankYou: {
    fontSize: 12,
    color: '#374151',
    fontWeight: 500,
    marginBottom: 24,
    lineHeight: 1.6,
  },
  terms: {
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 1.7,
    marginBottom: 32,
    maxWidth: 600,
  },
});

export const DocumentPDFTemplate: React.FC<DocumentPDFTemplateProps> = ({
  type,
  documentId,
  date,
  client,
  supplier,
  clientData,
  supplierData,
  items,
  paymentMethod,
  dueDate,
  note,
  taxEnabled,
  clientPoNumber,
  linkedBLs,
  companyInfo,
  language,
  discountType,
  discountValue,
}) => {
  // Get current language or use provided language
  const currentLang = language || i18n.language || 'en';
  const t = (key: string, options?: any) => i18n.t(key, { lng: currentLang, ...options });

  // Dynamic PDF colors from settings
  const primaryColor = companyInfo.pdfPrimaryColor || '#3b82f6';
  const titleColor = companyInfo.pdfTitleColor || '#3b82f6';

  const totals = calculateInvoiceTotals(items, discountType, discountValue);
  // showVAT rules:
  //   - invoice/estimate/credit_note/prelevement: always show VAT
  //   - delivery_note: show VAT UNLESS taxEnabled is explicitly false
  //     (undefined/null/true all mean "show tax" — tax is ON by default)
  const showVAT = type === 'invoice' || type === 'estimate' || type === 'credit_note' || type === 'prelevement'
    || (type === 'delivery_note' && taxEnabled !== false);

  const documentTitles: Record<string, string> = {
    invoice: String(t('pdf.invoice')),
    estimate: String(t('pdf.estimate')),
    delivery_note: String(t('pdf.deliveryNote')),
    purchase_order: String(t('pdf.purchaseOrder')),
    credit_note: String(t('pdf.creditNote')),
    statement: String(t('pdf.statement')),
    purchase_invoice: String(t('pdf.purchaseInvoice')),
    purchase_delivery_note: String(t('pdf.deliveryNote')),
    prelevement: 'AVANCE / PRÉLÈVEMENT', // Fallback until translation added
  };

  // Calculate font size based on text length - smaller for longer text
  const getTitleFontSize = (text: string): number => {
    const length = text.length;
    if (length <= 8) return 28;      // Short: INVOICE (7), DEVIS (5)
    if (length <= 15) return 24;     // Medium: BON DE COMMANDE (15)
    if (length <= 18) return 20;     // Long: BON DE LIVRAISON (17)
    return 18;                        // Very long: fallback
  };

  const paymentMethodText: Record<string, string> = {
    cash: String(t('paymentMethods.cash')),
    check: String(t('paymentMethods.check')),
    bank_transfer: String(t('paymentMethods.bankTransfer')),
  };

  // Format date based on language
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const locale = currentLang === 'fr' ? 'fr-FR' : 'en-US';
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return d.toLocaleDateString(locale, options);
  };

  // Format document ID with French prefix based on document type
  const formatDocumentId = (id: string, docType: string): string => {
    // Define French prefixes for each document type
    const prefixes: Record<string, string> = {
      invoice: 'FC',                    // Facture Client
      estimate: 'DV',                   // Devis
      delivery_note: 'BL',              // Bon de Livraison
      purchase_order: 'BC',             // Bon de Commande
      credit_note: 'AV',                // Avoir
      statement: 'RL',                  // Relevé
      purchase_invoice: 'FA',           // Facture d'Achat
      purchase_delivery_note: 'BL',     // Bon de Livraison
      divers: 'BL',                     // Bon de Livraison Divers
    };

    const prefix = prefixes[docType] || 'DOC';

    // If ID already starts with the expected prefix, return as is
    if (id.toUpperCase().startsWith(prefix)) {
      return id;
    }

    // Handle legacy English prefixes if they still exist in DB
    if (id.startsWith('INV-')) return id.replace('INV-', 'FC-');
    if (id.startsWith('EST-')) return id.replace('EST-', 'DV-');
    if (id.startsWith('DN-')) return id.replace('DN-', 'BL-');
    if (id.startsWith('DIV-')) return id.replace('DIV-', 'BL-');
    if (id.startsWith('CN-')) return id.replace('CN-', 'AV-');
    if (id.startsWith('ST-')) return id.replace('ST-', 'RL-');
    if (id.startsWith('PO-')) return id.replace('PO-', 'BC-');
    if (id.startsWith('PI-')) return id.replace('PI-', 'FA-');

    // If ID already has an uppercase prefix separated by a dash, return as is
    if (id.match(/^[A-Z]{2,4}-/)) {
      return id;
    }

    // Otherwise, add the prefix
    return `${prefix}-${id}`;
  };

  const formattedDocumentId = formatDocumentId(documentId, type);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.contentWrapper}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              {/* Company Info - Logo Only */}
              <View style={styles.companyInfo}>
                {companyInfo.logo && companyInfo.logo.trim() ? (
                  <Image
                    src={companyInfo.logo}
                    style={styles.logo}
                    cache={false}
                  />
                ) : (
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.companyName, { color: titleColor }]}>{(companyInfo.name || 'COMPANY NAME').toUpperCase()}</Text>
                  </View>
                )}
              </View>

              {/* Document Title */}
              <View style={{ alignItems: 'flex-end', width: 'auto' }}>
                <Text style={[styles.documentTitle, { fontSize: getTitleFontSize(documentTitles[type]), color: titleColor }]}>
                  {documentTitles[type]}
                </Text>
                <View style={[styles.invoiceDetails, { width: 'auto', alignSelf: 'flex-end', backgroundColor: primaryColor }]}>
                  <View style={styles.invoiceDetailRow}>
                    <Text>
                      <Text style={styles.invoiceDetailLabel}>{String(t('pdf.documentNumber'))}: </Text>
                      <Text style={styles.invoiceDetailValue}>{formattedDocumentId}</Text>
                    </Text>
                  </View>
                  {companyInfo.footerText && (
                    <View style={styles.invoiceDetailRow}>
                      <Text>
                        <Text style={styles.invoiceDetailLabel}>Lieu: </Text>
                        <Text style={styles.invoiceDetailValue}>{companyInfo.footerText}</Text>
                      </Text>
                    </View>
                  )}
                  <View>
                    <Text>
                      <Text style={styles.invoiceDetailLabel}>{String(t('common.date'))}: </Text>
                      <Text style={styles.invoiceDetailValue}>{formatDate(date)}</Text>
                    </Text>
                  </View>
                </View>


              </View>
            </View>

            {/* Company Info and Invoice To - Side by Side */}
            <View style={{
              flexDirection: 'row',
              gap: 20,
              width: '100%',
              marginTop: 0,
              marginLeft: 0,
              paddingLeft: 0,
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 12,
            }}>
              {/* Left Box - From (Sender) */}
              <View style={{ width: '40%', flexShrink: 0 }}>
                <Text style={[styles.invoiceToLabel, { color: primaryColor }]}>{String(t('pdf.from'))}:</Text>
                <View style={[styles.invoiceToBox, { borderColor: primaryColor }]}>
                  {type === 'purchase_invoice' || type === 'purchase_delivery_note' ? (
                    /* For Purchase Invoice/Delivery Note: Sender is Supplier */
                    <View>
                      {/* Use supplierData if available */}
                      {(clientData || supplierData) ? (
                        <View>
                          <Text style={styles.clientName}>
                            {clientData?.company || supplierData?.company || clientData?.name || supplierData?.name || '-'}
                            {(clientData?.ice || supplierData?.ice) ? <Text style={{ fontSize: 8, color: '#475569', fontWeight: 'normal' }}>   {String(t('pdf.ice'))}: {clientData?.ice || supplierData?.ice}</Text> : null}
                          </Text>
                          <Text style={{ fontSize: 8, color: '#475569', marginTop: 2 }}>
                            {(clientData?.phone || supplierData?.phone) ? <Text>{String(t('pdf.phone'))}: {clientData?.phone || supplierData?.phone}    </Text> : null}
                            {(clientData?.address || supplierData?.address) ? <Text>{clientData?.address || supplierData?.address}</Text> : null}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.clientName}>{client || supplier || '-'}</Text>
                      )}
                    </View>
                  ) : (
                    /* For Sales Invoice/Others: Sender is Company (Us) */
                    <View>
                      <Text style={styles.clientName}>
                        {(companyInfo.name || 'COMPANY NAME').toUpperCase()}
                        {companyInfo.ice ? <Text style={{ fontSize: 8, color: '#475569', fontWeight: 'normal' }}>   {String(t('pdf.ice'))}: {companyInfo.ice}</Text> : null}
                      </Text>
                      <Text style={{ fontSize: 8, color: '#475569', marginTop: 2 }}>
                        {companyInfo.phone ? <Text>{String(t('pdf.phone'))}: {companyInfo.phone}    </Text> : null}
                        {companyInfo.address ? <Text>{companyInfo.address}</Text> : null}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Right Box - To (Recipient) */}
              <View style={{ width: '40%', flexShrink: 0 }}>
                <Text style={[styles.invoiceToLabel, { color: primaryColor }]}>
                  {type === 'purchase_order' 
                    ? `${String(t('pdf.supplier'))}:` 
                    : (currentLang === 'en' ? `${documentTitles[type]} TO:` : `${documentTitles[type]} À:`)}
                </Text>
                <View style={[styles.invoiceToBox, { borderColor: primaryColor }]}>
                  {type === 'purchase_invoice' || type === 'purchase_delivery_note' ? (
                    /* For Purchase Invoice/Delivery Note: Recipient is Company (Us) */
                    <View>
                      <Text style={styles.clientName}>
                        {(companyInfo.name || 'COMPANY NAME').toUpperCase()}
                        {companyInfo.ice ? <Text style={{ fontSize: 8, color: '#475569', fontWeight: 'normal' }}>   {String(t('pdf.ice'))}: {companyInfo.ice}</Text> : null}
                      </Text>
                      <Text style={{ fontSize: 8, color: '#475569', marginTop: 2 }}>
                        {companyInfo.phone ? <Text>{String(t('pdf.phone'))}: {companyInfo.phone}    </Text> : null}
                        {companyInfo.address ? <Text>{companyInfo.address}</Text> : null}
                      </Text>
                    </View>
                  ) : (
                    /* For Sales Invoice/Others: Recipient is Client/Supplier */
                    <View>
                      {/* Use clientData/supplierData if available */}
                      {(clientData || supplierData) ? (
                        <View>
                          <Text style={styles.clientName}>
                            {clientData?.company || supplierData?.company || clientData?.name || supplierData?.name || '-'}
                            {(clientData?.ice || supplierData?.ice) ? <Text style={{ fontSize: 8, color: '#475569', fontWeight: 'normal' }}>   {String(t('pdf.ice'))}: {clientData?.ice || supplierData?.ice}</Text> : null}
                          </Text>
                          <Text style={{ fontSize: 8, color: '#475569', marginTop: 2 }}>
                            {(clientData?.phone || supplierData?.phone) ? <Text>{String(t('pdf.phone'))}: {clientData?.phone || supplierData?.phone}    </Text> : null}
                            {(clientData?.address || supplierData?.address) ? <Text>{clientData?.address || supplierData?.address}</Text> : null}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.clientName}>{client || supplier || '-'}</Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Client PO Number — shown for delivery notes when provided */}
          {type === 'delivery_note' && clientPoNumber && clientPoNumber.trim() && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 8,
                paddingVertical: 4,
                paddingHorizontal: 0,
              }}
              wrap={false}
            >
              <Text style={{
                fontSize: 9,
                fontFamily: 'Helvetica-Bold',
                color: primaryColor,
                marginRight: 6,
                textTransform: 'uppercase',
                letterSpacing: 0.05,
              }}>
                Bon de commande client :
              </Text>
              <Text style={{
                fontSize: 10,
                fontFamily: 'Helvetica-Bold',
                color: primaryColor,
                letterSpacing: 0.02,
              }}>
                {clientPoNumber}
              </Text>
            </View>
          )}

          {/* Items Table - Can flow across pages */}
          <View style={[styles.table, { borderColor: primaryColor }]} wrap>
            {/* Table Header */}
            <View style={[styles.tableHeader, { backgroundColor: primaryColor }]} wrap={false}>
              <View style={[styles.tableHeaderCell, { flex: 0.5, width: '5%' }]}>
                <Text>{String(t('pdf.no'))}</Text>
              </View>
              <View style={[styles.tableHeaderCell, { flex: 3.0, width: '30%' }]}>
                <Text>{String(t('pdf.description'))}</Text>
              </View>
              <View style={[styles.tableHeaderCell, { flex: 0.8, width: '8%', textAlign: 'center' }]}>
                <Text>{String(t('pdf.qty'))}</Text>
              </View>
              <View style={[styles.tableHeaderCell, { flex: 0.9, width: '9%', textAlign: 'center' }]}>
                <Text>UNITÉ</Text>
              </View>
              <View style={[styles.tableHeaderCell, { flex: 1.3, width: '13%', textAlign: 'center' }]}>
                <Text>{String(t('pdf.price'))}</Text>
              </View>
              {((totals.discountAmount || 0) > 0) && (
                <View style={[styles.tableHeaderCell, { flex: 1.0, width: showVAT ? '10%' : '12%', textAlign: 'center' }]}>
                  <Text>REMISE</Text>
                </View>
              )}
              {showVAT && (
                <View style={[styles.tableHeaderCell, { flex: 1.0, width: ((totals.discountAmount || 0) > 0) ? '10%' : '12%', textAlign: 'center' }]}>
                  <Text>{String(t('pdf.tax'))}</Text>
                </View>
              )}
              <View style={[styles.tableHeaderCell, { flex: 1.5, width: (showVAT && (totals.discountAmount || 0) > 0) ? '15%' : (showVAT || (totals.discountAmount || 0) > 0) ? '23%' : '35%', textAlign: 'right' }]}>
                <Text>{String(t('pdf.total'))}</Text>
              </View>
            </View>

            {/* Table Rows - grouped by BL when available, otherwise flat */}
            {(() => {
              const hasGroupedBLs = type === 'invoice' && linkedBLs && linkedBLs.length > 0 && linkedBLs.some(bl => bl.items && bl.items.length > 0);

              const renderItemRow = (item: { id?: string; description: string; quantity: number; unit?: string; unit_price?: number; unitPrice?: number; total: number }, rowIndex: number) => {
                const unitPrice = Number((item as any).unit_price ?? (item as any).unitPrice) || 0;
                const quantity = Number(item.quantity) || 0;
                const itemInitialHT = unitPrice * quantity;
                let discountForThisItem = 0;
                if ((totals.discountAmount || 0) > 0 && discountValue) {
                  if (discountType === 'percentage') {
                    discountForThisItem = itemInitialHT * (discountValue / 100);
                  } else if (totals.initialSubtotal) {
                    discountForThisItem = (itemInitialHT / totals.initialSubtotal) * (totals.discountAmount || 0);
                  }
                }
                const itemNetHT = itemInitialHT - discountForThisItem;
                const itemTaxAmount = showVAT ? itemNetHT * VAT_RATE : 0;
                const itemTotalAfterTax = itemNetHT + itemTaxAmount;

                return (
                  <View
                    key={item.id || rowIndex}
                    style={[styles.tableRow, rowIndex % 2 === 0 ? styles.rowEven : styles.rowOdd]}
                    wrap={false}
                  >
                    <View style={[styles.tableCell, { flex: 0.5, width: '5%' }]}>
                      <Text>{rowIndex + 1}</Text>
                    </View>
                    <View style={[styles.tableCell, { flex: 3.0, width: '30%' }]}>
                      <Text>{item.description || '-'}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.tableCellCenter, { flex: 0.8, width: '8%' }]}>
                      <Text>{quantity}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.tableCellCenter, { flex: 0.9, width: '9%' }]}>
                      <Text>{item.unit || '-'}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.tableCellCenter, { flex: 1.3, width: '13%' }]}>
                      <Text wrap={false}>{formatMADFull(unitPrice)}</Text>
                    </View>
                    {((totals.discountAmount || 0) > 0) && (
                      <View style={[styles.tableCell, styles.tableCellCenter, { flex: 1.0, width: showVAT ? '10%' : '12%' }]}>
                        <Text wrap={false}>{formatMADFull(discountForThisItem)}</Text>
                      </View>
                    )}
                    {showVAT && (
                      <View style={[styles.tableCell, styles.tableCellCenter, { flex: 1.0, width: ((totals.discountAmount || 0) > 0) ? '10%' : '12%' }]}>
                        <Text wrap={false}>{formatMADFull(itemTaxAmount)}</Text>
                      </View>
                    )}
                    <View style={[styles.tableCell, styles.tableCellRight, styles.tableCellBold, { flex: 1.5, width: (showVAT && (totals.discountAmount || 0) > 0) ? '15%' : (showVAT || (totals.discountAmount || 0) > 0) ? '23%' : '35%' }]}>
                      <Text wrap={false}>{formatMADFull(itemTotalAfterTax)}</Text>
                    </View>
                  </View>
                );
              };

              if (hasGroupedBLs) {
                let globalIndex = 0;
                return linkedBLs!.map((bl, blIdx) => {
                  const blItems = bl.items || [];
                  const d = new Date(bl.date);
                  const shortDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().slice(2)}`;
                  const startIndex = globalIndex;
                  globalIndex += blItems.length;
                  return (
                    <React.Fragment key={bl.id || blIdx}>
                      <View style={{ flexDirection: 'row', backgroundColor: '#EFF6FF', borderBottom: '1px solid #BFDBFE', borderTop: blIdx > 0 ? '2px solid #93C5FD' : undefined, padding: '5px 8px' }} wrap={false}>
                        <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1D4ED8' }}>
                          {bl.document_id} Du {shortDate}
                        </Text>
                      </View>
                      {blItems.map((item, itemIdx) => renderItemRow(item, startIndex + itemIdx))}
                    </React.Fragment>
                  );
                });
              }

              // Default flat list
              return items.map((item, index) => renderItemRow(item, index));
            })()}
          </View>

          {/* Financial Summary - Keep together with table, with Note on Left */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-start', gap: 20, marginBottom: 32, width: '100%' }} wrap={false}>
            {/* Note Section - Left Side */}
            {note && note.trim() && (
              <View style={{
                flex: 1,
                maxWidth: 300,
                padding: '12px 14px',
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: 6,
                marginTop: 10,
                marginRight: 'auto',
              }}>
                <Text style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#374151',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: 0.05,
                }}>
                  {String(t('common.notes'))}
                </Text>
                <Text style={{
                  fontSize: 10,
                  color: '#6B7280',
                  lineHeight: 1.5,
                }}>
                  {note}
                </Text>
              </View>
            )}

            {/* Summary Box - Right Side - Always Right Aligned */}
            <View style={[styles.summaryBox, { backgroundColor: primaryColor }]} wrap={false}>
              
              {(totals.discountAmount || 0) > 0 && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryText}>{String(t('documents.subtotalHT'))} (Initial)</Text>
                    <Text style={styles.summaryTextBold} wrap={false}>{formatMADFull(totals.initialSubtotal ?? totals.subtotal)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryText}>Remise {discountType === 'percentage' ? `(${discountValue}%)` : ''}</Text>
                    <Text style={styles.summaryTextBold} wrap={false}>-{formatMADFull(totals.discountAmount || 0)}</Text>
                  </View>
                </>
              )}

              {showVAT && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryText}>{String(t('documents.subtotalHT'))} {((totals.discountAmount || 0) > 0) ? '(Net)' : ''}</Text>
                    <Text style={styles.summaryTextBold} wrap={false}>{formatMADFull(totals.subtotal)}</Text>
                  </View>
                  <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.summaryText}>{String(t('documents.vat'))} {VAT_RATE * 100}%</Text>
                    <Text style={styles.summaryTextBold} wrap={false}>{formatMADFull(totals.vat)}</Text>
                  </View>
                  <View style={styles.summaryTotal}>
                    <Text style={styles.summaryTotalText}>{String(t('pdf.grandTotal'))}</Text>
                    <Text style={styles.summaryTotalText} wrap={false}>{formatMADFull(totals.total)}</Text>
                  </View>
                </>
              )}
              {!showVAT && (
                <>
                  {((totals.discountAmount || 0) > 0) && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryText}>{String(t('documents.subtotalHT'))} (Net)</Text>
                      <Text style={styles.summaryTextBold} wrap={false}>{formatMADFull(totals.subtotal)}</Text>
                    </View>
                  )}
                  <View style={styles.summaryTotal}>
                    <Text style={styles.summaryTotalText}>{String(t('pdf.grandTotal'))}</Text>
                    <Text style={styles.summaryTotalText} wrap={false}>{formatMADFull(totals.subtotal)}</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Amount in Words for Invoices - Bottom Left Above Footer */}
          {type === 'invoice' && (
            <View style={{ marginTop: 'auto', marginBottom: 15, paddingLeft: 8 }} wrap={false}>
             <Text style={{ fontSize: 9, color: '#374151' }}>
               Arrêté la présente facture à la somme de :
             </Text>
             <Text style={{ fontSize: 11, fontWeight: 'bold', color: primaryColor, marginTop: 4 }}>
               {amountToFrenchWords(showVAT ? totals.total : totals.subtotal)}
             </Text>
            </View>
          )}

          {/* Footer - Company Details - Single line - Always at bottom */}
          <View style={[styles.footer, type === 'invoice' ? { marginTop: 0 } : {}]}>
            <Text style={{
              fontSize: 8,
              color: '#6B7280',
              lineHeight: 1.4,
              textAlign: 'center',
              fontWeight: 700,
            }}>
              {[
                companyInfo.ice && `${String(t('pdf.ice'))}: ${companyInfo.ice}`,
                companyInfo.ifNumber && `${String(t('pdf.if'))}: ${companyInfo.ifNumber}`,
                companyInfo.rc && `${String(t('pdf.rc'))}: ${companyInfo.rc}`,
                companyInfo.tp && `${String(t('pdf.tp'))}: ${companyInfo.tp}`,
                companyInfo.patente && `${String(t('pdf.patente'))}: ${companyInfo.patente}`,
                companyInfo.cnss && `${String(t('pdf.cnss'))}: ${companyInfo.cnss}`,
                companyInfo.phone && `${String(t('pdf.phone'))}: ${companyInfo.phone}`,
                companyInfo.email && `${String(t('common.email'))}: ${companyInfo.email}`
              ].filter(Boolean).join(' | ')}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
