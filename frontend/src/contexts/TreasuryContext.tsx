import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { treasuryService, BankAccount as ServiceBankAccount, TreasuryPayment } from '@/services/treasury.service';
import { invoicesService } from '@/services/invoices.service';
import { purchaseInvoicesService } from '@/services/purchase-invoices.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// UI-friendly interfaces (camelCase)
export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  entity: string;
  amount: number;
  paymentMethod: 'cash' | 'check' | 'bank_transfer';
  bank?: string;
  checkNumber?: string;
  maturityDate?: string;
  status: 'in-hand' | 'pending_bank' | 'cleared';
  date: string;
  warehouse?: string;
  notes?: string;
  type: 'sales' | 'purchase';
}

export interface BankAccount {
  id: string;
  name: string;
  bank: string;
  accountNumber: string;
  balance: number;
}

export interface WarehouseCash {
  marrakech: number;
  agadir: number;
  ouarzazate: number;
}

interface TreasuryContextType {
  // Bank Accounts
  bankAccounts: BankAccount[];
  isLoading: boolean;
  addBankAccount: (account: Omit<BankAccount, 'id'>) => Promise<void>;
  updateBankAccount: (id: string, account: Partial<BankAccount>) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<void>;

  // Warehouse Cash
  warehouseCash: WarehouseCash;
  updateWarehouseCash: (warehouse: keyof WarehouseCash, amount: number) => Promise<void>;

  // Payments
  salesPayments: Payment[];
  purchasePayments: Payment[];
  addPayment: (payment: Omit<Payment, 'id'>, type: 'sales' | 'purchase') => Promise<void>;
  updatePayment: (id: string, payment: Partial<Payment>, type: 'sales' | 'purchase') => Promise<void>;
  deletePayment: (id: string, type: 'sales' | 'purchase') => Promise<void>;
  updatePaymentStatus: (id: string, status: Payment['status'], type: 'sales' | 'purchase') => Promise<void>;

  // Calculations
  totalBank: number;
  totalWarehouseCash: number;
  realTimeBalance: number;
  netLiquidity: number;
  totalCashedSales: number;
  totalSupplierBillsPaid: number;
  tvaReserve: number;
  collectedTVA: number;
  recoverableTVA: number;
  netTVADue: number;
  expectedInflowPayments: Payment[];
  totalExpectedInflow: number;
  upcomingPayments: Payment[];
  totalUpcomingPayments: number;
  bankStatementData: Array<Omit<Payment, 'type'> & { transactionType: 'credit' | 'debit'; description: string; runningBalance: number }>;
  refreshData: () => Promise<void>;
}

const TreasuryContext = createContext<TreasuryContextType | undefined>(undefined);

// Helper functions to convert between service and UI formats
const toUIBankAccount = (account: ServiceBankAccount): BankAccount => ({
  id: account.id,
  name: account.name,
  bank: account.bank,
  accountNumber: account.accountNumber || account.account_number,
  balance: account.balance,
});

const toUIPayment = (payment: TreasuryPayment): Payment => ({
  id: payment.id,
  invoiceId: payment.invoiceId || payment.invoice_id,
  invoiceNumber: payment.invoiceNumber || payment.invoice_number,
  entity: payment.entity,
  amount: payment.amount,
  paymentMethod: payment.paymentMethod || payment.payment_method,
  bank: payment.bank,
  checkNumber: payment.checkNumber || payment.check_number,
  maturityDate: payment.maturityDate || payment.maturity_date,
  status: payment.status,
  date: payment.date || payment.payment_date || '',
  warehouse: payment.warehouse || payment.warehouse_id,
  notes: payment.notes,
  type: payment.paymentType || payment.payment_type,
});

// Helper to convert warehouse cash array to object format
const warehouseCashArrayToObject = (cashArray: Array<{ warehouse_id: string; amount: number }>): WarehouseCash => {
  const defaultCash: WarehouseCash = { marrakech: 0, agadir: 0, ouarzazate: 0 };

  cashArray.forEach((cash) => {
    const warehouseId = cash.warehouse_id;
    if (warehouseId === 'marrakech' || warehouseId === 'agadir' || warehouseId === 'ouarzazate') {
      defaultCash[warehouseId] = cash.amount || 0;
    }
  });

  return defaultCash;
};

export const TreasuryProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();

  // Fetch bank accounts
  const { data: bankAccountsData = [], isLoading: isLoadingBankAccounts } = useQuery({
    queryKey: ['treasury', 'bankAccounts'],
    queryFn: () => treasuryService.getAllBankAccounts(),
    staleTime: 30000,
  });

  // Fetch warehouse cash
  const { data: warehouseCashData = [], isLoading: isLoadingWarehouseCash } = useQuery({
    queryKey: ['treasury', 'warehouseCash'],
    queryFn: () => treasuryService.getAllWarehouseCash(),
    staleTime: 30000,
  });

  // Fetch sales payments
  const { data: salesPaymentsData = [], isLoading: isLoadingSalesPayments } = useQuery({
    queryKey: ['treasury', 'payments', 'sales'],
    queryFn: () => treasuryService.getAllPayments('sales'),
    staleTime: 30000,
  });

  // Fetch purchase payments
  const { data: purchasePaymentsData = [], isLoading: isLoadingPurchasePayments } = useQuery({
    queryKey: ['treasury', 'payments', 'purchase'],
    queryFn: () => treasuryService.getAllPayments('purchase'),
    staleTime: 30000,
  });

  // Fetch invoices for TVA calculation (only cleared payments)
  const { data: invoicesData = [] } = useQuery({
    queryKey: ['invoices', 'treasury', 'tva'],
    queryFn: () => invoicesService.getAll(),
    staleTime: 30000,
  });

  // Fetch purchase invoices for TVA calculation (only cleared payments)
  const { data: purchaseInvoicesData = [] } = useQuery({
    queryKey: ['purchase_invoices', 'treasury', 'tva'],
    queryFn: () => purchaseInvoicesService.getAll(),
    staleTime: 30000,
  });

  const isLoading = isLoadingBankAccounts || isLoadingWarehouseCash || isLoadingSalesPayments || isLoadingPurchasePayments;

  // Convert to UI format
  const bankAccounts: BankAccount[] = bankAccountsData.map(toUIBankAccount);
  const warehouseCash: WarehouseCash = useMemo(
    () => warehouseCashArrayToObject(warehouseCashData),
    [warehouseCashData]
  );
  const salesPayments: Payment[] = salesPaymentsData.map(toUIPayment);
  const purchasePayments: Payment[] = purchasePaymentsData.map(toUIPayment);

  // Mutations for bank accounts
  const addBankAccountMutation = useMutation({
    mutationFn: (account: Omit<BankAccount, 'id'>) =>
      treasuryService.createBankAccount({
        ...account,
        account_number: account.accountNumber,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury', 'bankAccounts'] });
    },
  });

  const updateBankAccountMutation = useMutation({
    mutationFn: ({ id, account }: { id: string; account: Partial<BankAccount> }) =>
      treasuryService.updateBankAccount(id, {
        ...account,
        account_number: account.accountNumber,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury', 'bankAccounts'] });
    },
  });

  const deleteBankAccountMutation = useMutation({
    mutationFn: (id: string) => treasuryService.deleteBankAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury', 'bankAccounts'] });
    },
  });

  // Mutations for warehouse cash
  const updateWarehouseCashMutation = useMutation({
    mutationFn: ({ warehouseId, amount }: { warehouseId: string; amount: number }) =>
      treasuryService.updateWarehouseCash(warehouseId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury', 'warehouseCash'] });
    },
  });

  // Mutations for payments
  const addPaymentMutation = useMutation({
    mutationFn: ({ payment, type }: { payment: Omit<Payment, 'id'>; type: 'sales' | 'purchase' }) =>
      treasuryService.createPayment({
        invoice_id: payment.invoiceId,
        invoice_number: payment.invoiceNumber,
        entity: payment.entity,
        amount: payment.amount,
        payment_method: payment.paymentMethod,
        bank: payment.bank,
        check_number: payment.checkNumber,
        maturity_date: payment.maturityDate,
        status: payment.status,
        date: payment.date,
        warehouse_id: payment.warehouse,
        notes: payment.notes,
        payment_type: type,
      } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury', 'payments'] });
      // If cash payment, also refresh warehouse cash
      queryClient.invalidateQueries({ queryKey: ['treasury', 'warehouseCash'] });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, payment, type }: { id: string; payment: Partial<Payment>; type: 'sales' | 'purchase' }) => {
      const updateData: any = {};
      if (payment.invoiceId !== undefined) updateData.invoice_id = payment.invoiceId;
      if (payment.invoiceNumber !== undefined) updateData.invoice_number = payment.invoiceNumber;
      if (payment.entity !== undefined) updateData.entity = payment.entity;
      if (payment.amount !== undefined) updateData.amount = payment.amount;
      if (payment.paymentMethod !== undefined) updateData.payment_method = payment.paymentMethod;
      if (payment.bank !== undefined) updateData.bank = payment.bank;
      if (payment.checkNumber !== undefined) updateData.check_number = payment.checkNumber;
      if (payment.maturityDate !== undefined) updateData.maturity_date = payment.maturityDate;
      if (payment.status !== undefined) updateData.status = payment.status;
      if (payment.date !== undefined) updateData.payment_date = payment.date;
      if (payment.warehouse !== undefined) updateData.warehouse_id = payment.warehouse;
      if (payment.notes !== undefined) updateData.notes = payment.notes;
      updateData.payment_type = type;

      return treasuryService.updatePayment(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['treasury', 'warehouseCash'] });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => treasuryService.deletePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury', 'payments'] });
    },
  });

  const updatePaymentStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Payment['status'] }) =>
      treasuryService.updatePaymentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['treasury', 'bankAccounts'] });
    },
  });

  // Async wrapper functions
  const addBankAccount = useCallback(async (account: Omit<BankAccount, 'id'>) => {
    await addBankAccountMutation.mutateAsync(account);
  }, [addBankAccountMutation]);

  const updateBankAccount = useCallback(async (id: string, account: Partial<BankAccount>) => {
    await updateBankAccountMutation.mutateAsync({ id, account });
  }, [updateBankAccountMutation]);

  const deleteBankAccount = useCallback(async (id: string) => {
    await deleteBankAccountMutation.mutateAsync(id);
  }, [deleteBankAccountMutation]);

  const updateWarehouseCash = useCallback(async (warehouse: keyof WarehouseCash, amount: number) => {
    await updateWarehouseCashMutation.mutateAsync({ warehouseId: warehouse, amount });
  }, [updateWarehouseCashMutation]);

  const addPayment = useCallback(async (payment: Omit<Payment, 'id'>, type: 'sales' | 'purchase') => {
    await addPaymentMutation.mutateAsync({ payment, type });
  }, [addPaymentMutation]);

  const updatePayment = useCallback(async (id: string, payment: Partial<Payment>, type: 'sales' | 'purchase') => {
    await updatePaymentMutation.mutateAsync({ id, payment, type });
  }, [updatePaymentMutation]);

  const deletePayment = useCallback(async (id: string, type: 'sales' | 'purchase') => {
    await deletePaymentMutation.mutateAsync(id);
  }, [deletePaymentMutation]);

  const updatePaymentStatus = useCallback(async (id: string, status: Payment['status'], type: 'sales' | 'purchase') => {
    await updatePaymentStatusMutation.mutateAsync({ id, status });
  }, [updatePaymentStatusMutation]);

  const refreshData = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['treasury'] });
  }, [queryClient]);

  // Calculations
  const totalBank = useMemo(() => bankAccounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0), [bankAccounts]);
  const totalWarehouseCashValue = useMemo(
    () => Object.values(warehouseCash).reduce((sum, cash) => sum + (Number(cash) || 0), 0),
    [warehouseCash]
  );

  const clearedSalesPayments = useMemo(
    () => salesPayments.filter(p => p.status === 'cleared'),
    [salesPayments]
  );
  const totalCashedSales = useMemo(
    () => clearedSalesPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [clearedSalesPayments]
  );

  const clearedPurchasePayments = useMemo(
    () => purchasePayments.filter(p => p.status === 'cleared'),
    [purchasePayments]
  );
  const totalSupplierBillsPaid = useMemo(
    () => clearedPurchasePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [clearedPurchasePayments]
  );

  const realTimeBalance = useMemo(
    () => (totalBank + totalCashedSales) - totalSupplierBillsPaid,
    [totalBank, totalCashedSales, totalSupplierBillsPaid]
  );
  const netLiquidity = useMemo(
    () => totalBank + totalWarehouseCashValue,
    [totalBank, totalWarehouseCashValue]
  );

  // Calculate TVA from actual invoice VAT amounts (only for cleared payments)
  // Get cleared payment invoice numbers
  const clearedSalesInvoiceNumbers = useMemo(
    () => new Set(clearedSalesPayments.map(p => p.invoiceNumber)),
    [clearedSalesPayments]
  );

  const clearedPurchaseInvoiceNumbers = useMemo(
    () => new Set(clearedPurchasePayments.map(p => p.invoiceNumber)),
    [clearedPurchasePayments]
  );

  // Calculate collected TVA from sales invoices (only cleared payments)
  const collectedTVA = useMemo(() => {
    return invoicesData
      .filter(inv => clearedSalesInvoiceNumbers.has(inv.document_id))
      .reduce((sum, inv) => sum + (inv.vat_amount || 0), 0);
  }, [invoicesData, clearedSalesInvoiceNumbers]);

  // Calculate recoverable TVA from purchase invoices (only cleared payments)
  const recoverableTVA = useMemo(() => {
    return purchaseInvoicesData
      .filter(inv => clearedPurchaseInvoiceNumbers.has(inv.document_id))
      .reduce((sum, inv) => sum + (inv.vat_amount || 0), 0);
  }, [purchaseInvoicesData, clearedPurchaseInvoiceNumbers]);

  // TVA Reserve is the same as collected TVA (reserved for tax payment)
  const tvaReserve = useMemo(() => collectedTVA, [collectedTVA]);

  // Net TVA Due = Collected TVA - Recoverable TVA
  const netTVADue = useMemo(() => collectedTVA - recoverableTVA, [collectedTVA, recoverableTVA]);

  const expectedInflowPayments = useMemo(
    () => salesPayments.filter(p => p.status === 'in-hand' || p.status === 'pending_bank'),
    [salesPayments]
  );
  const totalExpectedInflow = useMemo(
    () => expectedInflowPayments.reduce((sum, p) => sum + p.amount, 0),
    [expectedInflowPayments]
  );

  const upcomingPayments = useMemo(
    () => purchasePayments.filter(p => p.status === 'in-hand' || p.status === 'pending_bank'),
    [purchasePayments]
  );
  const totalUpcomingPayments = useMemo(
    () => upcomingPayments.reduce((sum, p) => sum + p.amount, 0),
    [upcomingPayments]
  );

  // Bank Statement data
  const bankStatementData = useMemo(() => {
    const allPayments = [
      ...salesPayments
        .filter(p => p.status === 'cleared' && (p.paymentMethod === 'bank_transfer' || (p.paymentMethod === 'check' && p.bank)))
        .map(p => ({
          ...p,
          transactionType: 'credit' as const,
          description: `${p.invoiceNumber} - ${p.entity}`,
        })),
      ...purchasePayments
        .filter(p => p.status === 'cleared' && (p.paymentMethod === 'bank_transfer' || (p.paymentMethod === 'check' && p.bank)))
        .map(p => ({
          ...p,
          transactionType: 'debit' as const,
          description: `${p.invoiceNumber} - ${p.entity}`,
        })),
    ];

    allPayments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalCredits = allPayments
      .filter(p => p.transactionType === 'credit')
      .reduce((sum, p) => sum + p.amount, 0);
    const totalDebits = allPayments
      .filter(p => p.transactionType === 'debit')
      .reduce((sum, p) => sum + p.amount, 0);
    const startingBalance = totalBank - (totalCredits - totalDebits);

    let runningBalance = startingBalance;
    const statementEntries = allPayments.map(payment => {
      const { type, transactionType, ...rest } = payment;
      if (transactionType === 'credit') {
        runningBalance += payment.amount;
      } else {
        runningBalance -= payment.amount;
      }
      return {
        ...rest,
        transactionType,
        runningBalance,
      };
    });

    return statementEntries;
  }, [salesPayments, purchasePayments, totalBank]);

  const value: TreasuryContextType = {
    bankAccounts,
    isLoading,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    warehouseCash,
    updateWarehouseCash,
    salesPayments,
    purchasePayments,
    addPayment,
    updatePayment,
    deletePayment,
    updatePaymentStatus,
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
    refreshData,
  };

  return (
    <TreasuryContext.Provider value={value}>
      {children}
    </TreasuryContext.Provider>
  );
};

export const useTreasury = () => {
  const context = useContext(TreasuryContext);
  if (context === undefined) {
    throw new Error('useTreasury must be used within a TreasuryProvider');
  }
  return context;
};
