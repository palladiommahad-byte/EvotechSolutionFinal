/**
 * Document Number Service
 * Simplified version using client-side generation
 * (Previously used Supabase RPC)
 */

import { generateDocumentNumber, DocumentType } from './document-number-generator';

interface DocumentInfo {
  id: string;
  type?: DocumentType | string;
  date?: string;
}

/**
 * Generates a unique document number
 * Note: This version is client-side only. 
 * In a multi-user environment, this should be handled by the backend.
 * 
 * @param documentType - Type of document to generate
 * @param existingDocuments - Array of existing documents to check for uniqueness
 * @param documentDate - Optional date for the document (defaults to today)
 * @returns Unique document number in format PREFIX-MM/YY/NNNN
 */
export async function generateDocumentNumberFromDB(
  documentType: DocumentType,
  existingDocuments?: DocumentInfo[],
  documentDate?: Date | string
): Promise<string> {
  try {
    // Pass existing documents to ensure uniqueness
    return generateDocumentNumber(documentType, existingDocuments || [], documentDate);
  } catch (error) {
    console.error('Error generating document number:', error);
    throw error;
  }
}

