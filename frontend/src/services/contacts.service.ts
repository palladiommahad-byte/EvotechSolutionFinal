/**
 * Contacts Service
 * Handles all API operations for contacts (clients and suppliers)
 */

import { apiClient } from '@/lib/api-client';

export interface Contact {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  city?: string;
  address?: string;
  ice?: string;
  if_number?: string;
  ifNumber?: string;
  rc?: string;
  contact_type: 'client' | 'supplier';
  status: 'active' | 'inactive';
  total_transactions?: number;
  totalTransactions?: number;
  created_at?: string;
  updated_at?: string;
}

export const contactsService = {
  /**
   * Get all contacts with optional filters
   */
  async getAll(filters?: {
    contactType?: 'client' | 'supplier';
    status?: 'active' | 'inactive';
    search?: string;
  }): Promise<Contact[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.contactType) params.append('contactType', filters.contactType);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);

      const queryString = params.toString();
      const endpoint = `/contacts${queryString ? `?${queryString}` : ''}`;

      return await apiClient.get<Contact[]>(endpoint);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return [];
    }
  },

  /**
   * Get contact by ID
   */
  async getById(id: string): Promise<Contact | null> {
    try {
      return await apiClient.get<Contact>(`/contacts/${id}`);
    } catch (error) {
      console.error('Error fetching contact:', error);
      return null;
    }
  },

  /**
   * Create a new contact
   */
  async create(contact: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'total_transactions' | 'totalTransactions'>): Promise<Contact> {
    return await apiClient.post<Contact>('/contacts', contact);
  },

  /**
   * Update a contact
   */
  async update(id: string, contact: Partial<Contact>): Promise<Contact> {
    return await apiClient.put<Contact>(`/contacts/${id}`, contact);
  },

  /**
   * Delete a contact
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/contacts/${id}`);
  },

  /**
   * Get clients only
   */
  async getClients(filters?: {
    status?: 'active' | 'inactive';
    search?: string;
  }): Promise<Contact[]> {
    return this.getAll({ ...filters, contactType: 'client' });
  },

  /**
   * Get suppliers only
   */
  async getSuppliers(filters?: {
    status?: 'active' | 'inactive';
    search?: string;
  }): Promise<Contact[]> {
    return this.getAll({ ...filters, contactType: 'supplier' });
  },
};
