/**
 * Purchase Invoices Service
 * Handles all API operations for purchase invoices
 */

import { apiClient } from '@/lib/api-client';

export interface PurchaseInvoiceItem {
  id: string;
  purchase_invoice_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface PurchaseInvoice {
  id: string;
  document_id: string;
  supplier_id: string;
  date: string;
  due_date: string | null;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  payment_method: 'cash' | 'check' | 'bank_transfer' | null;
  check_number: string | null;
  bank_account_id?: string | null;
  status: 'draft' | 'received' | 'paid' | 'overdue' | 'cancelled';
  note: string | null;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseInvoiceWithItems extends PurchaseInvoice {
  items: PurchaseInvoiceItem[];
  supplier?: {
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

export const purchaseInvoicesService = {
  async getAll(filters?: {
    status?: string;
    supplierId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PurchaseInvoiceWithItems[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.supplierId) params.append('supplierId', filters.supplierId);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const queryString = params.toString();
      return await apiClient.get<PurchaseInvoiceWithItems[]>(`/purchase-invoices${queryString ? `?${queryString}` : ''}`);
    } catch (error) {
      console.error('Error fetching purchase invoices:', error);
      return [];
    }
  },

  async getById(id: string): Promise<PurchaseInvoiceWithItems | null> {
    try {
      return await apiClient.get<PurchaseInvoiceWithItems>(`/purchase-invoices/${id}`);
    } catch (error) {
      console.error('Error fetching purchase invoice:', error);
      return null;
    }
  },

  async create(data: {
    document_id: string;
    supplier_id: string;
    date: string;
    due_date?: string;
    subtotal: number;
    vat_rate?: number;
    vat_amount: number;
    total: number;
    payment_method?: 'cash' | 'check' | 'bank_transfer';
    check_number?: string;
    bank_account_id?: string;
    status?: 'draft' | 'received' | 'paid' | 'overdue' | 'cancelled';
    note?: string;
    attachment_url?: string;
    items: Array<{ product_id?: string | null; description: string; quantity: number; unit_price: number }>;
  }): Promise<PurchaseInvoiceWithItems> {
    return await apiClient.post<PurchaseInvoiceWithItems>('/purchase-invoices', data);
  },

  async update(id: string, data: {
    date?: string;
    due_date?: string;
    subtotal?: number;
    vat_rate?: number;
    vat_amount?: number;
    total?: number;
    payment_method?: 'cash' | 'check' | 'bank_transfer';
    check_number?: string;
    bank_account_id?: string;
    status?: 'draft' | 'received' | 'paid' | 'overdue' | 'cancelled';
    note?: string;
    attachment_url?: string;
    items?: Array<{ product_id?: string | null; description: string; quantity: number; unit_price: number }>;
  }): Promise<PurchaseInvoiceWithItems> {
    return await apiClient.put<PurchaseInvoiceWithItems>(`/purchase-invoices/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/purchase-invoices/${id}`);
  },
};
