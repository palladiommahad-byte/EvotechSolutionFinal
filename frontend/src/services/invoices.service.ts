/**
 * Invoices Service
 * Handles all API operations for invoices and related documents
 */

import { apiClient } from '@/lib/api-client';

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: string;
  document_id: string;
  client_id: string;
  date: string;
  due_date: string | null;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  payment_method: 'cash' | 'check' | 'bank_transfer' | null;
  check_number?: string | null;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
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

export const invoicesService = {
  /**
   * Get all invoices with optional filters
   */
  async getAll(filters?: {
    status?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<InvoiceWithItems[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.clientId) params.append('clientId', filters.clientId);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const queryString = params.toString();
      const endpoint = `/invoices${queryString ? `?${queryString}` : ''}`;

      return await apiClient.get<InvoiceWithItems[]>(endpoint);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  },

  /**
   * Get invoice by ID
   */
  async getById(id: string): Promise<InvoiceWithItems | null> {
    try {
      return await apiClient.get<InvoiceWithItems>(`/invoices/${id}`);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }
  },

  /**
   * Get invoice by document ID
   */
  async getByDocumentId(documentId: string): Promise<InvoiceWithItems | null> {
    try {
      return await apiClient.get<InvoiceWithItems>(`/invoices/document/${documentId}`);
    } catch (error) {
      console.error('Error fetching invoice by document ID:', error);
      return null;
    }
  },

  /**
   * Create a new invoice with items
   */
  async create(invoice: {
    document_id: string;
    client_id: string;
    date: string;
    due_date?: string;
    payment_method?: 'cash' | 'check' | 'bank_transfer';
    check_number?: string;
    note?: string;
    items: Array<{
      product_id?: string;
      description: string;
      quantity: number;
      unit_price: number;
    }>;
  }): Promise<InvoiceWithItems> {
    return await apiClient.post<InvoiceWithItems>('/invoices', invoice);
  },

  /**
   * Update an invoice with items
   */
  async update(id: string, invoice: {
    date?: string;
    due_date?: string;
    payment_method?: 'cash' | 'check' | 'bank_transfer';
    check_number?: string | null;
    status?: Invoice['status'];
    note?: string;
    items?: Array<{
      product_id?: string | null;
      description: string;
      quantity: number;
      unit_price: number;
    }>;
  }): Promise<InvoiceWithItems> {
    return await apiClient.put<InvoiceWithItems>(`/invoices/${id}`, invoice);
  },

  /**
   * Update invoice status
   */
  async updateStatus(id: string, status: Invoice['status']): Promise<Invoice> {
    return await apiClient.patch<Invoice>(`/invoices/${id}/status`, { status });
  },

  /**
   * Delete invoice
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/invoices/${id}`);
  },
};
