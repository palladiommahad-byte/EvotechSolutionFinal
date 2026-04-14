/**
 * Prelevement Service
 * Handles all API operations for prelevements documents
 */

import { apiClient } from '@/lib/api-client';

export interface PrelevementItem {
    id: string;
    prelevement_id: string;
    product_id: string | null;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
}

export interface Prelevement {
    id: string;
    document_id: string;
    client_id: string | null;
    date: string;
    subtotal: number;
    status: 'draft' | 'generated' | 'cancelled';
    note: string | null;
    created_at: string;
    updated_at: string;
}

export interface PrelevementWithItems extends Prelevement {
    items: PrelevementItem[];
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

export const prelevementsService = {
    async getAll(filters?: {
        status?: string;
        clientId?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<PrelevementWithItems[]> {
        try {
            const params = new URLSearchParams();
            if (filters?.status) params.append('status', filters.status);
            if (filters?.clientId) params.append('clientId', filters.clientId);
            if (filters?.startDate) params.append('startDate', filters.startDate);
            if (filters?.endDate) params.append('endDate', filters.endDate);

            const queryString = params.toString();
            return await apiClient.get<PrelevementWithItems[]>(`/prelevements${queryString ? `?${queryString}` : ''}`);
        } catch (error) {
            console.error('Error fetching prelevements:', error);
            return [];
        }
    },

    async getById(id: string): Promise<PrelevementWithItems | null> {
        try {
            return await apiClient.get<PrelevementWithItems>(`/prelevements/${id}`);
        } catch (error) {
            console.error('Error fetching prelevement:', error);
            return null;
        }
    },

    async create(prelevement: {
        document_id?: string;
        client_id?: string;
        date: string;
        note?: string;
        items: Array<{ product_id?: string; description: string; quantity: number; unit_price: number }>;
    }): Promise<PrelevementWithItems> {
        return await apiClient.post<PrelevementWithItems>('/prelevements', prelevement);
    },

    async update(id: string, prelevement: {
        date?: string;
        status?: Prelevement['status'];
        note?: string;
        items?: Array<{ product_id?: string; description: string; quantity: number; unit_price: number }>;
    }): Promise<PrelevementWithItems> {
        return await apiClient.put<PrelevementWithItems>(`/prelevements/${id}`, prelevement);
    },

    async delete(id: string): Promise<void> {
        await apiClient.delete(`/prelevements/${id}`);
    },
};
