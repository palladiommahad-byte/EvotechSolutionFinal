import React from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { formatMADFull, VAT_RATE, calculateInvoiceTotals } from '@/lib/moroccan-utils';
import { InvoiceItem } from '@/lib/moroccan-utils';
import { UIContact } from '@/contexts/ContactsContext';

interface DocumentTemplateProps {
  type: 'invoice' | 'estimate' | 'delivery_note' | 'purchase_order' | 'purchase_invoice' | 'purchase_delivery_note';
  documentId: string;
  date: string;
  client?: string;
  supplier?: string;
  clientData?: UIContact;
  supplierData?: UIContact;
  items: InvoiceItem[];
  paymentMethod?: 'cash' | 'check' | 'bank_transfer';
  dueDate?: string;
  note?: string;
}

export const DocumentTemplate: React.FC<DocumentTemplateProps> = ({
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
}) => {
  const { companyInfo } = useCompany();
  const totals = calculateInvoiceTotals(items);
  // For purchase documents, the external contact is the supplier. For sales, it's the client.
  const isPurchaseSide = type === 'purchase_order' || type === 'purchase_invoice' || type === 'purchase_delivery_note';
  // Incoming docs (Invoice, Delivery Note) are From Supplier -> To Company.
  // Outgoing docs (PO) are From Company -> To Supplier.
  const isIncomingPurchaseDoc = type === 'purchase_invoice' || type === 'purchase_delivery_note';

  const contactData = isPurchaseSide ? supplierData : clientData;
  const showVAT = type === 'invoice' || type === 'estimate' || type === 'purchase_invoice';
  const contactName = contactData?.company || contactData?.name || client || supplier || '-';
  const contactICE = contactData?.ice;
  const contactPhone = contactData?.phone;
  const contactAddress = contactData?.address || contactData?.city;

  const documentTitles: Record<typeof type, { en: string; fr: string }> = {
    invoice: { en: 'Invoice', fr: 'INVOICE' },
    estimate: { en: 'Estimate', fr: 'DEVIS' },
    delivery_note: { en: 'Delivery Note', fr: 'BON DE LIVRAISON' },
    purchase_order: { en: 'Purchase Order', fr: 'BON DE COMMANDE' },
    purchase_invoice: { en: 'Purchase Invoice', fr: 'FACTURE ACHAT' },
    purchase_delivery_note: { en: 'Delivery Note', fr: 'BON DE LIVRAISON' },
  };

  // Calculate font size based on text length - smaller for longer text
  const getTitleFontSize = (text: string): string => {
    const length = text.length;
    if (length <= 8) return '28px';      // Short: INVOICE (7), DEVIS (5)
    if (length <= 15) return '24px';     // Medium: BON DE COMMANDE (15)
    if (length <= 18) return '20px';     // Long: BON DE LIVRAISON (17)
    return '18px';                        // Very long: fallback
  };

  const getDocumentLabel = () => {
    switch (type) {
      case 'purchase_order':
      case 'purchase_invoice':
      case 'purchase_delivery_note':
        return 'Supplier';
      case 'delivery_note':
        return 'Client';
      case 'estimate':
        return 'Client';
      default:
        return 'Client';
    }
  };

  const paymentMethodText: Record<string, string> = {
    cash: 'Espèces',
    check: 'Chèque',
    bank_transfer: 'Virement bancaire',
  };

  // Sky Blue color
  const skyBlue = '#3b82f6';
  const lightBlueGray = '#f1f5f9';

  // Format date
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  };

  return (
    <div
      className="document-template w-full flex justify-center"
      style={{
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        backgroundColor: '#F5F5F5',
        minHeight: '100vh',
        padding: '20px 0'
      }}
    >
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
            background: white;
          }
          .document-template {
            margin: 0;
            padding: 0;
            width: 100%;
            max-width: 100%;
            background: white;
          }
          .document-content {
            width: 210mm;
            max-width: 210mm;
            margin: 0 auto;
            padding: 10px 56px 48px 56px;
            min-height: 297mm;
            height: 297mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .no-print {
            display: none !important;
          }
        }
        .document-template {
          font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
      `}</style>

      <div
        className="document-content max-w-4xl w-full mx-auto bg-white shadow-lg"
        style={{
          padding: '10px 56px 48px 56px',
          width: '210mm',
          minHeight: '297mm',
          boxSizing: 'border-box',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        {/* Main Content Wrapper */}
        <div style={{ flex: 1 }}>
          {/* Header Section */}
          <div style={{ marginBottom: '42px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px' }}>
              {/* Left: Logo and Company Info */}
              <div style={{ flex: '1', paddingRight: '40px', display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
                  {/* Logo */}
                  {companyInfo.logo && (
                    <div style={{ flexShrink: 0 }}>
                      <img
                        src={companyInfo.logo}
                        alt={companyInfo.name}
                        style={{ height: '60px', objectFit: 'contain', maxWidth: '120px' }}
                      />
                    </div>
                  )}
                  {/* Company Name and Details */}
                  <div style={{ flex: '1' }}>
                    <h1 style={{
                      fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#111827',
                      margin: '0 0 6px 0',
                      letterSpacing: '-0.01em',
                      lineHeight: '1.3'
                    }}>
                      {companyInfo.name?.toUpperCase() || 'COMPANY NAME'}
                    </h1>
                    {companyInfo.email && (
                      <p style={{
                        fontSize: '10px',
                        color: '#6B7280',
                        margin: '0',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        lineHeight: '1.5'
                      }}>
                        {companyInfo.email.split('@')[1]?.toUpperCase() || ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Document Title in Sky Blue */}
              <div style={{ textAlign: 'right', display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                <h2 style={{
                  fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
                  fontSize: getTitleFontSize(documentTitles[type].fr),
                  fontWeight: 700,
                  color: skyBlue,
                  margin: '0 0 14px 0',
                  letterSpacing: '0.03em',
                  lineHeight: '1',
                  whiteSpace: 'nowrap'
                }}>
                  {documentTitles[type].fr}
                </h2>
                <div style={{
                  backgroundColor: skyBlue,
                  padding: '10px 14px',
                  borderRadius: '6px',
                  textAlign: 'left',
                  width: '100%',
                  boxSizing: 'border-box',
                  minWidth: '100%'
                }}>
                  <div style={{ fontSize: '9px', color: '#FFFFFF', lineHeight: '1.6' }}>
                    <div style={{ marginBottom: '3px' }}>
                      <span style={{ fontWeight: 600, letterSpacing: '0.01em' }}>Invoice No: </span>
                      <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{documentId}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, letterSpacing: '0.01em' }}>Date: </span>
                      <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{formatDate(date)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Company Info and Invoice To Section - Side by Side */}
            <div style={{
              display: 'flex',
              gap: '20px',
              width: '100%',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginLeft: '0',
              marginBottom: '16px',
              paddingLeft: '0'
            }}>
              {/* Company Info Box - Left (40%) */}
              <div style={{ flex: '0 0 40%' }}>
                <h3 style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#374151',
                  marginBottom: '5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  lineHeight: '1.3'
                }}>
                  From:
                </h3>
                <div style={{
                  backgroundColor: '#EFF6FF',
                  padding: '10px 12px',
                  borderRadius: '5px',
                  border: `1px solid ${skyBlue}`
                }}>
                  {isIncomingPurchaseDoc ? (
                    // For Purchase Invoices/Delivery Notes: From is Supplier
                    <>
                      <p style={{
                        fontSize: '9px',
                        fontWeight: 600,
                        color: '#111827',
                        margin: '0 0 3px 0',
                        lineHeight: '1.3'
                      }}>
                        {contactName}
                      </p>
                      {contactICE && (
                        <p style={{ fontSize: '8px', color: '#475569', margin: '0 0 2px 0', lineHeight: '1.3' }}>
                          ICE: {contactICE}
                        </p>
                      )}
                      {contactPhone && (
                        <p style={{ fontSize: '8px', color: '#475569', margin: '0 0 2px 0', lineHeight: '1.3' }}>
                          Tél: {contactPhone}
                        </p>
                      )}
                      {contactAddress && (
                        <p style={{ fontSize: '8px', color: '#475569', margin: '0', lineHeight: '1.3' }}>
                          {contactAddress}
                        </p>
                      )}
                    </>
                  ) : (
                    // For Sales Docs: From is Company
                    <>
                      <p style={{
                        fontSize: '9px',
                        fontWeight: 600,
                        color: '#111827',
                        margin: '0 0 3px 0',
                        lineHeight: '1.3'
                      }}>
                        {companyInfo.name || '-'}
                      </p>
                      {companyInfo.ice && (
                        <p style={{ fontSize: '8px', color: '#475569', margin: '0 0 2px 0', lineHeight: '1.3' }}>
                          ICE: {companyInfo.ice}
                        </p>
                      )}
                      {companyInfo.phone && (
                        <p style={{ fontSize: '8px', color: '#475569', margin: '0 0 2px 0', lineHeight: '1.3' }}>
                          Tél: {companyInfo.phone}
                        </p>
                      )}
                      {companyInfo.address && (
                        <p style={{ fontSize: '8px', color: '#475569', margin: '0', lineHeight: '1.3' }}>
                          {companyInfo.address}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Invoice To Box - Right (40%) */}
              <div style={{ flex: '0 0 40%' }}>
                <h3 style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#374151',
                  marginBottom: '5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  lineHeight: '1.3'
                }}>
                  {type === 'purchase_order' ? 'Supplier:' : 'Invoice To:'}
                </h3>
                <div style={{
                  backgroundColor: '#EFF6FF',
                  padding: '10px 12px',
                  borderRadius: '5px',
                  border: `1px solid ${skyBlue}`
                }}>
                  {isIncomingPurchaseDoc ? (
                    // For Purchase Invoices/DN: To is Company
                    <>
                      <p style={{
                        fontSize: '9px',
                        fontWeight: 600,
                        color: '#111827',
                        margin: '0 0 3px 0',
                        lineHeight: '1.3'
                      }}>
                        {companyInfo.name || '-'}
                      </p>
                      {companyInfo.ice && (
                        <p style={{ fontSize: '8px', color: '#475569', margin: '0 0 2px 0', lineHeight: '1.3' }}>
                          ICE: {companyInfo.ice}
                        </p>
                      )}
                      {companyInfo.phone && (
                        <p style={{ fontSize: '8px', color: '#475569', margin: '0 0 2px 0', lineHeight: '1.3' }}>
                          Tél: {companyInfo.phone}
                        </p>
                      )}
                      {companyInfo.address && (
                        <p style={{ fontSize: '8px', color: '#475569', margin: '0', lineHeight: '1.3' }}>
                          {companyInfo.address}
                        </p>
                      )}
                    </>
                  ) : (
                    // For Sales Docs: To is Client
                    <>
                      <p style={{
                        fontSize: '9px',
                        fontWeight: 600,
                        color: '#111827',
                        margin: '0 0 3px 0',
                        lineHeight: '1.3'
                      }}>
                        {contactName}
                      </p>
                      {contactICE && (
                        <p style={{ fontSize: '8px', color: '#475569', margin: '0 0 2px 0', lineHeight: '1.3' }}>
                          ICE: {contactICE}
                        </p>
                      )}
                      {contactPhone && (
                        <p style={{ fontSize: '8px', color: '#475569', margin: '0 0 2px 0', lineHeight: '1.3' }}>
                          Tél: {contactPhone}
                        </p>
                      )}
                      {contactAddress && (
                        <p style={{ fontSize: '8px', color: '#475569', margin: '0', lineHeight: '1.3' }}>
                          {contactAddress}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ marginBottom: '32px', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
              border: `1px solid ${skyBlue}`,
              borderRadius: '4px',
              overflow: 'hidden',
              margin: '0 auto'
            }}>
              <thead>
                <tr style={{ backgroundColor: skyBlue }}>
                  <th style={{
                    padding: '6px 8px',
                    textAlign: 'left',
                    fontSize: '8px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    lineHeight: '1.2',
                    width: '6%',
                    whiteSpace: 'nowrap'
                  }}>
                    NO
                  </th>
                  <th style={{
                    padding: '6px 10px',
                    textAlign: 'left',
                    fontSize: '8px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    lineHeight: '1.2',
                    width: '40%',
                    whiteSpace: 'nowrap'
                  }}>
                    DESCRIPTION
                  </th>
                  <th style={{
                    padding: '6px 6px',
                    textAlign: 'center',
                    fontSize: '8px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    lineHeight: '1.2',
                    width: '10%',
                    whiteSpace: 'nowrap'
                  }}>
                    QTY
                  </th>
                  <th style={{
                    padding: '6px 6px',
                    textAlign: 'center',
                    fontSize: '8px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    lineHeight: '1.2',
                    width: '16%',
                    whiteSpace: 'nowrap'
                  }}>
                    PRICE
                  </th>
                  <th style={{
                    padding: '6px 6px',
                    textAlign: 'center',
                    fontSize: '8px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    lineHeight: '1.2',
                    width: '14%',
                    whiteSpace: 'nowrap'
                  }}>
                    TAX
                  </th>
                  <th style={{
                    padding: '6px 8px',
                    textAlign: 'right',
                    fontSize: '8px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    lineHeight: '1.2',
                    width: '18%',
                    whiteSpace: 'nowrap'
                  }}>
                    TOTAL
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const itemTax = showVAT ? item.unitPrice * VAT_RATE : 0;
                  const itemTotalAfterTax = showVAT ? (item.unitPrice + itemTax) * item.quantity : item.total;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        backgroundColor: index % 2 === 0 ? '#FFFFFF' : lightBlueGray,
                      }}
                    >
                      <td style={{
                        padding: '6px 8px',
                        fontSize: '9px',
                        color: '#374151',
                        borderBottom: index < items.length - 1 ? '1px solid #E5E7EB' : 'none',
                        lineHeight: '1.3',
                        whiteSpace: 'nowrap'
                      }}>
                        {index + 1}
                      </td>
                      <td style={{
                        padding: '6px 10px',
                        fontSize: '9px',
                        color: '#374151',
                        borderBottom: index < items.length - 1 ? '1px solid #E5E7EB' : 'none',
                        lineHeight: '1.3',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {item.description || '-'}
                      </td>
                      <td style={{
                        padding: '6px 6px',
                        fontSize: '9px',
                        color: '#374151',
                        textAlign: 'center',
                        borderBottom: index < items.length - 1 ? '1px solid #E5E7EB' : 'none',
                        lineHeight: '1.3',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.quantity}
                      </td>
                      <td style={{
                        padding: '6px 6px',
                        fontSize: '9px',
                        color: '#374151',
                        textAlign: 'center',
                        borderBottom: index < items.length - 1 ? '1px solid #E5E7EB' : 'none',
                        lineHeight: '1.3',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        wordBreak: 'keep-all'
                      }}>
                        <span style={{ whiteSpace: 'nowrap' }}>{formatMADFull(item.unitPrice)}</span>
                      </td>
                      <td style={{
                        padding: '6px 6px',
                        fontSize: '9px',
                        color: '#374151',
                        textAlign: 'center',
                        borderBottom: index < items.length - 1 ? '1px solid #E5E7EB' : 'none',
                        lineHeight: '1.3',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        wordBreak: 'keep-all'
                      }}>
                        <span style={{ whiteSpace: 'nowrap' }}>{showVAT ? formatMADFull(itemTax) : '-'}</span>
                      </td>
                      <td style={{
                        padding: '6px 8px',
                        fontSize: '9px',
                        color: '#374151',
                        textAlign: 'right',
                        fontWeight: 600,
                        borderBottom: index < items.length - 1 ? '1px solid #E5E7EB' : 'none',
                        lineHeight: '1.3',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        wordBreak: 'keep-all'
                      }}>
                        <span style={{ whiteSpace: 'nowrap' }}>{formatMADFull(itemTotalAfterTax)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Financial Summary - Blue Box - Right Aligned with Note on Left */}
          <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', width: '100%', gap: '20px' }}>
            {/* Note Section - Left Side */}
            {note && note.trim() && (
              <div style={{
                flex: 1,
                maxWidth: '300px',
                padding: '12px 14px',
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                marginTop: '10px',
                marginRight: 'auto'
              }}>
                <div style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#374151',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Note
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#6B7280',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word'
                }}>
                  {note}
                </div>
              </div>
            )}

            {/* Summary Box - Right Side - Always Right Aligned */}
            <div style={{
              backgroundColor: skyBlue,
              padding: '12px 18px',
              borderRadius: '6px',
              minWidth: '240px',
              color: '#FFFFFF',
              marginTop: '10px',
              marginLeft: 'auto'
            }}>
              {showVAT && (
                <>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      letterSpacing: '0.01em',
                      lineHeight: '1.5'
                    }}>
                      Sub Total
                    </span>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      letterSpacing: '0.01em',
                      lineHeight: '1.5',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      {formatMADFull(totals.subtotal)}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 500,
                      letterSpacing: '0.01em',
                      lineHeight: '1.4'
                    }}>
                      Tax {VAT_RATE * 100}{'%'}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.01em',
                      lineHeight: '1.4',
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap'
                    }}>
                      {formatMADFull(totals.vat)}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0 0 0',
                    marginTop: '5px',
                    borderTop: '2px solid rgba(255, 255, 255, 0.3)'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      lineHeight: '1.3'
                    }}>
                      GRAND TOTAL
                    </span>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      lineHeight: '1.3',
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap'
                    }}>
                      {formatMADFull(totals.total)}
                    </span>
                  </div>
                </>
              )}
              {!showVAT && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0 0 0',
                  marginTop: '5px',
                  borderTop: '2px solid rgba(255, 255, 255, 0.3)'
                }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    lineHeight: '1.4'
                  }}>
                    GRAND TOTAL
                  </span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    lineHeight: '1.4',
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    {formatMADFull(totals.subtotal)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Company Details - Single line - Always at bottom */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '18px',
          borderTop: '1px solid #E5E7EB',
          width: '100%'
        }}>
          <div style={{
            textAlign: 'center',
            fontSize: '8px',
            color: '#6B7280',
            lineHeight: '1.4',
            fontWeight: 700
          }}>
            {[
              companyInfo.ice && `ICE: ${companyInfo.ice}`,
              companyInfo.ifNumber && `IF: ${companyInfo.ifNumber}`,
              companyInfo.rc && `RC: ${companyInfo.rc}`,
              companyInfo.cnss && `CNSS: ${companyInfo.cnss}`,
              companyInfo.phone && `Tél: ${companyInfo.phone}`,
              companyInfo.email && `Email: ${companyInfo.email}`
            ].filter(Boolean).join(' | ')}
          </div>
        </div>
      </div>
    </div>
  );
};
