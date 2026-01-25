/**
 * Treasury Service
 * Handles all API operations for treasury (bank accounts, warehouse cash, payments)
 */

import { apiClient } from '@/lib/api-client';

export interface BankAccount {
  id: string;
  name: string;
  bank: string;
  account_number: string;
  accountNumber?: string;
  balance: number;
  created_at?: string;
  updated_at?: string;
}

export interface WarehouseCash {
  id?: string;
  warehouse_id: string;
  warehouseId?: string;
  amount: number;
  created_at?: string;
  updated_at?: string;
}

export interface TreasuryPayment {
  id: string;
  invoice_id: string;
  invoiceId?: string;
  invoice_number: string;
  invoiceNumber?: string;
  entity: string;
  amount: number;
  payment_method: 'cash' | 'check' | 'bank_transfer';
  paymentMethod?: 'cash' | 'check' | 'bank_transfer';
  bank?: string;
  check_number?: string;
  checkNumber?: string;
  maturity_date?: string;
  maturityDate?: string;
  status: 'in-hand' | 'pending_bank' | 'cleared';
  date: string;
  payment_date?: string;
  warehouse?: string;
  warehouse_id?: string;
  notes?: string;
  payment_type: 'sales' | 'purchase';
  paymentType?: 'sales' | 'purchase';
  created_at?: string;
  updated_at?: string;
}

export const treasuryService = {
  // Bank Accounts
  async getAllBankAccounts(): Promise<BankAccount[]> {
    try {
      return await apiClient.get<BankAccount[]>('/treasury/bank-accounts');
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      return [];
    }
  },

  async getBankAccountById(id: string): Promise<BankAccount | null> {
    try {
      return await apiClient.get<BankAccount>(`/treasury/bank-accounts/${id}`);
    } catch (error) {
      console.error('Error fetching bank account:', error);
      return null;
    }
  },

  async createBankAccount(account: Omit<BankAccount, 'id' | 'created_at' | 'updated_at' | 'accountNumber'>): Promise<BankAccount> {
    return await apiClient.post<BankAccount>('/treasury/bank-accounts', account);
  },

  async updateBankAccount(id: string, account: Partial<BankAccount>): Promise<BankAccount> {
    return await apiClient.put<BankAccount>(`/treasury/bank-accounts/${id}`, account);
  },

  async deleteBankAccount(id: string): Promise<void> {
    await apiClient.delete(`/treasury/bank-accounts/${id}`);
  },

  // Warehouse Cash
  async getAllWarehouseCash(): Promise<WarehouseCash[]> {
    try {
      return await apiClient.get<WarehouseCash[]>('/treasury/warehouse-cash');
    } catch (error) {
      console.error('Error fetching warehouse cash:', error);
      return [];
    }
  },

  async updateWarehouseCash(warehouseId: string, amount: number): Promise<WarehouseCash> {
    return await apiClient.put<WarehouseCash>(`/treasury/warehouse-cash/${warehouseId}`, { amount });
  },

  // Payments
  async getAllPayments(paymentType?: 'sales' | 'purchase'): Promise<TreasuryPayment[]> {
    try {
      const endpoint = paymentType ? `/treasury/payments?paymentType=${paymentType}` : '/treasury/payments';
      return await apiClient.get<TreasuryPayment[]>(endpoint);
    } catch (error) {
      console.error('Error fetching payments:', error);
      return [];
    }
  },

  async getPaymentById(id: string): Promise<TreasuryPayment | null> {
    try {
      return await apiClient.get<TreasuryPayment>(`/treasury/payments/${id}`);
    } catch (error) {
      console.error('Error fetching payment:', error);
      return null;
    }
  },

  async createPayment(payment: Omit<TreasuryPayment, 'id' | 'created_at' | 'updated_at' | 'invoiceId' | 'invoiceNumber' | 'paymentMethod' | 'checkNumber' | 'maturityDate' | 'paymentType' | 'payment_date' | 'warehouse_id'>): Promise<TreasuryPayment> {
    return await apiClient.post<TreasuryPayment>('/treasury/payments', payment);
  },

  async updatePayment(id: string, payment: Partial<TreasuryPayment>): Promise<TreasuryPayment> {
    return await apiClient.put<TreasuryPayment>(`/treasury/payments/${id}`, payment);
  },

  async deletePayment(id: string): Promise<void> {
    await apiClient.delete(`/treasury/payments/${id}`);
  },

  async updatePaymentStatus(id: string, status: TreasuryPayment['status']): Promise<TreasuryPayment> {
    return await apiClient.patch<TreasuryPayment>(`/treasury/payments/${id}/status`, { status });
  },

  async getPaymentByInvoiceNumber(invoiceNumber: string, paymentType: 'sales' | 'purchase'): Promise<TreasuryPayment | null> {
    try {
      return await apiClient.get<TreasuryPayment>(`/treasury/payments/invoice/${invoiceNumber}?paymentType=${paymentType}`);
    } catch (error) {
      console.error('Error fetching payment by invoice number:', error);
      return null;
    }
  },

  async deletePaymentByInvoiceNumber(invoiceNumber: string, paymentType: 'sales' | 'purchase'): Promise<void> {
    await apiClient.delete(`/treasury/payments/invoice/${invoiceNumber}?paymentType=${paymentType}`);
  },
};
