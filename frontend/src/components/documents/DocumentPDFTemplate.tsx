import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';
import { CompanyInfo } from '@/contexts/CompanyContext';
import { formatMADFull, VAT_RATE, calculateInvoiceTotals } from '@/lib/moroccan-utils';
import { InvoiceItem } from '@/lib/moroccan-utils';
import i18n from '@/i18n/config';
import { amountToFrenchWords } from '@/lib/number-to-words';

interface DocumentPDFTemplateProps {
  type: 'invoice' | 'estimate' | 'delivery_note' | 'purchase_order' | 'credit_note' | 'statement' | 'purchase_invoice' | 'purchase_delivery_note' | 'prelevement' | 'divers';
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
  originalInvoice?: string; // For credit notes: reference to the original invoice ID
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

const getLayoutScale = (itemCount: number): number => {
  if (itemCount <= 8) return 1.0;
  if (itemCount <= 12) return 0.88;
  if (itemCount <= 16) return 0.78;
  if (itemCount <= 20) return 0.70;
  if (itemCount <= 25) return 0.62;
  return 0.55;
};

const createStyles = (scale: number) => {
  const s = (v: number) => Math.max(1, Math.round(v * scale));
  return StyleSheet.create({
  page: {
    paddingTop: s(8),
    paddingRight: 56,
    paddingBottom: 42,
    paddingLeft: 56,
    fontSize: 15,
    fontFamily: 'Helvetica',
    color: '#1F2937',
    lineHeight: scale < 0.85 ? 1.2 : 1.6,
    flexDirection: 'column',
  },
  header: {
    marginBottom: s(6),
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 56,
    right: 56,
    paddingTop: s(8),
    borderTop: '1px solid #E5E7EB',
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
    marginBottom: s(8),
  },
  companyInfo: {
    flex: 1,
    paddingRight: 16,
    flexDirection: 'row',
    gap: s(8),
    alignItems: 'center',
  },
  logo: {
    height: s(76),
    maxWidth: s(152),
    flexShrink: 0,
  },
  companyName: {
    fontSize: s(18),
    fontWeight: 700,
    color: '#111827',
    marginBottom: s(4),
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.3,
    letterSpacing: -0.01,
  },
  website: {
    fontSize: s(11),
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 0,
    lineHeight: 1.5,
    letterSpacing: 0.03,
  },
  documentTitle: {
    fontSize: s(33),
    fontWeight: 700,
    color: '#3b82f6',
    marginBottom: s(10),
    letterSpacing: 0.03,
    lineHeight: 1,
    width: 'auto',
  },
  invoiceDetails: {
    backgroundColor: '#3b82f6',
    padding: `${s(5)}px ${s(11)}px`,
    borderRadius: 6,
    width: 'auto',
    alignSelf: 'flex-end',
  },
  invoiceDetailRow: {
    marginBottom: 0,
  },
  invoiceDetailLabel: {
    fontSize: s(10),
    fontWeight: 600,
    color: '#FFFFFF',
    letterSpacing: 0.01,
  },
  invoiceDetailValue: {
    fontSize: s(10),
    fontWeight: 700,
    color: '#FFFFFF',
  },
  invoiceToSection: {
    marginTop: 0,
    marginBottom: s(8),
  },
  invoiceToLabel: {
    fontSize: s(10),
    fontWeight: 700,
    color: '#374151',
    marginBottom: s(3),
    textTransform: 'uppercase',
    letterSpacing: 0.05,
    lineHeight: 1.3,
  },
  invoiceToBox: {
    backgroundColor: '#F9FAFB',
    padding: `${s(5)}px ${s(8)}px`,
    borderRadius: 5,
    border: '1px solid #E5E7EB',
  },
  clientName: {
    fontSize: s(15),
    fontWeight: 600,
    color: '#111827',
    lineHeight: 1.3,
    marginBottom: s(2),
  },
  table: {
    marginBottom: s(10),
    border: '1px solid #3b82f6',
    borderRadius: 4,
  },
  tableHeader: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
  },
  tableHeaderCell: {
    padding: `${s(5)}px ${s(6)}px`,
    fontSize: s(9),
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
    padding: `${s(4)}px ${s(6)}px`,
    fontSize: s(10),
    color: '#374151',
    lineHeight: 1.2,
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
    padding: `${s(8)}px ${s(14)}px`,
    borderRadius: 6,
    minWidth: 220,
    marginBottom: 0,
    marginTop: s(6),
    marginLeft: 'auto',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: `${s(4)}px 0`,
    borderBottom: '1px solid #FFFFFF',
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: `${s(5)}px 0 0 0`,
    marginTop: s(3),
    borderTop: '1px solid #FFFFFF',
  },
  summaryText: {
    fontSize: s(11),
    color: '#FFFFFF',
    fontWeight: 500,
    letterSpacing: 0.01,
    lineHeight: 1.3,
  },
  summaryTextBold: {
    fontSize: s(11),
    color: '#FFFFFF',
    fontWeight: 700,
    letterSpacing: 0.01,
    lineHeight: 1.3,
  },
  summaryTotalText: {
    fontSize: s(14),
    color: '#FFFFFF',
    fontWeight: 700,
    letterSpacing: 0.02,
    lineHeight: 1.2,
  },
  paymentMethod: {
    marginBottom: s(10),
  },
  sectionLabel: {
    fontSize: s(13),
    fontWeight: 700,
    color: '#374151',
    marginBottom: s(6),
    textTransform: 'uppercase',
    letterSpacing: 0.05,
    lineHeight: 1.4,
  },
  sectionText: {
    fontSize: s(14),
    color: '#374151',
    marginBottom: 0,
    fontWeight: 600,
    lineHeight: 1.5,
  },
  thankYou: {
    fontSize: s(14),
    color: '#374151',
    fontWeight: 500,
    marginBottom: s(16),
    lineHeight: 1.6,
  },
  terms: {
    fontSize: s(11),
    color: '#6B7280',
    lineHeight: 1.7,
    marginBottom: s(20),
    maxWidth: 600,
  },
  });
};

// Items per page for multi-page invoice pagination
const ITEMS_PER_PAGE = 14;

type PageableItem = {
  item: any;
  globalIndex: number;
  blDocId?: string;
  blShortDate?: string;
};

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
  originalInvoice,
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

  // For BL-grouped invoices, compute totals from BL items (same data shown in the table).
  // This ensures subtotal always matches the displayed line rows, even if invoice_items diverge.
  const hasGroupedBLsEarly = type === 'invoice' && linkedBLs && linkedBLs.length > 0
    && linkedBLs.some(bl => bl.items && bl.items.length > 0);
  const itemsForTotals: InvoiceItem[] = hasGroupedBLsEarly
    ? (linkedBLs || []).flatMap(bl => (bl.items || []).map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unit_price,
        total: item.total,
      })))
    : items;
  const totals = calculateInvoiceTotals(itemsForTotals, discountType, discountValue);
  const showVAT = type === 'invoice' || type === 'estimate' || type === 'credit_note' || type === 'prelevement'
    || type === 'purchase_order' || type === 'purchase_delivery_note'
    || (type === 'delivery_note' && taxEnabled !== false);

  const totalItemCount = (type === 'invoice' && linkedBLs && linkedBLs.length > 0)
    ? linkedBLs.reduce((sum, bl) => sum + (bl.items?.length || 0), 0)
    : items.length;

  // Multi-page mode: invoices with more than ITEMS_PER_PAGE items get paginated
  const isMultiPage = type === 'invoice' && totalItemCount > ITEMS_PER_PAGE;

  // For multi-page use a comfortable fixed scale; for single-page use auto-shrink
  const scale = isMultiPage ? 0.88 : getLayoutScale(totalItemCount);
  const styles = createStyles(scale);

  // Dynamic font size for company name — shrinks to fit long names on one line.
  // Only applied to the company-name texts; no other font sizes are affected.
  const dynCompanyFontSize = (name: string, basePt: number): number => {
    const len = (name || '').length;
    const base = Math.max(1, Math.round(basePt * scale));
    if (len <= 12) return base;
    if (len <= 18) return Math.max(8, Math.round(base * 0.87));
    if (len <= 24) return Math.max(8, Math.round(base * 0.78));
    if (len <= 30) return Math.max(7, Math.round(base * 0.70));
    return Math.max(7, Math.round(base * 0.62));
  };

  // Shared font size for both DE: and recipient boxes — driven by whichever name is longer
  // so both sides always render at the same size for a balanced look.
  const _recipientName = clientData?.company || supplierData?.company || clientData?.name || supplierData?.name || client || supplier || '';
  const _providerName  = companyInfo.name || '';
  const _longerName    = _providerName.length >= _recipientName.length ? _providerName : _recipientName;
  const sharedNameFontSize = dynCompanyFontSize(_longerName, 15);

  const documentTitles: Record<string, string> = {
    invoice: String(t('pdf.invoice')),
    estimate: String(t('pdf.estimate')),
    delivery_note: String(t('pdf.deliveryNote')),
    purchase_order: String(t('pdf.purchaseOrder')),
    credit_note: String(t('pdf.creditNote')),
    statement: String(t('pdf.statement')),
    purchase_invoice: String(t('pdf.purchaseInvoice')),
    purchase_delivery_note: String(t('pdf.deliveryNote')),
    prelevement: 'PRÉLÈVEMENT',
    divers: 'DIVERS',
  };

  const getTitleFontSize = (text: string): number => {
    const length = text.length;
    if (length <= 8) return 35;
    if (length <= 15) return 30;
    if (length <= 18) return 25;
    return 23;
  };

  const paymentMethodText: Record<string, string> = {
    cash: String(t('paymentMethods.cash')),
    check: String(t('paymentMethods.check')),
    bank_transfer: String(t('paymentMethods.bankTransfer')),
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const locale = currentLang === 'fr' ? 'fr-FR' : 'en-US';
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return d.toLocaleDateString(locale, options);
  };

  const formatDocumentId = (id: string, docType: string): string => {
    const prefixes: Record<string, string> = {
      invoice: 'FC',
      estimate: 'DV',
      delivery_note: 'BL',
      purchase_order: 'BC',
      credit_note: 'AV',
      statement: 'RL',
      purchase_invoice: 'FA',
      purchase_delivery_note: 'BL',
      divers: 'DIV',
    };

    const prefix = prefixes[docType] || 'DOC';

    if (id.toUpperCase().startsWith(prefix)) {
      return id;
    }

    if (id.startsWith('INV-')) return id.replace('INV-', 'FC-');
    if (id.startsWith('EST-')) return id.replace('EST-', 'DV-');
    if (id.startsWith('DN-')) return id.replace('DN-', 'BL-');
    if (id.startsWith('DIV-')) return id.replace('DIV-', 'BL-');
    if (id.startsWith('CN-')) return id.replace('CN-', 'AV-');
    if (id.startsWith('ST-')) return id.replace('ST-', 'RL-');
    if (id.startsWith('PO-')) return id.replace('PO-', 'BC-');
    if (id.startsWith('PI-')) return id.replace('PI-', 'FA-');

    if (id.match(/^[A-Z]{2,4}-/)) {
      return id;
    }

    return `${prefix}-${id}`;
  };

  const formattedDocumentId = formatDocumentId(documentId, type);

  const hasGroupedBLs = type === 'invoice' && linkedBLs && linkedBLs.length > 0 && linkedBLs.some(bl => bl.items && bl.items.length > 0);

  // Collect all pageable items (flat across BL groups) for multi-page chunking
  const allPageableItems: PageableItem[] = [];
  if (hasGroupedBLs) {
    let gi = 0;
    for (const bl of linkedBLs!) {
      const d = new Date(bl.date);
      const sd = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`;
      (bl.items || []).forEach(item => {
        allPageableItems.push({ item, globalIndex: gi++, blDocId: bl.document_id, blShortDate: sd });
      });
    }
  } else {
    items.forEach((item, i) => allPageableItems.push({ item, globalIndex: i }));
  }

  // Split into pages of ITEMS_PER_PAGE
  const pageChunks: PageableItem[][] = [];
  if (isMultiPage) {
    for (let i = 0; i < allPageableItems.length; i += ITEMS_PER_PAGE) {
      pageChunks.push(allPageableItems.slice(i, i + ITEMS_PER_PAGE));
    }
  }

  // ─── Render helpers (shared by single-page and multi-page paths) ───────────

  const renderItemRow = (item: any, rowIndex: number) => {
    const unitPrice = Number(item.unit_price ?? item.unitPrice) || 0;
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
            <Text wrap={false}>{`${Math.round(VAT_RATE * 100)}%`}</Text>
          </View>
        )}
        <View style={[styles.tableCell, styles.tableCellRight, styles.tableCellBold, { flex: 1.5, width: (showVAT && (totals.discountAmount || 0) > 0) ? '15%' : (showVAT || (totals.discountAmount || 0) > 0) ? '23%' : '35%' }]}>
          <Text wrap={false}>{formatMADFull(itemNetHT)}</Text>
        </View>
      </View>
    );
  };

  const renderTableHeaderRow = () => (
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
          <Text>TVA</Text>
        </View>
      )}
      <View style={[styles.tableHeaderCell, { flex: 1.5, width: (showVAT && (totals.discountAmount || 0) > 0) ? '15%' : (showVAT || (totals.discountAmount || 0) > 0) ? '23%' : '35%', textAlign: 'right' }]}>
        <Text>{String(t('pdf.total'))}</Text>
      </View>
    </View>
  );

  const renderHeader = () => (
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
              <Text style={[styles.companyName, { color: titleColor, fontSize: dynCompanyFontSize(companyInfo.name || '', 18) }]}>{(companyInfo.name || 'COMPANY NAME').toUpperCase()}</Text>
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
            {type === 'credit_note' && originalInvoice && (
              <View style={styles.invoiceDetailRow}>
                <Text>
                  <Text style={styles.invoiceDetailLabel}>Réf. Facture: </Text>
                  <Text style={styles.invoiceDetailValue}>{originalInvoice}</Text>
                </Text>
              </View>
            )}
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
        marginBottom: scale < 1 ? 6 : 12,
      }}>
        {/* Left Box - From (Sender) */}
        <View style={{ width: '40%', flexShrink: 0 }}>
          <Text style={[styles.invoiceToLabel, { color: primaryColor }]}>{String(t('pdf.from'))}:</Text>
          <View style={[styles.invoiceToBox, { borderColor: primaryColor }]}>
            {type === 'purchase_invoice' || type === 'purchase_delivery_note' ? (
              <View>
                {(clientData || supplierData) ? (
                  <View>
                    <Text style={[styles.clientName, { fontSize: sharedNameFontSize }]}>
{clientData?.company || supplierData?.company || clientData?.name || supplierData?.name || '-'}
</Text>
{(clientData?.ice || supplierData?.ice) ? <Text style={{ fontSize: 10, color: '#475569', marginTop: 1, lineHeight: 1.2 }}>{String(t('pdf.ice'))}: {clientData?.ice || supplierData?.ice}</Text> : null}
{(clientData?.phone || supplierData?.phone) ? <Text style={{ fontSize: 10, color: '#475569', marginTop: 1, lineHeight: 1.2 }}>{String(t('pdf.phone'))}: {clientData?.phone || supplierData?.phone}</Text> : null}
{(clientData?.address || supplierData?.address) ? <Text style={{ fontSize: 10, color: '#475569', marginTop: 1, lineHeight: 1.2 }}>{clientData?.address || supplierData?.address}</Text> : null}
                  </View>
                ) : (
                  <Text style={[styles.clientName, { fontSize: sharedNameFontSize }]}>{client || supplier || '-'}</Text>
                )}
              </View>
            ) : (
              <View>
                <Text style={[styles.clientName, { fontSize: sharedNameFontSize }]}>
{(companyInfo.name || 'COMPANY NAME').toUpperCase()}
</Text>
{companyInfo.ice ? <Text style={{ fontSize: 10, color: '#475569', marginTop: 1, lineHeight: 1.2 }}>{String(t('pdf.ice'))}: {companyInfo.ice}</Text> : null}
{companyInfo.phone ? <Text style={{ fontSize: 10, color: '#475569', marginTop: 1, lineHeight: 1.2 }}>{String(t('pdf.phone'))}: {companyInfo.phone}</Text> : null}
{companyInfo.address ? <Text style={{ fontSize: 10, color: '#475569', marginTop: 1, lineHeight: 1.2 }}>{companyInfo.address}</Text> : null}
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
              <View>
                <Text style={[styles.clientName, { fontSize: sharedNameFontSize }]}>
{(companyInfo.name || 'COMPANY NAME').toUpperCase()}
</Text>
{companyInfo.ice ? <Text style={{ fontSize: 10, color: '#475569', marginTop: 1, lineHeight: 1.2 }}>{String(t('pdf.ice'))}: {companyInfo.ice}</Text> : null}
{companyInfo.phone ? <Text style={{ fontSize: 10, color: '#475569', marginTop: 1, lineHeight: 1.2 }}>{String(t('pdf.phone'))}: {companyInfo.phone}</Text> : null}
{companyInfo.address ? <Text style={{ fontSize: 10, color: '#475569', marginTop: 1, lineHeight: 1.2 }}>{companyInfo.address}</Text> : null}
              </View>
            ) : (
              <View>
                {(clientData || supplierData) ? (
                  <View>
                    <Text style={[styles.clientName, { fontSize: sharedNameFontSize }]}>
{clientData?.company || supplierData?.company || clientData?.name || supplierData?.name || '-'}
</Text>
{(clientData?.ice || supplierData?.ice) ? <Text style={{ fontSize: 10, color: '#475569', marginTop: 1, lineHeight: 1.2 }}>{String(t('pdf.ice'))}: {clientData?.ice || supplierData?.ice}</Text> : null}
{(clientData?.phone || supplierData?.phone) ? <Text style={{ fontSize: 10, color: '#475569', marginTop: 1, lineHeight: 1.2 }}>{String(t('pdf.phone'))}: {clientData?.phone || supplierData?.phone}</Text> : null}
{(clientData?.address || supplierData?.address) ? <Text style={{ fontSize: 10, color: '#475569', marginTop: 1, lineHeight: 1.2 }}>{clientData?.address || supplierData?.address}</Text> : null}
                  </View>
                ) : (
                  <Text style={[styles.clientName, { fontSize: sharedNameFontSize }]}>{client || supplier || '-'}</Text>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );

  const renderSummarySection = () => (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-start', gap: 20, marginBottom: scale < 1 ? 8 : 32, width: '100%' }} wrap={false}>
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
            fontSize: 11,
            fontWeight: 700,
            color: '#374151',
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: 0.05,
          }}>
            {String(t('common.notes'))}
          </Text>
          <Text style={{
            fontSize: 13,
            color: '#6B7280',
            lineHeight: 1.5,
          }}>
            {note}
          </Text>
        </View>
      )}

      {/* Summary Box - Right Side */}
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
  );

  const renderAmountInWordsSection = () => (type === 'invoice' || type === 'credit_note') ? (
    <View style={{ marginTop: scale < 1 ? 4 : 'auto', marginBottom: scale < 1 ? 6 : 15, paddingLeft: 8 }} wrap={false}>
      <Text style={{ fontSize: scale < 1 ? 8 : 9, color: '#374151' }}>
        {type === 'credit_note'
          ? 'Arrêté le présent avoir à la somme de :'
          : 'Arrêté la présente facture à la somme de :'}
      </Text>
      <Text style={{ fontSize: scale < 1 ? 9 : 11, fontWeight: 'bold', color: primaryColor, marginTop: 3 }}>
        {amountToFrenchWords(showVAT ? totals.total : totals.subtotal)}
      </Text>
    </View>
  ) : null;

  const renderFooterText = () => (
    <Text style={{
      fontSize: 10,
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
  );

  // ─── Multi-page render (invoices with > 20 items) ────────────────────────
  if (isMultiPage) {
    const totalPages = pageChunks.length;

    return (
      <Document>
        {pageChunks.map((chunk, pageIdx) => (
          <Page key={pageIdx} size="A4" style={styles.page}>
            <View style={styles.contentWrapper}>
              {/* Full header on every page */}
              {renderHeader()}

              {/* Items table for this page */}
              <View style={[styles.table, { borderColor: primaryColor }]}>
                {renderTableHeaderRow()}
                {chunk.map((pi, localIdx) => {
                  // Show BL group header when BL changes within a page
                  const showBLHeader = !!pi.blDocId && (
                    localIdx === 0 || chunk[localIdx - 1].blDocId !== pi.blDocId
                  );
                  return (
                    <React.Fragment key={pi.item?.id ?? pi.globalIndex}>
                      {showBLHeader && (
                        <View
                          style={{
                            flexDirection: 'row',
                            backgroundColor: '#EFF6FF',
                            borderBottom: '1px solid #BFDBFE',
                            padding: `${Math.max(2, Math.round(4 * scale))}px ${Math.max(4, Math.round(8 * scale))}px`,
                          }}
                          wrap={false}
                        >
                          <Text style={{ fontSize: Math.max(7, Math.round(9 * scale)), fontFamily: 'Helvetica-Bold', color: '#1D4ED8' }}>
                            {pi.blDocId} Du {pi.blShortDate}
                          </Text>
                        </View>
                      )}
                      {renderItemRow(pi.item, pi.globalIndex)}
                    </React.Fragment>
                  );
                })}
              </View>

              {/* Totals and amount in words — last page only */}
              {pageIdx === totalPages - 1 && renderSummarySection()}
              {pageIdx === totalPages - 1 && renderAmountInWordsSection()}
            </View>

            {/* Footer with page number — explicit on every page */}
            <View style={styles.footer}>
              {renderFooterText()}
              <Text style={{ fontSize: 9, color: '#9CA3AF', marginTop: 3 }}>
                Page {pageIdx + 1} / {totalPages}
              </Text>
            </View>
          </Page>
        ))}
      </Document>
    );
  }

  // ─── Single-page render (existing behavior — all non-invoice types and invoices ≤ 20 items) ──
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.contentWrapper}>
          {/* Header */}
          {renderHeader()}

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
                fontSize: 11,
                fontFamily: 'Helvetica-Bold',
                color: primaryColor,
                marginRight: 6,
                textTransform: 'uppercase',
                letterSpacing: 0.05,
              }}>
                Bon de commande client :
              </Text>
              <Text style={{
                fontSize: 13,
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
            {renderTableHeaderRow()}

            {/* Table Rows - grouped by BL when available, otherwise flat */}
            {(() => {
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
                      <View style={{ flexDirection: 'row', backgroundColor: '#EFF6FF', borderBottom: '1px solid #BFDBFE', borderTop: blIdx > 0 ? '2px solid #93C5FD' : undefined, padding: `${Math.max(2, Math.round(4*scale))}px ${Math.max(4, Math.round(8*scale))}px` }} wrap={false}>
                        <Text style={{ fontSize: Math.max(7, Math.round(9*scale)), fontFamily: 'Helvetica-Bold', color: '#1D4ED8' }}>
                          {bl.document_id} Du {shortDate}
                        </Text>
                      </View>
                      {blItems.map((item, itemIdx) => renderItemRow(item as any, startIndex + itemIdx))}
                    </React.Fragment>
                  );
                });
              }

              // Default flat list
              return items.map((item, index) => renderItemRow(item, index));
            })()}
          </View>

          {/* Financial Summary */}
          {renderSummarySection()}

          {/* Amount in Words for Invoices */}
          {renderAmountInWordsSection()}
        </View>

        {/* Footer - fixed so it appears on every page if content overflows */}
        <View style={styles.footer} fixed>
          {renderFooterText()}
        </View>
      </Page>
    </Document>
  );
};
