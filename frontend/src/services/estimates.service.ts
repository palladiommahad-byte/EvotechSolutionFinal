/**
 * Estimates Service
 * Handles all API operations for estimates
 */

import { apiClient } from '@/lib/api-client';

export interface EstimateItem {
  id: string;
  estimate_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Estimate {
  id: string;
  document_id: string;
  client_id: string;
  date: string;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface EstimateWithItems extends Estimate {
  items: EstimateItem[];
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

export const estimatesService = {
  async getAll(filters?: {
    status?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<EstimateWithItems[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.clientId) params.append('clientId', filters.clientId);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const queryString = params.toString();
      return await apiClient.get<EstimateWithItems[]>(`/estimates${queryString ? `?${queryString}` : ''}`);
    } catch (error) {
      console.error('Error fetching estimates:', error);
      return [];
    }
  },

  async getById(id: string): Promise<EstimateWithItems | null> {
    try {
      return await apiClient.get<EstimateWithItems>(`/estimates/${id}`);
    } catch (error) {
      console.error('Error fetching estimate:', error);
      return null;
    }
  },

  async getByDocumentId(documentId: string): Promise<EstimateWithItems | null> {
    try {
      return await apiClient.get<EstimateWithItems>(`/estimates/document/${documentId}`);
    } catch (error) {
      console.error('Error fetching estimate by document ID:', error);
      return null;
    }
  },

  async create(estimate: {
    document_id?: string;
    client_id: string;
    date: string;
    note?: string;
    items: Array<{ product_id?: string; description: string; quantity: number; unit_price: number }>;
  }): Promise<EstimateWithItems> {
    return await apiClient.post<EstimateWithItems>('/estimates', estimate);
  },

  async update(id: string, estimate: {
    date?: string;
    status?: Estimate['status'];
    note?: string;
    items?: Array<{ product_id?: string; description: string; quantity: number; unit_price: number }>;
  }): Promise<EstimateWithItems> {
    return await apiClient.put<EstimateWithItems>(`/estimates/${id}`, estimate);
  },

  async updateStatus(id: string, status: Estimate['status']): Promise<Estimate> {
    return await apiClient.patch<Estimate>(`/estimates/${id}/status`, { status });
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/estimates/${id}`);
  },
};
