/**
 * RH Service
 * API layer for the RH module — employees, payroll, leaves, tax config, attestations.
 * Uses the existing apiClient (fetch-based, JWT auth).
 */

import { apiClient } from '@/lib/api-client';

// ── Types ────────────────────────────────────────────────────────────────────

export type ContractType = 'CDI' | 'CDD' | 'Intérim';
export type EmployeeStatus = 'actif' | 'suspendu' | 'terminé';
export type PayrollStatus = 'brouillon' | 'validé' | 'payé';
export type LeaveStatus = 'en attente' | 'approuvé' | 'refusé';
export type LeaveType = 'congé annuel' | 'maladie' | 'sans solde' | 'autre';
export type OvertimeType = 'weekday_25' | 'weekday_50' | 'restday_100' | 'restday_150';

export interface Employee {
  id: string;
  full_name: string;
  cin: string;
  phone?: string;
  address?: string;
  email?: string;
  hire_date: string;
  job_title: string;
  department?: string;
  contract_type: ContractType;
  status: EmployeeStatus;
  base_salary: number;
  cnss_number: string;
  nb_dependents: number;
  created_at?: string;
  updated_at?: string;
}

export interface PayrollRecord {
  id: string;
  employee_id: string;
  full_name?: string;
  job_title?: string;
  month: number;
  year: number;
  base_salary: number;
  days_worked: number;
  overtime_hours: number;
  overtime_type: OvertimeType;
  prime_transport: number;
  prime_rendement: number;
  prime_anciennete: number;
  other_bonus: number;
  advance_deduction: number;
  unjustified_absence_days: number;
  // Calculated
  daily_rate: number;
  absence_deduction: number;
  adjusted_base: number;
  overtime_pay: number;
  brut: number;
  cnss_employee: number;
  amo_employee: number;
  frais_pro_raw: number;
  frais_professionnels: number;
  net_imposable: number;
  igr_raw: number;
  charge_relief: number;
  igr: number;
  net_a_payer: number;
  cnss_employer: number;
  prestations_familiales: number;
  taxe_formation: number;
  amo_employer: number;
  total_employer_cost: number;
  status: PayrollStatus;
  generated_at?: string;
  paid_at?: string;
}

export interface PayrollInputs {
  employee_id: string;
  month: number;
  year: number;
  base_salary?: number;
  days_worked?: number;
  overtime_hours?: number;
  overtime_type?: OvertimeType;
  prime_transport?: number;
  prime_rendement?: number;
  prime_anciennete?: number;
  other_bonus?: number;
  advance_deduction?: number;
  unjustified_absence_days?: number;
}

export interface LeaveRecord {
  id: string;
  employee_id: string;
  full_name?: string;
  job_title?: string;
  type: LeaveType;
  start_date: string;
  end_date: string;
  days_count: number;
  reason?: string;
  status: LeaveStatus;
  created_at?: string;
}

export interface TaxConfig {
  id: string;
  year: number;
  cnss_employee_rate: number;
  cnss_employer_rate: number;
  cnss_ceiling: number;
  prestations_familiales_rate: number;
  taxe_formation_rate: number;
  amo_employee_rate: number;
  amo_employer_rate: number;
  frais_pro_rate: number;
  frais_pro_ceiling_monthly: number;
  igr_brackets: Array<{ min: number; max: number | null; rate: number; deduction: number }>;
  charge_deduction_per_dependent: number;
  max_dependents: number;
  smig_monthly: number;
}

// ── Service ──────────────────────────────────────────────────────────────────

export const rhService = {
  // --- Employees ---
  async getEmployees(): Promise<Employee[]> {
    try { return await apiClient.get<Employee[]>('/rh/employees'); }
    catch { return []; }
  },

  async getEmployee(id: string): Promise<Employee | null> {
    try { return await apiClient.get<Employee>(`/rh/employees/${id}`); }
    catch { return null; }
  },

  async createEmployee(data: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee> {
    return apiClient.post<Employee>('/rh/employees', data);
  },

  async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee> {
    return apiClient.put<Employee>(`/rh/employees/${id}`, data);
  },

  async deleteEmployee(id: string): Promise<void> {
    return apiClient.delete(`/rh/employees/${id}`);
  },

  // --- Payroll ---
  async getPayrollList(filters?: { month?: number; year?: number; status?: PayrollStatus }): Promise<PayrollRecord[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.month) params.set('month', String(filters.month));
      if (filters?.year)  params.set('year',  String(filters.year));
      if (filters?.status) params.set('status', filters.status);
      const qs = params.toString();
      return await apiClient.get<PayrollRecord[]>(`/rh/payroll${qs ? `?${qs}` : ''}`);
    } catch { return []; }
  },

  async getEmployeePayroll(employeeId: string): Promise<PayrollRecord[]> {
    try { return await apiClient.get<PayrollRecord[]>(`/rh/payroll/${employeeId}`); }
    catch { return []; }
  },

  async calculatePayroll(inputs: Partial<PayrollInputs> & { year?: number }): Promise<Partial<PayrollRecord>> {
    return apiClient.post<Partial<PayrollRecord>>('/rh/payroll/calculate', inputs);
  },

  async generatePayroll(inputs: PayrollInputs): Promise<PayrollRecord> {
    return apiClient.post<PayrollRecord>('/rh/payroll/generate', inputs);
  },

  async validatePayroll(id: string): Promise<PayrollRecord> {
    return apiClient.put<PayrollRecord>(`/rh/payroll/${id}/validate`, {});
  },

  async markPayrollPaid(id: string): Promise<PayrollRecord> {
    return apiClient.put<PayrollRecord>(`/rh/payroll/${id}/pay`, {});
  },

  getBulletinUrl(id: string): string {
    const base = import.meta.env.VITE_API_URL || '/api';
    return `${base}/rh/payroll/${id}/bulletin`;
  },

  getCnssExportUrl(month: number, year: number): string {
    const base = import.meta.env.VITE_API_URL || '/api';
    return `${base}/rh/payroll/export/cnss?month=${month}&year=${year}`;
  },

  // --- Leaves ---
  async getLeaves(filters?: { status?: LeaveStatus; employee_id?: string }): Promise<LeaveRecord[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status)      params.set('status', filters.status);
      if (filters?.employee_id) params.set('employee_id', filters.employee_id);
      const qs = params.toString();
      return await apiClient.get<LeaveRecord[]>(`/rh/leaves${qs ? `?${qs}` : ''}`);
    } catch { return []; }
  },

  async getEmployeeLeaves(employeeId: string): Promise<LeaveRecord[]> {
    try { return await apiClient.get<LeaveRecord[]>(`/rh/leaves/${employeeId}`); }
    catch { return []; }
  },

  async createLeave(data: Omit<LeaveRecord, 'id' | 'status' | 'full_name' | 'job_title' | 'created_at'>): Promise<LeaveRecord> {
    return apiClient.post<LeaveRecord>('/rh/leaves', data);
  },

  async approveLeave(id: string): Promise<LeaveRecord> {
    return apiClient.put<LeaveRecord>(`/rh/leaves/${id}/approve`, {});
  },

  async rejectLeave(id: string): Promise<LeaveRecord> {
    return apiClient.put<LeaveRecord>(`/rh/leaves/${id}/reject`, {});
  },

  // --- Tax Config ---
  async getTaxConfig(year: number): Promise<TaxConfig | null> {
    try { return await apiClient.get<TaxConfig>(`/rh/tax-config/${year}`); }
    catch { return null; }
  },

  async updateTaxConfig(year: number, data: Partial<TaxConfig>): Promise<TaxConfig> {
    return apiClient.put<TaxConfig>(`/rh/tax-config/${year}`, data);
  },

  // --- Attestations (download URLs) ---
  getAttestationTravailUrl(employeeId: string): string {
    const base = import.meta.env.VITE_API_URL || '/api';
    return `${base}/rh/attestations/${employeeId}/travail`;
  },

  getAttestationSalaireUrl(employeeId: string): string {
    const base = import.meta.env.VITE_API_URL || '/api';
    return `${base}/rh/attestations/${employeeId}/salaire`;
  },

  getAttestationCongeUrl(employeeId: string, leaveId: string): string {
    const base = import.meta.env.VITE_API_URL || '/api';
    return `${base}/rh/attestations/${employeeId}/conge/${leaveId}`;
  },

  // Download a PDF from a URL (adds auth header)
  async downloadPdf(url: string, filename: string): Promise<void> {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Erreur lors du téléchargement du PDF');
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },
};
