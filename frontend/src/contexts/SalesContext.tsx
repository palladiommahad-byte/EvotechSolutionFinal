/**
 * Sales Context
 * Manages all sales documents (invoices, estimates, delivery notes, credit notes, divers)
 * Unified interface for the Sales page
 */

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesService, InvoiceWithItems } from '@/services/invoices.service';
import { estimatesService, EstimateWithItems } from '@/services/estimates.service';
import { deliveryNotesService, DeliveryNoteWithItems } from '@/services/delivery-notes.service';
import { creditNotesService, CreditNoteWithItems } from '@/services/credit-notes.service';
import { treasuryService } from '@/services/treasury.service';
import { productsService } from '@/services/products.service';
import {
  mapInvoiceStatus,
  mapInvoiceStatusToUI,
  mapEstimateStatus,
  mapEstimateStatusToUI,
  mapDeliveryNoteStatus,
  mapDeliveryNoteStatusToUI,
  mapCreditNoteStatus,
  mapCreditNoteStatusToUI
} from '@/lib/status-mapper';
import { useToast } from '@/hooks/use-toast';
import { UIContact } from './ContactsContext';
import { useProducts } from './ProductsContext';

// UI-friendly Sales Document interface (matches Sales page)
export interface SalesItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SalesDocument {
  id: string; // document_id
  documentId: string; // document_id (alias)
  client: string; // client name or ID
  clientData?: UIContact;
  date: string;
  items: SalesItem[];
  total: number;
  status: string;
  type: 'delivery_note' | 'divers' | 'invoice' | 'estimate' | 'credit_note' | 'statement';
  paymentMethod?: 'cash' | 'check' | 'bank_transfer';
  checkNumber?: string;
  dueDate?: string;
  note?: string;
  taxEnabled?: boolean; // For divers documents
  warehouseId?: string; // For delivery notes and divers
  // Additional fields for internal use
  _internalId?: string; // database ID
}

interface SalesContextType {
  // Documents by type
  invoices: SalesDocument[];
  estimates: SalesDocument[];
  deliveryNotes: SalesDocument[];
  allDeliveryNotes: SalesDocument[];
  divers: SalesDocument[];
  creditNotes: SalesDocument[];

  // Loading state
  isLoading: boolean;

  // CRUD operations
  createInvoice: (data: Omit<SalesDocument, 'id' | 'type'>) => Promise<void>;
  updateInvoice: (id: string, data: Partial<SalesDocument>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;

  createEstimate: (data: Omit<SalesDocument, 'id' | 'type'>) => Promise<void>;
  updateEstimate: (id: string, data: Partial<SalesDocument>) => Promise<void>;
  deleteEstimate: (id: string) => Promise<void>;

  createDeliveryNote: (data: Omit<SalesDocument, 'id' | 'type'>) => Promise<void>;
  updateDeliveryNote: (id: string, data: Partial<SalesDocument>) => Promise<void>;
  deleteDeliveryNote: (id: string) => Promise<void>;

  createDivers: (data: Omit<SalesDocument, 'id' | 'type'>) => Promise<void>;
  updateDivers: (id: string, data: Partial<SalesDocument>) => Promise<void>;
  deleteDivers: (id: string) => Promise<void>;

  createCreditNote: (data: Omit<SalesDocument, 'id' | 'type'>) => Promise<void>;
  updateCreditNote: (id: string, data: Partial<SalesDocument>) => Promise<void>;
  deleteCreditNote: (id: string) => Promise<void>;

  // Refresh data
  refreshAll: () => Promise<void>;
}

const SalesContext = createContext<SalesContextType | undefined>(undefined);

// Helper to convert invoice to SalesDocument
const invoiceToSalesDocument = (invoice: InvoiceWithItems): SalesDocument => {
  const clientData: UIContact | undefined = invoice.client ? {
    id: invoice.client.id,
    name: invoice.client.name,
    company: invoice.client.company || '',
    email: invoice.client.email || '',
    phone: invoice.client.phone || '',
    city: '',
    ice: invoice.client.ice || '',
    ifNumber: invoice.client.if_number || '',
    rc: invoice.client.rc || '',
    status: 'active',
    totalTransactions: 0
  } : undefined;

  return {
    id: invoice.document_id,
    documentId: invoice.document_id,
    client: invoice.client?.name || invoice.client_id,
    clientData,
    date: invoice.date,
    items: invoice.items.map(item => ({
      id: item.id,
      productId: item.product_id || undefined,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      total: item.total,
    })),
    total: invoice.total,
    status: mapInvoiceStatusToUI(invoice.status),
    type: 'invoice',
    paymentMethod: invoice.payment_method || undefined,
    checkNumber: (invoice as any).check_number || (invoice as any).checkNumber || undefined,
    dueDate: invoice.due_date || undefined,
    note: invoice.note || undefined,
    _internalId: invoice.id,
  };
};

// Helper to convert estimate to SalesDocument
const estimateToSalesDocument = (estimate: EstimateWithItems): SalesDocument => {
  const clientData: UIContact | undefined = estimate.client ? {
    id: estimate.client.id,
    name: estimate.client.name,
    company: estimate.client.company || '',
    email: estimate.client.email || '',
    phone: estimate.client.phone || '',
    city: '',
    ice: estimate.client.ice || '',
    ifNumber: estimate.client.if_number || '',
    rc: estimate.client.rc || '',
    status: 'active',
    totalTransactions: 0
  } : undefined;

  return {
    id: estimate.document_id,
    documentId: estimate.document_id,
    client: estimate.client?.name || estimate.client_id,
    clientData,
    date: estimate.date,
    items: estimate.items.map(item => ({
      id: item.id,
      productId: item.product_id || undefined,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      total: item.total,
    })),
    total: estimate.total,
    status: mapEstimateStatusToUI(estimate.status),
    type: 'estimate',
    note: estimate.note || undefined,
    _internalId: estimate.id,
  };
};

// Helper to convert delivery note to SalesDocument
const deliveryNoteToSalesDocument = (deliveryNote: DeliveryNoteWithItems): SalesDocument => {
  const contact = deliveryNote.client || deliveryNote.supplier;
  const clientData: UIContact | undefined = contact ? {
    id: contact.id,
    name: contact.name,
    company: contact.company || '',
    email: contact.email || '',
    phone: contact.phone || '',
    city: '',
    ice: contact.ice || '',
    ifNumber: contact.if_number || '',
    rc: contact.rc || '',
    status: 'active',
    totalTransactions: 0
  } : undefined;

  return {
    id: deliveryNote.document_id,
    documentId: deliveryNote.document_id,
    client: deliveryNote.client?.name || deliveryNote.client_id || deliveryNote.supplier?.name || deliveryNote.supplier_id || '',
    clientData,
    date: deliveryNote.date,
    items: deliveryNote.items.map(item => ({
      id: item.id,
      productId: item.product_id || undefined,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      total: item.total,
    })),
    total: deliveryNote.subtotal, // Delivery notes use subtotal
    status: mapDeliveryNoteStatusToUI(deliveryNote.status),
    type: deliveryNote.document_type === 'divers' ? 'divers' : 'delivery_note',
    note: deliveryNote.note || undefined,
    _internalId: deliveryNote.id,
  };
};

// Helper to convert credit note to SalesDocument
const creditNoteToSalesDocument = (creditNote: CreditNoteWithItems): SalesDocument => {
  const clientData: UIContact | undefined = creditNote.client ? {
    id: creditNote.client.id,
    name: creditNote.client.name,
    company: creditNote.client.company || '',
    email: creditNote.client.email || '',
    phone: creditNote.client.phone || '',
    city: '',
    ice: creditNote.client.ice || '',
    ifNumber: creditNote.client.if_number || '',
    rc: creditNote.client.rc || '',
    status: 'active',
    totalTransactions: 0
  } : undefined;

  return {
    id: creditNote.document_id,
    documentId: creditNote.document_id,
    client: creditNote.client?.name || creditNote.client_id,
    clientData,
    date: creditNote.date,
    items: creditNote.items.map(item => ({
      id: item.id,
      productId: item.product_id || undefined,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      total: item.total,
    })),
    total: creditNote.total,
    status: mapCreditNoteStatusToUI(creditNote.status),
    type: 'credit_note',
    note: creditNote.note || undefined,
    _internalId: creditNote.id,
  };
};

export const SalesProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { validateStockItems } = useProducts();

  // Fetch invoices
  const { data: invoicesData = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['sales', 'invoices'],
    queryFn: () => invoicesService.getAll(),
    staleTime: 30000,
  });

  // Fetch estimates
  const { data: estimatesData = [], isLoading: isLoadingEstimates } = useQuery({
    queryKey: ['sales', 'estimates'],
    queryFn: () => estimatesService.getAll(),
    staleTime: 30000,
  });

  // Fetch delivery notes (includes both delivery_note and divers)
  const { data: deliveryNotesData = [], isLoading: isLoadingDeliveryNotes } = useQuery({
    queryKey: ['sales', 'deliveryNotes'],
    queryFn: () => deliveryNotesService.getAll(),
    staleTime: 30000,
  });

  // Fetch credit notes
  const { data: creditNotesData = [], isLoading: isLoadingCreditNotes } = useQuery({
    queryKey: ['sales', 'creditNotes'],
    queryFn: () => creditNotesService.getAll(),
    staleTime: 30000,
  });

  const isLoading = isLoadingInvoices || isLoadingEstimates || isLoadingDeliveryNotes || isLoadingCreditNotes;

  // Convert to SalesDocument format
  const invoices: SalesDocument[] = useMemo(
    () => invoicesData.map(invoiceToSalesDocument),
    [invoicesData]
  );

  const estimates: SalesDocument[] = useMemo(
    () => estimatesData.map(estimateToSalesDocument),
    [estimatesData]
  );

  const allDeliveryNotes: SalesDocument[] = useMemo(
    () => deliveryNotesData.map(deliveryNoteToSalesDocument),
    [deliveryNotesData]
  );

  const deliveryNotes: SalesDocument[] = useMemo(
    () => allDeliveryNotes.filter(doc => doc.type === 'delivery_note'),
    [allDeliveryNotes]
  );

  const divers: SalesDocument[] = useMemo(
    () => allDeliveryNotes.filter(doc => doc.type === 'divers'),
    [allDeliveryNotes]
  );

  const creditNotes: SalesDocument[] = useMemo(
    () => creditNotesData.map(creditNoteToSalesDocument),
    [creditNotesData]
  );

  // Helper to validate stock before document creation
  const checkStockAvailability = async (items: SalesItem[]) => {
    const { isValid, warnings } = validateStockItems(
      items.map(item => ({ productId: item.productId, quantity: item.quantity }))
    );

    if (!isValid) {
      throw new Error(
        `Insufficient stock for the following items: ${warnings.join(', ')}. Creation blocked to prevent stock falling below minimum levels.`
      );
    }
  };

  // Mutations for invoices
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: Omit<SalesDocument, 'id' | 'type'>) => {
      // Validate stock levels first
      await checkStockAvailability(data.items);

      // Validate and get client UUID
      const clientId = data.clientData?.id || (typeof data.client === 'string' ? data.client : null);

      if (!clientId) {
        throw new Error('Client is required');
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clientId)) {
        throw new Error(`Invalid client ID format. Expected UUID, got: ${clientId}. Please select a valid client from the database.`);
      }

      return invoicesService.create({
        document_id: data.documentId || `FC-${Date.now()}`,
        client_id: clientId,
        date: data.date,
        due_date: data.dueDate,
        payment_method: data.paymentMethod,
        check_number: data.paymentMethod === 'check' ? data.checkNumber : undefined,
        note: data.note,
        items: data.items.map(item => ({
          product_id: item.productId && uuidRegex.test(item.productId) ? item.productId : null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });
    },
    onSuccess: async (invoice: InvoiceWithItems, variables: Omit<SalesDocument, 'id' | 'type'>) => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'invoices'] });

      // Automatically create treasury payment entry for the invoice
      try {
        const clientName = variables.clientData?.company || variables.clientData?.name || variables.client || 'Unknown Client';
        const paymentMethod = variables.paymentMethod || 'cash';
        const checkNumber = paymentMethod === 'check' ? variables.checkNumber : undefined;

        // Determine initial status based on payment method
        let initialStatus: 'in-hand' | 'pending_bank' | 'cleared' = 'in-hand';
        if (paymentMethod === 'bank_transfer') {
          initialStatus = 'pending_bank';
        }

        await treasuryService.createPayment({
          invoice_id: invoice.document_id,
          invoice_number: invoice.document_id,
          entity: clientName,
          amount: invoice.total,
          payment_method: paymentMethod,
          check_number: checkNumber,
          status: initialStatus,
          date: invoice.date,
          payment_type: 'sales',
          notes: `Auto-created from invoice ${invoice.document_id}`,
        });

        // Invalidate treasury queries to refresh the data
        queryClient.invalidateQueries({ queryKey: ['treasury', 'payments'] });
      } catch (treasuryError) {
        // Log error but don't fail the invoice creation
        console.error('Error creating treasury payment entry:', treasuryError);
        // Still show success for invoice creation
      }

      toast({ title: 'Invoice created successfully', variant: 'success' });
    },
    onError: (error: Error) => {
      // Check if it's a duplicate key error
      if (error.message.includes('duplicate key') || error.message.includes('document_id_key')) {
        toast({
          title: 'Error creating invoice',
          description: 'A document with this number already exists. Please try again.',
          variant: 'destructive'
        });
        queryClient.invalidateQueries({ queryKey: ['sales', 'invoices'] });
      } else {
        toast({ title: 'Error creating invoice', description: error.message, variant: 'destructive' });
      }
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalesDocument> }) => {
      const invoice = invoices.find(inv => inv.id === id || inv._internalId === id);
      if (!invoice?._internalId) {
        throw new Error('Invoice not found');
      }
      const paymentMethod = data.paymentMethod ?? invoice.paymentMethod;
      const checkNumber =
        paymentMethod && paymentMethod !== 'check'
          ? null
          : data.checkNumber !== undefined
            ? data.checkNumber
            : invoice.checkNumber;

      const updatedInvoice = await invoicesService.update(invoice._internalId, {
        date: data.date,
        status: data.status ? mapInvoiceStatus(data.status) : undefined,
        payment_method: paymentMethod,
        check_number: checkNumber,
        note: data.note,
        items: data.items?.map(item => ({
          product_id: item.productId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });

      // Sync with treasury payment
      try {
        const existingPayment = await treasuryService.getPaymentByInvoiceNumber(invoice.documentId || invoice.id, 'sales');
        if (existingPayment) {
          // Update treasury payment with new invoice data
          const clientName = data.clientData?.company || data.clientData?.name || invoice.client || 'Unknown Client';
          const paymentMethod = data.paymentMethod || invoice.paymentMethod || existingPayment.paymentMethod || 'cash';
          const checkNumberForTreasury =
            paymentMethod !== 'check'
              ? null
              : data.checkNumber !== undefined
                ? data.checkNumber
                : existingPayment.checkNumber;

          // Map invoice status to treasury payment status
          // Invoice status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          // Treasury payment status: 'in-hand' | 'pending_bank' | 'cleared'
          let paymentStatus: 'in-hand' | 'pending_bank' | 'cleared' = existingPayment.status;

          // Use the updated invoice status from the database response
          const invoiceStatus = updatedInvoice.status;
          if (invoiceStatus === 'paid') {
            // When invoice is marked as paid, mark payment as cleared
            paymentStatus = 'cleared';
          } else if (invoiceStatus === 'sent' || invoiceStatus === 'overdue') {
            // When invoice is sent/overdue, update payment status based on payment method
            if (paymentMethod === 'bank_transfer' && existingPayment.status === 'in-hand') {
              paymentStatus = 'pending_bank';
            }
            // Otherwise keep current status
          } else if (invoiceStatus === 'cancelled') {
            // If cancelled, reset to in-hand
            paymentStatus = 'in-hand';
          } else if (invoiceStatus === 'draft') {
            // If back to draft, keep as in-hand
            paymentStatus = 'in-hand';
          }

          await treasuryService.updatePayment(existingPayment.id, {
            entity: clientName,
            amount: updatedInvoice.total,
            payment_method: paymentMethod,
            check_number: checkNumberForTreasury,
            payment_date: updatedInvoice.date,
            status: paymentStatus,
            notes: `Auto-updated from invoice ${updatedInvoice.document_id} (Status: ${updatedInvoice.status})`,
          });

          queryClient.invalidateQueries({ queryKey: ['treasury', 'payments'] });
        }
      } catch (treasuryError) {
        // Log error but don't fail the invoice update
        console.error('Error updating treasury payment:', treasuryError);
      }

      return updatedInvoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'invoices'] });
      toast({ title: 'Invoice updated successfully', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating invoice', description: error.message, variant: 'destructive' });
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const invoice = invoices.find(inv => inv.id === id || inv._internalId === id);
      if (!invoice?._internalId) {
        throw new Error('Invoice not found');
      }

      const invoiceNumber = invoice.documentId || invoice.id;

      // Delete treasury payment first
      try {
        await treasuryService.deletePaymentByInvoiceNumber(invoiceNumber, 'sales');
        queryClient.invalidateQueries({ queryKey: ['treasury', 'payments'] });
      } catch (treasuryError) {
        // Log error but continue with invoice deletion
        console.error('Error deleting treasury payment:', treasuryError);
      }

      return invoicesService.delete(invoice._internalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'invoices'] });
      toast({ title: 'Invoice deleted successfully', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting invoice', description: error.message, variant: 'destructive' });
    },
  });

  // Mutations for estimates
  const createEstimateMutation = useMutation({
    mutationFn: async (data: Omit<SalesDocument, 'id' | 'type'>) => {
      // Validate stock levels first
      await checkStockAvailability(data.items);

      // Validate and get client UUID
      const clientId = data.clientData?.id || (typeof data.client === 'string' ? data.client : null);

      if (!clientId) {
        throw new Error('Client is required');
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clientId)) {
        throw new Error(`Invalid client ID format. Expected UUID, got: ${clientId}. Please select a valid client from the database.`);
      }

      return estimatesService.create({
        document_id: data.documentId || `DV-${Date.now()}`,
        client_id: clientId,
        date: data.date,
        note: data.note,
        items: data.items.map(item => ({
          product_id: item.productId && uuidRegex.test(item.productId) ? item.productId : null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'estimates'] });
      toast({ title: 'Estimate created successfully', variant: 'success' });
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate key') || error.message.includes('document_id_key')) {
        toast({
          title: 'Error creating estimate',
          description: 'A document with this number already exists. Please try again.',
          variant: 'destructive'
        });
        queryClient.invalidateQueries({ queryKey: ['sales', 'estimates'] });
      } else {
        toast({ title: 'Error creating estimate', description: error.message, variant: 'destructive' });
      }
    },
  });

  const updateEstimateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalesDocument> }) => {
      const estimate = estimates.find(est => est.id === id || est._internalId === id);
      if (!estimate?._internalId) {
        throw new Error('Estimate not found');
      }

      return estimatesService.update(estimate._internalId, {
        date: data.date,
        status: data.status ? mapEstimateStatus(data.status) : undefined,
        note: data.note,
        items: data.items?.map(item => ({
          product_id: item.productId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'estimates'] });
      toast({ title: 'Estimate updated successfully', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating estimate', description: error.message, variant: 'destructive' });
    },
  });

  const deleteEstimateMutation = useMutation({
    mutationFn: async (id: string) => {
      const estimate = estimates.find(est => est.id === id || est._internalId === id);
      if (!estimate?._internalId) {
        throw new Error('Estimate not found');
      }
      return estimatesService.delete(estimate._internalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'estimates'] });
      toast({ title: 'Estimate deleted successfully', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting estimate', description: error.message, variant: 'destructive' });
    },
  });

  // Mutations for delivery notes
  const createDeliveryNoteMutation = useMutation({
    mutationFn: async (data: Omit<SalesDocument, 'id' | 'type'>) => {
      // Validate stock levels first
      await checkStockAvailability(data.items);

      // Validate and get client UUID
      const clientId = data.clientData?.id || (typeof data.client === 'string' ? data.client : null);

      if (!clientId) {
        throw new Error('Client is required');
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clientId)) {
        throw new Error(`Invalid client ID format. Expected UUID, got: ${clientId}. Please select a valid client from the database.`);
      }

      return deliveryNotesService.create({
        document_id: data.documentId || `BL-${Date.now()}`,
        client_id: clientId,
        date: data.date,
        document_type: 'delivery_note',
        note: data.note,
        warehouse_id: data.warehouseId,
        items: data.items.map(item => ({
          product_id: item.productId && uuidRegex.test(item.productId) ? item.productId : null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'deliveryNotes'] });
      // Invalidate products and stock items to reflect stock changes
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stockItems'] });
      toast({ title: 'Delivery note created successfully', variant: 'success' });
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate key') || error.message.includes('document_id_key')) {
        toast({
          title: 'Error creating delivery note',
          description: 'A document with this number already exists. Please try again.',
          variant: 'destructive'
        });
        queryClient.invalidateQueries({ queryKey: ['sales', 'deliveryNotes'] });
      } else {
        toast({ title: 'Error creating delivery note', description: error.message, variant: 'destructive' });
      }
    },
  });

  const updateDeliveryNoteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalesDocument> }) => {
      const deliveryNote = deliveryNotes.find(dn => dn.id === id || dn._internalId === id);
      if (!deliveryNote?._internalId) {
        throw new Error('Delivery note not found');
      }

      return deliveryNotesService.update(deliveryNote._internalId, {
        date: data.date,
        status: data.status ? mapDeliveryNoteStatus(data.status) : undefined,
        note: data.note,
        items: data.items?.map(item => ({
          product_id: item.productId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'deliveryNotes'] });
      // Invalidate products and stock items to reflect stock changes
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stockItems'] });
      toast({ title: 'Delivery note updated successfully', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating delivery note', description: error.message, variant: 'destructive' });
    },
  });

  const deleteDeliveryNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const deliveryNote = deliveryNotes.find(dn => dn.id === id || dn._internalId === id);
      if (!deliveryNote?._internalId) {
        throw new Error('Delivery note not found');
      }
      return deliveryNotesService.delete(deliveryNote._internalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'deliveryNotes'] });
      // Invalidate products and stock items to reflect stock changes
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stockItems'] });
      toast({ title: 'Delivery note deleted successfully', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting delivery note', description: error.message, variant: 'destructive' });
    },
  });

  // Mutations for divers (same as delivery notes but with document_type='divers')
  const createDiversMutation = useMutation({
    mutationFn: async (data: Omit<SalesDocument, 'id' | 'type'>) => {
      // Validate stock levels first
      await checkStockAvailability(data.items);

      // Validate and get client UUID
      const clientId = data.clientData?.id || (typeof data.client === 'string' ? data.client : null);

      if (!clientId) {
        throw new Error('Client is required');
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clientId)) {
        throw new Error(`Invalid client ID format. Expected UUID, got: ${clientId}. Please select a valid client from the database.`);
      }

      return deliveryNotesService.create({
        document_id: data.documentId || `BL-${Date.now()}`,
        client_id: clientId,
        date: data.date,
        document_type: 'divers',
        note: data.note,
        warehouse_id: data.warehouseId,
        items: data.items.map(item => ({
          product_id: item.productId && uuidRegex.test(item.productId) ? item.productId : null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'deliveryNotes'] });
      // Invalidate products and stock items to reflect stock changes
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stockItems'] });
      toast({ title: 'Divers document created successfully', variant: 'success' });
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate key') || error.message.includes('document_id_key')) {
        toast({
          title: 'Error creating divers document',
          description: 'A document with this number already exists. Please try again.',
          variant: 'destructive'
        });
        queryClient.invalidateQueries({ queryKey: ['sales', 'deliveryNotes'] });
      } else {
        toast({ title: 'Error creating divers document', description: error.message, variant: 'destructive' });
      }
    },
  });

  const updateDiversMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalesDocument> }) => {
      const diversDoc = divers.find(div => div.id === id || div._internalId === id);
      if (!diversDoc?._internalId) {
        throw new Error('Divers document not found');
      }

      return deliveryNotesService.update(diversDoc._internalId, {
        date: data.date,
        status: data.status ? mapDeliveryNoteStatus(data.status) : undefined,
        note: data.note,
        items: data.items?.map(item => ({
          product_id: item.productId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'deliveryNotes'] });
      // Invalidate products and stock items to reflect stock changes
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stockItems'] });
      toast({ title: 'Divers document updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating divers document', description: error.message, variant: 'destructive' });
    },
  });

  const deleteDiversMutation = useMutation({
    mutationFn: async (id: string) => {
      const diversDoc = divers.find(div => div.id === id || div._internalId === id);
      if (!diversDoc?._internalId) {
        throw new Error('Divers document not found');
      }
      return deliveryNotesService.delete(diversDoc._internalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'deliveryNotes'] });
      // Invalidate products and stock items to reflect stock changes
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stockItems'] });
      toast({ title: 'Divers document deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting divers document', description: error.message, variant: 'destructive' });
    },
  });

  // Mutations for credit notes
  const createCreditNoteMutation = useMutation({
    mutationFn: async (data: Omit<SalesDocument, 'id' | 'type'>) => {
      // Validate and get client UUID
      const clientId = data.clientData?.id || (typeof data.client === 'string' ? data.client : null);

      if (!clientId) {
        throw new Error('Client is required');
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clientId)) {
        throw new Error(`Invalid client ID format. Expected UUID, got: ${clientId}. Please select a valid client from the database.`);
      }

      return creditNotesService.create({
        document_id: data.documentId || `AV-${Date.now()}`,
        client_id: clientId,
        date: data.date,
        note: data.note,
        items: data.items.map(item => ({
          product_id: item.productId && uuidRegex.test(item.productId) ? item.productId : null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'creditNotes'] });
      toast({ title: 'Credit note created successfully' });
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate key') || error.message.includes('document_id_key')) {
        toast({
          title: 'Error creating credit note',
          description: 'A document with this number already exists. Please try again.',
          variant: 'destructive'
        });
        queryClient.invalidateQueries({ queryKey: ['sales', 'creditNotes'] });
      } else {
        toast({ title: 'Error creating credit note', description: error.message, variant: 'destructive' });
      }
    },
  });

  const updateCreditNoteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalesDocument> }) => {
      const creditNote = creditNotes.find(cn => cn.id === id || cn._internalId === id);
      if (!creditNote?._internalId) {
        throw new Error('Credit note not found');
      }

      return creditNotesService.update(creditNote._internalId, {
        date: data.date,
        status: data.status ? mapCreditNoteStatus(data.status) : undefined,
        note: data.note,
        items: data.items?.map(item => ({
          product_id: item.productId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'creditNotes'] });
      toast({ title: 'Credit note updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating credit note', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCreditNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const creditNote = creditNotes.find(cn => cn.id === id || cn._internalId === id);
      if (!creditNote?._internalId) {
        throw new Error('Credit note not found');
      }
      return creditNotesService.delete(creditNote._internalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'creditNotes'] });
      toast({ title: 'Credit note deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting credit note', description: error.message, variant: 'destructive' });
    },
  });

  // Refresh all data
  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['sales', 'invoices'] }),
      queryClient.invalidateQueries({ queryKey: ['sales', 'estimates'] }),
      queryClient.invalidateQueries({ queryKey: ['sales', 'deliveryNotes'] }),
      queryClient.invalidateQueries({ queryKey: ['sales', 'creditNotes'] }),
    ]);
  };

  const value: SalesContextType = {
    invoices,
    estimates,
    deliveryNotes,
    allDeliveryNotes,
    divers,
    creditNotes,
    isLoading,
    createInvoice: async (data) => { await createInvoiceMutation.mutateAsync(data); },
    updateInvoice: async (id, data) => { await updateInvoiceMutation.mutateAsync({ id, data }); },
    deleteInvoice: async (id) => { await deleteInvoiceMutation.mutateAsync(id); },
    createEstimate: async (data) => { await createEstimateMutation.mutateAsync(data); },
    updateEstimate: async (id, data) => { await updateEstimateMutation.mutateAsync({ id, data }); },
    deleteEstimate: async (id) => { await deleteEstimateMutation.mutateAsync(id); },
    createDeliveryNote: async (data) => { await createDeliveryNoteMutation.mutateAsync(data); },
    updateDeliveryNote: async (id, data) => { await updateDeliveryNoteMutation.mutateAsync({ id, data }); },
    deleteDeliveryNote: async (id) => { await deleteDeliveryNoteMutation.mutateAsync(id); },
    createDivers: async (data) => { await createDiversMutation.mutateAsync(data); },
    updateDivers: async (id, data) => { await updateDiversMutation.mutateAsync({ id, data }); },
    deleteDivers: async (id) => { await deleteDiversMutation.mutateAsync(id); },
    createCreditNote: async (data) => { await createCreditNoteMutation.mutateAsync(data); },
    updateCreditNote: async (id, data) => { await updateCreditNoteMutation.mutateAsync({ id, data }); },
    deleteCreditNote: async (id) => { await deleteCreditNoteMutation.mutateAsync(id); },
    refreshAll,
  };

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
};

export const useSales = () => {
  const context = useContext(SalesContext);
  if (context === undefined) {
    throw new Error('useSales must be used within a SalesProvider');
  }
  return context;
};
