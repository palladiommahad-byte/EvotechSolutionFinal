/**
 * Credit Notes Service
 * Handles all API operations for credit notes
 */

import { apiClient } from '@/lib/api-client';

export interface CreditNoteItem {
  id: string;
  credit_note_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface CreditNote {
  id: string;
  document_id: string;
  client_id: string;
  invoice_id: string | null;
  date: string;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  status: 'draft' | 'sent' | 'applied' | 'cancelled';
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditNoteWithItems extends CreditNote {
  items: CreditNoteItem[];
  client?: {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    ice: string | null;
    if_number: string | null;
    rc: string | null;
  };
}

export const creditNotesService = {
  async getAll(filters?: {
    status?: string;
    clientId?: string;
    invoiceId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<CreditNoteWithItems[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.clientId) params.append('clientId', filters.clientId);
      if (filters?.invoiceId) params.append('invoiceId', filters.invoiceId);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const queryString = params.toString();
      return await apiClient.get<CreditNoteWithItems[]>(`/credit-notes${queryString ? `?${queryString}` : ''}`);
    } catch (error) {
      console.error('Error fetching credit notes:', error);
      return [];
    }
  },

  async getById(id: string): Promise<CreditNoteWithItems | null> {
    try {
      return await apiClient.get<CreditNoteWithItems>(`/credit-notes/${id}`);
    } catch (error) {
      console.error('Error fetching credit note:', error);
      return null;
    }
  },

  async getByDocumentId(documentId: string): Promise<CreditNoteWithItems | null> {
    try {
      return await apiClient.get<CreditNoteWithItems>(`/credit-notes/document/${documentId}`);
    } catch (error) {
      console.error('Error fetching credit note by document ID:', error);
      return null;
    }
  },

  async create(creditNote: {
    document_id: string;
    client_id: string;
    invoice_id?: string;
    date: string;
    note?: string;
    items: Array<{ product_id?: string; description: string; quantity: number; unit_price: number }>;
  }): Promise<CreditNoteWithItems> {
    return await apiClient.post<CreditNoteWithItems>('/credit-notes', creditNote);
  },

  async update(id: string, creditNote: {
    date?: string;
    status?: CreditNote['status'];
    note?: string;
    items?: Array<{ product_id?: string; description: string; quantity: number; unit_price: number }>;
  }): Promise<CreditNoteWithItems> {
    return await apiClient.put<CreditNoteWithItems>(`/credit-notes/${id}`, creditNote);
  },

  async updateStatus(id: string, status: CreditNote['status']): Promise<CreditNote> {
    return await apiClient.patch<CreditNote>(`/credit-notes/${id}/status`, { status });
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/credit-notes/${id}`);
  },
};
