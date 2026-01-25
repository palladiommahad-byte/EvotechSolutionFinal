import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { contactsService, Contact } from '@/services/contacts.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// UI-friendly Contact interface (camelCase)
export interface UIContact {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  address?: string;
  ice: string;
  ifNumber: string;
  rc: string;
  status: 'active' | 'inactive';
  totalTransactions: number;
}

export interface ContactContextType {
  contacts: UIContact[];
  clients: UIContact[];
  suppliers: UIContact[];
  isLoading: boolean;
  addClient: (client: Omit<UIContact, 'id' | 'totalTransactions'>) => Promise<void>;
  updateClient: (id: string, client: Partial<UIContact>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addSupplier: (supplier: Omit<UIContact, 'id' | 'totalTransactions'>) => Promise<void>;
  updateSupplier: (id: string, supplier: Partial<UIContact>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  getClientById: (id: string) => UIContact | undefined;
  getSupplierById: (id: string) => UIContact | undefined;
  refreshContacts: () => Promise<void>;
}

const ContactsContext = createContext<ContactContextType | undefined>(undefined);

// Helper function to convert Contact to UIContact
const toUIContact = (contact: Contact): UIContact => ({
  id: contact.id,
  name: contact.name,
  company: contact.company || '',
  email: contact.email || '',
  phone: contact.phone || '',
  city: contact.city || '',
  address: contact.address,
  ice: contact.ice || '',
  ifNumber: contact.ifNumber || contact.if_number || '',
  rc: contact.rc || '',
  status: contact.status,
  totalTransactions: contact.totalTransactions || contact.total_transactions || 0,
});

export const ContactsProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();

  // Fetch all contacts
  const { data: contactsData = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => contactsService.getAll(),
    staleTime: 30000, // 30 seconds
  });

  // Convert to UI format and filter
  const contacts: UIContact[] = contactsData.map(toUIContact);
  const clients = contacts.filter(c => {
    const contactData = contactsData.find(ct => ct.id === c.id);
    return contactData?.contact_type === 'client';
  });
  const suppliers = contacts.filter(c => {
    const contactData = contactsData.find(ct => ct.id === c.id);
    return contactData?.contact_type === 'supplier';
  });

  // Mutation for adding a contact
  const addMutation = useMutation({
    mutationFn: (contact: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'total_transactions' | 'totalTransactions'>) =>
      contactsService.create(contact),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Mutation for updating a contact
  const updateMutation = useMutation({
    mutationFn: ({ id, contact }: { id: string; contact: Partial<Contact> }) =>
      contactsService.update(id, contact),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Mutation for deleting a contact
  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  const addClient = useCallback(async (client: Omit<UIContact, 'id' | 'totalTransactions'>) => {
    const contactToCreate: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'total_transactions' | 'totalTransactions'> = {
      ...client,
      contact_type: 'client',
      if_number: client.ifNumber,
      total_transactions: 0,
    };
    await addMutation.mutateAsync(contactToCreate);
  }, [addMutation]);

  const addSupplier = useCallback(async (supplier: Omit<UIContact, 'id' | 'totalTransactions'>) => {
    const contactToCreate: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'total_transactions' | 'totalTransactions'> = {
      ...supplier,
      contact_type: 'supplier',
      if_number: supplier.ifNumber,
      total_transactions: 0,
    };
    await addMutation.mutateAsync(contactToCreate);
  }, [addMutation]);

  const updateClient = useCallback(async (id: string, client: Partial<UIContact>) => {
    const contactToUpdate: Partial<Contact> = {
      ...client,
      if_number: client.ifNumber,
      total_transactions: client.totalTransactions,
    };
    await updateMutation.mutateAsync({ id, contact: contactToUpdate });
  }, [updateMutation]);

  const updateSupplier = useCallback(async (id: string, supplier: Partial<UIContact>) => {
    const contactToUpdate: Partial<Contact> = {
      ...supplier,
      if_number: supplier.ifNumber,
      total_transactions: supplier.totalTransactions,
    };
    await updateMutation.mutateAsync({ id, contact: contactToUpdate });
  }, [updateMutation]);

  const deleteClient = useCallback(async (id: string) => {
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  const deleteSupplier = useCallback(async (id: string) => {
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  const getClientById = useCallback((id: string) => {
    return clients.find(c => c.id === id);
  }, [clients]);

  const getSupplierById = useCallback((id: string) => {
    return suppliers.find(s => s.id === id);
  }, [suppliers]);

  const refreshContacts = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['contacts'] });
  }, [queryClient]);

  const value: ContactContextType = {
    contacts,
    clients,
    suppliers,
    isLoading,
    addClient,
    updateClient,
    deleteClient,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getClientById,
    getSupplierById,
    refreshContacts,
  };

  return <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>;
};

export const useContacts = () => {
  const context = useContext(ContactsContext);
  if (context === undefined) {
    throw new Error('useContacts must be used within a ContactsProvider');
  }
  return context;
};
