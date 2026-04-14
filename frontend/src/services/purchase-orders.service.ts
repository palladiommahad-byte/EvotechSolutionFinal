/**
 * Purchase Orders Service
 * Handles all API operations for purchase orders
 */

import { apiClient } from '@/lib/api-client';

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  document_id: string;
  supplier_id: string;
  date: string;
  subtotal: number;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderWithItems extends PurchaseOrder {
  items: PurchaseOrderItem[];
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

export const purchaseOrdersService = {
  async getAll(filters?: {
    status?: string;
    supplierId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PurchaseOrderWithItems[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.supplierId) params.append('supplierId', filters.supplierId);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const queryString = params.toString();
      return await apiClient.get<PurchaseOrderWithItems[]>(`/purchase-orders${queryString ? `?${queryString}` : ''}`);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      return [];
    }
  },

  async getById(id: string): Promise<PurchaseOrderWithItems | null> {
    try {
      return await apiClient.get<PurchaseOrderWithItems>(`/purchase-orders/${id}`);
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      return null;
    }
  },

  async create(data: {
    document_id?: string;
    supplier_id: string;
    date: string;
    subtotal: number;
    status?: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
    note?: string;
    items: Array<{ product_id?: string | null; description: string; quantity: number; unit_price: number }>;
  }): Promise<PurchaseOrderWithItems> {
    return await apiClient.post<PurchaseOrderWithItems>('/purchase-orders', data);
  },

  async update(id: string, data: {
    date?: string;
    subtotal?: number;
    status?: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
    note?: string;
    items?: Array<{ product_id?: string | null; description: string; quantity: number; unit_price: number }>;
  }): Promise<PurchaseOrderWithItems> {
    return await apiClient.put<PurchaseOrderWithItems>(`/purchase-orders/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/purchase-orders/${id}`);
  },
};
