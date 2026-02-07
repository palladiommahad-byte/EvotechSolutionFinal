/**
 * Delivery Notes Service
 * Handles all API operations for delivery notes and divers documents
 */

import { apiClient } from '@/lib/api-client';

export interface DeliveryNoteItem {
  id: string;
  delivery_note_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface DeliveryNote {
  id: string;
  document_id: string;
  client_id: string | null;
  supplier_id: string | null;
  warehouse_id: string | null;
  date: string;
  subtotal: number;
  status: 'draft' | 'delivered' | 'cancelled';
  note: string | null;
  document_type: 'delivery_note' | 'divers';
  created_at: string;
  updated_at: string;
}

export interface DeliveryNoteWithItems extends DeliveryNote {
  items: DeliveryNoteItem[];
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

export const deliveryNotesService = {
  async getAll(filters?: {
    status?: string;
    clientId?: string;
    supplierId?: string;
    documentType?: 'delivery_note' | 'divers';
    startDate?: string;
    endDate?: string;
  }): Promise<DeliveryNoteWithItems[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.clientId) params.append('clientId', filters.clientId);
      if (filters?.supplierId) params.append('supplierId', filters.supplierId);
      if (filters?.documentType) params.append('documentType', filters.documentType);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const queryString = params.toString();
      return await apiClient.get<DeliveryNoteWithItems[]>(`/delivery-notes${queryString ? `?${queryString}` : ''}`);
    } catch (error) {
      console.error('Error fetching delivery notes:', error);
      return [];
    }
  },

  async getById(id: string): Promise<DeliveryNoteWithItems | null> {
    try {
      return await apiClient.get<DeliveryNoteWithItems>(`/delivery-notes/${id}`);
    } catch (error) {
      console.error('Error fetching delivery note:', error);
      return null;
    }
  },

  async getByDocumentId(documentId: string): Promise<DeliveryNoteWithItems | null> {
    try {
      return await apiClient.get<DeliveryNoteWithItems>(`/delivery-notes/document/${documentId}`);
    } catch (error) {
      console.error('Error fetching delivery note by document ID:', error);
      return null;
    }
  },

  async create(deliveryNote: {
    document_id?: string;
    client_id?: string;
    supplier_id?: string;
    warehouse_id?: string;
    date: string;
    document_type?: 'delivery_note' | 'divers';
    note?: string;
    items: Array<{ product_id?: string; description: string; quantity: number; unit_price: number }>;
  }): Promise<DeliveryNoteWithItems> {
    return await apiClient.post<DeliveryNoteWithItems>('/delivery-notes', deliveryNote);
  },

  async update(id: string, deliveryNote: {
    date?: string;
    status?: DeliveryNote['status'];
    note?: string;
    items?: Array<{ product_id?: string; description: string; quantity: number; unit_price: number }>;
  }): Promise<DeliveryNoteWithItems> {
    return await apiClient.put<DeliveryNoteWithItems>(`/delivery-notes/${id}`, deliveryNote);
  },

  async updateStatus(id: string, status: DeliveryNote['status']): Promise<DeliveryNote> {
    return await apiClient.patch<DeliveryNote>(`/delivery-notes/${id}/status`, { status });
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/delivery-notes/${id}`);
  },
};
