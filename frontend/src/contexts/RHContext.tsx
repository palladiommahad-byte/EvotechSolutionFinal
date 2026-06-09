/**
 * RH Context
 * Provides employees, payroll records, and leaves via React Query.
 * Follows the same pattern as TreasuryContext / ProductsContext.
 */

import React, { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rhService, Employee, PayrollRecord, LeaveRecord, PayrollInputs } from '@/services/rh.service';
import { useToast } from '@/hooks/use-toast';

interface RHContextType {
  // Employees
  employees: Employee[];
  employeesLoading: boolean;
  refetchEmployees: () => void;
  createEmployee: (data: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => Promise<Employee>;
  updateEmployee: (id: string, data: Partial<Employee>) => Promise<Employee>;
  deleteEmployee: (id: string) => Promise<void>;

  // Payroll
  payrollList: PayrollRecord[];
  payrollLoading: boolean;
  refetchPayroll: () => void;
  generatePayroll: (inputs: PayrollInputs) => Promise<PayrollRecord>;
  validatePayroll: (id: string) => Promise<PayrollRecord>;
  markPayrollPaid: (id: string) => Promise<PayrollRecord>;

  // Leaves
  leaves: LeaveRecord[];
  leavesLoading: boolean;
  refetchLeaves: () => void;
  createLeave: (data: Omit<LeaveRecord, 'id' | 'status' | 'full_name' | 'job_title' | 'created_at'>) => Promise<LeaveRecord>;
  approveLeave: (id: string) => Promise<LeaveRecord>;
  rejectLeave: (id: string) => Promise<LeaveRecord>;
}

const RHContext = createContext<RHContextType | undefined>(undefined);

export const RHProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: employees = [], isLoading: employeesLoading, refetch: refetchEmployees } =
    useQuery({ queryKey: ['rh-employees'], queryFn: rhService.getEmployees });

  const { data: payrollList = [], isLoading: payrollLoading, refetch: refetchPayroll } =
    useQuery({ queryKey: ['rh-payroll'], queryFn: () => rhService.getPayrollList() });

  const { data: leaves = [], isLoading: leavesLoading, refetch: refetchLeaves } =
    useQuery({ queryKey: ['rh-leaves'], queryFn: () => rhService.getLeaves() });

  // Employee mutations
  const createEmpMutation = useMutation({
    mutationFn: rhService.createEmployee,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh-employees'] }); toast({ title: 'Employé créé' }); },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const updateEmpMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) => rhService.updateEmployee(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh-employees'] }); toast({ title: 'Employé mis à jour' }); },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const deleteEmpMutation = useMutation({
    mutationFn: rhService.deleteEmployee,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh-employees'] }); toast({ title: 'Employé désactivé' }); },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  // Payroll mutations
  const generateMutation = useMutation({
    mutationFn: rhService.generatePayroll,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh-payroll'] }); toast({ title: 'Fiche de paie générée' }); },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const validateMutation = useMutation({
    mutationFn: rhService.validatePayroll,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh-payroll'] }); toast({ title: 'Fiche de paie validée' }); },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const payMutation = useMutation({
    mutationFn: rhService.markPayrollPaid,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh-payroll'] }); toast({ title: 'Salaire marqué comme payé' }); },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  // Leave mutations
  const createLeaveMutation = useMutation({
    mutationFn: rhService.createLeave,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh-leaves'] }); toast({ title: 'Demande de congé créée' }); },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const approveLeaveMutation = useMutation({
    mutationFn: rhService.approveLeave,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh-leaves'] }); toast({ title: 'Congé approuvé' }); },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const rejectLeaveMutation = useMutation({
    mutationFn: rhService.rejectLeave,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh-leaves'] }); toast({ title: 'Congé refusé' }); },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  return (
    <RHContext.Provider value={{
      employees, employeesLoading, refetchEmployees: () => refetchEmployees(),
      createEmployee: createEmpMutation.mutateAsync,
      updateEmployee: (id, data) => updateEmpMutation.mutateAsync({ id, data }),
      deleteEmployee: deleteEmpMutation.mutateAsync,

      payrollList, payrollLoading, refetchPayroll: () => refetchPayroll(),
      generatePayroll: generateMutation.mutateAsync,
      validatePayroll: validateMutation.mutateAsync,
      markPayrollPaid: payMutation.mutateAsync,

      leaves, leavesLoading, refetchLeaves: () => refetchLeaves(),
      createLeave: createLeaveMutation.mutateAsync,
      approveLeave: approveLeaveMutation.mutateAsync,
      rejectLeave: rejectLeaveMutation.mutateAsync,
    }}>
      {children}
    </RHContext.Provider>
  );
};

export const useRH = (): RHContextType => {
  const ctx = useContext(RHContext);
  if (!ctx) throw new Error('useRH must be used within RHProvider');
  return ctx;
};
