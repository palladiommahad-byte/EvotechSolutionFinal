import React from 'react';
import ReactDOM from 'react-dom/client';
import { DocumentTemplate } from '@/components/documents/DocumentTemplate';
import { CompanyProvider } from '@/contexts/CompanyContext';
import { InvoiceItem } from './moroccan-utils';
import { pdf } from '@react-pdf/renderer';
import { DocumentPDFTemplate } from '@/components/documents/DocumentPDFTemplate';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import i18n from '@/i18n/config';

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

interface DocumentData {
  type: 'invoice' | 'estimate' | 'delivery_note' | 'purchase_order' | 'credit_note' | 'statement' | 'purchase_invoice' | 'purchase_delivery_note';
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
  language?: string;
  companyInfo?: CompanyInfo; // Optional - should be provided from CompanyContext
}

const defaultCompanyInfo: CompanyInfo = {
  name: 'EVOTECH Solutions SARL',
  legalForm: 'SARL',
  email: 'contact@evotech.ma',
  phone: '+212 5 24 45 67 89',
  address: 'Zone Industrielle, Lot 123, Marrakech 40000, Morocco',
  ice: '001234567890123',
  ifNumber: '12345678',
  rc: '123456 - Marrakech',
  tp: '12345678',
  cnss: '1234567',
  logo: null,
  footerText: 'Merci pour votre confiance. Paiement à 30 jours. TVA 20%.',
};

// Helper function to get company info (from parameter or defaults)
// Note: companyInfo should always be provided from CompanyContext
const getCompanyInfo = (providedCompanyInfo?: CompanyInfo): CompanyInfo => {
  // Use provided company info if available
  if (providedCompanyInfo) {
    return { ...defaultCompanyInfo, ...providedCompanyInfo };
  }

  // Use defaults if not provided (should not happen in normal operation)
  return defaultCompanyInfo;
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

  // If ID already has a standard prefix (PREFIX-MM/YY/NNNN), return as is
  if (id.match(/^[A-Z]{2,3}-\d{2}\/\d{2}\/\d{4}$/)) {
    return id;
  }

  // Handle legacy English prefixes if they still exist in DB
  // This ensures old documents display with French prefixes in PDF
  if (id.startsWith('INV-')) return id.replace('INV-', 'FC-');
  if (id.startsWith('EST-')) return id.replace('EST-', 'DV-');
  if (id.startsWith('DN-')) return id.replace('DN-', 'BL-');
  if (id.startsWith('DIV-')) return id.replace('DIV-', 'BL-');
  if (id.startsWith('CN-')) return id.replace('CN-', 'AV-');
  if (id.startsWith('ST-')) return id.replace('ST-', 'RL-');
  if (id.startsWith('PO-')) return id.replace('PO-', 'BC-');
  if (id.startsWith('PI-')) return id.replace('PI-', 'FA-');

  // If ID already has any uppercase prefix, return as is
  if (id.match(/^[A-Z]{2,4}-/)) {
    return id;
  }

  // Otherwise, add the prefix
  return `${prefix}-${id}`;
};

// Generate PDF using @react-pdf/renderer for vector PDF
export const generatePDFFromTemplate = async (data: DocumentData): Promise<void> => {
  // Validate required data
  if (!data.items || data.items.length === 0) {
    throw new Error('Cannot generate PDF: items array is empty');
  }

  // Get company info (from parameter or defaults)
  const companyInfo = getCompanyInfo(data.companyInfo);

  // Get current language
  const currentLanguage = data.language || i18n.language || 'en';

  // Try @react-pdf/renderer first, fallback to html2canvas if it fails
  try {
    console.log('Starting PDF generation with @react-pdf/renderer...');
    console.log('PDF Template received clientData:', {
      hasClientData: !!data.clientData,
      clientDataName: data.clientData?.company || data.clientData?.name,
      clientField: data.client
    });

    // Create PDF document using React.createElement for better compatibility
    const pdfDoc = React.createElement(DocumentPDFTemplate, {
      type: data.type,
      documentId: data.documentId,
      date: data.date,
      client: data.client,
      supplier: data.supplier,
      clientData: data.clientData,
      supplierData: data.supplierData,
      items: data.items,
      paymentMethod: data.paymentMethod,
      dueDate: data.dueDate,
      note: data.note,
      companyInfo: companyInfo as any,
      language: currentLanguage,
    });

    console.log('PDF document created, generating blob...');

    // Generate PDF blob (type assertion needed for @react-pdf/renderer compatibility)
    const blob = await pdf(pdfDoc as any).toBlob();

    console.log('PDF blob generated, size:', blob.size);

    // Create download link with document type name
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Get document type name (using translations)
    const t = (key: string) => i18n.t(key, { lng: currentLanguage });
    const getDocumentTypeName = (type: string): string => {
      switch (type) {
        case 'invoice': return t('pdf.invoice');
        case 'estimate': return t('pdf.estimate');
        case 'delivery_note': return t('pdf.deliveryNote');
        case 'purchase_order': return t('pdf.purchaseOrder');
        case 'credit_note': return t('pdf.creditNote');
        case 'statement': return t('pdf.statement');
        case 'purchase_invoice': return t('pdf.purchaseInvoice');
        default: return t('pdf.document');
      }
    };

    const documentTypeName = getDocumentTypeName(data.type);
    const formattedDocId = formatDocumentId(data.documentId, data.type);
    link.download = `${documentTypeName}_${formattedDocId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('PDF download initiated successfully');
    return;
  } catch (error) {
    console.warn('@react-pdf/renderer failed, falling back to html2canvas:', error);
    console.warn('Error details:', {
      message: error instanceof Error ? error.message : String(error),
    });

    // Fallback to html2canvas method
    try {
      await generatePDFWithHtml2Canvas(data, companyInfo);
    } catch (fallbackError) {
      console.error('Both PDF generation methods failed:', fallbackError);
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

// Fallback method using html2canvas
const generatePDFWithHtml2Canvas = async (data: DocumentData, companyInfo: any): Promise<void> => {
  // Create a temporary container for the React component
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm';
  container.style.minWidth = '210mm';
  container.style.maxWidth = '210mm';
  container.style.backgroundColor = 'white';
  container.style.overflow = 'visible';
  container.style.fontFamily = 'Inter, system-ui, sans-serif';
  container.style.color = '#111827';
  document.body.appendChild(container);

  // Create root and render the template wrapped in CompanyProvider
  const root = ReactDOM.createRoot(container);

  return new Promise((resolve, reject) => {
    // Only use DocumentTemplate for supported types
    const supportedTypes = ['invoice', 'estimate', 'delivery_note', 'purchase_order', 'purchase_invoice', 'purchase_delivery_note'];
    const useTemplate = supportedTypes.includes(data.type);

    if (useTemplate) {
      root.render(
        React.createElement(
          CompanyProvider,
          {
            children: React.createElement(DocumentTemplate, {
              type: data.type as 'invoice' | 'estimate' | 'delivery_note' | 'purchase_order' | 'purchase_invoice' | 'purchase_delivery_note',
              documentId: data.documentId,
              date: data.date,
              client: data.client,
              supplier: data.supplier,
              clientData: data.clientData,
              supplierData: data.supplierData,
              items: data.items,
              paymentMethod: data.paymentMethod,
              dueDate: data.dueDate,
              note: data.note,
            })
          }
        )
      );
    } else {
      // For unsupported types, just create an empty div
      root.render(React.createElement('div', {}, 'PDF generation not supported for this document type'));
    }

    // Wait for render and images to load
    setTimeout(async () => {
      try {
        // Wait for images to load
        const images = container.querySelectorAll('img');
        await Promise.all(
          Array.from(images).map(
            (img) =>
              new Promise((resolve) => {
                if (img.complete) {
                  resolve(undefined);
                } else {
                  img.onload = () => resolve(undefined);
                  img.onerror = () => resolve(undefined);
                }
              })
          )
        );

        await new Promise(resolve => setTimeout(resolve, 500));
        container.offsetHeight;

        container.style.width = '210mm';
        container.style.minHeight = '297mm';
        container.style.padding = '20mm';
        container.style.boxSizing = 'border-box';
        container.offsetHeight;

        // Convert to canvas
        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          allowTaint: false,
        });

        // Calculate PDF dimensions
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;

        // Create PDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        let position = 0;

        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        // Cleanup
        setTimeout(() => {
          try {
            root.unmount();
            if (container.parentNode) {
              document.body.removeChild(container);
            }
          } catch (e) {
            console.warn('Cleanup error:', e);
          }
        }, 100);

        // Get document type name for filename (using translations)
        const currentLang = data.language || i18n.language || 'en';
        const t = (key: string) => i18n.t(key, { lng: currentLang });
        const getDocumentTypeName = (type: string): string => {
          switch (type) {
            case 'invoice': return t('pdf.invoice');
            case 'estimate': return t('pdf.estimate');
            case 'delivery_note': return t('pdf.deliveryNote');
            case 'purchase_order': return t('pdf.purchaseOrder');
            case 'credit_note': return t('pdf.creditNote');
            case 'statement': return t('pdf.statement');
            case 'purchase_invoice': return t('pdf.purchaseInvoice');
            case 'purchase_delivery_note': return t('pdf.deliveryNote');
            default: return t('pdf.document');
          }
        };

        const documentTypeName = getDocumentTypeName(data.type);
        const formattedDocId = formatDocumentId(data.documentId, data.type);
        pdf.save(`${documentTypeName}_${formattedDocId}.pdf`);
        resolve();
      } catch (error) {
        console.error('html2canvas PDF generation error:', error);
        try {
          root.unmount();
          if (container.parentNode) {
            document.body.removeChild(container);
          }
        } catch (e) {
          console.warn('Cleanup error:', e);
        }
        reject(error);
      }
    }, 1000);
  });
};

// Helper to create fallback items when items array is not available (legacy support)
// This is used as a fallback when document.items is a number (count) instead of an array
export const createFallbackItems = (count: number, total: number): InvoiceItem[] => {
  if (count === 0) {
    return [{
      id: '1',
      description: 'Item',
      quantity: 1,
      unitPrice: total,
      total: total,
    }];
  }

  const avgPrice = total / count;
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i + 1}`,
    description: `Item ${i + 1}`,
    quantity: 1,
    unitPrice: avgPrice,
    total: avgPrice,
  }));
};

// Legacy export name for backward compatibility
export const createMockItems = createFallbackItems;
