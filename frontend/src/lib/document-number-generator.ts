/**
 * Document Number Generator
 * Generates unique document numbers in the format: PREFIX-MM/YY/NNNN
 * Example: FC-01/26/0001
 * 
 * Format:
 * - PREFIX: Document type prefix (French abbreviations)
 *   - FC: Facture Client (Sales Invoice)
 *   - DV: Devis (Estimate/Quote)
 *   - BC: Bon de Commande (Purchase Order)
 *   - BL: Bon de Livraison (Delivery Note)
 *   - AV: Avoir (Credit Note)
 *   - RL: Relevé (Statement)
 *   - FA: Facture Achat (Purchase Invoice)
 * - MM: Month (01-12)
 * - YY: Year (2 digits, e.g., 26 for 2026)
 * - NNNN: Serial number (0001-9999)
 */

export type DocumentType =
  | 'invoice'           // FC - Facture Client (Sales Invoice)
  | 'estimate'          // DV - Devis (Estimate/Quote)
  | 'purchase_order'    // BC - Bon de Commande (Purchase Order)
  | 'delivery_note'     // BL - Bon de Livraison (Delivery Note)
  | 'credit_note'       // AV - Avoir (Credit Note)
  | 'statement'         // RL - Relevé (Statement)
  | 'purchase_invoice'  // FA - Facture Achat (Purchase Invoice)
  | 'divers';           // BL - Bon de Livraison Divers

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
};

interface DocumentInfo {
  id: string;
  type?: DocumentType | string;
  date?: string;
}

/**
 * Extracts document number components from a document ID
 */
function parseDocumentNumber(documentId: string): {
  prefix: string;
  month: string;
  year: string;
  serial: string;
} | null {
  // Format: PREFIX-MM/YY/NNNN
  const match = documentId.match(/^([A-Z]+)-(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  return {
    prefix: match[1],
    month: match[2],
    year: match[3],
    serial: match[4],
  };
}

/**
 * Note: This function is now a fallback only.
 * For production use, prefer generateDocumentNumberFromDB from document-number-service.ts
 * which uses the database to ensure uniqueness.
 */

/**
 * Gets the next serial number for a given prefix, month, and year
 */
function getNextSerialNumber(
  prefix: string,
  month: string,
  year: string,
  existingDocumentIds: string[]
): number {
  // Filter documents that match the prefix, month, and year
  const matchingDocs = existingDocumentIds
    .map(id => parseDocumentNumber(id))
    .filter(
      (parsed): parsed is NonNullable<typeof parsed> =>
        parsed !== null &&
        parsed.prefix === prefix &&
        parsed.month === month &&
        parsed.year === year
    );

  if (matchingDocs.length === 0) {
    return 1; // Start from 0001
  }

  // Find the highest serial number
  const maxSerial = Math.max(
    ...matchingDocs.map(doc => parseInt(doc.serial, 10))
  );

  return maxSerial + 1;
}

/**
 * Generates a unique document number
 * 
 * @param documentType - Type of document to generate
 * @param existingDocuments - Optional array of existing documents to check for uniqueness
 * @param documentDate - Optional date for the document (defaults to today)
 * @returns Unique document number in format PREFIX-MM/YY/NNNN
 */
export function generateDocumentNumber(
  documentType: DocumentType,
  existingDocuments?: DocumentInfo[],
  documentDate?: Date | string
): string {
  const prefix = DOCUMENT_PREFIXES[documentType];

  // Get date
  let date: Date;
  if (typeof documentDate === 'string') {
    date = new Date(documentDate);
  } else if (documentDate instanceof Date) {
    date = documentDate;
  } else {
    date = new Date();
  }

  // Format month and year
  const month = String(date.getMonth() + 1).padStart(2, '0'); // 01-12
  const year = String(date.getFullYear()).slice(-2); // Last 2 digits of year

  // Get existing document IDs from passed documents only
  // Note: For production, use generateDocumentNumberFromDB from document-number-service.ts
  const existingIds = existingDocuments
    ? existingDocuments.map(doc => doc.id).filter(Boolean) as string[]
    : [];

  // Get next serial number
  const serialNumber = getNextSerialNumber(prefix, month, year, existingIds);

  // Format serial number with leading zeros
  const serial = String(serialNumber).padStart(4, '0');

  // Generate document number
  const documentNumber = `${prefix}-${month}/${year}/${serial}`;

  // Verify uniqueness (should never happen, but double-check)
  if (existingIds.includes(documentNumber)) {
    console.warn(`Generated duplicate document number: ${documentNumber}. Trying next number.`);
    // Recursively try next number
    return generateDocumentNumber(documentType, existingDocuments, date);
  }

  return documentNumber;
}

/**
 * Validates a document number format
 */
export function isValidDocumentNumber(documentId: string): boolean {
  return /^[A-Z]+-\d{2}\/\d{2}\/\d{4}$/.test(documentId);
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