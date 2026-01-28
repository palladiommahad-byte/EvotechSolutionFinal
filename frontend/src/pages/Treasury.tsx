import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Building2,
  Coins,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Trash2,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn, formatDate } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';
import { formatMAD, VAT_RATE } from '@/lib/moroccan-utils';
import { useContacts } from '@/contexts/ContactsContext';
import { useTreasury } from '@/contexts/TreasuryContext';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { useToast } from '@/hooks/use-toast';
import { invoicesService } from '@/services/invoices.service';
import { purchaseOrdersService } from '@/services/purchase-orders.service';
import { purchaseInvoicesService } from '@/services/purchase-invoices.service';
import { useQuery } from '@tanstack/react-query';
// Recharts removed as unused
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Textarea } from '@/components/ui/textarea';

// Import types from context
import type { Payment, BankAccount, WarehouseCash } from '@/contexts/TreasuryContext';

// CashFlowData interface removed as unused

// Interfaces for Sales and Purchases integration
interface SalesInvoice {
  id: string;
  client: string;
  date: string;
  items: number | any[];
  total: number;
  status: string;
  type: 'invoice';
  paymentMethod?: 'cash' | 'check' | 'bank_transfer';
  dueDate?: string;
}

interface PurchaseOrder {
  id: string;
  supplier: string;
  date: string;
  items: number | any[];
  total: number;
  status: string;
  type: 'purchase_order';
  paymentMethod?: 'cash' | 'check' | 'bank_transfer';
  dueDate?: string;
}

// Mock data removed - using TreasuryContext and invoicesService instead

export const Treasury = () => {
  const { t } = useTranslation();


  const { clients, suppliers } = useContacts();
  const { toast } = useToast();

  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [selectedPurchaseInvoices, setSelectedPurchaseInvoices] = useState<Set<string>>(new Set());

  const toggleSelectAll = () => {
    if (selectedTransactions.size === filteredBankStatementData.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filteredBankStatementData.map(i => i.id)));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    toggleSelectAll();
  };

  const handleSelectTransaction = (id: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedTransactions(newSelected);
  };

  const handleExportSelected = async () => {
    const dataToExport = filteredBankStatementData.filter(i => selectedTransactions.has(i.id));
    if (dataToExport.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner des transactions à exporter",
        variant: "destructive"
      });
      return;
    }

    const mappedData = dataToExport.map(item => ({
      date: item.date,
      description: item.description,
      type: item.transactionType === 'credit' ? 'Crédit' : 'Débit',
      amount: item.amount,
      balance: item.runningBalance
    }));

    const columns = [
      { key: 'date', header: 'Date', width: 15 },
      { key: 'description', header: 'Description', width: 40 },
      { key: 'type', header: 'Type', width: 10 },
      { key: 'amount', header: 'Montant (DH)', width: 15 },
      { key: 'balance', header: 'Solde (DH)', width: 15 }
    ];

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/reports/export-custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          data: mappedData,
          columns,
          title: 'Relevé Bancaire'
        })
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Releve_Bancaire_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast({
        title: "Succès",
        description: "Export réussi",
        variant: "success"
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'export",
        variant: "destructive"
      });
    }
  };

  const toggleSelectAllInvoices = () => {
    if (selectedInvoices.size === allInvoicesData.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(allInvoicesData.map(i => i.id)));
    }
  };

  const handleSelectAllInvoices = () => {
    toggleSelectAllInvoices();
  };

  const handleSelectInvoice = (id: string) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedInvoices(newSelected);
  };

  const handleExportSelectedInvoices = async () => {
    const dataToExport = allInvoicesData.filter(i => selectedInvoices.has(i.id));
    if (dataToExport.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner des factures à exporter",
        variant: "destructive"
      });
      return;
    }

    const mappedData = dataToExport.map(item => {
      const client = clients.find(c => c.id === item.client_id);
      const clientName = client?.company || client?.name || 'Unknown Client';
      return {
        date: item.date,
        invoiceNumber: item.document_id,
        client: clientName,
        subtotal: item.subtotal,
        vat: item.vat_amount,
        total: item.total,
        status: item.status
      };
    });

    const columns = [
      { key: 'invoiceNumber', header: 'N° Facture', width: 20 },
      { key: 'client', header: 'Client', width: 30 },
      { key: 'date', header: 'Date', width: 15 },
      { key: 'subtotal', header: 'Sous-total', width: 15 },
      { key: 'vat', header: 'TVA', width: 15 },
      { key: 'total', header: 'Total', width: 15 },
      { key: 'status', header: 'Statut', width: 15 }
    ];

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/reports/export-custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          data: mappedData,
          columns,
          title: 'Aperçu des Factures'
        })
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Factures_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast({
        title: "Succès",
        description: "Export réussi",
        variant: "success"
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'export",
        variant: "destructive"
      });
    }
  };


  const toggleSelectAllPurchaseInvoices = () => {
    if (selectedPurchaseInvoices.size === purchaseInvoicesData.length) {
      setSelectedPurchaseInvoices(new Set());
    } else {
      setSelectedPurchaseInvoices(new Set(purchaseInvoicesData.map(i => i.id)));
    }
  };

  const handleSelectAllPurchaseInvoices = () => {
    toggleSelectAllPurchaseInvoices();
  };

  const handleSelectPurchaseInvoice = (id: string) => {
    const newSelected = new Set(selectedPurchaseInvoices);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedPurchaseInvoices(newSelected);
  };

  const handleExportSelectedPurchaseInvoices = async () => {
    const dataToExport = purchaseInvoicesData.filter(i => selectedPurchaseInvoices.has(i.id));
    if (dataToExport.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner des factures d'achat à exporter",
        variant: "destructive"
      });
      return;
    }

    const mappedData = dataToExport.map(item => {
      const supplier = suppliers.find(s => s.id === item.supplier_id);
      const supplierName = supplier?.company || supplier?.name || 'Unknown Supplier';
      return {
        date: item.date,
        invoiceNumber: item.document_id,
        supplier: supplierName,
        subtotal: item.subtotal,
        vat: item.vat_amount || 0,
        total: item.total,
        status: item.status
      };
    });

    const columns = [
      { key: 'invoiceNumber', header: 'N° Facture', width: 20 },
      { key: 'supplier', header: 'Fournisseur', width: 30 },
      { key: 'date', header: 'Date', width: 15 },
      { key: 'subtotal', header: 'Sous-total', width: 15 },
      { key: 'vat', header: 'TVA', width: 15 },
      { key: 'total', header: 'Total', width: 15 },
      { key: 'status', header: 'Statut', width: 15 }
    ];

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/reports/export-custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          data: mappedData,
          columns,
          title: 'Aperçu des Achats'
        })
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Achats_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast({
        title: "Succès",
        description: "Export réussi",
        variant: "success"
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'export",
        variant: "destructive"
      });
    }
  };

  const {
    bankAccounts,
    warehouseCash,
    salesPayments,
    purchasePayments,
    totalBank,
    totalWarehouseCash: totalWarehouseCashValue,
    realTimeBalance,
    netLiquidity,
    totalCashedSales,
    totalSupplierBillsPaid,
    tvaReserve,
    collectedTVA,
    recoverableTVA,
    netTVADue,
    expectedInflowPayments,
    totalExpectedInflow,
    upcomingPayments,
    totalUpcomingPayments,
    bankStatementData,
    addBankAccount,
    addPayment,
    updatePaymentStatus,
    deleteBankAccount,
    isLoading,
  } = useTreasury();
  const { warehouses } = useWarehouse();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [salesSearchQuery, setSalesSearchQuery] = useState('');
  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState('');
  const [salesStatusFilter, setSalesStatusFilter] = useState<string>('all');
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState<string>('all');
  const [salesPaymentMethodFilter, setSalesPaymentMethodFilter] = useState<string>('all');
  const [purchasePaymentMethodFilter, setPurchasePaymentMethodFilter] = useState<string>('all');
  const [paymentType, setPaymentType] = useState<'sales' | 'purchase'>('sales');
  const [isAddBankOpen, setIsAddBankOpen] = useState(false);
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);
  const [dateFilterRange, setDateFilterRange] = useState<string>('all');

  // invoicesData fetch for aging removed as unused

  // Fetch all invoices for insights (recent invoices with tax breakdown)
  const { data: allInvoicesData = [] } = useQuery({
    queryKey: ['invoices', 'all'],
    queryFn: () => invoicesService.getAll(),
    staleTime: 30000,
  });

  // Fetch purchase orders and purchase invoices for insights
  const { data: purchaseOrdersData = [] } = useQuery({
    queryKey: ['purchases', 'purchase_orders', 'treasury'],
    queryFn: () => purchaseOrdersService.getAll(),
    staleTime: 30000,
  });

  const { data: purchaseInvoicesData = [] } = useQuery({
    queryKey: ['purchases', 'purchase_invoices', 'treasury'],
    queryFn: () => purchaseInvoicesService.getAll(),
    staleTime: 30000,
  });

  // Form state for Add Payment dialog
  const [formInvoiceId, setFormInvoiceId] = useState('');
  const [formClient, setFormClient] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<'cash' | 'check' | 'bank_transfer'>('cash');
  const [formBank, setFormBank] = useState('');
  const [formCheckNumber, setFormCheckNumber] = useState('');
  const [formMaturityDate, setFormMaturityDate] = useState('');
  const [formWarehouse, setFormWarehouse] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);

  // Form state for Add Bank Account dialog
  const [formBankName, setFormBankName] = useState('');
  const [formCustomBankName, setFormCustomBankName] = useState('');
  const [formBankAccountName, setFormBankAccountName] = useState('');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formInitialBalance, setFormInitialBalance] = useState('');

  // Delete confirmation state
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);

  const handleDeleteBankAccount = (id: string) => {
    setAccountToDelete(id);
    setDeleteConfirmationOpen(true);
  };

  const confirmDeleteBankAccount = async () => {
    if (!accountToDelete) return;

    try {
      await deleteBankAccount(accountToDelete);
      toast({
        title: t('common.success', { defaultValue: 'Success' }),
        description: t('treasury.bankAccountDeleted', { defaultValue: 'Bank account deleted successfully' }),
        variant: 'default', // success
      });
    } catch (error) {
      toast({
        title: t('common.error', { defaultValue: 'Error' }),
        description: t('treasury.errorDeletingBankAccount', { defaultValue: 'Failed to delete bank account' }),
        variant: 'destructive',
      });
    } finally {
      setDeleteConfirmationOpen(false);
      setAccountToDelete(null);
    }
  };

  // Calculate totals - now using values from context
  // These are calculated in TreasuryContext and passed down

  // Date filter helper function (reusable)
  const matchesDateFilter = (date: string): boolean => {
    if (dateFilterRange === 'all') return true;

    const paymentDate = new Date(date);
    paymentDate.setHours(0, 0, 0, 0);

    const now = new Date();
    now.setHours(23, 59, 59, 999);

    let startDate: Date | null = null;
    let endDate: Date = now;

    switch (dateFilterRange) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last7days':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last30days':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last90days':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 90);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'lastYear':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        return true;
    }

    if (startDate) {
      return paymentDate >= startDate && paymentDate <= endDate;
    }

    return true;
  };

  // Calculate TVA Reserve, Expected Inflow, Upcoming Payments, Net TVA Due
  // These are calculated in TreasuryContext, but we need to apply date filter here
  const filteredExpectedInflowPayments = expectedInflowPayments.filter(p => matchesDateFilter(p.date));
  const filteredTotalExpectedInflow = filteredExpectedInflowPayments.reduce((sum, p) => sum + p.amount, 0);

  const filteredUpcomingPayments = upcomingPayments.filter(p => matchesDateFilter(p.date));
  const filteredTotalUpcomingPayments = filteredUpcomingPayments.reduce((sum, p) => sum + p.amount, 0);

  // Filter bank statement data by date
  const filteredBankStatementData = bankStatementData.filter(entry => matchesDateFilter(entry.date));

  // Create a set of existing invoice document IDs for validation
  // Treasury payments store document_id (e.g., "FC-01/26/0002") as invoice_id
  const existingInvoiceDocumentIds = useMemo(() => {
    return new Set(allInvoicesData.map(inv => inv.document_id));
  }, [allInvoicesData]);

  // Filter sales and purchase payments for display
  // Only show payments that have a corresponding invoice in the database
  const filteredSalesPayments = salesPayments.filter(payment => {
    // Validate that the invoice exists by checking document_id (invoice_number)
    const invoiceExists = payment.invoiceNumber ? existingInvoiceDocumentIds.has(payment.invoiceNumber) : false;
    if (!invoiceExists) return false;

    const matchesSearch =
      payment.invoiceNumber.toLowerCase().includes(salesSearchQuery.toLowerCase()) ||
      payment.entity.toLowerCase().includes(salesSearchQuery.toLowerCase()) ||
      (payment.checkNumber && payment.checkNumber.toLowerCase().includes(salesSearchQuery.toLowerCase()));

    const matchesStatus = salesStatusFilter === 'all' || payment.status === salesStatusFilter;
    const matchesMethod = salesPaymentMethodFilter === 'all' || payment.paymentMethod === salesPaymentMethodFilter;
    const matchesDate = matchesDateFilter(payment.date);

    return matchesSearch && matchesStatus && matchesMethod && matchesDate;
  });

  // Create sets of existing purchase document IDs for validation
  // Treasury payments store document_id (e.g., "BC-01/26/0001") as invoice_id
  const existingPurchaseOrderDocumentIds = useMemo(() => {
    return new Set(purchaseOrdersData.map(po => po.document_id));
  }, [purchaseOrdersData]);

  const existingPurchaseInvoiceDocumentIds = useMemo(() => {
    return new Set(purchaseInvoicesData.map(pi => pi.document_id));
  }, [purchaseInvoicesData]);

  const filteredPurchasePayments = purchasePayments.filter(payment => {
    // Validate that the purchase document exists by checking document_id (invoice_number)
    const documentExists = payment.invoiceNumber ?
      (existingPurchaseOrderDocumentIds.has(payment.invoiceNumber) || existingPurchaseInvoiceDocumentIds.has(payment.invoiceNumber)) :
      false;
    if (!documentExists) return false;

    const matchesSearch =
      payment.invoiceNumber.toLowerCase().includes(purchaseSearchQuery.toLowerCase()) ||
      payment.entity.toLowerCase().includes(purchaseSearchQuery.toLowerCase()) ||
      (payment.checkNumber && payment.checkNumber.toLowerCase().includes(purchaseSearchQuery.toLowerCase()));

    const matchesStatus = purchaseStatusFilter === 'all' || payment.status === purchaseStatusFilter;
    const matchesMethod = purchasePaymentMethodFilter === 'all' || payment.paymentMethod === purchasePaymentMethodFilter;
    const matchesDate = matchesDateFilter(payment.date);

    return matchesSearch && matchesStatus && matchesMethod && matchesDate;
  });

  // calculateAging and agingData removed as unused

  // generateCashFlowData and cashFlowData removed as unused

  // Handle Add Payment
  const handleAddPayment = async () => {
    if (!formInvoiceId || !formClient || !formAmount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (formPaymentMethod === 'check' && (!formBank || !formCheckNumber || !formMaturityDate)) {
      toast({
        title: "Validation Error",
        description: "Check payments require Bank, Check Number, and Maturity Date.",
        variant: "destructive",
      });
      return;
    }

    if (formPaymentMethod === 'cash' && !formWarehouse) {
      toast({
        title: "Validation Error",
        description: "Cash payments require a warehouse selection.",
        variant: "destructive",
      });
      return;
    }

    const newPayment: Omit<Payment, 'id'> = {
      invoiceId: formInvoiceId,
      invoiceNumber: formInvoiceId,
      entity: formClient,
      amount: parseFloat(formAmount),
      paymentMethod: formPaymentMethod,
      bank: formPaymentMethod === 'check' || formPaymentMethod === 'bank_transfer' ? formBank : undefined,
      checkNumber: formPaymentMethod === 'check' ? formCheckNumber : undefined,
      maturityDate: formPaymentMethod === 'check' ? formMaturityDate : undefined,
      status: formPaymentMethod === 'check' ? 'in-hand' : 'cleared',
      date: new Date().toISOString().split('T')[0],
      warehouse: formPaymentMethod === 'cash' ? formWarehouse : undefined,
      notes: formNotes || undefined,
      type: paymentType,
    };

    try {
      await addPayment(newPayment, paymentType);

      // Reset form
      setFormInvoiceId('');
      setFormClient('');
      setFormAmount('');
      setFormBank('');
      setFormCheckNumber('');
      setFormMaturityDate('');
      setFormWarehouse('');
      setFormNotes('');
      setIsAddPaymentOpen(false);

      toast({
        title: "Payment Recorded",
        description: `${paymentType === 'sales' ? 'Sales' : 'Purchase'} payment of ${formatMAD(parseFloat(formAmount))} has been recorded successfully.`,
        variant: "success",
      });
    } catch (error) {
      console.error('Error adding payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle Add Bank Account
  const handleAddBankAccount = async () => {
    const bankNameFinal = formBankName === 'Other' ? formCustomBankName : formBankName;

    if (!bankNameFinal || !formBankAccountName || !formAccountNumber) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Bank, Account Name, and Account Number).",
        variant: "destructive",
      });
      return;
    }

    if (formBankName === 'Other' && !formCustomBankName) {
      toast({
        title: "Validation Error",
        description: "Please enter a custom bank name.",
        variant: "destructive",
      });
      return;
    }

    const initialBalance = parseFloat(formInitialBalance) || 0;

    const newBankAccount: Omit<BankAccount, 'id'> = {
      name: formBankAccountName,
      bank: bankNameFinal,
      accountNumber: formAccountNumber,
      balance: initialBalance,
    };

    try {
      await addBankAccount(newBankAccount);

      // Reset form
      setFormBankName('');
      setFormCustomBankName('');
      setFormBankAccountName('');
      setFormAccountNumber('');
      setFormInitialBalance('');
      setIsAddBankOpen(false);

      toast({
        title: "Bank Account Added",
        description: `${formBankAccountName} account has been added successfully.`,
        variant: "success",
      });
    } catch (error) {
      console.error('Error adding bank account:', error);
      toast({
        title: "Error",
        description: "Failed to add bank account. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Mark Sales Invoice as Paid (Reconciliation)
  const markInvoiceAsPaid = async (invoiceId: string) => {
    try {
      await invoicesService.updateStatus(invoiceId, 'paid');

      toast({
        title: "Invoice Marked as Paid",
        description: `Invoice ${invoiceId} has been marked as paid.`,
        variant: "success",
      });
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      toast({
        title: "Error",
        description: "Failed to update invoice status.",
        variant: "destructive",
      });
    }
  };

  // Mark Purchase Order as Settled (Reconciliation)
  // Note: Purchase orders are managed in the Purchases page, not in Treasury
  // This function is kept for compatibility but should be handled in Purchases page
  const markPurchaseOrderAsSettled = async (orderId: string) => {
    toast({
      title: "Info",
      description: "Purchase orders are managed in the Purchases page.",
    });
  };

  // Handle status update for checks
  const handleStatusUpdate = async (paymentId: string, newStatus: Payment['status'], type: 'sales' | 'purchase') => {
    try {
      await updatePaymentStatus(paymentId, newStatus, type);
      toast({
        title: "Status Updated",
        description: `Payment status updated to ${newStatus === 'in-hand' ? 'In-Hand' : newStatus === 'pending_bank' ? 'Pending Bank' : 'Cleared'}.`,
        variant: "success",
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: Payment['status']) => {
    switch (status) {
      case 'in-hand':
        return <StatusBadge status="warning">In-Hand</StatusBadge>;
      case 'pending_bank':
        return <StatusBadge status="info">Pending Bank</StatusBadge>;
      case 'cleared':
        return <StatusBadge status="success">Cleared</StatusBadge>;
    }
  };

  const getPaymentMethodIcon = (method: Payment['paymentMethod']) => {
    switch (method) {
      case 'cash':
        return <Coins className="w-4 h-4 text-success" />;
      case 'check':
        return <CreditCard className="w-4 h-4 text-warning" />;
      case 'bank_transfer':
        return <Building2 className="w-4 h-4 text-info" />;
    }
  };

  // Get human-readable date range label
  const getDateRangeLabel = (): string => {
    const labels: Record<string, string> = {
      'all': t('treasury.filter.allTime', { defaultValue: 'All Time' }),
      'today': t('treasury.filter.today', { defaultValue: 'Today' }),
      'last7days': t('treasury.filter.last7days', { defaultValue: 'Last 7 Days' }),
      'last30days': t('treasury.filter.last30days', { defaultValue: 'Last 30 Days' }),
      'last90days': t('treasury.filter.last90days', { defaultValue: 'Last 90 Days' }),
      'thisMonth': t('treasury.filter.thisMonth', { defaultValue: 'This Month' }),
      'lastMonth': t('treasury.filter.lastMonth', { defaultValue: 'Last Month' }),
      'thisYear': t('treasury.filter.thisYear', { defaultValue: 'This Year' }),
      'lastYear': t('treasury.filter.lastYear', { defaultValue: 'Last Year' }),
    };
    return labels[dateFilterRange] || 'All Time';
  };

  // Export handlers
  const handleExportExcel = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: t('common.error', { defaultValue: 'Error' }),
          description: 'Authentication required',
          variant: 'destructive',
        });
        return;
      }

      const res = await fetch(`http://localhost:3000/api/reports/export?type=treasury`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Treasury_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: t('common.success', { defaultValue: 'Success' }),
        description: t('treasury.exportSuccess', { defaultValue: 'Treasury report exported successfully' }),
        variant: 'default',
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: t('common.error', { defaultValue: 'Error' }),
        description: t('treasury.exportError', { defaultValue: 'Failed to export treasury report' }),
        variant: 'destructive',
      });
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">{t('treasury.title')}</h1>
          <p className="text-muted-foreground">{t('treasury.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={dateFilterRange} onValueChange={setDateFilterRange}>
            <SelectTrigger className="w-[160px] h-9">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <SelectValue placeholder={t('treasury.dateRange')} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('treasury.filter.allTime')}</SelectItem>
              <SelectItem value="today">{t('treasury.filter.today')}</SelectItem>
              <SelectItem value="last7days">{t('treasury.filter.last7days')}</SelectItem>
              <SelectItem value="last30days">{t('treasury.filter.last30days')}</SelectItem>
              <SelectItem value="last90days">{t('treasury.filter.last90days')}</SelectItem>
              <SelectItem value="thisMonth">{t('treasury.filter.thisMonth')}</SelectItem>
              <SelectItem value="lastMonth">{t('treasury.filter.lastMonth')}</SelectItem>
              <SelectItem value="thisYear">{t('treasury.filter.thisYear')}</SelectItem>
              <SelectItem value="lastYear">{t('treasury.filter.lastYear')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportExcel} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            {t('treasury.exportToExcel', { defaultValue: 'Styled Export (Beta)' })}
          </Button>
        </div>
      </div>

      {/* Liquidity Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10">
              <Building2 className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-heading font-bold text-foreground">
                {formatMAD(totalBank)}
              </p>
              <p className="text-sm text-muted-foreground">{t('treasury.totalBank')}</p>
            </div>
          </div>
          <div className="mt-4 space-y-1">
            {bankAccounts.map(acc => (
              <div key={acc.id} className="flex justify-between items-center text-xs text-muted-foreground group">
                <span className="font-medium">{acc.bank}</span>
                <span>{formatMAD(acc.balance)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <Coins className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-heading font-bold text-foreground">
                {formatMAD(totalWarehouseCashValue)}
              </p>
              <p className="text-sm text-muted-foreground">{t('treasury.totalWarehouseCash')}</p>
            </div>
          </div>
          <div className="mt-4 space-y-1">
            {warehouses.map((warehouse) => (
              <div key={warehouse.id} className="flex justify-between text-xs text-muted-foreground">
                <span>{warehouse.city}</span>
                <span>{formatMAD(warehouseCash[warehouse.id] || 0)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="kpi-card bg-primary/5 border-2 border-primary">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-heading font-bold text-primary">
                {formatMAD(realTimeBalance)}
              </p>
              <p className="text-sm text-muted-foreground">{t('treasury.realTimeBalance')}</p>
            </div>
          </div>
          <div className="mt-4 space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>{t('treasury.netLiquidity')}:</span>
              <span>{formatMAD(netLiquidity)}</span>
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          Loading treasury data...
        </div>
      )}



      <div className="grid grid-cols-1 gap-4">
        {/* Bank Statement */}
        {/* Bank Statement */}
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <h2 className="text-base font-heading font-semibold text-foreground">
                {t('treasury.bankStatement.title')}
              </h2>
              <Badge variant="outline" className="text-xs">
                {t('treasury.bankStatement.currentBalance')}: {formatMAD(totalBank)}
              </Badge>
            </div>
            {selectedTransactions.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSelected}
                className="h-8 text-xs gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                {t('common.export')} ({selectedTransactions.size})
              </Button>
            )}
          </div>
          <div className="overflow-y-auto h-[450px] border rounded-md relative">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-20 shadow-sm ring-1 ring-border/50">
                <TableRow className="data-table-header hover:bg-card">
                  <TableHead className="w-[50px] min-w-[50px] px-2 py-2 bg-card">
                    <Checkbox
                      checked={filteredBankStatementData.length > 0 && selectedTransactions.size === filteredBankStatementData.length}
                      onCheckedChange={handleSelectAll}
                      className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                  </TableHead>
                  <TableHead className="min-w-[90px] px-2 py-2 text-xs font-medium">{t('treasury.bankStatement.table.date')}</TableHead>
                  <TableHead className="min-w-[150px] px-2 py-2 text-xs font-medium">{t('treasury.bankStatement.table.description')}</TableHead>
                  <TableHead className="min-w-[80px] px-2 py-2 text-xs font-medium">{t('treasury.bankStatement.table.type')}</TableHead>
                  <TableHead className="min-w-[100px] px-2 py-2 text-xs font-medium text-right">{t('treasury.bankStatement.table.amount')}</TableHead>
                  <TableHead className="min-w-[100px] px-2 py-2 text-xs font-medium text-right">{t('treasury.bankStatement.table.balance')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBankStatementData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                      {t('treasury.bankStatement.noTransactions')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBankStatementData.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-section/50">
                      <TableCell className="w-[50px] min-w-[50px] px-2 py-2">
                        <Checkbox
                          checked={selectedTransactions.has(entry.id)}
                          onCheckedChange={() => handleSelectTransaction(entry.id)}
                          className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                        />
                      </TableCell>
                      <TableCell className="px-2 py-2 text-xs whitespace-nowrap">
                        {formatDate(entry.date)}
                      </TableCell>
                      <TableCell className="px-2 py-2 text-xs max-w-[150px] truncate" title={entry.description}>
                        {entry.description}
                      </TableCell>
                      <TableCell className="px-2 py-2 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-xs ${entry.transactionType === 'credit' ? 'bg-success/10 text-success border-success/20' : 'bg-red-50 text-red-600 border-red-200'}`}
                        >
                          {entry.transactionType === 'credit' ? t('treasury.bankStatement.credit') : t('treasury.bankStatement.debit')}
                        </Badge>
                      </TableCell>
                      <TableCell className={`px-2 py-2 text-xs text-right font-medium whitespace-nowrap ${entry.transactionType === 'credit' ? 'text-success' : 'text-red-600'}`}>
                        {entry.transactionType === 'credit' ? '+' : '-'}
                        <CurrencyDisplay amount={entry.amount} />
                      </TableCell>
                      <TableCell className="px-2 py-2 text-xs text-right font-medium whitespace-nowrap">
                        <CurrencyDisplay amount={entry.runningBalance} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {filteredBankStatementData.length > 0 && (
                <TableFooter className="bg-section sticky bottom-0 z-10 shadow-[0_-1px_0_0_rgba(0,0,0,0.1)]">
                  <TableRow>
                    <TableCell colSpan={4} className="text-xs font-semibold px-2 py-2 text-right">
                      {t('common.total')}
                    </TableCell>
                    <TableCell className="px-2 py-2 whitespace-nowrap text-right">
                      <div className="flex flex-col gap-0.5 items-end">
                        <span className="text-[10px] text-muted-foreground">Crédit: <span className="text-success font-medium">{formatMAD(filteredBankStatementData.filter(d => d.transactionType === 'credit').reduce((sum, i) => sum + (Number(i.amount) || 0), 0))}</span></span>
                        <span className="text-[10px] text-muted-foreground">Débit: <span className="text-red-600 font-medium">{formatMAD(filteredBankStatementData.filter(d => d.transactionType === 'debit').reduce((sum, i) => sum + (Number(i.amount) || 0), 0))}</span></span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-2 py-2 text-xs font-bold whitespace-nowrap">
                      <CurrencyDisplay amount={filteredBankStatementData.reduce((acc, curr) => curr.transactionType === 'credit' ? acc + (Number(curr.amount) || 0) : acc - (Number(curr.amount) || 0), 0)} />
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </div>

        {/* Net TVA Due Widget */}
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-warning/10">
              <AlertCircle className="w-4 h-4 text-warning" />
            </div>
            <div>
              <h2 className="text-base font-heading font-semibold text-foreground">
                {t('treasury.tax.netTvaDue')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t('treasury.tax.formula')}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-xs text-muted-foreground">{t('treasury.tax.collected')}</span>
              <span className="text-xs font-medium">
                <CurrencyDisplay amount={collectedTVA} />
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-xs text-muted-foreground">{t('treasury.tax.recoverable')}</span>
              <span className="text-xs font-medium">
                <CurrencyDisplay amount={recoverableTVA} />
              </span>
            </div>
            <div className="flex justify-between py-2 text-base">
              <span className="text-sm font-semibold text-foreground">{t('treasury.tax.netTvaDue')}</span>
              <span className={`text-base font-heading font-bold ${netTVADue >= 0 ? 'text-warning' : 'text-success'}`}>
                <CurrencyDisplay amount={Math.abs(netTVADue)} />
                {netTVADue < 0 && <span className="text-xs ml-1">({t('treasury.tax.credit')})</span>}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {netTVADue >= 0
                ? t('treasury.tax.payToDgi')
                : t('treasury.tax.creditFromDgi')}
            </p>
          </div>
        </div>
      </div>

      {/* Invoice Insights with Tax Breakdown */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-semibold text-foreground">
                {t('treasury.tax.insightsTitle')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t('treasury.tax.insightsSubtitle')}
              </p>
            </div>
          </div>
          {selectedInvoices.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSelectedInvoices}
              className="h-8 text-xs gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              {t('common.export')} ({selectedInvoices.size})
            </Button>
          )}
        </div>
        <div className="overflow-y-auto h-[450px] border rounded-md relative">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-20 shadow-sm ring-1 ring-border/50">
              <TableRow className="data-table-header hover:bg-card">
                <TableHead className="w-[50px] min-w-[50px] px-2 py-2 bg-card">
                  <Checkbox
                    checked={allInvoicesData.length > 0 && selectedInvoices.size === allInvoicesData.length}
                    onCheckedChange={handleSelectAllInvoices}
                    className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  />
                </TableHead>
                <TableHead className="min-w-[120px] px-3 py-3 text-xs font-medium">{t('treasury.tax.table.invoiceNumber')}</TableHead>
                <TableHead className="min-w-[150px] px-3 py-3 text-xs font-medium">{t('treasury.table.client')}</TableHead>
                <TableHead className="min-w-[100px] px-3 py-3 text-xs font-medium">{t('treasury.bankStatement.table.date')}</TableHead>
                <TableHead className="min-w-[120px] px-3 py-3 text-xs font-medium text-right">{t('treasury.tax.table.subtotal')}</TableHead>
                <TableHead className="min-w-[100px] px-3 py-3 text-xs font-medium text-right">{t('treasury.tax.table.vat')}</TableHead>
                <TableHead className="min-w-[120px] px-3 py-3 text-xs font-medium text-right">{t('treasury.tax.table.total')}</TableHead>
                <TableHead className="min-w-[100px] px-3 py-3 text-xs font-medium">{t('treasury.table.status')}</TableHead>
                <TableHead className="min-w-[100px] px-3 py-3 text-xs font-medium">{t('treasury.table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allInvoicesData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">
                    {t('treasury.tax.table.noInvoices')}
                  </TableCell>
                </TableRow>
              ) : (
                allInvoicesData
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((invoice) => {
                    const client = clients.find(c => c.id === invoice.client_id);
                    const clientName = client?.company || client?.name || t('treasury.tax.table.unknownClient');
                    const payment = salesPayments.find(p => p.invoiceNumber === invoice.document_id);

                    return (
                      <TableRow key={invoice.id} className="hover:bg-section/50">
                        <TableCell className="w-[50px] min-w-[50px] px-2 py-2">
                          <Checkbox
                            checked={selectedInvoices.has(invoice.id)}
                            onCheckedChange={() => handleSelectInvoice(invoice.id)}
                            className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs px-3 py-3 whitespace-nowrap font-medium">
                          {invoice.document_id}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs max-w-[150px] truncate" title={clientName}>
                          {clientName}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs whitespace-nowrap">
                          {formatDate(invoice.date)}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs text-right font-medium whitespace-nowrap">
                          <CurrencyDisplay amount={invoice.subtotal} />
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs text-right font-medium whitespace-nowrap text-warning">
                          <CurrencyDisplay amount={invoice.vat_amount} />
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs text-right font-bold whitespace-nowrap text-success">
                          <CurrencyDisplay amount={invoice.total} />
                        </TableCell>
                        <TableCell className="px-3 py-3 whitespace-nowrap">
                          <div className="scale-90 origin-left">
                            <StatusBadge
                              status={
                                invoice.status === 'paid' ? 'success' :
                                  invoice.status === 'overdue' ? 'danger' :
                                    invoice.status === 'sent' ? 'info' :
                                      invoice.status === 'cancelled' ? 'default' :
                                        'warning'
                              }
                            >
                              {invoice.status === 'sent' ? 'Sent' :
                                invoice.status === 'paid' ? 'Paid' :
                                  invoice.status === 'overdue' ? 'Overdue' :
                                    invoice.status === 'cancelled' ? 'Cancelled' :
                                      'Draft'}
                            </StatusBadge>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs whitespace-nowrap">
                          {payment ? (
                            <div className="flex items-center gap-1">
                              {getPaymentMethodIcon(payment.paymentMethod)}
                              <span className="capitalize text-xs">{payment.paymentMethod.replace('_', ' ')}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not tracked</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-section/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">{t('treasury.tax.totalInvoices', { defaultValue: 'Total Invoices' })}</div>
              <div className="text-lg font-semibold text-foreground">{allInvoicesData.length}</div>
            </div>
            <div className="p-3 bg-section/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">{t('treasury.tax.totalVatCollected', { defaultValue: 'Total VAT Collected' })}</div>
              <div className="text-lg font-semibold text-warning">
                <CurrencyDisplay amount={allInvoicesData.reduce((sum, inv) => sum + (Number(inv.vat_amount) || 0), 0)} />
              </div>
            </div>
            <div className="p-3 bg-section/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">{t('treasury.tax.totalInvoiceValue', { defaultValue: 'Total Invoice Value' })}</div>
              <div className="text-lg font-semibold text-success">
                <CurrencyDisplay amount={allInvoicesData.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Insights with Tax Breakdown */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-warning/10">
              <CreditCard className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-semibold text-foreground">
                {t('treasury.tax.purchaseInsightsTitle')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t('treasury.tax.purchaseInsightsSubtitle')}
              </p>
            </div>
          </div>
          {selectedPurchaseInvoices.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSelectedPurchaseInvoices}
              className="h-8 text-xs gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              {t('common.export')} ({selectedPurchaseInvoices.size})
            </Button>
          )}
        </div>

        {/* Purchase Invoices Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">{t('treasury.tax.purchaseInvoicesWithTax')}</h3>
          <div className="max-h-[450px] overflow-auto border rounded-md relative">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-20 shadow-sm ring-1 ring-border/50">
                <TableRow className="data-table-header hover:bg-card">
                  <TableHead className="w-[50px] min-w-[50px] px-2 py-2 bg-card">
                    <Checkbox
                      checked={purchaseInvoicesData.length > 0 && selectedPurchaseInvoices.size === purchaseInvoicesData.length}
                      onCheckedChange={handleSelectAllPurchaseInvoices}
                      className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                  </TableHead>
                  <TableHead className="min-w-[120px] px-3 py-3 text-xs font-medium">{t('treasury.tax.table.invoiceNumber')}</TableHead>
                  <TableHead className="min-w-[150px] px-3 py-3 text-xs font-medium">{t('documents.supplier')}</TableHead>
                  <TableHead className="min-w-[100px] px-3 py-3 text-xs font-medium">{t('treasury.bankStatement.table.date')}</TableHead>
                  <TableHead className="min-w-[120px] px-3 py-3 text-xs font-medium text-right">{t('treasury.tax.table.subtotal')}</TableHead>
                  <TableHead className="min-w-[100px] px-3 py-3 text-xs font-medium text-right">{t('treasury.tax.table.vat')}</TableHead>
                  <TableHead className="min-w-[120px] px-3 py-3 text-xs font-medium text-right">{t('treasury.tax.table.total')}</TableHead>
                  <TableHead className="min-w-[100px] px-3 py-3 text-xs font-medium">{t('treasury.table.status')}</TableHead>
                  <TableHead className="min-w-[100px] px-3 py-3 text-xs font-medium">{t('treasury.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseInvoicesData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4 text-sm text-muted-foreground">
                      {t('treasury.tax.table.noPurchaseInvoices')}
                    </TableCell>
                  </TableRow>
                ) : (
                  purchaseInvoicesData
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((invoice) => {
                      const supplier = suppliers.find(s => s.id === invoice.supplier_id);
                      const supplierName = supplier?.company || supplier?.name || t('treasury.tax.table.unknownSupplier');
                      const payment = purchasePayments.find(p => p.invoiceNumber === invoice.document_id);

                      return (
                        <TableRow key={invoice.id} className="hover:bg-section/50">
                          <TableCell className="w-[50px] min-w-[50px] px-2 py-2">
                            <Checkbox
                              checked={selectedPurchaseInvoices.has(invoice.id)}
                              onCheckedChange={() => handleSelectPurchaseInvoice(invoice.id)}
                              className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs px-3 py-3 whitespace-nowrap font-medium">
                            {invoice.document_id}
                          </TableCell>
                          <TableCell className="px-3 py-3 text-xs max-w-[150px] truncate" title={supplierName}>
                            {supplierName}
                          </TableCell>
                          <TableCell className="px-3 py-3 text-xs whitespace-nowrap">
                            {formatDate(invoice.date)}
                          </TableCell>
                          <TableCell className="px-3 py-3 text-xs text-right font-medium whitespace-nowrap">
                            <CurrencyDisplay amount={invoice.subtotal} />
                          </TableCell>
                          <TableCell className="px-3 py-3 text-xs text-right font-medium whitespace-nowrap text-warning">
                            <CurrencyDisplay amount={invoice.vat_amount || 0} />
                          </TableCell>
                          <TableCell className="px-3 py-3 text-xs text-right font-bold whitespace-nowrap text-danger">
                            <CurrencyDisplay amount={invoice.total} />
                          </TableCell>
                          <TableCell className="px-3 py-3 whitespace-nowrap">
                            <div className="scale-90 origin-left">
                              <StatusBadge
                                status={
                                  invoice.status === 'paid' ? 'success' :
                                    invoice.status === 'overdue' ? 'danger' :
                                      invoice.status === 'received' ? 'info' :
                                        invoice.status === 'cancelled' ? 'default' :
                                          'warning'
                                }
                              >
                                {invoice.status === 'received' ? t('status.received') :
                                  invoice.status === 'paid' ? t('status.paid') :
                                    invoice.status === 'overdue' ? t('status.overdue') :
                                      invoice.status === 'cancelled' ? t('status.cancelled') :
                                        t('status.draft')}
                              </StatusBadge>
                            </div>
                          </TableCell>
                          <TableCell className="px-3 py-3 text-xs whitespace-nowrap">
                            {payment ? (
                              <div className="flex items-center gap-1">
                                {getPaymentMethodIcon(payment.paymentMethod)}
                                <span className="capitalize text-xs">{payment.paymentMethod.replace('_', ' ')}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">{t('treasury.tax.table.notTracked')}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </div>
        </div>




        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-section/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">{t('treasury.tax.totalPurchaseInvoices')}</div>
              <div className="text-lg font-semibold text-foreground">{purchaseInvoicesData.length}</div>
            </div>
            <div className="p-3 bg-section/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">{t('treasury.tax.totalRecoverableVat')}</div>
              <div className="text-lg font-semibold text-warning">
                <CurrencyDisplay amount={purchaseInvoicesData.reduce((sum, inv) => sum + (Number(inv.vat_amount) || 0), 0)} />
              </div>
            </div>


            <div className="p-3 bg-section/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">{t('treasury.tax.totalPurchaseValue')}</div>
              <div className="text-lg font-semibold text-danger">
                <CurrencyDisplay amount={
                  purchaseInvoicesData.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) +
                  purchaseOrdersData.reduce((sum, po) => sum + (Number(po.subtotal) || 0), 0)
                } />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bank Reconciliation - Moved to fill the space or change grid if needed */}
        {/* Cash Flow Trend Removed */}
      </div>

      {/* Bank Reconciliation */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-semibold text-foreground">
            Bank Reconciliation
          </h2>
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Reconcile
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bankAccounts.map(account => {
            const salesPending = salesPayments.filter(
              p => p.bank === account.bank && p.status === 'pending_bank'
            );
            const purchasePending = purchasePayments.filter(
              p => p.bank === account.bank && p.status === 'pending_bank'
            );
            const salesPendingAmount = salesPending.reduce((sum, p) => sum + p.amount, 0);
            const purchasePendingAmount = purchasePending.reduce((sum, p) => sum + p.amount, 0);
            const pendingAmount = salesPendingAmount - purchasePendingAmount; // Sales add, purchases subtract

            return (
              <div key={account.id} className="p-4 border border-border rounded-lg group relative">
                <div className="absolute top-2 right-2 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteBankAccount(account.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{account.bank}</span>
                  <span className="text-xs text-muted-foreground mr-8">{account.accountNumber}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Balance</span>
                    <span className="font-medium">
                      <CurrencyDisplay amount={account.balance} />
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pending</span>
                    <span className="font-medium text-warning">
                      <CurrencyDisplay amount={pendingAmount} />
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-border">
                    <span className="text-muted-foreground">Projected</span>
                    <span className="font-medium text-success">
                      <CurrencyDisplay amount={account.balance + pendingAmount} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* View Payment Dialog */}
      <Dialog open={!!viewingPayment} onOpenChange={() => setViewingPayment(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewingPayment && (
            <>
              <DialogHeader>
                <DialogTitle>Payment Details</DialogTitle>
                <DialogDescription>
                  {viewingPayment.type === 'sales' ? 'Sales' : 'Purchase'} Payment #{viewingPayment.invoiceNumber}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Invoice Number</Label>
                    <p className="font-medium font-mono">{viewingPayment.invoiceNumber}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{viewingPayment.type === 'sales' ? 'Client' : 'Supplier'}</Label>
                    <p className="font-medium">{viewingPayment.entity}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Amount (MAD)</Label>
                    <p className="font-medium text-lg">
                      <CurrencyDisplay amount={viewingPayment.amount} />
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Payment Method</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {getPaymentMethodIcon(viewingPayment.paymentMethod)}
                      <span className="capitalize">{viewingPayment.paymentMethod.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(viewingPayment.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date</Label>
                    <p className="font-medium">{new Date(viewingPayment.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                  </div>
                  {viewingPayment.bank && (
                    <div>
                      <Label className="text-muted-foreground">Bank</Label>
                      <p className="font-medium">{viewingPayment.bank}</p>
                    </div>
                  )}
                  {viewingPayment.checkNumber && (
                    <div>
                      <Label className="text-muted-foreground">Check Number</Label>
                      <p className="font-medium font-mono">{viewingPayment.checkNumber}</p>
                    </div>
                  )}
                  {viewingPayment.maturityDate && (
                    <div>
                      <Label className="text-muted-foreground">Maturity Date</Label>
                      <p className="font-medium">{new Date(viewingPayment.maturityDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                    </div>
                  )}
                  {viewingPayment.warehouse && (
                    <div>
                      <Label className="text-muted-foreground">Warehouse</Label>
                      <p className="font-medium capitalize">{viewingPayment.warehouse}</p>
                    </div>
                  )}
                  {viewingPayment.notes && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Notes</Label>
                      <p className="font-medium mt-1 whitespace-pre-wrap">{viewingPayment.notes}</p>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewingPayment(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>
              Record a payment for an invoice. Link the invoice to a payment method.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="paymentType">Payment Type *</Label>
              <Select value={paymentType} onValueChange={(value) => {
                setPaymentType(value as 'sales' | 'purchase');
                setFormClient(''); // Reset entity selection when switching type
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales Payment</SelectItem>
                  <SelectItem value="purchase">Purchase Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice">Invoice Number *</Label>
                <Input
                  id="invoice"
                  placeholder={paymentType === 'sales' ? 'FC-01/26/0001' : 'FA-01/26/0001'}
                  value={formInvoiceId}
                  onChange={(e) => setFormInvoiceId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entity">{paymentType === 'sales' ? 'Client' : 'Supplier'} *</Label>
                <Select value={formClient} onValueChange={setFormClient}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${paymentType === 'sales' ? 'client' : 'supplier'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentType === 'sales' ? (
                      clients.map((client) => (
                        <SelectItem key={client.id} value={client.company || client.name}>
                          {client.company || client.name}
                        </SelectItem>
                      ))
                    ) : (
                      suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.company || supplier.name}>
                          {supplier.company || supplier.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (MAD) *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Payment Method *</Label>
                <Select
                  value={formPaymentMethod}
                  onValueChange={(value) => setFormPaymentMethod(value as 'cash' | 'check' | 'bank_transfer')}
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
            </div>

            {formPaymentMethod === 'check' && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank">Bank *</Label>
                    <Select value={formBank} onValueChange={setFormBank}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Attijariwafa Bank">Attijariwafa Bank</SelectItem>
                        <SelectItem value="Banque Populaire">Banque Populaire</SelectItem>
                        <SelectItem value="BMCE">BMCE</SelectItem>
                        <SelectItem value="CIH">CIH</SelectItem>
                        <SelectItem value="Crédit du Maroc">Crédit du Maroc</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkNumber">Check Number *</Label>
                    <Input
                      id="checkNumber"
                      placeholder="CHK-12345"
                      value={formCheckNumber}
                      onChange={(e) => setFormCheckNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maturityDate">Maturity Date *</Label>
                    <Input
                      id="maturityDate"
                      type="date"
                      value={formMaturityDate}
                      onChange={(e) => setFormMaturityDate(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {formPaymentMethod === 'bank_transfer' && (
              <div className="space-y-2">
                <Label htmlFor="transferBank">Bank</Label>
                <Select value={formBank} onValueChange={setFormBank}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Attijariwafa Bank">Attijariwafa Bank</SelectItem>
                    <SelectItem value="Banque Populaire">Banque Populaire</SelectItem>
                    <SelectItem value="BMCE">BMCE</SelectItem>
                    <SelectItem value="CIH">CIH</SelectItem>
                    <SelectItem value="Crédit du Maroc">Crédit du Maroc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formPaymentMethod === 'cash' && (
              <div className="space-y-2">
                <Label htmlFor="warehouse">Warehouse *</Label>
                <Select value={formWarehouse} onValueChange={setFormWarehouse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddPaymentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPayment}>
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Bank Account Dialog */}
      <Dialog open={isAddBankOpen} onOpenChange={setIsAddBankOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
            <DialogDescription>
              Add a new bank account to track balances and transactions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name *</Label>
              <Select value={formBankName} onValueChange={setFormBankName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Attijariwafa Bank">Attijariwafa Bank</SelectItem>
                  <SelectItem value="Banque Populaire">Banque Populaire</SelectItem>
                  <SelectItem value="BMCE">BMCE</SelectItem>
                  <SelectItem value="CIH">CIH</SelectItem>
                  <SelectItem value="Crédit du Maroc">Crédit du Maroc</SelectItem>
                  <SelectItem value="Bank of Africa">Bank of Africa</SelectItem>
                  <SelectItem value="Crédit Agricole">Crédit Agricole</SelectItem>
                  <SelectItem value="Banque Centrale Populaire">Banque Centrale Populaire</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {formBankName === 'Other' && (
                <Input
                  placeholder="Enter custom bank name"
                  value={formCustomBankName}
                  onChange={(e) => setFormCustomBankName(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name *</Label>
              <Input
                id="accountName"
                placeholder="e.g., Operating Account, Savings, Investment"
                value={formBankAccountName}
                onChange={(e) => setFormBankAccountName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number *</Label>
                <Input
                  id="accountNumber"
                  placeholder="e.g., 001-234567-89"
                  value={formAccountNumber}
                  onChange={(e) => setFormAccountNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initialBalance">Initial Balance (MAD)</Label>
                <Input
                  id="initialBalance"
                  type="number"
                  placeholder="0.00"
                  value={formInitialBalance}
                  onChange={(e) => setFormInitialBalance(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddBankOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBankAccount}>
              Add Bank Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmationOpen} onOpenChange={setDeleteConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.areYouSure', { defaultValue: 'Are you sure?' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('treasury.deleteBankAccountWarning', {
                defaultValue: 'This action cannot be undone. This will permanently delete the bank account and remove it from your treasury tracking.'
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', { defaultValue: 'Cancel' })}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBankAccount} className="bg-destructive hover:bg-destructive/90">
              {t('common.delete', { defaultValue: 'Delete' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
};
