import React, { useState } from 'react';
import { Plus, Search, ShoppingCart, FileText, Download, Package, Receipt, FileCheck, Calculator, Trash2, Send, Eye, Edit, Check, FileSpreadsheet, ChevronDown, Printer, TrendingUp, CheckSquare, FileX, Upload, Image as ImageIcon, Paperclip } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatMAD, VAT_RATE, calculateInvoiceTotals } from '@/lib/moroccan-utils';
import { ProductSearch } from '@/components/ui/product-search';
import { Product } from '@/lib/products';
import { useProducts } from '@/contexts/ProductsContext';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';
import { useContacts, UIContact } from '@/contexts/ContactsContext';
import { usePurchases, PurchaseDocument, PurchaseItem } from '@/contexts/PurchasesContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { useToast } from '@/hooks/use-toast';
import { generateDocumentNumber } from '@/lib/document-number-generator';
import {
  generatePurchaseOrderPDF,
  generateDeliveryNotePDF,
  generateInvoicePDF,
  generatePurchaseInvoicePDF,
  generatePurchaseDeliveryNotePDF,
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
// import { getSupabaseClient } from '@/lib/supabase'; // Removed legacy Supabase import

// PurchaseItem and PurchaseDocument interfaces are imported from PurchasesContext

// Mock data removed - all data now comes from database via PurchasesContext

export const Purchases = () => {
  const { t } = useTranslation();
  const { suppliers, getSupplierById } = useContacts();
  const { products = [] } = useProducts();
  const { companyInfo } = useCompany();
  const { warehouses } = useWarehouse();
  const { toast } = useToast();
  const {
    purchaseOrders,
    purchaseInvoices,
    deliveryNotes,
    allDeliveryNotes,
    isLoading: isLoadingPurchases,
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    createPurchaseInvoice,
    updatePurchaseInvoice,
    deletePurchaseInvoice,
    createDeliveryNote,
    updateDeliveryNote,
    deleteDeliveryNote,
  } = usePurchases();

  // Statements feature removed - no database table yet
  const [documentType, setDocumentType] = useState<'purchase_order' | 'delivery_note' | 'invoice' | 'statement'>('purchase_order');
  const [activeTab, setActiveTab] = useState<'purchase_order' | 'delivery_note' | 'invoice' | 'statement'>('purchase_order');
  const [items, setItems] = useState<PurchaseItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 },
  ]);
  const [formSupplier, setFormSupplier] = useState('');
  const [formWarehouse, setFormWarehouse] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPaymentMethod, setFormPaymentMethod] = useState<'cash' | 'check' | 'bank_transfer'>('cash');
  const [formDueDate, setFormDueDate] = useState('');
  const [formNote, setFormNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [viewingDocument, setViewingDocument] = useState<PurchaseDocument | null>(null);
  const [editingDocument, setEditingDocument] = useState<PurchaseDocument | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<PurchaseDocument>>({});
  const [deletingDocument, setDeletingDocument] = useState<PurchaseDocument | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Manual Document ID state
  const [manualDocumentId, setManualDocumentId] = useState('');
  const [isManualId, setIsManualId] = useState(false);

  // Check number state
  const [formCheckNumber, setFormCheckNumber] = useState('');

  // Helper to get current documents based on activeTab
  const getCurrentDocuments = (): PurchaseDocument[] => {
    switch (activeTab) {
      case 'purchase_order':
        return purchaseOrders;
      case 'delivery_note':
        return deliveryNotes;
      case 'invoice':
        return purchaseInvoices;
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

  const handleDeleteDocument = (doc: PurchaseDocument) => {
    setDeletingDocument(doc);
  };

  const confirmDeleteDocument = async () => {
    if (!deletingDocument) return;

    const documentTypeNames: Record<string, string> = {
      'purchase_order': 'Purchase Order',
      'delivery_note': 'Delivery Note',
      'invoice': 'Purchase Invoice',
      'statement': 'Statement',
    };

    try {
      // Delete from database (except statements which are mock)
      switch (deletingDocument.type) {
        case 'purchase_order':
          await deletePurchaseOrder(deletingDocument.id);
          break;
        case 'delivery_note':
          await deleteDeliveryNote(deletingDocument.id);
          break;
        case 'invoice':
          await deletePurchaseInvoice(deletingDocument.id);
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
      'purchase_order': t('documents.purchaseOrder'),
      'delivery_note': t('documents.deliveryNote'),
      'invoice': t('documents.purchaseInvoice', { defaultValue: 'Purchase Invoices' }),
      'statement': t('documents.statement'),
    };

    try {
      const documentsToDelete = getCurrentDocuments().filter(d => selectedDocuments.has(d.id));

      // Delete all selected documents
      await Promise.all(
        documentsToDelete.map(async (doc) => {
          switch (doc.type) {
            case 'purchase_order':
              await deletePurchaseOrder(doc.id);
              break;
            case 'delivery_note':
              await deleteDeliveryNote(doc.id);
              break;
            case 'invoice':
              await deletePurchaseInvoice(doc.id);
              break;
            case 'statement':
              // Statements feature not implemented
              break;
              break;
          }
        })
      );

      const count = selectedDocuments.size;
      const docTypeName = documentTypeNames[activeTab] || t('documents.document');
      setSelectedDocuments(new Set());

      toast({
        title: t('documents.documentsDeleted', { defaultValue: 'Documents Deleted' }),
        description: t('documents.documentsDeletedDescription', { count, docTypeName, defaultValue: `${count} ${docTypeName} have been deleted successfully.` }),
        variant: "destructive",
      });
    } catch (error) {
      console.error('Error deleting documents:', error);
      // Error toast is handled by the context
    }
  };

  const handleViewDocument = (doc: PurchaseDocument) => {
    setViewingDocument(doc);
  };

  // Format document ID with French prefix based on document type
  const formatDocumentId = (id: string, docType: string): string => {
    // If ID already has a standard prefix (PREFIX-MM/YY/NNNN), return as is
    if (id.match(/^[A-Z]{2,3}-\d{2}\/\d{2}\/\d{4}$/)) {
      return id;
    }

    const prefixes: Record<string, string> = {
      purchase_order: 'BC',
      purchase_invoice: 'FA',
      delivery_note: 'BL',
    };

    // Replace English database prefixes with French ones for legacy support
    if (id.startsWith('PO-')) return id.replace('PO-', 'BC-');
    if (id.startsWith('PI-')) return id.replace('PI-', 'FA-');
    if (id.startsWith('DN-')) return id.replace('DN-', 'BL-');

    const prefix = prefixes[docType] || 'DOC';

    // If ID already has any uppercase prefix, return as is
    if (id.match(/^[A-Z]{2,4}-/)) {
      return id;
    }

    // Otherwise, add the prefix
    return `${prefix}-${id}`;
  };

  // Get supplier display name from document
  const getSupplierDisplayName = (doc: PurchaseDocument): string => {
    if (doc.supplierData) {
      return doc.supplierData.company || doc.supplierData.name || doc.supplier || 'Unknown Supplier';
    }
    // Fallback: try to look up from contacts
    const supplier = suppliers.find(s => s.id === doc.supplier);
    return supplier ? (supplier.company || supplier.name) : doc.supplier || 'Unknown Supplier';
  };

  const handleEditDocument = (doc: PurchaseDocument) => {
    setEditingDocument(doc);
    setEditFormData({
      supplier: doc.supplier,
      date: doc.date,
      status: doc.status,
      paymentMethod: doc.paymentMethod,
    });
    toast({
      title: "Document Loaded",
      description: "Document details loaded for editing.",
      variant: "success",
    });
  };

  const handleSaveDocument = async () => {
    if (!editingDocument) return;

    try {
      const updateData: Partial<PurchaseDocument> = {
        ...editFormData,
      };

      // Update in database (except statements which are mock)
      switch (editingDocument.type) {
        case 'purchase_order':
          await updatePurchaseOrder(editingDocument.id, updateData);
          break;
        case 'delivery_note':
          await updateDeliveryNote(editingDocument.id, updateData);
          break;
        case 'invoice':
          await updatePurchaseInvoice(editingDocument.id, updateData);
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

  const handleDownloadPDF = async (doc: PurchaseDocument & { items?: any }) => {
    try {
      const docType = doc.type || activeTab;

      // If supplierData is missing, try to find it from CRM using supplier ID
      let docWithSupplierData = { ...doc };
      if (!docWithSupplierData.supplierData && docWithSupplierData.supplier) {
        console.log('Looking up supplier:', docWithSupplierData.supplier);
        console.log('Available suppliers:', suppliers.length);
        // Try to find supplier by ID (supplier field stores the UUID)
        const foundSupplier = suppliers.find(s => s.id === docWithSupplierData.supplier);
        if (foundSupplier) {
          console.log('Found supplier:', foundSupplier.company || foundSupplier.name);
          docWithSupplierData.supplierData = {
            id: foundSupplier.id,
            name: foundSupplier.name,
            company: foundSupplier.company || '',
            email: foundSupplier.email || '',
            phone: foundSupplier.phone || '',
            ice: foundSupplier.ice || null,
            if_number: foundSupplier.ifNumber || null,
            rc: foundSupplier.rc || null,
          };
        } else {
          console.warn('Supplier not found in CRM. Supplier ID:', docWithSupplierData.supplier);
        }
      } else if (docWithSupplierData.supplierData) {
        console.log('Supplier data already present:', docWithSupplierData.supplierData.company || docWithSupplierData.supplierData.name);
      }

      // Prepare document data with items if available
      const docWithItems = {
        ...docWithSupplierData,
        items: docWithSupplierData.items || (typeof docWithSupplierData.items === 'number' ? docWithSupplierData.items : 0),
      };

      switch (docType) {
        case 'purchase_order':
          await generatePurchaseOrderPDF({ ...docWithItems as any, companyInfo });
          break;
        case 'delivery_note':
          await generatePurchaseDeliveryNotePDF({ ...docWithItems as any, companyInfo });
          break;
        case 'invoice':
          await generatePurchaseInvoicePDF({ ...docWithItems as any, companyInfo });
          break;
        case 'statement':
          generateStatementPDF(doc);
          break;
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: t('common.error', { defaultValue: 'Error' }),
        description: t('documents.errorGeneratingPDF', { defaultValue: 'Error generating PDF. Please check the console for details.' }),
        variant: "destructive",
      });
    }
  };

  const handlePrintPDF = async (doc: PurchaseDocument & { items?: any }) => {
    try {
      const docType = doc.type || activeTab;

      // If supplierData is missing, try to find it from CRM using supplier ID
      let docWithSupplierData = { ...doc };
      if (!docWithSupplierData.supplierData && docWithSupplierData.supplier) {
        // Try to find supplier by ID (supplier field stores the UUID)
        const foundSupplier = suppliers.find(s => s.id === docWithSupplierData.supplier);
        if (foundSupplier) {
          docWithSupplierData.supplierData = {
            id: foundSupplier.id,
            name: foundSupplier.name,
            company: foundSupplier.company || '',
            email: foundSupplier.email || '',
            phone: foundSupplier.phone || '',
            ice: foundSupplier.ice || null,
            if_number: foundSupplier.ifNumber || null,
            rc: foundSupplier.rc || null,
          };
        }
      }

      // Prepare document data with items if available
      const docWithItems = {
        ...docWithSupplierData,
        items: Array.isArray(docWithSupplierData.items) ? docWithSupplierData.items : [],
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
        supplier: docWithItems.supplier,
        supplierData: docWithItems.supplierData,
        items: items,
        paymentMethod: docWithItems.paymentMethod as 'cash' | 'check' | 'bank_transfer' | undefined,
        dueDate: docWithItems.dueDate,
        note: docWithItems.note,
        companyInfo: companyInfo as any,
      });

      // Generate PDF blob
      const blob = await pdf(React.createElement('div', null, pdfDoc)).toBlob();
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

  const handleDownloadExcel = (doc: PurchaseDocument) => {
    const docType = doc.type || activeTab;
    generateDocumentExcel({
      ...doc,
      items: Array.isArray(doc.items) ? doc.items.length : 0,
    }, docType);
  };

  const handleBulkExportExcel = () => {
    const currentDocuments = getCurrentDocuments();
    const documentsToExport = currentDocuments
      .filter(doc => selectedDocuments.has(doc.id))
      .map(doc => ({
        ...doc,
        items: Array.isArray(doc.items) ? doc.items.length : (typeof doc.items === 'number' ? doc.items : 0),
      }));
    if (documentsToExport.length > 0) {
      generateBulkDocumentsExcel(documentsToExport as any, activeTab);
    }
  };

  const handleDownloadCSV = (doc: PurchaseDocument) => {
    const docType = doc.type || activeTab;
    const docForExport = {
      ...doc,
      items: Array.isArray(doc.items) ? doc.items.length : (typeof doc.items === 'number' ? doc.items : 0),
    };
    generateDocumentCSV(docForExport as any, docType);
  };

  const handleBulkExportCSV = () => {
    const currentDocuments = getCurrentDocuments();
    const documentsToExport = currentDocuments
      .filter(doc => selectedDocuments.has(doc.id))
      .map(doc => ({
        ...doc,
        items: Array.isArray(doc.items) ? doc.items.length : (typeof doc.items === 'number' ? doc.items : 0),
      }));
    if (documentsToExport.length > 0) {
      generateBulkDocumentsCSV(documentsToExport as any, activeTab);
    }
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof PurchaseItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        updated.total = updated.quantity * updated.unitPrice;
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
          updated.total = updated.quantity * updated.unitPrice;
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
      toast({
        title: t('common.error', { defaultValue: 'Error' }),
        description: t('documents.addValidLineItem', { defaultValue: 'Please add at least one valid line item before creating the document.' }),
        variant: "destructive",
      });
      return;
    }

    if (!formSupplier) {
      toast({
        title: t('common.error', { defaultValue: 'Error' }),
        description: t('documents.selectSupplier', { defaultValue: 'Please select a supplier.' }),
        variant: "destructive",
      });
      return;
    }

    // Get full supplier data from CRM
    const supplierData = getSupplierById(formSupplier);
    if (!supplierData) {
      toast({
        title: t('common.error', { defaultValue: 'Error' }),
        description: t('documents.supplierNotFound', { defaultValue: 'Supplier not found. Please select a valid supplier.' }),
        variant: "destructive",
      });
      return;
    }

    // Collect all existing documents to ensure unique document number
    const allExistingDocuments = [
      ...purchaseOrders,
      ...allDeliveryNotes,
      ...purchaseInvoices,
    ];

    // Generate unique document number using database function or use manual input
    let documentNumber: string;

    if (isManualId && manualDocumentId.trim()) {
      documentNumber = manualDocumentId.trim();

      // Validate uniqueness
      const alreadyExists = allExistingDocuments.some(doc =>
        doc.id.toLowerCase() === documentNumber.toLowerCase() ||
        doc.documentId.toLowerCase() === documentNumber.toLowerCase()
      );

      if (alreadyExists) {
        toast({
          title: t('common.error', { defaultValue: 'Error' }),
          description: t('documents.idAlreadyExists', { defaultValue: 'This document ID already exists. Please use a unique ID.' }),
          variant: "destructive",
        });
        return;
      }
    } else {
      try {
        const { generateDocumentNumberFromDB } = await import('@/lib/document-number-service');
        documentNumber = await generateDocumentNumberFromDB(
          documentType === 'invoice' ? 'purchase_invoice' :
            documentType === 'purchase_order' ? 'purchase_order' :
              documentType === 'delivery_note' ? 'delivery_note' :
                'statement',
          allExistingDocuments,
          formDate
        );
      } catch (error) {
        console.warn('Failed to generate document number, using fallback:', error);
        // Fallback to direct generator call
        documentNumber = generateDocumentNumber(
          documentType === 'invoice' ? 'purchase_invoice' :
            documentType === 'purchase_order' ? 'purchase_order' :
              documentType === 'delivery_note' ? 'delivery_note' :
                'statement',
          allExistingDocuments,
          formDate
        );
      }
    }

    // Handle File Upload - Disabled for local backend
    let attachmentUrl: string | null = null;
    if (selectedFile && documentType === 'invoice') {
      toast({
        title: "Info",
        description: "File upload to local backend not yet implemented. Attachment will be skipped.",
      });
    }

    // Calculate total based on document type
    let documentTotal: number;
    if (documentType === 'invoice') {
      documentTotal = totals.total; // Includes VAT
    } else {
      documentTotal = totals.subtotal; // No VAT for purchase orders and delivery notes
    }

    try {
      const newDocumentData: Omit<PurchaseDocument, 'id' | 'type'> = {
        documentId: documentNumber,
        supplier: supplierData.id,
        attachment_url: attachmentUrl,
        supplierData: {
          id: supplierData.id,
          name: supplierData.name,
          company: supplierData.company || '',
          email: supplierData.email || '',
          phone: supplierData.phone || '',
          ice: supplierData.ice || null,
          if_number: supplierData.ifNumber || null,
          rc: supplierData.rc || null,
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
        checkNumber: documentType === 'invoice' && formPaymentMethod === 'check' ? (formCheckNumber || undefined) : undefined,
        dueDate: formDueDate || undefined,
        note: formNote || undefined,
        warehouseId: formWarehouse || undefined,
      };

      // Create in database (except statements which are mock)
      switch (documentType) {
        case 'purchase_order':
          await createPurchaseOrder(newDocumentData);
          break;
        case 'delivery_note':
          await createDeliveryNote(newDocumentData);
          break;
        case 'invoice':
          await createPurchaseInvoice(newDocumentData);
          break;
        case 'statement':
          // Statements feature not implemented yet
          toast({
            title: "Feature Not Available",
            description: "Statements feature is not yet implemented.",
            variant: "destructive",
          });
          return;
      }

      // Reset form
      setItems([{ id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }]);
      setFormSupplier('');
      setFormDate(new Date().toISOString().split('T')[0]);
      setFormPaymentMethod('cash');
      setFormCheckNumber('');
      setFormDueDate('');
      setFormNote('');
      setManualDocumentId('');
      setIsManualId(false);
      setSelectedFile(null);
      setFilePreview(null);
      setIsUploading(false);
    } catch (error) {
      console.error('Error creating document:', error);
      // Error toast is handled by the context
    }
  };

  const handlePreviewPDF = async () => {
    if (!formSupplier) {
      toast({
        title: t('common.error', { defaultValue: 'Error' }),
        description: t('documents.selectSupplier', { defaultValue: 'Please select a supplier.' }),
        variant: "destructive",
      });
      return;
    }

    // Get full supplier data from CRM
    const supplierData = getSupplierById(formSupplier);

    const previewDocument: PurchaseDocument & { items?: any } = {
      id: 'PREVIEW',
      documentId: 'PREVIEW',
      supplier: supplierData?.company || supplierData?.name || formSupplier,
      supplierData: supplierData ? {
        id: supplierData.id,
        name: supplierData.name,
        company: supplierData.company || '',
        email: supplierData.email || '',
        phone: supplierData.phone || '',
        ice: supplierData.ice || null,
        if_number: supplierData.ifNumber || null,
        rc: supplierData.rc || null,
      } : undefined,
      date: formDate,
      items: items,
      total: documentType === 'invoice' ? totals.total : totals.subtotal,
      status: 'draft',
      type: documentType,
      paymentMethod: documentType === 'invoice' ? formPaymentMethod : undefined,
      dueDate: formDueDate || undefined,
      note: formNote || undefined,
    };

    await handleDownloadPDF(previewDocument);
  };

  const getDocumentTitle = () => {
    switch (documentType) {
      case 'purchase_order': return t('documents.purchaseOrder');
      case 'delivery_note': return t('documents.deliveryNote');
      case 'invoice': return t('documents.purchaseInvoice');
      case 'statement': return t('documents.statement');
    }
  };

  const getDocumentIcon = () => {
    switch (documentType) {
      case 'purchase_order': return <ShoppingCart className="w-5 h-5 text-primary" />;
      case 'delivery_note': return <Package className="w-5 h-5 text-primary" />;
      case 'invoice': return <Receipt className="w-5 h-5 text-primary" />;
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
      case 'purchase_order':
        return ['pending', 'shipped', 'received', 'cancelled'];
      case 'delivery_note':
        return ['pending', 'in_transit', 'delivered', 'cancelled'];
      case 'invoice':
        return ['pending', 'paid', 'overdue', 'cancelled'];
      case 'statement':
        return ['draft', 'current', 'overdue', 'paid'];
      default:
        return [];
    }
  };

  const handleStatusChange = async (docId: string, newStatus: string, docType: string) => {
    try {
      const updateData: Partial<PurchaseDocument> = {
        status: newStatus,
      };

      // Update in database (except statements which are mock)
      switch (docType) {
        case 'purchase_order':
          await updatePurchaseOrder(docId, updateData);
          break;
        case 'delivery_note':
          await updateDeliveryNote(docId, updateData);
          break;
        case 'invoice':
          await updatePurchaseInvoice(docId, updateData);
          break;
        case 'statement':
          // Statements feature not implemented
          break;
      }
    } catch (error) {
      console.error('Error updating document status:', error);
      // Error toast is handled by the context
    }
  };

  const renderStatusSelect = (doc: PurchaseDocument) => {
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

  const getAllDocuments = () => {
    return getCurrentDocuments();
  };

  const filteredDocuments = getAllDocuments().filter(doc => {
    const matchesSearch = doc.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  const handleTabChange = (value: string) => {
    const tabValue = value as 'purchase_order' | 'delivery_note' | 'invoice' | 'statement';
    setActiveTab(tabValue);
    setDocumentType(tabValue);
    setSelectedDocuments(new Set()); // Clear selection when switching tabs
    // Reset manual ID state when switching tabs
    setIsManualId(false);
    setManualDocumentId('');
  };

  const totalPending = purchaseOrders
    .filter(o => o.status === 'pending' || o.status === 'shipped')
    .reduce((sum, o) => {
      const amount = typeof o.total === 'number' ? o.total : parseFloat(o.total as any) || 0;
      return sum + amount;
    }, 0);

  // Purchase Invoice Statistics Calculations
  const purchaseInvoiceStats = {
    totalInvoices: purchaseInvoices.length,
    paidInvoices: purchaseInvoices.filter(inv => inv.status === 'paid').length,
    unpaidInvoices: purchaseInvoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled').length,
    overdueInvoices: purchaseInvoices.filter(inv => inv.status === 'overdue').length,
    draftInvoices: purchaseInvoices.filter(inv => inv.status === 'draft').length,
    cancelledInvoices: purchaseInvoices.filter(inv => inv.status === 'cancelled').length,
    totalAmount: purchaseInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0),
    paidAmount: purchaseInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (Number(inv.total) || 0), 0),
    unpaidAmount: purchaseInvoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled').reduce((sum, inv) => sum + (Number(inv.total) || 0), 0),
    overdueAmount: purchaseInvoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + (Number(inv.total) || 0), 0),
    paymentMethodBreakdown: {
      cash: purchaseInvoices.filter(inv => inv.paymentMethod === 'cash').reduce((sum, inv) => sum + (Number(inv.total) || 0), 0),
      check: purchaseInvoices.filter(inv => inv.paymentMethod === 'check').reduce((sum, inv) => sum + (Number(inv.total) || 0), 0),
      bank_transfer: purchaseInvoices.filter(inv => inv.paymentMethod === 'bank_transfer').reduce((sum, inv) => sum + (Number(inv.total) || 0), 0),
    },
    supplierBreakdown: purchaseInvoices.reduce((acc, inv) => {
      const supplier = inv.supplier;
      if (!acc[supplier]) {
        acc[supplier] = { total: 0, paid: 0, unpaid: 0, count: 0, paidCount: 0, unpaidCount: 0 };
      }
      acc[supplier].total += (Number(inv.total) || 0);
      acc[supplier].count += 1;
      if (inv.status === 'paid') {
        acc[supplier].paid += (Number(inv.total) || 0);
        acc[supplier].paidCount += 1;
      } else if (inv.status !== 'cancelled') {
        acc[supplier].unpaid += (Number(inv.total) || 0);
        acc[supplier].unpaidCount += 1;
      }
      return acc;
    }, {} as Record<string, { total: number; paid: number; unpaid: number; count: number; paidCount: number; unpaidCount: number }>),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">{t('purchases.title')}</h1>
          <p className="text-muted-foreground">{t('purchases.description')}</p>
        </div>

      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-heading font-bold text-foreground break-words overflow-visible whitespace-normal leading-tight">{purchaseOrders.length}</p>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground line-clamp-1" title={t('documents.purchaseOrder')}>{t('documents.purchaseOrder')}</p>
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <Package className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-heading font-bold text-foreground break-words overflow-visible whitespace-normal leading-tight">
                {purchaseOrders.filter(o => o.status === 'pending').length}
              </p>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground line-clamp-1" title={t('status.pending')}>{t('status.pending')}</p>
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10">
              <FileText className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-heading font-bold text-foreground break-words overflow-visible whitespace-normal leading-tight">
                {deliveryNotes.length}
              </p>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground line-clamp-1" title={t('documents.allDeliveryNotes')}>{t('documents.allDeliveryNotes')}</p>
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <ShoppingCart className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-heading font-bold text-foreground break-words overflow-visible whitespace-normal leading-tight">{formatMAD(totalPending)}</p>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground line-clamp-1" title={t('purchases.pendingValue')}>{t('purchases.pendingValue')}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-section border border-border rounded-lg grid grid-cols-4 w-full p-1.5 gap-1.5">
          <TabsTrigger
            value="purchase_order"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            {t('documents.purchaseOrder')}
          </TabsTrigger>
          <TabsTrigger
            value="delivery_note"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <Package className="w-4 h-4" />
            {t('documents.deliveryNote')}
          </TabsTrigger>
          <TabsTrigger
            value="invoice"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <Receipt className="w-4 h-4" />
            {t('documents.purchaseInvoice')}
          </TabsTrigger>
          <TabsTrigger
            value="statement"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <FileCheck className="w-4 h-4" />
            {t('documents.statement')}
          </TabsTrigger>
        </TabsList>

        {/* Purchase Order Tab */}
        <TabsContent value="purchase_order" className="space-y-6">
          <Tabs defaultValue="create" className="space-y-6">
            <TabsList className="bg-section border border-border rounded-lg p-1.5 gap-1.5">
              <TabsTrigger
                value="create"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                {t('documents.createPurchaseOrder')}
              </TabsTrigger>
              <TabsTrigger
                value="list"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <FileText className="w-4 h-4" />
                {t('documents.allPurchaseOrders')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="card-elevated p-6">
                    <h3 className="font-heading font-semibold text-foreground mb-4">{t('purchases.supplierInformation', { defaultValue: 'Supplier Information' })}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('purchases.selectSupplier', { defaultValue: 'Select Supplier' })}</Label>
                        <Select value={formSupplier} onValueChange={setFormSupplier}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('documents.chooseSupplier')} />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.company || supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('purchases.orderDate', { defaultValue: 'Order Date' })}</Label>
                        <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>{t('documents.purchaseOrderNumber')}</Label>
                          {isManualId ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setIsManualId(false);
                                setManualDocumentId('');
                              }}
                              className="h-6 text-xs"
                            >
                              {t('common.autoGenerate')}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsManualId(true)}
                              className="h-6 text-xs text-muted-foreground hover:text-foreground"
                            >
                              {t('common.manualEntry')}
                            </Button>
                          )}
                        </div>
                        {isManualId ? (
                          <Input
                            placeholder={t('documents.enterPONumber')}
                            value={manualDocumentId}
                            onChange={(e) => setManualDocumentId(e.target.value)}
                            className="bg-background"
                          />
                        ) : (
                          <Input placeholder={t('common.autoGenerated')} disabled />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>{t('documents.expectedDeliveryDate')}</Label>
                        <Input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
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
                              <Label className="text-xs font-medium mb-1.5 block">{t('inventory.productName')} ({t('common.optional')})</Label>
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
                      {getDocumentIcon()}
                      <h3 className="font-heading font-semibold text-foreground text-lg sm:text-base leading-tight">{t('documents.documentSummary', { documentType: getDocumentTitle() })}</h3>
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
                        {t('documents.createAndSend')}
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
                        placeholder={t('purchases.searchByOrderOrSupplier', { defaultValue: 'Search by order # or supplier...' })}
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
                        <SelectItem value="shipped">{t('status.shipped')}</SelectItem>
                        <SelectItem value="received">{t('status.received')}</SelectItem>
                        <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedDocuments.size > 0 && (
                  <div className="card-elevated p-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {t('documents.documentsSelected', { count: selectedDocuments.size })}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleBulkDelete} className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        {t('documents.deleteSelected')}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            {t('documents.exportSelected')}
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={handleBulkExportPDF} disabled={selectedDocuments.size === 0}>
                            <FileText className="w-4 h-4 mr-2" />
                            {t('documents.exportAsPDF')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleBulkExportExcel} disabled={selectedDocuments.size === 0}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            {t('documents.exportAsExcel')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleBulkExportCSV} disabled={selectedDocuments.size === 0}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            {t('documents.exportAsCSV')}
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
                              aria-label={t('documents.selectAll')}
                            />
                          </div>
                        </TableHead>
                        <TableHead>{t('documents.orderNumber')}</TableHead>
                        <TableHead>{t('documents.supplier')}</TableHead>
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
                            {t('documents.noDocumentsFound')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDocuments.map((order) => (
                          <TableRow
                            key={order.id}
                            className={cn(
                              "hover:bg-section/50",
                              selectedDocuments.has(order.id) && "bg-primary/5"
                            )}
                          >
                            <TableCell className="w-[70px] min-w-[70px] px-3 text-center">
                              <div className="flex items-center justify-center w-full">
                                <Checkbox
                                  checked={selectedDocuments.has(order.id)}
                                  onCheckedChange={() => toggleDocumentSelection(order.id)}
                                  aria-label={t('documents.selectAll')}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="font-mono font-medium max-w-[120px] truncate">{order.id}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{order.supplier}</TableCell>
                            <TableCell className="max-w-[120px] truncate">{formatDate(order.date)}</TableCell>
                            <TableCell className="text-center number-cell">{Array.isArray(order.items) ? order.items.length : 0}</TableCell>
                            <TableCell className="text-right font-medium number-cell">{formatMAD(order.total)}</TableCell>
                            <TableCell className="text-center">
                              {renderStatusSelect(order)}
                            </TableCell>
                            <TableCell className="w-[180px]">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleViewDocument(order)}
                                  title={t('common.view')}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditDocument(order)}
                                  title={t('common.edit')}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDownloadPDF(order)}
                                  title={t('documents.downloadPDF')}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteDocument(order)}
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

        {/* Delivery Note Tab */}
        <TabsContent value="delivery_note" className="space-y-6">
          <Tabs defaultValue="create" className="space-y-6">
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
                    <h3 className="font-heading font-semibold text-foreground mb-4">{t('purchases.deliveryInformation')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('purchases.selectSupplier')}</Label>
                        <Select value={formSupplier} onValueChange={setFormSupplier}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('documents.chooseSupplier')} />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.company || supplier.name}
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
                        <div className="flex items-center justify-between">
                          <Label>{t('documents.deliveryNoteNumber')}</Label>
                          {isManualId ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setIsManualId(false);
                                setManualDocumentId('');
                              }}
                              className="h-6 text-xs"
                            >
                              {t('common.autoGenerate')}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsManualId(true)}
                              className="h-6 text-xs text-muted-foreground hover:text-foreground"
                            >
                              {t('common.manualEntry')}
                            </Button>
                          )}
                        </div>
                        {isManualId ? (
                          <Input
                            placeholder={t('documents.enterDNNumber')}
                            value={manualDocumentId}
                            onChange={(e) => setManualDocumentId(e.target.value)}
                            className="bg-background"
                          />
                        ) : (
                          <Input placeholder={t('common.autoGenerated')} disabled />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>{t('documents.referencePurchaseOrder')}</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder={t('purchases.linkToPOOrDN')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bc1">BC-01/26/0001</SelectItem>
                            <SelectItem value="bc2">BC-01/26/0002</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>{t('documents.deliveryAddress')}</Label>
                        <Input placeholder={t('documents.clientDeliveryAddress')} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>{t('settings.warehouses')}</Label>
                        <Select value={formWarehouse} onValueChange={setFormWarehouse}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('settings.activeWarehouse')} />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses.map((w) => (
                              <SelectItem key={w.id} value={w.id}>
                                {w.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="card-elevated p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-heading font-semibold text-foreground">{t('purchases.receivedItems', { defaultValue: 'Received Items' })}</h3>
                      <Button variant="outline" size="sm" onClick={addItem} className="gap-2">
                        <Plus className="w-4 h-4" />
                        {t('documents.addItem')}
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div key={item.id} className="p-4 border border-border rounded-lg space-y-4 bg-card">
                          <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 md:col-span-5">
                              <Label className="text-xs font-medium mb-1.5 block">{t('documents.productOptional')}</Label>
                              <ProductSearch
                                products={products}
                                value={item.productId}
                                onSelect={(product) => handleProductSelect(item.id, product)}
                                placeholder={t('documents.searchProduct')}
                              />
                            </div>
                            <div className="col-span-12 md:col-span-7">
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
                            <div className="col-span-3 md:col-span-2">
                              <Label className="text-xs font-medium mb-1.5 block">{t('common.quantity')}</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                className="w-full"
                              />
                            </div>
                            <div className="col-span-4 md:col-span-4">
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
                            <div className="col-span-3 md:col-span-4">
                              <Label className="text-xs font-medium mb-1.5 block">{t('documents.totalMAD')}</Label>
                              <Input value={formatMAD(item.total)} disabled className="w-full font-medium" />
                            </div>
                            <div className="col-span-2 md:col-span-2 flex justify-end">
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
                </div>

                <div className="space-y-6">
                  <div className="card-elevated p-6 sticky top-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="w-5 h-5 text-primary" />
                      <h3 className="font-heading font-semibold text-foreground">{t('documents.documentSummary', { documentType: t('documents.deliveryNote') })}</h3>
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
                        {t('documents.createDeliveryNote')}
                      </Button>
                      <Button variant="outline" className="w-full gap-2">
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
                        placeholder={t('purchases.searchByNoteOrSupplier', { defaultValue: 'Search by note # or supplier...' })}
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
                        <SelectItem value="in_transit">{t('status.inTransit')}</SelectItem>
                        <SelectItem value="delivered">{t('status.delivered')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedDocuments.size > 0 && (
                  <div className="card-elevated p-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {t('documents.documentsSelected', { count: selectedDocuments.size })}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleBulkDelete} className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        {t('documents.deleteSelected')}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            {t('documents.exportSelected')}
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={handleBulkExportPDF} disabled={selectedDocuments.size === 0}>
                            <FileText className="w-4 h-4 mr-2" />
                            {t('documents.exportAsPDF')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleBulkExportExcel} disabled={selectedDocuments.size === 0}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            {t('documents.exportAsExcel')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleBulkExportCSV} disabled={selectedDocuments.size === 0}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            {t('documents.exportAsCSV')}
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
                              aria-label={t('documents.selectAll')}
                            />
                          </div>
                        </TableHead>
                        <TableHead>{t('documents.noteNumber')}</TableHead>
                        <TableHead>{t('documents.supplier')}</TableHead>
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
                            {t('documents.noDocumentsFound')}
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
                                  aria-label={t('documents.selectAll')}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="font-mono font-medium max-w-[120px] truncate">{doc.id}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{doc.supplier}</TableCell>
                            <TableCell className="max-w-[120px] truncate">{formatDate(doc.date)}</TableCell>
                            <TableCell className="text-center number-cell">{Array.isArray(doc.items) ? doc.items.length : 0}</TableCell>
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
                                  title={t('common.view')}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditDocument(doc)}
                                  title={t('common.edit')}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDownloadPDF(doc)}
                                  title={t('documents.downloadPDF')}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handlePrintPDF(doc)}
                                  title={t('common.print', { defaultValue: 'Print' })}
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

        {/* Invoice Tab */}
        <TabsContent value="invoice" className="space-y-6">
          <Tabs defaultValue="create" className="space-y-6">
            <TabsList className="bg-section border border-border rounded-lg p-1.5 gap-1.5">
              <TabsTrigger
                value="create"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                {t('documents.createPurchaseInvoice')}
              </TabsTrigger>
              <TabsTrigger
                value="list"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <FileText className="w-4 h-4" />
                {t('documents.allPurchaseInvoices')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="card-elevated p-6">
                    <h3 className="font-heading font-semibold text-foreground mb-4">{t('purchases.invoiceInformation')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('purchases.selectSupplier')}</Label>
                        <Select value={formSupplier} onValueChange={setFormSupplier}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('documents.chooseSupplier')} />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.company || supplier.name}
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
                        <div className="flex items-center justify-between">
                          <Label>{t('documents.invoiceNumber')}</Label>
                          {isManualId ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIsManualId(false);
                                setManualDocumentId('');
                              }}
                              className="h-6 text-xs"
                            >
                              {t('common.autoGenerate')}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsManualId(true)}
                              className="h-6 text-xs text-muted-foreground hover:text-foreground"
                            >
                              {t('common.manualEntry')}
                            </Button>
                          )}
                        </div>
                        {isManualId ? (
                          <Input
                            placeholder={t('documents.enterInvoiceNumber')}
                            value={manualDocumentId}
                            onChange={(e) => setManualDocumentId(e.target.value)}
                            className="bg-background"
                          />
                        ) : (
                          <Input placeholder={t('common.autoGenerated')} disabled />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>{t('documents.dueDate')}</Label>
                        <Input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('documents.paymentMethod')}</Label>
                        <Select value={formPaymentMethod} onValueChange={(value) => setFormPaymentMethod(value as 'cash' | 'check' | 'bank_transfer')}>
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
                      {formPaymentMethod === 'check' && (
                        <div className="space-y-2 md:col-span-2 p-4 bg-muted/40 rounded-lg border border-border">
                          <Label className="font-medium flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-primary" />
                            {t('documents.checkNumber')}
                          </Label>
                          <Input
                            placeholder={t('documents.enterCheckNumber', { defaultValue: 'Entrer le numéro du chèque' })}
                            value={formCheckNumber}
                            onChange={(e) => setFormCheckNumber(e.target.value)}
                            className="bg-background"
                          />
                        </div>
                      )}
                      <div className="space-y-2 md:col-span-2">
                        <Label>{t('purchases.referenceDocuments')}</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder={t('purchases.linkToPOOrDN')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t('common.none')}</SelectItem>
                            {/* In the future, we could map existing purchaseOrders or deliveryNotes here */}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2 p-4 bg-muted/40 rounded-lg border border-border">
                        <Label className="font-medium flex items-center gap-2 mb-2">
                          <Paperclip className="w-4 h-4 text-primary" />
                          {t('common.attachment')} (Image/PDF)
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            key={selectedFile ? 'file-selected' : 'file-empty'}
                            type="file"
                            accept="image/*,application/pdf"
                            className="cursor-pointer bg-background"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setSelectedFile(file);
                                if (file.type.startsWith('image/')) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setFilePreview(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                } else {
                                  setFilePreview(null);
                                }
                              }
                            }}
                          />
                          {selectedFile && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedFile(null);
                                setFilePreview(null);
                              }}
                              className="text-destructive hover:text-destructive shrink-0"
                            >
                              <FileX className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        {selectedFile && (
                          <div className="mt-2 text-sm text-muted-foreground flex items-start gap-3 p-2 bg-background rounded-md border border-border shadow-sm">
                            {filePreview ? (
                              <img src={filePreview} alt="Preview" className="h-12 w-12 object-cover rounded-md border" />
                            ) : (
                              <div className="h-12 w-12 bg-muted rounded-md border flex items-center justify-center shrink-0">
                                <FileText className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate text-foreground">{selectedFile.name}</p>
                              <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                            </div>
                          </div>
                        )}
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
                            <div className="col-span-12 md:col-span-5">
                              <Label className="text-xs font-medium mb-1.5 block">{t('documents.productOptional')}</Label>
                              <ProductSearch
                                products={products}
                                value={item.productId}
                                onSelect={(product) => handleProductSelect(item.id, product)}
                                placeholder={t('documents.searchProduct')}
                              />
                            </div>
                            <div className="col-span-12 md:col-span-7">
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
                            <div className="col-span-3 md:col-span-2">
                              <Label className="text-xs font-medium mb-1.5 block">{t('common.quantity')}</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                className="w-full"
                              />
                            </div>
                            <div className="col-span-4 md:col-span-4">
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
                            <div className="col-span-3 md:col-span-4">
                              <Label className="text-xs font-medium mb-1.5 block">{t('documents.totalMAD')}</Label>
                              <Input value={formatMAD(item.total)} disabled className="w-full font-medium" />
                            </div>
                            <div className="col-span-2 md:col-span-2 flex justify-end">
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
                </div>

                <div className="space-y-6">
                  <div className="card-elevated p-6 sticky top-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Receipt className="w-5 h-5 text-primary" />
                      <h3 className="font-heading font-semibold text-foreground">{t('documents.documentSummary', { documentType: t('documents.purchaseInvoice') })}</h3>
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
                        {t('purchases.createAndRecordInvoice')}
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
                        placeholder={t('purchases.searchByInvoiceOrSupplier')}
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
                      {t('documents.documentsSelected', { count: selectedDocuments.size })}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleBulkDelete} className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        {t('documents.deleteSelected')}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            {t('documents.exportSelected')}
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={handleBulkExportPDF} disabled={selectedDocuments.size === 0}>
                            <FileText className="w-4 h-4 mr-2" />
                            {t('documents.exportAsPDF')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleBulkExportExcel} disabled={selectedDocuments.size === 0}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            {t('documents.exportAsExcel')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleBulkExportCSV} disabled={selectedDocuments.size === 0}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            {t('documents.exportAsCSV')}
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
                              aria-label={t('documents.selectAll')}
                            />
                          </div>
                        </TableHead>
                        <TableHead>{t('documents.invoiceNumber')}</TableHead>
                        <TableHead>{t('documents.supplier')}</TableHead>
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
                            {t('documents.noDocumentsFound')}
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
                                  aria-label={t('documents.selectAll')}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="font-mono font-medium max-w-[120px] truncate">{doc.id}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{doc.supplier}</TableCell>
                            <TableCell className="max-w-[120px] truncate">{formatDate(doc.date)}</TableCell>
                            <TableCell className="text-center number-cell">{Array.isArray(doc.items) ? doc.items.length : 0}</TableCell>
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
                                  title={t('common.view')}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditDocument(doc)}
                                  title={t('common.edit')}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDownloadPDF(doc)}
                                  title={t('documents.downloadPDF')}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handlePrintPDF(doc)}
                                  title={t('common.print', { defaultValue: 'Print' })}
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

        {/* Statement Tab */}
        <TabsContent value="statement" className="space-y-6">
          <Tabs defaultValue="statistics" className="space-y-6">
            <TabsList className="bg-section border border-border rounded-lg p-1.5 gap-1.5">
              <TabsTrigger
                value="statistics"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <TrendingUp className="w-4 h-4" />
                {t('purchases.invoiceStatistics')}
              </TabsTrigger>
              <TabsTrigger
                value="list"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <FileText className="w-4 h-4" />
                {t('documents.allStatements')}
              </TabsTrigger>
            </TabsList>

            {/* Purchase Invoice Statistics Tab */}
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
                        {purchaseInvoiceStats.totalInvoices}
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
                        {purchaseInvoiceStats.paidInvoices}
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
                        {purchaseInvoiceStats.unpaidInvoices}
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
                        {purchaseInvoiceStats.overdueInvoices}
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
                    <CurrencyDisplay amount={purchaseInvoiceStats.totalAmount} />
                  </p>
                </div>
                <div className="card-elevated p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">{t('sales.paidAmount')}</p>
                    <CheckSquare className="w-4 h-4 text-success" />
                  </div>
                  <p className="text-2xl font-heading font-bold text-success">
                    <CurrencyDisplay amount={purchaseInvoiceStats.paidAmount} />
                  </p>
                </div>
                <div className="card-elevated p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">{t('sales.unpaidAmount')}</p>
                    <FileX className="w-4 h-4 text-warning" />
                  </div>
                  <p className="text-2xl font-heading font-bold text-warning">
                    <CurrencyDisplay amount={purchaseInvoiceStats.unpaidAmount} />
                  </p>
                </div>
                <div className="card-elevated p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">{t('sales.overdueAmount')}</p>
                    <TrendingUp className="w-4 h-4 text-destructive" />
                  </div>
                  <p className="text-2xl font-heading font-bold text-destructive">
                    <CurrencyDisplay amount={purchaseInvoiceStats.overdueAmount} />
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
                        {purchaseInvoices.filter(inv => inv.paymentMethod === 'cash').length} {t('documents.invoices')}
                      </span>
                    </div>
                    <p className="text-xl font-heading font-bold text-foreground">
                      <CurrencyDisplay amount={purchaseInvoiceStats.paymentMethodBreakdown.cash} />
                    </p>
                  </div>
                  <div className="p-4 bg-section rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">{t('paymentMethods.check')}</p>
                      <span className="text-xs font-medium text-muted-foreground">
                        {purchaseInvoices.filter(inv => inv.paymentMethod === 'check').length} {t('documents.invoices')}
                      </span>
                    </div>
                    <p className="text-xl font-heading font-bold text-foreground">
                      <CurrencyDisplay amount={purchaseInvoiceStats.paymentMethodBreakdown.check} />
                    </p>
                  </div>
                  <div className="p-4 bg-section rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">{t('paymentMethods.bankTransfer')}</p>
                      <span className="text-xs font-medium text-muted-foreground">
                        {purchaseInvoices.filter(inv => inv.paymentMethod === 'bank_transfer').length} {t('documents.invoices')}
                      </span>
                    </div>
                    <p className="text-xl font-heading font-bold text-foreground">
                      <CurrencyDisplay amount={purchaseInvoiceStats.paymentMethodBreakdown.bank_transfer} />
                    </p>
                  </div>
                </div>
              </div>

              {/* Invoice Breakdown Table */}
              <div className="card-elevated overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h3 className="font-heading font-semibold text-foreground">{t('purchases.invoiceBreakdownByStatus')}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t('purchases.detailedViewPurchaseInvoices')}</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="data-table-header hover:bg-section">
                      <TableHead>{t('documents.invoiceNumber')}</TableHead>
                      <TableHead>{t('documents.supplier')}</TableHead>
                      <TableHead>{t('common.date')}</TableHead>
                      <TableHead className="text-right">{t('documents.amountMAD')}</TableHead>
                      <TableHead>{t('documents.paymentMethod')}</TableHead>
                      <TableHead className="text-center">{t('common.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {t('documents.noDocumentsFound')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      purchaseInvoices.map((invoice) => (
                        <TableRow key={invoice.id} className="hover:bg-section/50">
                          <TableCell className="font-mono font-medium">{invoice.id}</TableCell>
                          <TableCell>{invoice.supplier}</TableCell>
                          <TableCell>{formatDate(invoice.date)}</TableCell>
                          <TableCell className="text-right font-medium">
                            <CurrencyDisplay amount={invoice.total} />
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{formatPaymentMethod(invoice.paymentMethod)}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(invoice.status)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Supplier Breakdown */}
              <div className="card-elevated overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h3 className="font-heading font-semibold text-foreground">{t('purchases.invoiceBreakdownBySupplier', { defaultValue: 'Invoice Breakdown by Supplier' })}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t('purchases.summaryInvoicesPerSupplier', { defaultValue: 'Summary of invoices per supplier with paid/unpaid amounts' })}</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="data-table-header hover:bg-section">
                      <TableHead>{t('documents.supplier')}</TableHead>
                      <TableHead className="text-right">{t('sales.totalInvoices')}</TableHead>
                      <TableHead className="text-right">{t('documents.paid')}</TableHead>
                      <TableHead className="text-right">{t('documents.unpaid')}</TableHead>
                      <TableHead className="text-right">{t('sales.totalAmount')}</TableHead>
                      <TableHead className="text-right">{t('sales.paidAmount')}</TableHead>
                      <TableHead className="text-right">{t('sales.unpaidAmount')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(purchaseInvoiceStats.supplierBreakdown).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t('purchases.noSupplierDataAvailable', { defaultValue: 'No supplier data available' })}
                        </TableCell>
                      </TableRow>
                    ) : (
                      Object.entries(purchaseInvoiceStats.supplierBreakdown)
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([supplier, stats]) => (
                          <TableRow key={supplier} className="hover:bg-section/50">
                            <TableCell className="font-medium">{supplier}</TableCell>
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

              {/* Status Summary */}
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
                        <span className="text-sm font-medium">{purchaseInvoiceStats.paidInvoices}</span>
                        <span className="text-sm font-medium text-success">
                          <CurrencyDisplay amount={purchaseInvoiceStats.paidAmount} />
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileX className="w-4 h-4 text-warning" />
                        <span className="text-sm text-muted-foreground">{t('sales.unpaidPending')}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">
                          {purchaseInvoiceStats.unpaidInvoices - purchaseInvoiceStats.overdueInvoices}
                        </span>
                        <span className="text-sm font-medium text-warning">
                          <CurrencyDisplay amount={purchaseInvoiceStats.unpaidAmount - purchaseInvoiceStats.overdueAmount} />
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-destructive" />
                        <span className="text-sm text-muted-foreground">{t('status.overdue')}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">{purchaseInvoiceStats.overdueInvoices}</span>
                        <span className="text-sm font-medium text-destructive">
                          <CurrencyDisplay amount={purchaseInvoiceStats.overdueAmount} />
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{t('status.draft')}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">{purchaseInvoiceStats.draftInvoices}</span>
                        <span className="text-sm font-medium text-muted-foreground">-</span>
                      </div>
                    </div>
                    {purchaseInvoiceStats.cancelledInvoices > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileX className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{t('status.cancelled')}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium">{purchaseInvoiceStats.cancelledInvoices}</span>
                          <span className="text-sm font-medium text-muted-foreground">-</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="card-elevated p-6">
                  <h3 className="font-heading font-semibold text-foreground mb-4">{t('sales.paymentSummary')}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">{t('purchases.totalInvoiceAmount', { defaultValue: 'Total Invoice Amount' })}</span>
                      <span className="text-lg font-heading font-bold text-foreground">
                        <CurrencyDisplay amount={purchaseInvoiceStats.totalAmount} />
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">{t('sales.paidAmount')}</span>
                      <span className="text-lg font-heading font-bold text-success">
                        <CurrencyDisplay amount={purchaseInvoiceStats.paidAmount} />
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">{t('purchases.outstandingAmount', { defaultValue: 'Outstanding Amount' })}</span>
                      <span className="text-lg font-heading font-bold text-warning">
                        <CurrencyDisplay amount={purchaseInvoiceStats.unpaidAmount} />
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 text-lg border-t-2 border-border mt-2">
                      <span className="font-semibold text-foreground">{t('purchases.paymentRate', { defaultValue: 'Payment Rate' })}</span>
                      <span className="font-heading font-bold text-primary">
                        {purchaseInvoiceStats.totalAmount > 0
                          ? ((purchaseInvoiceStats.paidAmount / purchaseInvoiceStats.totalAmount) * 100).toFixed(1)
                          : 0}%
                      </span>
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
                        placeholder={t('documents.searchByStatementOrClient')}
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
                        <SelectItem value="current">{t('status.current')}</SelectItem>
                        <SelectItem value="overdue">{t('status.overdue')}</SelectItem>
                        <SelectItem value="paid">{t('status.paid')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedDocuments.size > 0 && (
                  <div className="card-elevated p-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {t('documents.documentsSelected', { count: selectedDocuments.size })}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleBulkDelete} className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        {t('documents.deleteSelected')}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            {t('documents.exportSelected')}
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={handleBulkExportPDF} disabled={selectedDocuments.size === 0}>
                            <FileText className="w-4 h-4 mr-2" />
                            {t('documents.exportAsPDF')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleBulkExportExcel} disabled={selectedDocuments.size === 0}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            {t('documents.exportAsExcel')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleBulkExportCSV} disabled={selectedDocuments.size === 0}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            {t('documents.exportAsCSV')}
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
                              aria-label={t('documents.selectAll')}
                            />
                          </div>
                        </TableHead>
                        <TableHead>Statement #</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount (TTC)</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
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
                            <TableCell className="font-mono font-medium max-w-[120px] truncate">{doc.id}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{doc.supplier}</TableCell>
                            <TableCell className="max-w-[120px] truncate">{formatDate(doc.date)}</TableCell>
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
                                  title="Delete"
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
                    <Label className="text-muted-foreground">Supplier</Label>
                    <p className="font-medium">{getSupplierDisplayName(viewingDocument)}</p>
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
                          {viewingDocument.items.map((item: any, index: number) => (
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
                    <Label>Supplier</Label>
                    <Input
                      value={editFormData.supplier || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, supplier: e.target.value })}
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
                      onValueChange={(value) => setEditFormData({ ...editFormData, status: value as PurchaseDocument['status'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {editingDocument.type === 'invoice' && (
                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select
                        value={editFormData.paymentMethod || editingDocument.paymentMethod || 'cash'}
                        onValueChange={(value) => setEditFormData({ ...editFormData, paymentMethod: value as PurchaseDocument['paymentMethod'] })}
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
              Are you sure you want to delete <strong>{getDocumentTitle()} #{deletingDocument?.id}</strong> for <strong>{deletingDocument?.supplier}</strong>?
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