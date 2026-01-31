import React, { useState } from 'react';
import { Plus, Search, TrendingUp, FileText, Download, Users, Package, Receipt, FileCheck, Calculator, Trash2, Send, FileX, Eye, Edit, Check, FileSpreadsheet, ChevronDown, Printer, CheckSquare, ArrowRightLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { cn, formatDate } from '@/lib/utils';
import { ToastAction } from '@/components/ui/toast';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatMAD, VAT_RATE, calculateInvoiceTotals } from '@/lib/moroccan-utils';
import { ProductSearch } from '@/components/ui/product-search';
import { Product } from '@/lib/products';
import { useProducts } from '@/contexts/ProductsContext';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';
import { useContacts, UIContact } from '@/contexts/ContactsContext';
import { useSales } from '@/contexts/SalesContext';
import { useTreasury } from '@/contexts/TreasuryContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { useToast } from '@/hooks/use-toast';
import { generateDocumentNumber } from '@/lib/document-number-generator';
import {
  generateInvoicePDF,
  generateEstimatePDF,
  generateDeliveryNotePDF,
  generateCreditNotePDF,
  generateStatementPDF,
} from '@/lib/pdf-generator';
import {
  generateDocumentExcel,
  generateBulkDocumentsExcel,
} from '@/lib/excel-generator';
import {
  generateDocumentCSV,
  generateBulkDocumentsCSV,
} from '@/lib/csv-generator';

// Local interfaces removed in favor of imports from SalesContext
import { SalesDocument as ContextSalesDocument, SalesItem as ContextSalesItem } from '@/contexts/SalesContext';
type SalesDocument = ContextSalesDocument;
type SalesItem = ContextSalesItem;

// Mock data removed - all data now comes from database via SalesContext

export const Sales = () => {
  const { t } = useTranslation();
  const { clients, getClientById } = useContacts();
  const { products = [] } = useProducts();
  const { companyInfo } = useCompany();
  const { warehouses } = useWarehouse();
  const { toast } = useToast();
  const {
    invoices,
    estimates,
    deliveryNotes,
    allDeliveryNotes,
    divers,
    creditNotes,
    isLoading: isLoadingSales,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    createEstimate,
    updateEstimate,
    deleteEstimate,
    createDeliveryNote,
    updateDeliveryNote,
    deleteDeliveryNote,
    createDivers,
    updateDivers,
    deleteDivers,
    createCreditNote,
    updateCreditNote,
    deleteCreditNote,
  } = useSales();

  // Get bank accounts from Treasury context
  const { bankAccounts } = useTreasury();

  // Statements feature removed - no database table yet
  const [documentType, setDocumentType] = useState<'delivery_note' | 'divers' | 'invoice' | 'estimate' | 'credit_note' | 'statement'>('delivery_note');
  const [activeTab, setActiveTab] = useState<'delivery_note' | 'divers' | 'invoice' | 'estimate' | 'credit_note' | 'statement'>('delivery_note');
  const [formTaxEnabled, setFormTaxEnabled] = useState<boolean>(false); // Tax toggle for Divers
  const [items, setItems] = useState<SalesItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 },
  ]);
  const [formClient, setFormClient] = useState('');
  const [formWarehouse, setFormWarehouse] = useState('marrakech');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPaymentMethod, setFormPaymentMethod] = useState<'cash' | 'check' | 'bank_transfer'>('cash');
  const [formBankAccount, setFormBankAccount] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formNote, setFormNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [viewingDocument, setViewingDocument] = useState<SalesDocument | null>(null);
  const [editingDocument, setEditingDocument] = useState<SalesDocument | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<SalesDocument>>({});
  const [deletingDocument, setDeletingDocument] = useState<SalesDocument | null>(null);

  const [highlightedDocId, setHighlightedDocId] = useState<string | null>(null);

  // Tab State Control for Smart Redirection
  const [deliveryNoteTab, setDeliveryNoteTab] = useState("create");
  const [invoiceTab, setInvoiceTab] = useState("create");

  // Helper to find linked document (BL <-> Invoice) based on naming convention
  const findLinkedDocument = (doc: SalesDocument): SalesDocument | undefined => {
    // 1. Try to match by explicit document ID (e.g., BL-123 <-> FC-123)
    let linked: SalesDocument | undefined;

    if (doc.type === 'delivery_note') {
      const idBase = doc.id.replace('BL-', '').replace('FC-', '');
      // Try finding Invoice with FC- prefix
      linked = invoices.find(inv => inv.id === `FC-${idBase}` || inv.documentId === `FC-${idBase}`);

      // Fallback: Check if there's an invoice explicitly linked in DB (if we had that field in frontend model)
      // Since we don't strictly have the new column in frontend types yet, trust the ID convention first
    } else if (doc.type === 'invoice') {
      const idBase = doc.id.replace('FC-', '').replace('BL-', '');
      linked = deliveryNotes.find(bl => bl.id === `BL-${idBase}` || bl.documentId === `BL-${idBase}`);
    }

    return linked;
  };

  const handleSwitchView = (doc: SalesDocument) => {
    const linkedDoc = findLinkedDocument(doc);
    if (linkedDoc) {
      setActiveTab(linkedDoc.type);
      setDocumentType(linkedDoc.type);

      // Smart Redirection: Switch inner tab to list
      if (linkedDoc.type === 'delivery_note') {
        setDeliveryNoteTab('list');
      } else if (linkedDoc.type === 'invoice') {
        setInvoiceTab('list');
      }

      // Smart Redirection: Filter to show only this document
      setSearchQuery(linkedDoc.id);

      // Visual Highlight: Trigger glow effect
      setHighlightedDocId(linkedDoc.id);
      setTimeout(() => setHighlightedDocId(null), 2000); // Clear after animation

      toast({
        title: "Switched View",
        description: `Navigated to ${linkedDoc.type === 'invoice' ? 'Invoice' : 'Delivery Note'} ${linkedDoc.id}`,
      });
    } else {
      toast({
        title: "Not Found",
        description: "Linked document not found.",
        variant: "destructive"
      });
    }
  };

  // Helper to get current documents based on activeTab
  const getCurrentDocuments = (): SalesDocument[] => {
    switch (activeTab) {
      case 'delivery_note':
        return deliveryNotes;
      case 'divers':
        return divers;
      case 'invoice':
        return invoices;
      case 'estimate':
        return estimates;
      case 'credit_note':
        return creditNotes;
      case 'statement':
        return []; // Statements not implemented yet
      default:
        return [];
    }
  };

  const toggleDocumentSelection = (docId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocuments(newSelected);
  };

  const handleDeleteDocument = (doc: SalesDocument) => {
    setDeletingDocument(doc);
  };

  const confirmDeleteDocument = async () => {
    if (!deletingDocument) return;

    const documentTypeNames: Record<string, string> = {
      'delivery_note': 'Delivery Note',
      'divers': 'Divers',
      'invoice': 'Invoice',
      'estimate': 'Estimate',
      'credit_note': 'Credit Note',
      'statement': 'Statement',
    };

    try {
      // Delete from database (except statements which are mock)
      switch (deletingDocument.type) {
        case 'delivery_note':
          await deleteDeliveryNote(deletingDocument.id);
          break;
        case 'divers':
          await deleteDivers(deletingDocument.id);
          break;
        case 'invoice':
          await deleteInvoice(deletingDocument.id);
          break;
        case 'estimate':
          await deleteEstimate(deletingDocument.id);
          break;
        case 'credit_note':
          await deleteCreditNote(deletingDocument.id);
          break;
        case 'statement':
          // Statements feature not implemented
          break;
          break;
      }

      setSelectedDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(deletingDocument.id);
        return newSet;
      });

      const docTypeName = documentTypeNames[deletingDocument.type] || 'Document';
      setDeletingDocument(null);
    } catch (error) {
      console.error('Error deleting document:', error);
      // Error toast is handled by the context
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocuments.size === 0) return;

    const documentTypeNames: Record<string, string> = {
      'delivery_note': 'Delivery Notes',
      'divers': 'Divers',
      'invoice': 'Invoices',
      'estimate': 'Estimates',
      'credit_note': 'Credit Notes',
      'statement': 'Statements',
    };

    try {
      const documentsToDelete = getCurrentDocuments().filter(d => selectedDocuments.has(d.id));

      // Delete all selected documents
      await Promise.all(
        documentsToDelete.map(async (doc) => {
          switch (doc.type) {
            case 'delivery_note':
              await deleteDeliveryNote(doc.id);
              break;
            case 'divers':
              await deleteDivers(doc.id);
              break;
            case 'invoice':
              await deleteInvoice(doc.id);
              break;
            case 'estimate':
              await deleteEstimate(doc.id);
              break;
            case 'credit_note':
              await deleteCreditNote(doc.id);
              break;
            case 'statement':
              // Statements feature not implemented
              break;
              break;
          }
        })
      );

      const count = selectedDocuments.size;
      const docTypeName = documentTypeNames[activeTab] || 'Documents';
      setSelectedDocuments(new Set());

      toast({
        title: "Documents Deleted",
        description: `${count} ${docTypeName} have been deleted successfully.`,
        variant: "destructive",
      });
    } catch (error) {
      console.error('Error deleting documents:', error);
      // Error toast is handled by the context
    }
  };

  // Format document ID with French prefix based on document type
  const formatDocumentId = (id: string, docType: string): string => {
    // If ID already has a standard prefix (PREFIX-MM/YY/NNNN), return as is
    if (id.match(/^[A-Z]{2,3}-\d{2}\/\d{2}\/\d{4}$/)) {
      return id;
    }

    const prefixes: Record<string, string> = {
      invoice: 'FC',
      estimate: 'DV',
      delivery_note: 'BL',
      divers: 'BL',
      credit_note: 'AV',
      statement: 'RL',
    };

    // Replace English database prefixes with French ones for legacy support
    if (id.startsWith('INV-')) return id.replace('INV-', 'FC-');
    if (id.startsWith('EST-')) return id.replace('EST-', 'DV-');
    if (id.startsWith('DN-')) return id.replace('DN-', 'BL-');
    if (id.startsWith('DIV-')) return id.replace('DIV-', 'BL-');
    if (id.startsWith('CN-')) return id.replace('CN-', 'AV-');
    if (id.startsWith('ST-')) return id.replace('ST-', 'RL-');

    const prefix = prefixes[docType] || 'DOC';

    // If ID already has any uppercase prefix, return as is
    if (id.match(/^[A-Z]{2,4}-/)) {
      return id;
    }

    // Otherwise, add the prefix
    return `${prefix}-${id}`;
  };

  // Get client display name from document
  const getClientDisplayName = (doc: SalesDocument): string => {
    if (doc.clientData) {
      return doc.clientData.company || doc.clientData.name || doc.client || 'Unknown Client';
    }
    // Fallback: try to look up from contacts
    const client = clients.find(c => c.id === doc.client);
    return client ? (client.company || client.name) : doc.client || 'Unknown Client';
  };

  const handleViewDocument = (doc: SalesDocument) => {
    setViewingDocument(doc);
  };

  const handleEditDocument = (doc: SalesDocument) => {
    setEditingDocument(doc);
    setEditFormData({
      client: doc.client,
      date: doc.date,
      status: doc.status,
      paymentMethod: doc.paymentMethod,
      checkNumber: doc.checkNumber,
      taxEnabled: doc.taxEnabled,
    });
  };

  const handleSaveDocument = async () => {
    if (!editingDocument) return;

    try {
      const resolvedPaymentMethod = editFormData.paymentMethod || editingDocument.paymentMethod;
      const updateData: Partial<SalesDocument> = {
        ...editFormData,
        checkNumber: resolvedPaymentMethod === 'check' ? editFormData.checkNumber : '',
      };

      // Update in database (except statements which are mock)
      switch (editingDocument.type) {
        case 'delivery_note':
          await updateDeliveryNote(editingDocument.id, updateData);
          break;
        case 'divers':
          await updateDivers(editingDocument.id, updateData);
          break;
        case 'invoice':
          await updateInvoice(editingDocument.id, updateData);
          break;
        case 'estimate':
          await updateEstimate(editingDocument.id, updateData);
          break;
        case 'credit_note':
          await updateCreditNote(editingDocument.id, updateData);
          break;
        case 'statement':
          // Statements feature not implemented
          break;
          break;
      }

      setEditingDocument(null);
      setEditFormData({});
    } catch (error) {
      console.error('Error updating document:', error);
      // Error toast is handled by the context
    }
  };

  const handleDownloadPDF = async (doc: SalesDocument & { items?: any }) => {
    try {
      const docType = doc.type || activeTab;

      // If clientData is missing, try to find it from CRM using client ID
      let docWithClientData = { ...doc };
      if (!docWithClientData.clientData && docWithClientData.client) {
        console.log('Looking up client:', docWithClientData.client);
        console.log('Available clients:', clients.length);
        // Try to find client by ID (client field stores the UUID)
        const foundClient = clients.find(c => c.id === docWithClientData.client);
        if (foundClient) {
          console.log('Found client:', foundClient.company || foundClient.name);
          docWithClientData.clientData = foundClient;
        } else {
          console.warn('Client not found in CRM. Client ID:', docWithClientData.client);
        }
      } else if (docWithClientData.clientData) {
        console.log('Client data already present:', docWithClientData.clientData.company || docWithClientData.clientData.name);
      }

      // Prepare document data with items if available
      const docWithItems = {
        ...docWithClientData,
        items: docWithClientData.items || (typeof docWithClientData.items === 'number' ? docWithClientData.items : 0),
      };

      console.log('Passing to PDF generator:', {
        hasClientData: !!docWithItems.clientData,
        clientDataName: docWithItems.clientData?.company || docWithItems.clientData?.name,
        clientField: docWithItems.client
      });

      switch (docType) {
        case 'invoice':
          await generateInvoicePDF({ ...docWithItems as any, companyInfo });
          break;
        case 'estimate':
          await generateEstimatePDF({ ...docWithItems as any, companyInfo });
          break;
        case 'delivery_note':
          await generateDeliveryNotePDF({ ...docWithItems as any, companyInfo });
          break;
        case 'divers':
          await generateDeliveryNotePDF({ ...docWithItems as any, companyInfo }); // Use delivery note PDF format for divers
          break;
        case 'credit_note':
          generateCreditNotePDF(doc);
          break;
        case 'statement':
          generateStatementPDF(doc);
          break;
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please check the console for details.');
    }
  };

  const handlePrintPDF = async (doc: SalesDocument & { items?: any }) => {
    try {
      const docType = doc.type || activeTab;

      // If clientData is missing, try to find it from CRM using client ID
      let docWithClientData = { ...doc };
      if (!docWithClientData.clientData && docWithClientData.client) {
        // Try to find client by ID (client field stores the UUID)
        const foundClient = clients.find(c => c.id === docWithClientData.client);
        if (foundClient) {
          docWithClientData.clientData = foundClient;
        }
      }

      // Prepare document data with items if available
      const docWithItems = {
        ...docWithClientData,
        items: Array.isArray(docWithClientData.items) ? docWithClientData.items : [],
      };

      // Generate PDF using the same system as download
      const { pdf } = await import('@react-pdf/renderer');
      const React = await import('react');
      const { DocumentPDFTemplate } = await import('@/components/documents/DocumentPDFTemplate');

      const items = Array.isArray(docWithItems.items)
        ? docWithItems.items
        : []; // Use actual items from document, no mock items

      // Create PDF document using company info from context
      const pdfDoc = React.createElement(DocumentPDFTemplate, {
        type: docType as any,
        documentId: docWithItems.id,
        date: docWithItems.date,
        client: docWithItems.client,
        clientData: docWithItems.clientData,
        items: items,
        paymentMethod: docWithItems.paymentMethod as 'cash' | 'check' | 'bank_transfer' | undefined,
        dueDate: docWithItems.dueDate,
        note: docWithItems.note,
        companyInfo: companyInfo as any,
      });

      // Generate PDF blob
      const blob = await pdf(pdfDoc).toBlob();
      const url = URL.createObjectURL(blob);

      // Open PDF in new window and trigger print dialog
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }, 500);
        };
      } else {
        // Fallback: download if popup blocked
        const link = document.createElement('a');
        link.href = url;
        link.download = `${docType}_${docWithItems.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({
          title: "PDF Ready",
          description: "PDF downloaded. Please open and print manually.",
        });
      }
    } catch (error) {
      console.error('Error printing PDF:', error);
      toast({
        title: "Print Error",
        description: "Error generating PDF for printing. Please try downloading instead.",
        variant: "destructive",
      });
    }
  };

  const handleBulkExportPDF = async () => {
    const currentDocuments = getCurrentDocuments();
    const documentsToExport = currentDocuments.filter(doc => selectedDocuments.has(doc.id));
    for (let i = 0; i < documentsToExport.length; i++) {
      await handleDownloadPDF(documentsToExport[i]);
      // Small delay between exports
      if (i < documentsToExport.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const handleDownloadExcel = (doc: SalesDocument) => {
    const docType = doc.type || activeTab;
    const itemsCount = Array.isArray(doc.items) ? doc.items.length : (doc.items || 0);
    generateDocumentExcel({ ...doc, items: itemsCount }, docType);
  };

  const handleBulkExportExcel = () => {
    const documentsToExport = filteredDocuments.filter(doc => selectedDocuments.has(doc.id));
    if (documentsToExport.length > 0) {
      const mappedDocs = documentsToExport.map(doc => ({
        ...doc,
        items: Array.isArray(doc.items) ? doc.items.length : (doc.items || 0)
      }));
      generateBulkDocumentsExcel(mappedDocs, activeTab);
    }
  };

  const handleDownloadCSV = (doc: SalesDocument) => {
    const docType = doc.type || activeTab;
    const itemsCount = Array.isArray(doc.items) ? doc.items.length : (doc.items || 0);
    generateDocumentCSV({ ...doc, items: itemsCount }, docType);
  };

  const handleBulkExportCSV = () => {
    const documentsToExport = filteredDocuments.filter(doc => selectedDocuments.has(doc.id));
    if (documentsToExport.length > 0) {
      const mappedDocs = documentsToExport.map(doc => ({
        ...doc,
        items: Array.isArray(doc.items) ? doc.items.length : (doc.items || 0)
      }));
      generateBulkDocumentsCSV(mappedDocs, activeTab);
    }
  };

  const handleTabChange = (value: string) => {
    const tabValue = value as 'delivery_note' | 'divers' | 'invoice' | 'estimate' | 'credit_note' | 'statement';
    setActiveTab(tabValue);
    setDocumentType(tabValue);
    setSelectedDocuments(new Set()); // Clear selection when switching tabs
    setFormTaxEnabled(false); // Reset tax toggle when switching tabs
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof SalesItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Round to 2 decimal places to avoid floating point precision issues
        updated.total = Math.round((updated.quantity * updated.unitPrice) * 100) / 100;
        return updated;
      }
      return item;
    }));
  };

  const handleProductSelect = (itemId: string, product: Product | null) => {
    if (product) {
      setItems(items.map(item => {
        if (item.id === itemId) {
          const updated = {
            ...item,
            productId: product.id,
            description: product.name,
            unitPrice: product.price,
          };
          // Round to 2 decimal places to avoid floating point precision issues
          updated.total = Math.round((updated.quantity * updated.unitPrice) * 100) / 100;
          return updated;
        }
        return item;
      }));
    } else {
      setItems(items.map(item => {
        if (item.id === itemId) {
          return { ...item, productId: undefined };
        }
        return item;
      }));
    }
  };

  const totals = calculateInvoiceTotals(items);

  const handleCreateDocument = async () => {
    if (items.length === 0 || items.every(item => !item.description || item.quantity === 0 || item.unitPrice === 0)) {
      alert('Please add at least one valid line item before creating the document.');
      return;
    }

    if (!formClient) {
      alert('Please select a client.');
      return;
    }

    // Get full client data from CRM
    const clientData = getClientById(formClient);
    if (!clientData) {
      alert('Client not found. Please select a valid client.');
      return;
    }

    // Generate unique document number using client-side generator with all existing documents
    // This ensures uniqueness by checking against all documents in state
    const allExistingDocuments = [
      ...allDeliveryNotes,
      ...invoices,
      ...estimates,
      ...creditNotes,
    ];

    let documentNumber: string;
    try {
      const { generateDocumentNumberFromDB } = await import('@/lib/document-number-service');
      documentNumber = await generateDocumentNumberFromDB(
        documentType === 'invoice' ? 'invoice' :
          documentType === 'estimate' ? 'estimate' :
            documentType === 'delivery_note' ? 'delivery_note' :
              documentType === 'divers' ? 'divers' :
                documentType === 'credit_note' ? 'credit_note' :
                  'statement',
        allExistingDocuments,
        formDate
      );
    } catch (error) {
      console.warn('Failed to generate document number, using fallback:', error);
      // Fallback to direct generator call
      documentNumber = generateDocumentNumber(
        documentType === 'invoice' ? 'invoice' :
          documentType === 'estimate' ? 'estimate' :
            documentType === 'delivery_note' ? 'delivery_note' :
              documentType === 'divers' ? 'divers' :
                documentType === 'credit_note' ? 'credit_note' :
                  'statement',
        allExistingDocuments,
        formDate
      );
    }

    // Calculate total based on document type and tax settings
    let documentTotal: number;
    if (documentType === 'invoice' || documentType === 'estimate') {
      documentTotal = totals.total; // Always includes tax
    } else if (documentType === 'divers') {
      documentTotal = formTaxEnabled ? totals.total : totals.subtotal; // Tax optional
    } else {
      documentTotal = totals.subtotal; // No tax
    }

    try {
      const newDocumentData: any = { // Use any to bypass strict type mismatch with Context types
        documentId: documentNumber,
        client: clientData.id,
        clientData: {
          id: clientData.id,
          name: clientData.name,
          company: clientData.company || '',
          email: clientData.email || '',
          phone: clientData.phone || '',
          // Use UIContact properties
          city: clientData.city || '',
          address: clientData.address || '',
          ice: clientData.ice || '',
          ifNumber: clientData.ifNumber || (clientData as any).if_number || '', // Handle both cases safely
          rc: clientData.rc || '',
          status: clientData.status || 'active',
          totalTransactions: clientData.totalTransactions || 0,
        },
        date: formDate,
        items: items.map(item => ({
          id: item.id,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
        total: documentTotal,
        status: 'draft',
        paymentMethod: documentType === 'invoice' ? formPaymentMethod : undefined,
        bankAccountId: (documentType === 'invoice' && formBankAccount) ? formBankAccount : undefined,
        dueDate: formDueDate || undefined,
        note: formNote || undefined,
        taxEnabled: documentType === 'divers' ? formTaxEnabled : undefined,
        warehouseId: formWarehouse,
      };

      // Create in database (except statements which are mock)
      switch (documentType) {
        case 'delivery_note':
          await createDeliveryNote(newDocumentData);
          break;
        case 'divers':
          await createDivers(newDocumentData);
          break;
        case 'invoice':
          await createInvoice(newDocumentData);
          break;
        case 'estimate':
          await createEstimate(newDocumentData);
          break;
        case 'credit_note':
          await createCreditNote(newDocumentData);
          break;
        case 'statement':
          // Statements feature not implemented yet
          toast({
            title: t('common.featureNotAvailable'),
            description: t('documents.statementsFeatureSoon'),
            variant: "destructive",
          });
          break;
      }

      // Reset form
      setItems([{ id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }]);
      setFormClient('');
      setFormDate(new Date().toISOString().split('T')[0]);
      setFormPaymentMethod('cash');
      setFormBankAccount('');
      setFormDueDate('');
      setFormNote('');
      setFormTaxEnabled(false);

      const documentTypeNames: Record<string, string> = {
        'delivery_note': 'Delivery Note',
        'divers': 'Divers',
        'invoice': 'Invoice',
        'estimate': 'Estimate',
        'credit_note': 'Credit Note',
        'statement': 'Statement',
      };

      toast({
        title: "Document Created",
        description: `${documentTypeNames[documentType] || 'Document'} "${documentNumber}" has been created successfully.`,
        variant: "success",
      });
    } catch (error) {
      console.error('Error creating document:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Check if it's a stock validation error
      if (errorMessage.includes('Insufficient stock')) {
        toast({
          title: "Stock Validation Error",
          description: errorMessage,
          variant: "destructive",
          duration: Infinity, // Persistent
          action: <ToastAction altText="OK">OK</ToastAction>,
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to create document: ${errorMessage}`,
          variant: "destructive",
        });
      }
    }
  };

  const handlePreviewPDF = async () => {
    if (!formClient) {
      alert('Please select a client.');
      return;
    }

    // Get full client data from CRM
    const clientData = getClientById(formClient);

    // Calculate total based on document type and tax settings
    let previewTotal: number;
    if (documentType === 'invoice' || documentType === 'estimate') {
      previewTotal = totals.total; // Always includes tax
    } else if (documentType === 'divers') {
      previewTotal = formTaxEnabled ? totals.total : totals.subtotal; // Tax optional
    } else {
      previewTotal = totals.subtotal; // No tax
    }

    const previewDocument: SalesDocument & { items?: any } = {
      id: 'PREVIEW',
      documentId: 'PREVIEW',
      client: clientData?.company || clientData?.name || formClient,
      clientData: clientData,
      date: formDate,
      items: items,
      total: previewTotal,
      status: 'draft',
      type: documentType,
      paymentMethod: documentType === 'invoice' ? formPaymentMethod : undefined,
      dueDate: formDueDate || undefined,
      note: formNote || undefined,
      taxEnabled: documentType === 'divers' ? formTaxEnabled : undefined,
    };

    await handleDownloadPDF(previewDocument);
  };

  const getDocumentTitle = () => {
    switch (documentType) {
      case 'delivery_note': return t('documents.deliveryNote');
      case 'divers': return t('documents.divers');
      case 'invoice': return t('documents.invoice');
      case 'estimate': return t('documents.estimate');
      case 'credit_note': return t('documents.creditNote');
      case 'statement': return t('documents.statement');
    }
  };

  const getDocumentIcon = () => {
    switch (documentType) {
      case 'delivery_note': return <Package className="w-5 h-5 text-primary" />;
      case 'divers': return <FileText className="w-5 h-5 text-primary" />;
      case 'invoice': return <Receipt className="w-5 h-5 text-primary" />;
      case 'estimate': return <FileText className="w-5 h-5 text-primary" />;
      case 'credit_note': return <FileX className="w-5 h-5 text-primary" />;
      case 'statement': return <FileCheck className="w-5 h-5 text-primary" />;
    }
  };

  const formatPaymentMethod = (method?: string) => {
    if (!method) return '-';
    switch (method) {
      case 'cash': return t('paymentMethods.cash');
      case 'check': return t('paymentMethods.check');
      case 'bank_transfer': return t('paymentMethods.bankTransfer');
      default: return method;
    }
  };

  const getStatusBadge = (status: string) => {
    const formatStatus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ');

    switch (status) {
      case 'paid':
        return <StatusBadge status="success">{t('status.paid')}</StatusBadge>;
      case 'delivered':
        return <StatusBadge status="success">{t('status.delivered')}</StatusBadge>;
      case 'approved':
        return <StatusBadge status="success">{t('status.approved')}</StatusBadge>;
      case 'received':
        return <StatusBadge status="success">{t('status.received')}</StatusBadge>;
      case 'current':
        return <StatusBadge status="success">{t('status.current')}</StatusBadge>;
      case 'accepted':
        return <StatusBadge status="success">{t('status.accepted')}</StatusBadge>;

      case 'pending':
        return <StatusBadge status="warning">{t('status.pending')}</StatusBadge>;
      case 'draft':
        return <StatusBadge status="warning">{t('status.draft')}</StatusBadge>;

      case 'in_transit':
        return <StatusBadge status="info">{t('status.inTransit')}</StatusBadge>;
      case 'sent':
        return <StatusBadge status="info">{t('status.sent')}</StatusBadge>;
      case 'shipped':
        return <StatusBadge status="info">{t('status.shipped')}</StatusBadge>;

      case 'overdue':
        return <StatusBadge status="danger">{t('status.overdue')}</StatusBadge>;
      case 'cancelled':
        return <StatusBadge status="danger">{t('status.cancelled')}</StatusBadge>;
      case 'expired':
        return <StatusBadge status="danger">{t('status.expired')}</StatusBadge>;

      default:
        return <StatusBadge status="default">{formatStatus(status)}</StatusBadge>;
    }
  };

  const getAvailableStatuses = (docType: string): string[] => {
    switch (docType) {
      case 'delivery_note':
        return ['pending', 'in_transit', 'delivered', 'cancelled'];
      case 'divers':
        return ['draft', 'sent', 'delivered', 'cancelled'];
      case 'invoice':
        return ['draft', 'pending', 'paid', 'overdue', 'cancelled'];
      case 'estimate':
        return ['draft', 'sent', 'accepted', 'expired', 'cancelled'];
      case 'credit_note':
        return ['draft', 'pending', 'approved', 'cancelled'];
      case 'statement':
        return ['draft', 'current', 'overdue', 'paid'];
      default:
        return [];
    }
  };

  const handleStatusChange = async (docId: string, newStatus: string, docType: string) => {
    try {
      const updateData = { status: newStatus };

      switch (docType) {
        case 'delivery_note':
          await updateDeliveryNote(docId, updateData);
          break;
        case 'divers':
          await updateDivers(docId, updateData);
          break;
        case 'invoice':
          await updateInvoice(docId, updateData);
          break;
        case 'estimate':
          await updateEstimate(docId, updateData);
          break;
        case 'credit_note':
          await updateCreditNote(docId, updateData);
          break;
        case 'statement':
          // Statements feature not implemented
          break;
      }
    } catch (error) {
      console.error('Error updating status:', error);
      // Error toast is handled by the context
    }
  };

  const renderStatusSelect = (doc: SalesDocument) => {
    const availableStatuses = getAvailableStatuses(doc.type);
    return (
      <div className="flex items-center justify-center">
        <Select
          value={doc.status}
          onValueChange={(newStatus) => handleStatusChange(doc.id, newStatus, doc.type)}
        >
          <SelectTrigger className="w-[140px] h-auto py-1 px-2 text-xs border-transparent bg-transparent hover:bg-transparent shadow-none p-0 [&>span]:w-full">
            <div className="w-full flex items-center justify-center">
              {getStatusBadge(doc.status)}
            </div>
          </SelectTrigger>
          <SelectContent>
            {availableStatuses.map((status) => {
              const isSelected = doc.status === status;
              return (
                <SelectItem
                  key={status}
                  value={status}
                  className="cursor-pointer py-2.5 pl-3 pr-8 hover:bg-muted/50 [&>span:first-child]:hidden"
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center flex-1">
                      {getStatusBadge(status)}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const filteredDocuments = getCurrentDocuments().filter(doc => {
    const matchesSearch = doc.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map(doc => doc.id)));
    }
  };

  const totalRevenue = [...invoices, ...deliveryNotes].reduce((sum, o) => {
    const amount = typeof o.total === 'number' ? o.total : parseFloat(o.total as any) || 0;
    return sum + amount;
  }, 0);

  const pendingRevenue = invoices
    .filter(o => o.status !== 'paid')
    .reduce((sum, o) => {
      const amount = typeof o.total === 'number' ? o.total : parseFloat(o.total as any) || 0;
      return sum + amount;
    }, 0);

  // Invoice Statistics Calculations
  const invoiceStats = {
    totalInvoices: invoices.length,
    paidInvoices: invoices.filter(inv => inv.status === 'paid').length,
    unpaidInvoices: invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled').length,
    overdueInvoices: invoices.filter(inv => inv.status === 'overdue').length,
    draftInvoices: invoices.filter(inv => inv.status === 'draft').length,
    cancelledInvoices: invoices.filter(inv => inv.status === 'cancelled').length,
    totalAmount: invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0),
    paidAmount: invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (Number(inv.total) || 0), 0),
    unpaidAmount: invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled').reduce((sum, inv) => sum + (Number(inv.total) || 0), 0),
    overdueAmount: invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + (Number(inv.total) || 0), 0),
    paymentMethodBreakdown: {
      cash: invoices.filter(inv => inv.paymentMethod === 'cash').reduce((sum, inv) => sum + (Number(inv.total) || 0), 0),
      check: invoices.filter(inv => inv.paymentMethod === 'check').reduce((sum, inv) => sum + (Number(inv.total) || 0), 0),
      bank_transfer: invoices.filter(inv => inv.paymentMethod === 'bank_transfer').reduce((sum, inv) => sum + (Number(inv.total) || 0), 0),
    },
    clientBreakdown: invoices.reduce((acc, inv) => {
      const client = inv.client;
      if (!acc[client]) {
        acc[client] = { total: 0, paid: 0, unpaid: 0, count: 0, paidCount: 0, unpaidCount: 0 };
      }
      acc[client].total += (Number(inv.total) || 0);
      acc[client].count += 1;
      if (inv.status === 'paid') {
        acc[client].paid += (Number(inv.total) || 0);
        acc[client].paidCount += 1;
      } else if (inv.status !== 'cancelled') {
        acc[client].unpaid += (Number(inv.total) || 0);
        acc[client].unpaidCount += 1;
      }
      return acc;
    }, {} as Record<string, { total: number; paid: number; unpaid: number; count: number; paidCount: number; unpaidCount: number }>),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">{t('sales.title')}</h1>
          <p className="text-muted-foreground">{t('sales.description')}</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                {t('common.export')}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={async () => {
                try {
                  const token = localStorage.getItem('auth_token');
                  if (!token) {
                    toast({ title: 'Error', description: 'Authentication required', variant: 'destructive' });
                    return;
                  }

                  // Map activeTab to report type
                  let docType = activeTab === 'invoice' ? 'sales-invoice' :
                    activeTab === 'estimate' ? 'sales-estimate' :
                      activeTab === 'delivery_note' ? 'sales-delivery_note' :
                        activeTab === 'divers' ? 'sales-divers' :
                          activeTab === 'credit_note' ? 'sales-credit_note' : 'sales-invoice';

                  const res = await fetch(`http://localhost:3000/api/reports/export?type=${docType}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  });

                  if (!res.ok) throw new Error('Export failed');

                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${docType}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);

                  toast({ title: 'Success', description: 'Report downloaded successfully', variant: 'success' });
                } catch (e) {
                  console.error(e);
                  toast({ title: 'Error', description: 'Failed to download report', variant: 'destructive' });
                }
              }}>
                <FileSpreadsheet className="w-4 h-4 mr-2 text-primary" />
                Styled Export (Beta)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-heading font-bold text-foreground break-words overflow-visible whitespace-normal leading-tight">{formatMAD(totalRevenue)}</p>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground line-clamp-1" title={t('sales.totalRevenue')}>{t('sales.totalRevenue')}</p>
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <FileText className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-heading font-bold text-foreground break-words overflow-visible whitespace-normal leading-tight">{invoices.length}</p>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground line-clamp-1" title={t('documents.invoice')}>{t('documents.invoice')}</p>
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <TrendingUp className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-heading font-bold text-foreground break-words overflow-visible whitespace-normal leading-tight">{formatMAD(pendingRevenue)}</p>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground line-clamp-1" title={t('sales.pendingRevenue')}>{t('sales.pendingRevenue')}</p>
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10">
              <Users className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-heading font-bold text-foreground break-words overflow-visible whitespace-normal leading-tight">
                {new Set([...invoices, ...deliveryNotes, ...estimates].map(o => o.client)).size}
              </p>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground line-clamp-1" title={t('sales.activeClients')}>{t('sales.activeClients')}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-section border border-border rounded-lg grid grid-cols-6 w-full p-1.5 gap-1.5">
          <TabsTrigger
            value="delivery_note"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <Package className="w-4 h-4" />
            {t('documents.deliveryNote')}
          </TabsTrigger>
          <TabsTrigger
            value="divers"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <FileText className="w-4 h-4" />
            {t('documents.divers')}
          </TabsTrigger>
          <TabsTrigger
            value="invoice"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <Receipt className="w-4 h-4" />
            {t('documents.invoice')}
          </TabsTrigger>
          <TabsTrigger
            value="estimate"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <FileText className="w-4 h-4" />
            {t('documents.estimate')}
          </TabsTrigger>
          <TabsTrigger
            value="credit_note"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <FileX className="w-4 h-4" />
            {t('documents.creditNote')}
          </TabsTrigger>
          <TabsTrigger
            value="statement"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <FileCheck className="w-4 h-4" />
            {t('documents.statement')}
          </TabsTrigger>
        </TabsList>

        {/* Delivery Note Tab */}
        <TabsContent value="delivery_note" className="space-y-6">
          <Tabs value={deliveryNoteTab} onValueChange={setDeliveryNoteTab} className="space-y-6">
            <TabsList className="bg-section border border-border rounded-lg p-1.5 gap-1.5">
              <TabsTrigger
                value="create"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                {t('documents.createDeliveryNote')}
              </TabsTrigger>
              <TabsTrigger
                value="list"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <FileText className="w-4 h-4" />
                {t('documents.allDeliveryNotes')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="card-elevated p-6">
                    <h3 className="font-heading font-semibold text-foreground mb-4">Client Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('documents.selectClient')}</Label>
                        <Select value={formClient} onValueChange={setFormClient}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('documents.chooseClient')} />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.company || client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('common.date')}</Label>
                        <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>{documentType === 'divers' ? t('documents.divers') + ' ' + t('documents.documentNumber') : t('documents.deliveryNote') + ' ' + t('documents.documentNumber')}</Label>
                        <Input placeholder={t('common.autoGenerated')} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('documents.inventorySource')} ({t('common.warehouse')})</Label>
                        <Select value={formWarehouse} onValueChange={setFormWarehouse}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('common.selectWarehouse')} />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses.map((w) => (
                              <SelectItem key={w.id} value={w.id}>{w.city} ({w.name})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {documentType === 'divers' ? (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 pt-6">
                            <Checkbox
                              id="divers-tax-enabled-create"
                              checked={formTaxEnabled}
                              onCheckedChange={(checked) => setFormTaxEnabled(checked === true)}
                            />
                            <Label
                              htmlFor="divers-tax-enabled-create"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {t('documents.calculateTax', { rate: VAT_RATE * 100 })}
                            </Label>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label>{t('documents.referenceInvoiceOrder')}</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder={t('documents.linkToOrder')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fc1">FC-01/26/0001</SelectItem>
                              <SelectItem value="fc2">FC-01/26/0002</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {documentType === 'delivery_note' && (
                        <div className="space-y-2 md:col-span-2">
                          <Label>{t('documents.deliveryAddress')}</Label>
                          <Input placeholder={t('documents.clientDeliveryAddress')} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card-elevated p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-heading font-semibold text-foreground">{t('documents.items')}</h3>
                      <Button variant="outline" size="sm" onClick={addItem} className="gap-2">
                        <Plus className="w-4 h-4" />
                        {t('documents.addItem')}
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div key={item.id} className="p-4 border border-border rounded-lg space-y-4 bg-card">
                          <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-5">
                              <Label className="text-xs font-medium mb-1.5 block">{t('documents.productOptional')}</Label>
                              <ProductSearch
                                products={products}
                                value={item.productId}
                                onSelect={(product) => handleProductSelect(item.id, product)}
                                placeholder={t('documents.searchProduct')}
                              />
                            </div>
                            <div className="col-span-7">
                              <Label className="text-xs font-medium mb-1.5 block">{t('common.description')}</Label>
                              <Input
                                placeholder={t('documents.itemDescription')}
                                value={item.description}
                                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                className="w-full"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-12 gap-4 items-end">
                            <div className="col-span-2">
                              <Label className="text-xs font-medium mb-1.5 block">{t('common.quantity')}</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                className="w-full"
                              />
                            </div>
                            <div className="col-span-4">
                              <Label className="text-xs font-medium mb-1.5 block">{t('documents.unitPriceMAD')}</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full"
                              />
                            </div>
                            <div className="col-span-4">
                              <Label className="text-xs font-medium mb-1.5 block">{t('documents.totalMAD')}</Label>
                              <Input value={formatMAD(item.total)} disabled className="w-full font-medium" />
                            </div>
                            <div className="col-span-2 flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10"
                                onClick={() => removeItem(item.id)}
                                disabled={items.length === 1}
                                title={t('documents.removeItem')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Note Section */}
                  <div className="card-elevated p-6">
                    <div className="space-y-2">
                      <Label>{t('documents.noteOptional')}</Label>
                      <Textarea
                        placeholder={t('documents.addNotes')}
                        value={formNote}
                        onChange={(e) => setFormNote(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="card-elevated p-6 sticky top-6">
                    <div className="flex items-center gap-2 mb-4">
                      {documentType === 'delivery_note' ? <Package className="w-5 h-5 text-primary" /> : <FileText className="w-5 h-5 text-primary" />}
                      <h3 className="font-heading font-semibold text-foreground text-lg sm:text-base leading-tight">{t('documents.documentSummary', { documentType: getDocumentTitle() })}</h3>
                    </div>
                    <div className="space-y-3 overflow-visible">
                      <div className="flex justify-between py-2 border-b border-border gap-4 overflow-visible">
                        <span className="text-muted-foreground flex-shrink-0">{t('documents.subtotalHT')}</span>
                        <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
                          <CurrencyDisplay amount={totals.subtotal} />
                        </span>
                      </div>
                      {(documentType === 'divers' && formTaxEnabled) && (
                        <>
                          <div className="flex justify-between py-2 border-b border-border gap-4 overflow-visible">
                            <span className="text-muted-foreground flex-shrink-0">{t('documents.vat')} ({VAT_RATE * 100}%)</span>
                            <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
                              <CurrencyDisplay amount={totals.vat} />
                            </span>
                          </div>
                          <div className="flex justify-between py-3 text-lg gap-4 overflow-visible">
                            <span className="font-semibold text-foreground flex-shrink-0">{t('documents.totalTTC')}</span>
                            <span className="font-heading font-bold text-primary break-words overflow-visible whitespace-normal text-right min-w-0">
                              <CurrencyDisplay amount={totals.total} />
                            </span>
                          </div>
                        </>
                      )}
                      {(!formTaxEnabled || documentType === 'delivery_note') && (
                        <div className="flex justify-between py-3 text-lg gap-4 overflow-visible">
                          <span className="font-semibold text-foreground flex-shrink-0">{t('documents.total')}</span>
                          <span className="font-heading font-bold text-primary break-words overflow-visible whitespace-normal text-right min-w-0">
                            <CurrencyDisplay amount={documentType === 'divers' && formTaxEnabled ? totals.total : totals.subtotal} />
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-6 space-y-2">
                      <Button className="w-full gap-2 btn-primary-gradient" onClick={handleCreateDocument}>
                        <Send className="w-4 h-4" />
                        {documentType === 'divers' ? t('documents.createDivers') : t('documents.createDeliveryNote')}
                      </Button>
                      <Button variant="outline" className="w-full gap-2" onClick={handlePreviewPDF}>
                        <Download className="w-4 h-4" />
                        {t('documents.downloadPDF')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="list" className="animate-fade-in">
              <div className="space-y-4">
                <div className="card-elevated p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={t('documents.searchByClientOrDocument', { entity: t('documents.client') })}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder={t('common.status')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('documents.allStatuses')}</SelectItem>
                        <SelectItem value="in_transit">{t('status.inTransit')}</SelectItem>
                        <SelectItem value="delivered">{t('status.delivered')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedDocuments.size > 0 && (
                  <div className="card-elevated p-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {selectedDocuments.size} document{selectedDocuments.size > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleBulkDelete} className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        Delete Selected
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            Export Selected
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={handleBulkExportPDF} disabled={selectedDocuments.size === 0}>
                            <FileText className="w-4 h-4 mr-2" />
                            Export as PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleBulkExportExcel} disabled={selectedDocuments.size === 0}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Export as Excel
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleBulkExportCSV} disabled={selectedDocuments.size === 0}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Export as CSV
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}

                <div className="card-elevated overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="data-table-header hover:bg-section">
                        <TableHead className="w-[70px] min-w-[70px] px-3 text-center">
                          <div className="flex items-center justify-center w-full">
                            <Checkbox
                              checked={filteredDocuments.length > 0 && selectedDocuments.size === filteredDocuments.length}
                              onCheckedChange={toggleSelectAll}
                              aria-label="Select all"
                            />
                          </div>
                        </TableHead>
                        <TableHead>{t('documents.noteNumber')}</TableHead>
                        <TableHead>{t('documents.client')}</TableHead>
                        <TableHead>{t('common.date')}</TableHead>
                        <TableHead className="text-center">{t('documents.items')}</TableHead>
                        <TableHead className="text-right">{t('documents.totalTTC')}</TableHead>
                        <TableHead className="text-center">{t('common.status')}</TableHead>
                        <TableHead className="text-center">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground" align="center">
                            No documents found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDocuments.map((doc) => (
                          <TableRow
                            key={doc.id}
                            className={cn(
                              "hover:bg-section/50",
                              selectedDocuments.has(doc.id) && "bg-primary/5"
                            )}
                          >
                            <TableCell className="w-[70px] min-w-[70px] px-3 text-center">
                              <div className="flex items-center justify-center w-full">
                                <Checkbox
                                  checked={selectedDocuments.has(doc.id)}
                                  onCheckedChange={() => toggleDocumentSelection(doc.id)}
                                  aria-label={`Select ${doc.id}`}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="font-mono font-medium max-w-[120px] truncate" title={doc.id}>{doc.id}</TableCell>
                            <TableCell className="max-w-[200px] truncate" title={doc.client}>{doc.client}</TableCell>
                            <TableCell className="max-w-[120px] truncate" title={formatDate(doc.date)}>{formatDate(doc.date)}</TableCell>
                            <TableCell className="text-center number-cell">
                              {Array.isArray(doc.items) ? doc.items.length : doc.items}
                            </TableCell>
                            <TableCell className="text-right font-medium number-cell">
                              <CurrencyDisplay amount={doc.total} />
                            </TableCell>
                            <TableCell className="text-center">
                              {renderStatusSelect(doc)}
                            </TableCell>
                            <TableCell className="w-[220px]">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleViewDocument(doc)}
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditDocument(doc)}
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDownloadPDF(doc)}
                                  title="Download PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handlePrintPDF(doc)}
                                  title="Print"
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteDocument(doc)}
                                  title={t('common.delete')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                {findLinkedDocument(doc) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={() => handleSwitchView(doc)}
                                    title="View Associated Invoice"
                                  >
                                    <Receipt className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Divers Tab */}
        <TabsContent value="divers" className="space-y-6">
          <Tabs defaultValue="create" className="space-y-6">
            <TabsList className="bg-section border border-border rounded-lg p-1.5 gap-1.5">
              <TabsTrigger
                value="create"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                {t('documents.createDivers')}
              </TabsTrigger>
              <TabsTrigger
                value="list"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <FileText className="w-4 h-4" />
                {t('documents.allDivers')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="card-elevated p-6">
                    <h3 className="font-heading font-semibold text-foreground mb-4">{t('documents.clientInformation')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('documents.selectClient')}</Label>
                        <Select value={formClient} onValueChange={setFormClient}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('documents.chooseClient')} />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.company || client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('common.date')}</Label>
                        <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('documents.diversNumber')}</Label>
                        <Input placeholder={t('common.autoGenerated')} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Inventory Source ({t('common.warehouse')})</Label>
                        <Select value={formWarehouse} onValueChange={setFormWarehouse}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Warehouse" />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses.map((w) => (
                              <SelectItem key={w.id} value={w.id}>{w.city} ({w.name})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 pt-6">
                          <Checkbox
                            id="divers-tax-enabled"
                            checked={formTaxEnabled}
                            onCheckedChange={(checked) => setFormTaxEnabled(checked === true)}
                          />
                          <Label
                            htmlFor="divers-tax-enabled"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {t('documents.calculateTax', { rate: VAT_RATE * 100 })}
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card-elevated p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-heading font-semibold text-foreground">{t('documents.lineItems')}</h3>
                      <Button variant="outline" size="sm" onClick={addItem} className="gap-2">
                        <Plus className="w-4 h-4" />
                        {t('documents.addItem')}
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div key={item.id} className="p-4 border border-border rounded-lg space-y-4 bg-card">
                          <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-5">
                              <Label className="text-xs font-medium mb-1.5 block">Product (Optional)</Label>
                              <ProductSearch
                                products={products}
                                value={item.productId}
                                onSelect={(product) => handleProductSelect(item.id, product)}
                                placeholder="Search product..."
                              />
                            </div>
                            <div className="col-span-7">
                              <Label className="text-xs font-medium mb-1.5 block">Description</Label>
                              <Input
                                placeholder="Product or service description"
                                value={item.description}
                                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                className="w-full"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-12 gap-4 items-end">
                            <div className="col-span-2">
                              <Label className="text-xs font-medium mb-1.5 block">Quantity</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                className="w-full"
                              />
                            </div>
                            <div className="col-span-4">
                              <Label className="text-xs font-medium mb-1.5 block">Unit Price (MAD)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full"
                              />
                            </div>
                            <div className="col-span-4">
                              <Label className="text-xs font-medium mb-1.5 block">Total (MAD)</Label>
                              <Input value={formatMAD(item.total)} disabled className="w-full font-medium" />
                            </div>
                            <div className="col-span-2 flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10"
                                onClick={() => removeItem(item.id)}
                                disabled={items.length === 1}
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Note Section */}
                  <div className="card-elevated p-6">
                    <div className="space-y-2">
                      <Label>Note (Optional)</Label>
                      <Textarea
                        placeholder="Add any additional notes or comments..."
                        value={formNote}
                        onChange={(e) => setFormNote(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="card-elevated p-6 sticky top-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-primary" />
                      <h3 className="font-heading font-semibold text-foreground">Divers Summary</h3>
                    </div>
                    <div className="space-y-3 overflow-visible">
                      <div className="flex justify-between py-2 border-b border-border gap-4 overflow-visible">
                        <span className="text-muted-foreground flex-shrink-0">Subtotal (HT)</span>
                        <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
                          <CurrencyDisplay amount={totals.subtotal} />
                        </span>
                      </div>
                      {formTaxEnabled && (
                        <>
                          <div className="flex justify-between py-2 border-b border-border gap-4 overflow-visible">
                            <span className="text-muted-foreground flex-shrink-0">TVA ({VAT_RATE * 100}%)</span>
                            <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
                              <CurrencyDisplay amount={totals.vat} />
                            </span>
                          </div>
                          <div className="flex justify-between py-3 text-lg gap-4 overflow-visible">
                            <span className="font-semibold text-foreground flex-shrink-0">Total (TTC)</span>
                            <span className="font-heading font-bold text-primary break-words overflow-visible whitespace-normal text-right min-w-0">
                              <CurrencyDisplay amount={totals.total} />
                            </span>
                          </div>
                        </>
                      )}
                      {!formTaxEnabled && (
                        <div className="flex justify-between py-3 text-lg gap-4 overflow-visible">
                          <span className="font-semibold text-foreground flex-shrink-0">Total</span>
                          <span className="font-heading font-bold text-primary break-words overflow-visible whitespace-normal text-right min-w-0">
                            <CurrencyDisplay amount={totals.subtotal} />
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-6 space-y-2">
                      <Button className="w-full gap-2 btn-primary-gradient" onClick={handleCreateDocument}>
                        <Send className="w-4 h-4" />
                        Create Divers
                      </Button>
                      <Button variant="outline" className="w-full gap-2" onClick={handlePreviewPDF}>
                        <Download className="w-4 h-4" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="list" className="animate-fade-in">
              <div className="space-y-4">
                <div className="card-elevated p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by divers # or client..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedDocuments.size > 0 && (
                  <div className="card-elevated p-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {selectedDocuments.size} document{selectedDocuments.size > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleBulkDelete} className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        Delete Selected
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            Export Selected
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={handleBulkExportPDF} disabled={selectedDocuments.size === 0}>
                            <FileText className="w-4 h-4 mr-2" />
                            Export as PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleBulkExportExcel} disabled={selectedDocuments.size === 0}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Export as Excel
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleBulkExportCSV} disabled={selectedDocuments.size === 0}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Export as CSV
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}

                <div className="card-elevated overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="data-table-header hover:bg-section">
                        <TableHead className="w-[70px] min-w-[70px] px-3 text-center">
                          <div className="flex items-center justify-center w-full">
                            <Checkbox
                              checked={filteredDocuments.length > 0 && selectedDocuments.size === filteredDocuments.length}
                              onCheckedChange={toggleSelectAll}
                              aria-label="Select all"
                            />
                          </div>
                        </TableHead>
                        <TableHead>{t('documents.documentNumber')}</TableHead>
                        <TableHead>{t('documents.client')}</TableHead>
                        <TableHead>{t('common.date')}</TableHead>
                        <TableHead className="text-right">{t('documents.items')}</TableHead>
                        <TableHead className="text-right">{t('documents.totalMAD')}</TableHead>
                        <TableHead className="text-center">{t('common.status')}</TableHead>
                        <TableHead className="text-center">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground" align="center">
                            No documents found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDocuments.map((doc) => (
                          <TableRow
                            key={doc.id}
                            className={cn(
                              "hover:bg-section/50 transition-colors",
                              selectedDocuments.has(doc.id) && "bg-primary/5",
                              highlightedDocId === doc.id && "animate-highlight-glow"
                            )}
                          >
                            <TableCell className="w-[70px] min-w-[70px] px-3 text-center">
                              <div className="flex items-center justify-center w-full">
                                <Checkbox
                                  checked={selectedDocuments.has(doc.id)}
                                  onCheckedChange={() => toggleDocumentSelection(doc.id)}
                                  aria-label={`Select ${doc.id}`}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="font-mono font-medium max-w-[120px] truncate" title={formatDocumentId(doc.id, doc.type)}>{formatDocumentId(doc.id, doc.type)}</TableCell>
                            <TableCell className="max-w-[200px] truncate" title={getClientDisplayName(doc)}>{getClientDisplayName(doc)}</TableCell>
                            <TableCell className="max-w-[120px] truncate" title={formatDate(doc.date)}>{formatDate(doc.date)}</TableCell>
                            <TableCell className="text-right number-cell">
                              {Array.isArray(doc.items) ? doc.items.length : doc.items}
                            </TableCell>
                            <TableCell className="text-right font-medium number-cell">
                              <CurrencyDisplay amount={doc.total} />
                            </TableCell>
                            <TableCell className="text-center">
                              {doc.taxEnabled ? (
                                <span className="text-xs font-medium text-success">Yes</span>
                              ) : (
                                <span className="text-xs font-medium text-muted-foreground">No</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {renderStatusSelect(doc)}
                            </TableCell>
                            <TableCell className="w-[220px]">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleViewDocument(doc)}
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditDocument(doc)}
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDownloadPDF(doc)}
                                  title="Download PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handlePrintPDF(doc)}
                                  title="Print"
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteDocument(doc)}
                                  title={t('common.delete')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                {findLinkedDocument(doc) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                    onClick={() => handleSwitchView(doc)}
                                    title="View Linked Invoice"
                                  >
                                    <ArrowRightLeft className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="invoice" className="space-y-6">
          <Tabs value={invoiceTab} onValueChange={setInvoiceTab} className="space-y-6">
            <TabsList className="bg-section border border-border rounded-lg p-1.5 gap-1.5">
              <TabsTrigger
                value="create"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                {t('documents.createInvoice')}
              </TabsTrigger>
              <TabsTrigger
                value="list"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <FileText className="w-4 h-4" />
                {t('documents.allInvoices')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="card-elevated p-6">
                    <h3 className="font-heading font-semibold text-foreground mb-4">Client Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Select Client</Label>
                        <Select value={formClient} onValueChange={setFormClient}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a client" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.company || client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('documents.invoiceDate')}</Label>
                        <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('documents.invoiceNumber')}</Label>
                        <Input placeholder={t('common.autoGenerated')} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('documents.dueDate')}</Label>
                        <Input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('documents.paymentMethod')}</Label>
                        <Select
                          value={formPaymentMethod}
                          onValueChange={(value) => {
                            const method = value as 'cash' | 'check' | 'bank_transfer';
                            setFormPaymentMethod(method);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('documents.selectPaymentMethod')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">{t('paymentMethods.cash')}</SelectItem>
                            <SelectItem value="check">{t('paymentMethods.check')}</SelectItem>
                            <SelectItem value="bank_transfer">{t('paymentMethods.bankTransfer')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Bank Account Selection - For all payment methods */}
                      <div className="space-y-2">
                        <Label>{t('documents.bankAccount', { defaultValue: 'Bank Account' })}</Label>
                        <Select value={formBankAccount} onValueChange={setFormBankAccount}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('documents.selectBankAccount', { defaultValue: 'Select bank account' })} />
                          </SelectTrigger>
                          <SelectContent>
                            {bankAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.bank} - {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>{t('documents.paymentTerms')}</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder={t('documents.selectPaymentTerms')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="net15">{t('documents.net15')}</SelectItem>
                            <SelectItem value="net30">{t('documents.net30')}</SelectItem>
                            <SelectItem value="net60">{t('documents.net60')}</SelectItem>
                            <SelectItem value="cod">{t('documents.cashOnDelivery')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="card-elevated p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-heading font-semibold text-foreground">{t('documents.invoiceItems')}</h3>
                      <Button variant="outline" size="sm" onClick={addItem} className="gap-2">
                        <Plus className="w-4 h-4" />
                        {t('documents.addItem')}
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div key={item.id} className="p-4 border border-border rounded-lg space-y-4 bg-card">
                          <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-5">
                              <Label className="text-xs font-medium mb-1.5 block">Product (Optional)</Label>
                              <ProductSearch
                                products={products}
                                value={item.productId}
                                onSelect={(product) => handleProductSelect(item.id, product)}
                                placeholder="Search product..."
                              />
                            </div>
                            <div className="col-span-7">
                              <Label className="text-xs font-medium mb-1.5 block">Description</Label>
                              <Input
                                placeholder="Product or service description"
                                value={item.description}
                                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                className="w-full"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-12 gap-4 items-end">
                            <div className="col-span-2">
                              <Label className="text-xs font-medium mb-1.5 block">Quantity</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                className="w-full"
                              />
                            </div>
                            <div className="col-span-4">
                              <Label className="text-xs font-medium mb-1.5 block">Unit Price (MAD)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full"
                              />
                            </div>
                            <div className="col-span-4">
                              <Label className="text-xs font-medium mb-1.5 block">Total (MAD)</Label>
                              <Input value={formatMAD(item.total)} disabled className="w-full font-medium" />
                            </div>
                            <div className="col-span-2 flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10"
                                onClick={() => removeItem(item.id)}
                                disabled={items.length === 1}
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Note Section */}
                  <div className="card-elevated p-6">
                    <div className="space-y-2">
                      <Label>Note (Optional)</Label>
                      <Textarea
                        placeholder="Add any additional notes or comments..."
                        value={formNote}
                        onChange={(e) => setFormNote(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="card-elevated p-6 sticky top-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Receipt className="w-5 h-5 text-primary" />
                      <h3 className="font-heading font-semibold text-foreground">{t('documents.invoiceSummary')}</h3>
                    </div>
                    <div className="space-y-3 overflow-visible">
                      <div className="flex justify-between py-2 border-b border-border gap-4 overflow-visible">
                        <span className="text-muted-foreground flex-shrink-0">{t('documents.subtotalHT')}</span>
                        <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
                          <CurrencyDisplay amount={totals.subtotal} />
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border gap-4 overflow-visible">
                        <span className="text-muted-foreground flex-shrink-0">{t('documents.vat')} ({VAT_RATE * 100}%)</span>
                        <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
                          <CurrencyDisplay amount={totals.vat} />
                        </span>
                      </div>
                      <div className="flex justify-between py-3 text-lg gap-4 overflow-visible">
                        <span className="font-semibold text-foreground flex-shrink-0">{t('documents.totalTTC')}</span>
                        <span className="font-heading font-bold text-primary break-words overflow-visible whitespace-normal text-right min-w-0">
                          <CurrencyDisplay amount={totals.total} />
                        </span>
                      </div>
                    </div>
                    <div className="mt-6 space-y-2">
                      <Button className="w-full gap-2 btn-primary-gradient" onClick={handleCreateDocument}>
                        <Send className="w-4 h-4" />
                        {t('documents.createAndSendInvoice')}
                      </Button>
                      <Button variant="outline" className="w-full gap-2" onClick={handlePreviewPDF}>
                        <Download className="w-4 h-4" />
                        {t('documents.downloadPDF')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="list" className="animate-fade-in">
              <div className="space-y-4">
                <div className="card-elevated p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={t('documents.searchByInvoiceOrClient')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder={t('common.status')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('documents.allStatus')}</SelectItem>
                        <SelectItem value="pending">{t('status.pending')}</SelectItem>
                        <SelectItem value="paid">{t('status.paid')}</SelectItem>
                        <SelectItem value="overdue">{t('status.overdue')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedDocuments.size > 0 && (
                  <div className="card-elevated p-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {selectedDocuments.size} document{selectedDocuments.size > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleBulkDelete} className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        Delete Selected
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            Export Selected
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={handleBulkExportPDF} disabled={selectedDocuments.size === 0}>
                            <FileText className="w-4 h-4 mr-2" />
                            Export as PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleBulkExportExcel} disabled={selectedDocuments.size === 0}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Export as Excel
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleBulkExportCSV} disabled={selectedDocuments.size === 0}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Export as CSV
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}

                <div className="card-elevated overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="data-table-header hover:bg-section">
                        <TableHead className="w-[70px] min-w-[70px] px-3 text-center">
                          <div className="flex items-center justify-center w-full">
                            <Checkbox
                              checked={filteredDocuments.length > 0 && selectedDocuments.size === filteredDocuments.length}
                              onCheckedChange={toggleSelectAll}
                              aria-label="Select all"
                            />
                          </div>
                        </TableHead>
                        <TableHead>{t('documents.invoiceNumber')}</TableHead>
                        <TableHead>{t('documents.client')}</TableHead>
                        <TableHead>{t('common.date')}</TableHead>
                        <TableHead className="text-center">{t('documents.items')}</TableHead>
                        <TableHead className="text-right">{t('documents.totalTTC')}</TableHead>
                        <TableHead className="text-center">{t('documents.paymentMethod')}</TableHead>
                        <TableHead className="text-center">{t('common.status')}</TableHead>
                        <TableHead className="text-center">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground" align="center">
                            No documents found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDocuments.map((doc) => (
                          <TableRow
                            key={doc.id}
                            className={cn(
                              "hover:bg-section/50 transition-colors",
                              selectedDocuments.has(doc.id) && "bg-primary/5",
                              highlightedDocId === doc.id && "animate-highlight-glow"
                            )}
                          >
                            <TableCell className="w-[70px] min-w-[70px] px-3 text-center">
                              <div className="flex items-center justify-center w-full">
                                <Checkbox
                                  checked={selectedDocuments.has(doc.id)}
                                  onCheckedChange={() => toggleDocumentSelection(doc.id)}
                                  aria-label={`Select ${doc.id}`}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="font-mono font-medium max-w-[120px] truncate" title={doc.id}>{doc.id}</TableCell>
                            <TableCell className="max-w-[200px] truncate" title={doc.client}>{doc.client}</TableCell>
                            <TableCell className="max-w-[120px] truncate" title={formatDate(doc.date)}>{formatDate(doc.date)}</TableCell>
                            <TableCell className="text-center number-cell">
                              {Array.isArray(doc.items) ? doc.items.length : (doc.items ? 1 : 0)}
                            </TableCell>
                            <TableCell className="text-right font-medium number-cell">{formatMAD(doc.total)}</TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm font-medium">{formatPaymentMethod(doc.paymentMethod)}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              {renderStatusSelect(doc)}
                            </TableCell>
                            <TableCell className="w-[220px]">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleViewDocument(doc)}
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditDocument(doc)}
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDownloadPDF(doc)}
                                  title="Download PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handlePrintPDF(doc)}
                                  title="Print"
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteDocument(doc)}
                                  title={t('common.delete')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                {findLinkedDocument(doc) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                    onClick={() => handleSwitchView(doc)}
                                    title="View Associated Delivery Note"
                                  >
                                    <Package className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="estimate" className="space-y-6">
          <Tabs defaultValue="create" className="space-y-6">
            <TabsList className="bg-section border border-border rounded-lg p-1.5 gap-1.5">
              <TabsTrigger
                value="create"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                {t('documents.createEstimate')}
              </TabsTrigger>
              <TabsTrigger
                value="list"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <FileText className="w-4 h-4" />
                {t('documents.allEstimates')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="card-elevated p-6">
                    <h3 className="font-heading font-semibold text-foreground mb-4">Client Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Select Client</Label>
                        <Select value={formClient} onValueChange={setFormClient}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a client" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.company || client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('documents.estimateDate')}</Label>
                        <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('documents.estimateNumberLabel')}</Label>
                        <Input placeholder={t('common.autoGenerated')} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('documents.validUntil')}</Label>
                        <Input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="card-elevated p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-heading font-semibold text-foreground">{t('documents.estimateItems')}</h3>
                      <Button variant="outline" size="sm" onClick={addItem} className="gap-2">
                        <Plus className="w-4 h-4" />
                        {t('documents.addItem')}
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div key={item.id} className="p-4 border border-border rounded-lg space-y-4 bg-card">
                          <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-5">
                              <Label className="text-xs font-medium mb-1.5 block">Product (Optional)</Label>
                              <ProductSearch
                                products={products}
                                value={item.productId}
                                onSelect={(product) => handleProductSelect(item.id, product)}
                                placeholder="Search product..."
                              />
                            </div>
                            <div className="col-span-7">
                              <Label className="text-xs font-medium mb-1.5 block">Description</Label>
                              <Input
                                placeholder="Product or service description"
                                value={item.description}
                                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                className="w-full"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-12 gap-4 items-end">
                            <div className="col-span-2">
                              <Label className="text-xs font-medium mb-1.5 block">Quantity</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                className="w-full"
                              />
                            </div>
                            <div className="col-span-4">
                              <Label className="text-xs font-medium mb-1.5 block">Unit Price (MAD)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full"
                              />
                            </div>
                            <div className="col-span-4">
                              <Label className="text-xs font-medium mb-1.5 block">Total (MAD)</Label>
                              <Input value={formatMAD(item.total)} disabled className="w-full font-medium" />
                            </div>
                            <div className="col-span-2 flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10"
                                onClick={() => removeItem(item.id)}
                                disabled={items.length === 1}
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Note Section */}
                  <div className="card-elevated p-6">
                    <div className="space-y-2">
                      <Label>Note (Optional)</Label>
                      <Textarea
                        placeholder="Add any additional notes or comments..."
                        value={formNote}
                        onChange={(e) => setFormNote(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="card-elevated p-6 sticky top-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-primary" />
                      <h3 className="font-heading font-semibold text-foreground">Estimate Summary</h3>
                    </div>
                    <div className="space-y-3 overflow-visible">
                      <div className="flex justify-between py-2 border-b border-border gap-4 overflow-visible">
                        <span className="text-muted-foreground flex-shrink-0">Subtotal (HT)</span>
                        <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
                          <CurrencyDisplay amount={totals.subtotal} />
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border gap-4 overflow-visible">
                        <span className="text-muted-foreground flex-shrink-0">TVA ({VAT_RATE * 100}%)</span>
                        <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
                          <CurrencyDisplay amount={totals.vat} />
                        </span>
                      </div>
                      <div className="flex justify-between py-3 text-lg gap-4 overflow-visible">
                        <span className="font-semibold text-foreground flex-shrink-0">Total (TTC)</span>
                        <span className="font-heading font-bold text-primary break-words overflow-visible whitespace-normal text-right min-w-0">
                          <CurrencyDisplay amount={totals.total} />
                        </span>
                      </div>
                    </div>
                    <div className="mt-6 space-y-2">
                      <Button className="w-full gap-2 btn-primary-gradient" onClick={handleCreateDocument}>
                        <Send className="w-4 h-4" />
                        Create & Send Estimate
                      </Button>
                      <Button variant="outline" className="w-full gap-2" onClick={handlePreviewPDF}>
                        <Download className="w-4 h-4" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="list" className="animate-fade-in">
              <div className="space-y-4">
                <div className="card-elevated p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={t('documents.searchByEstimateOrClient')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder={t('common.status')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('documents.allStatus')}</SelectItem>
                        <SelectItem value="draft">{t('status.draft')}</SelectItem>
                        <SelectItem value="sent">{t('status.sent')}</SelectItem>
                        <SelectItem value="accepted">{t('status.accepted')}</SelectItem>
                        <SelectItem value="expired">{t('status.expired')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedDocuments.size > 0 && (
                  <div className="card-elevated p-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {selectedDocuments.size} document{selectedDocuments.size > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleBulkDelete} className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        Delete Selected
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            Export Selected
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={handleBulkExportPDF} disabled={selectedDocuments.size === 0}>
                            <FileText className="w-4 h-4 mr-2" />
                            Export as PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleBulkExportExcel} disabled={selectedDocuments.size === 0}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Export as Excel
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleBulkExportCSV} disabled={selectedDocuments.size === 0}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Export as CSV
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}

                <div className="card-elevated overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="data-table-header hover:bg-section">
                        <TableHead className="w-[70px] min-w-[70px] px-3 text-center">
                          <div className="flex items-center justify-center w-full">
                            <Checkbox
                              checked={filteredDocuments.length > 0 && selectedDocuments.size === filteredDocuments.length}
                              onCheckedChange={toggleSelectAll}
                              aria-label="Select all"
                            />
                          </div>
                        </TableHead>
                        <TableHead>{t('documents.estimateNumber')}</TableHead>
                        <TableHead>{t('documents.client')}</TableHead>
                        <TableHead>{t('common.date')}</TableHead>
                        <TableHead className="text-center">{t('documents.items')}</TableHead>
                        <TableHead className="text-right">{t('documents.totalTTC')}</TableHead>
                        <TableHead className="text-center">{t('common.status')}</TableHead>
                        <TableHead className="text-center">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground" align="center">
                            No documents found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDocuments.map((doc) => (
                          <TableRow
                            key={doc.id}
                            className={cn(
                              "hover:bg-section/50",
                              selectedDocuments.has(doc.id) && "bg-primary/5"
                            )}
                          >
                            <TableCell className="w-[70px] min-w-[70px] px-3 text-center">
                              <div className="flex items-center justify-center w-full">
                                <Checkbox
                                  checked={selectedDocuments.has(doc.id)}
                                  onCheckedChange={() => toggleDocumentSelection(doc.id)}
                                  aria-label={`Select ${doc.id}`}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="font-mono font-medium max-w-[120px] truncate" title={doc.id}>{doc.id}</TableCell>
                            <TableCell className="max-w-[200px] truncate" title={doc.client}>{doc.client}</TableCell>
                            <TableCell className="max-w-[120px] truncate" title={formatDate(doc.date)}>{formatDate(doc.date)}</TableCell>
                            <TableCell className="text-center number-cell">
                              {Array.isArray(doc.items) ? doc.items.length : doc.items}
                            </TableCell>
                            <TableCell className="text-right font-medium number-cell">
                              <CurrencyDisplay amount={doc.total} />
                            </TableCell>
                            <TableCell className="text-center">
                              {renderStatusSelect(doc)}
                            </TableCell>
                            <TableCell className="w-[220px]">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleViewDocument(doc)}
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditDocument(doc)}
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDownloadPDF(doc)}
                                  title="Download PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handlePrintPDF(doc)}
                                  title="Print"
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteDocument(doc)}
                                  title={t('common.delete')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
        <TabsContent value="credit_note" className="space-y-6">
          <Tabs defaultValue="create" className="space-y-6">
            <TabsList className="bg-section border border-border rounded-lg p-1.5 gap-1.5">
              <TabsTrigger
                value="create"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                {t('documents.createCreditNote')}
              </TabsTrigger>
              <TabsTrigger
                value="list"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <FileText className="w-4 h-4" />
                {t('documents.allCreditNotes')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="card-elevated p-6">
                    <h3 className="font-heading font-semibold text-foreground mb-4">Client Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Select Client</Label>
                        <Select value={formClient} onValueChange={setFormClient}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a client" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.company || client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Credit Note Date</Label>
                        <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Credit Note #</Label>
                        <Input placeholder={t('common.autoGenerated')} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('documents.originalInvoice')}</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select original invoice" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inv-001">INV-001</SelectItem>
                            <SelectItem value="inv-002">INV-002</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="card-elevated p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-heading font-semibold text-foreground">Items to Credited</h3>
                      <Button variant="outline" size="sm" onClick={addItem} className="gap-2">
                        <Plus className="w-4 h-4" />
                        {t('documents.addItem')}
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div key={item.id} className="p-4 border border-border rounded-lg space-y-4 bg-card">
                          <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-5">
                              <Label className="text-xs font-medium mb-1.5 block">Product (Optional)</Label>
                              <ProductSearch
                                products={products}
                                value={item.productId}
                                onSelect={(product) => handleProductSelect(item.id, product)}
                                placeholder="Search product..."
                              />
                            </div>
                            <div className="col-span-7">
                              <Label className="text-xs font-medium mb-1.5 block">Description</Label>
                              <Input
                                placeholder="Reason for credit"
                                value={item.description}
                                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                className="w-full"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-12 gap-4 items-end">
                            <div className="col-span-2">
                              <Label className="text-xs font-medium mb-1.5 block">Quantity</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                className="w-full"
                              />
                            </div>
                            <div className="col-span-4">
                              <Label className="text-xs font-medium mb-1.5 block">Unit Price (MAD)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full"
                              />
                            </div>
                            <div className="col-span-4">
                              <Label className="text-xs font-medium mb-1.5 block">Total (MAD)</Label>
                              <Input value={formatMAD(item.total)} disabled className="w-full font-medium" />
                            </div>
                            <div className="col-span-2 flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10"
                                onClick={() => removeItem(item.id)}
                                disabled={items.length === 1}
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Note Section */}
                  <div className="card-elevated p-6">
                    <div className="space-y-2">
                      <Label>Internal Note (Optional)</Label>
                      <Textarea
                        placeholder="Add reason for credit note..."
                        value={formNote}
                        onChange={(e) => setFormNote(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="card-elevated p-6 sticky top-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-primary" />
                      <h3 className="font-heading font-semibold text-foreground">Refund Summary</h3>
                    </div>
                    <div className="space-y-3 overflow-visible">
                      <div className="flex justify-between py-2 border-b border-border gap-4 overflow-visible">
                        <span className="text-muted-foreground flex-shrink-0">Subtotal (HT)</span>
                        <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
                          <CurrencyDisplay amount={totals.subtotal} />
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border gap-4 overflow-visible">
                        <span className="text-muted-foreground flex-shrink-0">TVA ({VAT_RATE * 100}%)</span>
                        <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
                          <CurrencyDisplay amount={totals.vat} />
                        </span>
                      </div>
                      <div className="flex justify-between py-3 text-lg gap-4 overflow-visible">
                        <span className="font-semibold text-foreground flex-shrink-0">Total Credit (TTC)</span>
                        <span className="font-heading font-bold text-primary break-words overflow-visible whitespace-normal text-right min-w-0">
                          <CurrencyDisplay amount={totals.total} />
                        </span>
                      </div>
                    </div>
                    <div className="mt-6 space-y-2">
                      <Button className="w-full gap-2 btn-primary-gradient" onClick={handleCreateDocument}>
                        <Send className="w-4 h-4" />
                        Create Credit Note
                      </Button>
                      <Button variant="outline" className="w-full gap-2" onClick={handlePreviewPDF}>
                        <Download className="w-4 h-4" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="list" className="animate-fade-in">
              <div className="space-y-4">
                <div className="card-elevated p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search credit notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder={t('common.status')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('documents.allStatus')}</SelectItem>
                        <SelectItem value="draft">{t('status.draft')}</SelectItem>
                        <SelectItem value="sent">{t('status.sent')}</SelectItem>
                        <SelectItem value="paid">{t('status.paid')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedDocuments.size > 0 && (
                  <div className="card-elevated p-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {selectedDocuments.size} document{selectedDocuments.size > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleBulkDelete} className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        Delete Selected
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            Export Selected
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={handleBulkExportPDF} disabled={selectedDocuments.size === 0}>
                            <FileText className="w-4 h-4 mr-2" />
                            Export as PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleBulkExportExcel} disabled={selectedDocuments.size === 0}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Export as Excel
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleBulkExportCSV} disabled={selectedDocuments.size === 0}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Export as CSV
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}

                <div className="card-elevated overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="data-table-header hover:bg-section">
                        <TableHead className="w-[70px] min-w-[70px] px-3 text-center">
                          <div className="flex items-center justify-center w-full">
                            <Checkbox
                              checked={filteredDocuments.length > 0 && selectedDocuments.size === filteredDocuments.length}
                              onCheckedChange={toggleSelectAll}
                              aria-label="Select all"
                            />
                          </div>
                        </TableHead>
                        <TableHead>Credit Note #</TableHead>
                        <TableHead>{t('documents.client')}</TableHead>
                        <TableHead>{t('common.date')}</TableHead>
                        <TableHead className="text-right">{t('documents.amountTTC')}</TableHead>
                        <TableHead className="text-center">{t('common.status')}</TableHead>
                        <TableHead className="text-center">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground" align="center">
                            No documents found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDocuments.map((doc) => (
                          <TableRow
                            key={doc.id}
                            className={cn(
                              "hover:bg-section/50",
                              selectedDocuments.has(doc.id) && "bg-primary/5"
                            )}
                          >
                            <TableCell className="w-[70px] min-w-[70px] px-3 text-center">
                              <div className="flex items-center justify-center w-full">
                                <Checkbox
                                  checked={selectedDocuments.has(doc.id)}
                                  onCheckedChange={() => toggleDocumentSelection(doc.id)}
                                  aria-label={`Select ${doc.id}`}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="font-mono font-medium max-w-[120px] truncate" title={doc.id}>{doc.id}</TableCell>
                            <TableCell className="max-w-[200px] truncate" title={doc.client}>{doc.client}</TableCell>
                            <TableCell className="max-w-[120px] truncate" title={formatDate(doc.date)}>{formatDate(doc.date)}</TableCell>
                            <TableCell className="text-right font-medium number-cell">
                              <CurrencyDisplay amount={doc.total} />
                            </TableCell>
                            <TableCell className="text-center">
                              {renderStatusSelect(doc)}
                            </TableCell>
                            <TableCell className="w-[220px]">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleViewDocument(doc)}
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditDocument(doc)}
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDownloadPDF(doc)}
                                  title="Download PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handlePrintPDF(doc)}
                                  title="Print"
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteDocument(doc)}
                                  title={t('common.delete')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
        <TabsContent value="statement" className="space-y-6">
          <Tabs defaultValue="statistics" className="space-y-6">
            <TabsList className="bg-section border border-border rounded-lg p-1.5 gap-1.5">
              <TabsTrigger
                value="statistics"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <TrendingUp className="w-4 h-4" />
                {t('sales.invoiceStatistics')}
              </TabsTrigger>
              <TabsTrigger
                value="list"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <FileText className="w-4 h-4" />
                {t('documents.allStatements')}
              </TabsTrigger>
            </TabsList>

            {/* Sales Invoice Statistics Tab */}
            <TabsContent value="statistics" className="space-y-6 animate-fade-in">
              {/* Statistics KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="kpi-card">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Receipt className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-heading font-bold text-foreground break-words overflow-visible whitespace-normal leading-tight">
                        {invoiceStats.totalInvoices}
                      </p>
                      <p className="text-sm text-muted-foreground">{t('sales.totalInvoices')}</p>
                    </div>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10">
                      <CheckSquare className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-heading font-bold text-foreground break-words overflow-visible whitespace-normal leading-tight">
                        {invoiceStats.paidInvoices}
                      </p>
                      <p className="text-sm text-muted-foreground">{t('sales.paidInvoices')}</p>
                    </div>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <FileX className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-heading font-bold text-foreground break-words overflow-visible whitespace-normal leading-tight">
                        {invoiceStats.unpaidInvoices}
                      </p>
                      <p className="text-sm text-muted-foreground">{t('sales.unpaidInvoices')}</p>
                    </div>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <TrendingUp className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-heading font-bold text-foreground break-words overflow-visible whitespace-normal leading-tight">
                        {invoiceStats.overdueInvoices}
                      </p>
                      <p className="text-sm text-muted-foreground">{t('sales.overdueInvoices')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount Statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card-elevated p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">{t('sales.totalAmount')}</p>
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-2xl font-heading font-bold text-foreground">
                    <CurrencyDisplay amount={invoiceStats.totalAmount} />
                  </p>
                </div>
                <div className="card-elevated p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">{t('sales.paidAmount')}</p>
                    <CheckSquare className="w-4 h-4 text-success" />
                  </div>
                  <p className="text-2xl font-heading font-bold text-success">
                    <CurrencyDisplay amount={invoiceStats.paidAmount} />
                  </p>
                </div>
                <div className="card-elevated p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">{t('sales.unpaidAmount')}</p>
                    <FileX className="w-4 h-4 text-warning" />
                  </div>
                  <p className="text-2xl font-heading font-bold text-warning">
                    <CurrencyDisplay amount={invoiceStats.unpaidAmount} />
                  </p>
                </div>
                <div className="card-elevated p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">{t('sales.overdueAmount')}</p>
                    <TrendingUp className="w-4 h-4 text-destructive" />
                  </div>
                  <p className="text-2xl font-heading font-bold text-destructive">
                    <CurrencyDisplay amount={invoiceStats.overdueAmount} />
                  </p>
                </div>
              </div>

              {/* Payment Method Breakdown */}
              <div className="card-elevated p-6">
                <h3 className="font-heading font-semibold text-foreground mb-4">{t('documents.paymentMethodBreakdown')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-section rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">{t('paymentMethods.cash')}</p>
                      <span className="text-xs font-medium text-muted-foreground">
                        {invoices.filter(inv => inv.paymentMethod === 'cash').length} {t('documents.invoices')}
                      </span>
                    </div>
                    <p className="text-xl font-heading font-bold text-foreground">
                      <CurrencyDisplay amount={invoiceStats.paymentMethodBreakdown.cash} />
                    </p>
                  </div>
                  <div className="p-4 bg-section rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">{t('paymentMethods.check')}</p>
                      <span className="text-xs font-medium text-muted-foreground">
                        {invoices.filter(inv => inv.paymentMethod === 'check').length} {t('documents.invoices')}
                      </span>
                    </div>
                    <p className="text-xl font-heading font-bold text-foreground">
                      <CurrencyDisplay amount={invoiceStats.paymentMethodBreakdown.check} />
                    </p>
                  </div>
                  <div className="p-4 bg-section rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">{t('paymentMethods.bankTransfer')}</p>
                      <span className="text-xs font-medium text-muted-foreground">
                        {invoices.filter(inv => inv.paymentMethod === 'bank_transfer').length} {t('documents.invoices')}
                      </span>
                    </div>
                    <p className="text-xl font-heading font-bold text-foreground">
                      <CurrencyDisplay amount={invoiceStats.paymentMethodBreakdown.bank_transfer} />
                    </p>
                  </div>
                </div>
              </div>

              {/* Invoice Breakdown Table */}
              <div className="card-elevated overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h3 className="font-heading font-semibold text-foreground">{t('sales.invoiceBreakdownByStatus')}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t('sales.detailedViewInvoices')}</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="data-table-header hover:bg-section">
                      <TableHead>{t('documents.invoiceNumber')}</TableHead>
                      <TableHead>{t('documents.client')}</TableHead>
                      <TableHead>{t('common.date')}</TableHead>
                      <TableHead className="text-right">{t('documents.amountMAD')}</TableHead>
                      <TableHead>{t('documents.paymentMethod')}</TableHead>
                      <TableHead className="text-center">{t('common.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground" align="center">
                          {t('documents.noDocumentsFound')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.slice(0, 10).map((inv) => (
                        <TableRow key={inv.id} className="hover:bg-section/50">
                          <TableCell className="font-mono">{inv.id}</TableCell>
                          <TableCell>{inv.client}</TableCell>
                          <TableCell>{formatDate(inv.date)}</TableCell>
                          <TableCell className="text-right font-medium">
                            <CurrencyDisplay amount={inv.total} />
                          </TableCell>
                          <TableCell>{t(`paymentMethods.${inv.paymentMethod}`)}</TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(inv.status)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Client Breakdown Table */}
              <div className="card-elevated overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h3 className="font-heading font-semibold text-foreground">{t('sales.invoiceBreakdownByClient')}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t('sales.summaryInvoicesPerClient')}</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="data-table-header hover:bg-section">
                      <TableHead>{t('documents.client')}</TableHead>
                      <TableHead className="text-right">{t('sales.totalInvoices')}</TableHead>
                      <TableHead className="text-right">{t('documents.paid')}</TableHead>
                      <TableHead className="text-right">{t('documents.unpaid')}</TableHead>
                      <TableHead className="text-right">{t('sales.totalAmount')}</TableHead>
                      <TableHead className="text-right">{t('sales.paidAmount')}</TableHead>
                      <TableHead className="text-right">{t('sales.unpaidAmount')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(invoiceStats.clientBreakdown).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground" align="center">
                          {t('sales.noClientDataAvailable')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      Object.entries(invoiceStats.clientBreakdown)
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([client, stats]) => (
                          <TableRow key={client} className="hover:bg-section/50">
                            <TableCell className="font-medium">{client}</TableCell>
                            <TableCell className="text-right">{stats.count}</TableCell>
                            <TableCell className="text-right">
                              <span className="text-success font-medium">{stats.paidCount}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-warning font-medium">{stats.unpaidCount}</span>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              <CurrencyDisplay amount={stats.total} />
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-success">
                                <CurrencyDisplay amount={stats.paid} />
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-warning">
                                <CurrencyDisplay amount={stats.unpaid} />
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Summary Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card-elevated p-6">
                  <h3 className="font-heading font-semibold text-foreground mb-4">{t('sales.statusSummary')}</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-success" />
                        <span className="text-sm text-muted-foreground">{t('status.paid')}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">{invoiceStats.paidInvoices}</span>
                        <span className="text-sm font-medium text-success">
                          <CurrencyDisplay amount={invoiceStats.paidAmount} />
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileX className="w-4 h-4 text-warning" />
                        <span className="text-sm text-muted-foreground">{t('status.pending')}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">{invoiceStats.unpaidInvoices}</span>
                        <span className="text-sm font-medium text-warning">
                          <CurrencyDisplay amount={invoiceStats.unpaidAmount} />
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-destructive" />
                        <span className="text-sm text-muted-foreground">{t('status.overdue')}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">{invoiceStats.overdueInvoices}</span>
                        <span className="text-sm font-medium text-destructive">
                          <CurrencyDisplay amount={invoiceStats.overdueAmount} />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card-elevated p-6">
                  <h3 className="font-heading font-semibold text-foreground mb-4">{t('sales.paymentSummary')}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">{t('sales.totalInvoiceAmount')}</span>
                      <span className="text-lg font-heading font-bold text-foreground">
                        <CurrencyDisplay amount={invoiceStats.totalAmount} />
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">{t('sales.paidAmount')}</span>
                      <span className="text-lg font-heading font-bold text-success">
                        <CurrencyDisplay amount={invoiceStats.paidAmount} />
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">{t('sales.outstandingAmount')}</span>
                      <span className="text-lg font-heading font-bold text-warning">
                        <CurrencyDisplay amount={invoiceStats.unpaidAmount} />
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 text-lg border-t-2 border-border mt-2">
                      <span className="font-semibold text-foreground">{t('sales.paymentRate')}</span>
                      <span className="font-heading font-bold text-primary">
                        {invoiceStats.totalAmount > 0
                          ? ((invoiceStats.paidAmount / invoiceStats.totalAmount) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="list" className="animate-fade-in">
              <div className="space-y-4">
                <div className="card-elevated p-8 text-center italic text-muted-foreground">
                  {t('documents.statementsFeatureSoon')}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* View Document Dialog */}
      <Dialog open={!!viewingDocument} onOpenChange={() => setViewingDocument(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewingDocument && (
            <>
              <DialogHeader>
                <DialogTitle>{getDocumentTitle()} Details</DialogTitle>
                <DialogDescription>Document #{formatDocumentId(viewingDocument.id, viewingDocument.type)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Client</Label>
                    <p className="font-medium">{getClientDisplayName(viewingDocument)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date</Label>
                    <p className="font-medium">{formatDate(viewingDocument.date)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Items</Label>
                    <p className="font-medium">
                      {Array.isArray(viewingDocument.items) ? viewingDocument.items.length : (viewingDocument.items ? 1 : 0)} item(s)
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(viewingDocument.status)}</div>
                  </div>
                  {viewingDocument.type === 'invoice' && (
                    <div>
                      <Label className="text-muted-foreground">Payment Method</Label>
                      <p className="font-medium">{formatPaymentMethod(viewingDocument.paymentMethod)}</p>
                    </div>
                  )}
                  {viewingDocument.type === 'invoice' && viewingDocument.paymentMethod === 'check' && viewingDocument.checkNumber && (
                    <div>
                      <Label className="text-muted-foreground">Check Serial Number</Label>
                      <p className="font-medium break-all">{viewingDocument.checkNumber}</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Total</Label>
                    <p className="text-2xl font-bold text-primary">{formatMAD(viewingDocument.total)}</p>
                  </div>
                </div>
                {/* Items List */}
                {Array.isArray(viewingDocument.items) && viewingDocument.items.length > 0 && (
                  <div className="mt-6">
                    <Label className="text-muted-foreground mb-3 block">Item Details</Label>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewingDocument.items.map((item, index) => (
                            <TableRow key={item.id || index}>
                              <TableCell>{item.description}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">{formatMAD(item.unitPrice)}</TableCell>
                              <TableCell className="text-right font-medium">{formatMAD(item.total || item.quantity * item.unitPrice)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewingDocument(null)}>Close</Button>
                <Button onClick={() => {
                  setViewingDocument(null);
                  handleEditDocument(viewingDocument);
                }}>Edit</Button>
                <Button variant="outline" className="gap-2" onClick={() => handleDownloadPDF(viewingDocument)}>
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => handlePrintPDF(viewingDocument)}>
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={!!editingDocument} onOpenChange={() => setEditingDocument(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {editingDocument && (
            <>
              <DialogHeader>
                <DialogTitle>Edit {getDocumentTitle()}</DialogTitle>
                <DialogDescription>Document #{editingDocument.id}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <Input
                      value={editFormData.client || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, client: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={editFormData.date || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={editFormData.status || editingDocument.status}
                      onValueChange={(value) => setEditFormData({ ...editFormData, status: value as SalesDocument['status'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {editingDocument.type === 'invoice' && (
                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select
                        value={editFormData.paymentMethod || editingDocument.paymentMethod || 'cash'}
                        onValueChange={(value) => {
                          const method = value as SalesDocument['paymentMethod'];
                          setEditFormData({
                            ...editFormData,
                            paymentMethod: method,
                            checkNumber: method === 'check' ? editFormData.checkNumber || editingDocument.checkNumber : undefined,
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {editingDocument.type === 'invoice' && (editFormData.paymentMethod || editingDocument.paymentMethod) === 'check' && (
                    <div className="space-y-2">
                      <Label>Check Serial Number</Label>
                      <Input
                        placeholder="Enter check serial number"
                        value={editFormData.checkNumber || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, checkNumber: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setEditingDocument(null);
                  setEditFormData({});
                }}>Cancel</Button>
                <Button className="btn-primary-gradient" onClick={handleSaveDocument}>Save Changes</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDocument} onOpenChange={(open) => !open && setDeletingDocument(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {getDocumentTitle()}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{getDocumentTitle()} #{deletingDocument?.id}</strong> for <strong>{deletingDocument?.client}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteDocument}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Sales;