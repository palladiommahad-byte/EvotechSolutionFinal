import React, { createContext, useContext, useEffect, useMemo, ReactNode } from 'react';
import { useCompanySettings, useUpdateCompanySettings } from '@/hooks/useSettings';

export interface CompanyInfo {
  name: string;
  legalForm: string;
  email: string;
  phone: string;
  address: string;
  ice: string;
  ifNumber: string;
  rc: string;
  tp: string;
  cnss: string;
  logo?: string | null;
  footerText?: string;
  autoNumberDocuments?: boolean;
}

interface CompanyContextType {
  companyInfo: CompanyInfo;
  updateCompanyInfo: (info: Partial<CompanyInfo>) => Promise<void>;
  isLoading: boolean;
}

const defaultCompanyInfo: CompanyInfo = {
  name: 'EVOTECH Solutions SARL',
  legalForm: 'SARL',
  email: 'contact@evotech.ma',
  phone: '+212 5 24 45 67 89',
  address: 'Zone Industrielle, Lot 123, Marrakech 40000, Morocco',
  ice: '001234567890123',
  ifNumber: '12345678',
  rc: '123456 - Marrakech',
  tp: '12345678',
  cnss: '1234567',
  logo: null,
  footerText: 'Merci pour votre confiance. Paiement à 30 jours. TVA 20%.',
  autoNumberDocuments: true,
};

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Fetch company settings from database
  const { data: dbSettings, isLoading } = useCompanySettings();
  const updateMutation = useUpdateCompanySettings();

  // Convert database settings to CompanyInfo format
  const companyInfo: CompanyInfo = useMemo(() => {
    if (!dbSettings) {
      return defaultCompanyInfo;
    }

    return {
      name: dbSettings.name || defaultCompanyInfo.name,
      legalForm: dbSettings.legal_form || defaultCompanyInfo.legalForm,
      email: dbSettings.email || defaultCompanyInfo.email,
      phone: dbSettings.phone || defaultCompanyInfo.phone,
      address: dbSettings.address || defaultCompanyInfo.address,
      ice: dbSettings.ice || defaultCompanyInfo.ice,
      ifNumber: dbSettings.if_number || defaultCompanyInfo.ifNumber,
      rc: dbSettings.rc || defaultCompanyInfo.rc,
      tp: dbSettings.tp || defaultCompanyInfo.tp,
      cnss: dbSettings.cnss || defaultCompanyInfo.cnss,
      logo: dbSettings.logo ?? defaultCompanyInfo.logo,
      footerText: dbSettings.footer_text || defaultCompanyInfo.footerText,
      autoNumberDocuments: dbSettings.auto_number_documents ?? defaultCompanyInfo.autoNumberDocuments,
    };
  }, [dbSettings]);

  const updateCompanyInfo = async (info: Partial<CompanyInfo>) => {
    // Convert CompanyInfo format to database format
    const dbUpdate: any = {};

    if (info.name !== undefined) dbUpdate.name = info.name;
    if (info.legalForm !== undefined) dbUpdate.legal_form = info.legalForm;
    if (info.email !== undefined) dbUpdate.email = info.email;
    if (info.phone !== undefined) dbUpdate.phone = info.phone;
    if (info.address !== undefined) dbUpdate.address = info.address;
    if (info.ice !== undefined) dbUpdate.ice = info.ice;
    if (info.ifNumber !== undefined) dbUpdate.if_number = info.ifNumber;
    if (info.rc !== undefined) dbUpdate.rc = info.rc;
    if (info.tp !== undefined) dbUpdate.tp = info.tp;
    if (info.cnss !== undefined) dbUpdate.cnss = info.cnss;
    if (info.logo !== undefined) dbUpdate.logo = info.logo;
    if (info.footerText !== undefined) dbUpdate.footer_text = info.footerText;
    if (info.autoNumberDocuments !== undefined) dbUpdate.auto_number_documents = info.autoNumberDocuments;

    try {
      await updateMutation.mutateAsync(dbUpdate);
    } catch (error) {
      console.error('Error updating company info:', error);
      throw error;
    }
  };

  return (
    <CompanyContext.Provider value={{ companyInfo, updateCompanyInfo, isLoading }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within CompanyProvider');
  }
  return context;
};
