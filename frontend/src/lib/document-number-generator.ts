/**
 * Document Number Generator
 *
 * Formats:
 *  - Facture (invoice): FCMMYY/NNNN  e.g. FC0626/0001
 *  - All other types:   PREFIX-MM/YY/NNNN  e.g. BL-06/26/0008
 */

export type DocumentType =
  | 'invoice'           // FC - Facture Client (Sales Invoice)
  | 'estimate'          // DV - Devis (Estimate/Quote)
  | 'purchase_order'    // BC - Bon de Commande (Purchase Order)
  | 'delivery_note'     // BL - Bon de Livraison (Delivery Note)
  | 'credit_note'       // AV - Avoir (Credit Note)
  | 'statement'         // RL - Relevé (Statement)
  | 'purchase_invoice'  // FA - Facture Achat (Purchase Invoice)
  | 'divers'            // DIV - Divers
  | 'prelevement';      // PRL - Prélèvement

// French prefixes for all document types (Moroccan business standards)
const DOCUMENT_PREFIXES: Record<DocumentType, string> = {
  invoice: 'FC',           // Facture Client (Sales Invoice)
  estimate: 'DV',          // Devis (Estimate/Quote)
  purchase_order: 'BC',    // Bon de Commande (Purchase Order)
  delivery_note: 'BL',     // Bon de Livraison (Delivery Note)
  credit_note: 'AV',       // Avoir (Credit Note)
  statement: 'RL',         // Relevé (Statement)
  purchase_invoice: 'FA',  // Facture Achat (Purchase Invoice)
  divers: 'DIV',           // Divers
  prelevement: 'PRL',      // Prélèvement
};

interface DocumentInfo {
  id: string;
  type?: DocumentType | string;
  date?: string;
}

/**
 * Parses a document number in either format:
 *  - New invoice format: FCMMYY/NNNN
 *  - Legacy format:      PREFIX-MM/YY/NNNN
 */
function parseDocumentNumber(documentId: string): {
  prefix: string;
  month: string;
  year: string;
  serial: string;
} | null {
  // New invoice format: FCMMYY/NNNN
  const newMatch = documentId.match(/^([A-Z]+)(\d{2})(\d{2})\/(\d{4})$/);
  if (newMatch) {
    return { prefix: newMatch[1], month: newMatch[2], year: newMatch[3], serial: newMatch[4] };
  }

  // Legacy format: PREFIX-MM/YY/NNNN
  const legacyMatch = documentId.match(/^([A-Z]+)-(\d{2})\/(\d{2})\/(\d{4})$/);
  if (legacyMatch) {
    return { prefix: legacyMatch[1], month: legacyMatch[2], year: legacyMatch[3], serial: legacyMatch[4] };
  }

  return null;
}

/**
 * Gets the next serial number for a given prefix, month, and year
 */
function getNextSerialNumber(
  prefix: string,
  month: string,
  year: string,
  existingDocumentIds: string[]
): number {
  const matchingDocs = existingDocumentIds
    .map(id => parseDocumentNumber(id))
    .filter(
      (parsed): parsed is NonNullable<typeof parsed> =>
        parsed !== null &&
        parsed.prefix === prefix &&
        parsed.month === month &&
        parsed.year === year
    );

  if (matchingDocs.length === 0) return 1;

  const maxSerial = Math.max(...matchingDocs.map(doc => parseInt(doc.serial, 10)));
  return maxSerial + 1;
}

/**
 * Generates a unique document number.
 * - invoice → FCMMYY/NNNN  (e.g. FC0626/0001)
 * - others  → PREFIX-MM/YY/NNNN  (e.g. BL-06/26/0008)
 */
export function generateDocumentNumber(
  documentType: DocumentType,
  existingDocuments?: DocumentInfo[],
  documentDate?: Date | string
): string {
  const prefix = DOCUMENT_PREFIXES[documentType];

  let date: Date;
  if (typeof documentDate === 'string') {
    date = new Date(documentDate);
  } else if (documentDate instanceof Date) {
    date = documentDate;
  } else {
    date = new Date();
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);

  const existingIds = existingDocuments
    ? existingDocuments.map(doc => doc.id).filter(Boolean) as string[]
    : [];

  const serialNumber = getNextSerialNumber(prefix, month, year, existingIds);
  const serial = String(serialNumber).padStart(4, '0');

  const documentNumber = documentType === 'invoice'
    ? `${prefix}${month}${year}/${serial}`       // FC0626/0001
    : `${prefix}-${month}/${year}/${serial}`;    // BL-06/26/0008

  if (existingIds.includes(documentNumber)) {
    console.warn(`Generated duplicate document number: ${documentNumber}. Trying next number.`);
    return generateDocumentNumber(documentType, existingDocuments, date);
  }

  return documentNumber;
}

/**
 * Validates a document number — accepts both formats.
 */
export function isValidDocumentNumber(documentId: string): boolean {
  return /^[A-Z]+\d{4}\/\d{4}$/.test(documentId)         // invoice: FCMMYY/NNNN
    || /^[A-Z]+-\d{2}\/\d{2}\/\d{4}$/.test(documentId);  // legacy:  PREFIX-MM/YY/NNNN
}

/**
 * Gets document type from document number prefix
 */
export function getDocumentTypeFromNumber(documentId: string): DocumentType | null {
  const parsed = parseDocumentNumber(documentId);
  if (!parsed) return null;

  const entry = Object.entries(DOCUMENT_PREFIXES).find(
    ([, prefix]) => prefix === parsed.prefix
  );

  return entry ? (entry[0] as DocumentType) : null;
}
