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
  patente: string;
  cnss: string;
  logo?: string | null;
  footerText?: string;
  autoNumberDocuments?: boolean;
  showLogo?: boolean;
  pdfPrimaryColor?: string;
  pdfTitleColor?: string;
  // PDF Design Studio fields
  pdfFontSize?: number;
  pdfFontFamily?: 'Helvetica' | 'Times-Roman' | 'Courier';
  pdfBodyTextColor?: string;
  pdfBorderColor?: string;
  pdfLogoSize?: 'small' | 'medium' | 'large';
  pdfLogoPosition?: 'left' | 'right';
  pdfTableSpacing?: 'compact' | 'normal' | 'spacious';
  pdfShowBorders?: boolean;
}

interface CompanyContextType {
  companyInfo: CompanyInfo;
  updateCompanyInfo: (info: Partial<CompanyInfo>) => Promise<void>;
  isLoading: boolean;
}

export const PDF_DESIGN_DEFAULTS = {
  pdfPrimaryColor: '#3b82f6',
  pdfTitleColor: '#3b82f6',
  pdfFontSize: 10,
  pdfFontFamily: 'Helvetica' as const,
  pdfBodyTextColor: '#374151',
  pdfBorderColor: '#3b82f6',
  pdfLogoSize: 'medium' as const,
  pdfLogoPosition: 'left' as const,
  pdfTableSpacing: 'normal' as const,
  pdfShowBorders: true,
};

const defaultCompanyInfo: CompanyInfo = {
  name: 'EVOTECH Solutions SARL',
  legalForm: 'SARL',
  email: 'contact@evotech.ma',
  phone: '+212 5 24 45 67 89',
  address: 'Zone Industrielle, Lot 123, Marrakech 40000, Morocco',
  ice: '',
  ifNumber: '',
  rc: '',
  tp: '',
  patente: '',
  cnss: '',
  logo: null,
  footerText: 'Merci pour votre confiance. Paiement à 30 jours. TVA 20%.',
  autoNumberDocuments: true,
  showLogo: true,
  ...PDF_DESIGN_DEFAULTS,
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
      name: dbSettings.name ?? defaultCompanyInfo.name,
      legalForm: dbSettings.legal_form ?? defaultCompanyInfo.legalForm,
      email: dbSettings.email ?? defaultCompanyInfo.email,
      phone: dbSettings.phone ?? defaultCompanyInfo.phone,
      address: dbSettings.address ?? defaultCompanyInfo.address,
      ice: dbSettings.ice ?? defaultCompanyInfo.ice,
      ifNumber: dbSettings.if_number ?? defaultCompanyInfo.ifNumber,
      rc: dbSettings.rc ?? defaultCompanyInfo.rc,
      tp: dbSettings.tp ?? defaultCompanyInfo.tp,
      patente: dbSettings.patente ?? defaultCompanyInfo.patente,
      cnss: dbSettings.cnss ?? defaultCompanyInfo.cnss,
      logo: dbSettings.logo ?? defaultCompanyInfo.logo,
      footerText: dbSettings.footer_text ?? defaultCompanyInfo.footerText,
      autoNumberDocuments: dbSettings.auto_number_documents ?? defaultCompanyInfo.autoNumberDocuments,
      showLogo: dbSettings.show_logo ?? defaultCompanyInfo.showLogo,
      pdfPrimaryColor: dbSettings.pdf_primary_color ?? defaultCompanyInfo.pdfPrimaryColor,
      pdfTitleColor: dbSettings.pdf_title_color ?? defaultCompanyInfo.pdfTitleColor,
      pdfFontSize: dbSettings.pdf_font_size ?? defaultCompanyInfo.pdfFontSize,
      pdfFontFamily: (dbSettings.pdf_font_family as CompanyInfo['pdfFontFamily']) ?? defaultCompanyInfo.pdfFontFamily,
      pdfBodyTextColor: dbSettings.pdf_body_text_color ?? defaultCompanyInfo.pdfBodyTextColor,
      pdfBorderColor: dbSettings.pdf_border_color ?? defaultCompanyInfo.pdfBorderColor,
      pdfLogoSize: (dbSettings.pdf_logo_size as CompanyInfo['pdfLogoSize']) ?? defaultCompanyInfo.pdfLogoSize,
      pdfLogoPosition: (dbSettings.pdf_logo_position as CompanyInfo['pdfLogoPosition']) ?? defaultCompanyInfo.pdfLogoPosition,
      pdfTableSpacing: (dbSettings.pdf_table_spacing as CompanyInfo['pdfTableSpacing']) ?? defaultCompanyInfo.pdfTableSpacing,
      pdfShowBorders: dbSettings.pdf_show_borders ?? defaultCompanyInfo.pdfShowBorders,
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
    if (info.patente !== undefined) dbUpdate.patente = info.patente;
    if (info.cnss !== undefined) dbUpdate.cnss = info.cnss;
    if (info.logo !== undefined) dbUpdate.logo = info.logo;
    if (info.footerText !== undefined) dbUpdate.footer_text = info.footerText;
    if (info.autoNumberDocuments !== undefined) dbUpdate.auto_number_documents = info.autoNumberDocuments;
    if (info.showLogo !== undefined) dbUpdate.show_logo = info.showLogo;
    if (info.pdfPrimaryColor !== undefined) dbUpdate.pdf_primary_color = info.pdfPrimaryColor;
    if (info.pdfTitleColor !== undefined) dbUpdate.pdf_title_color = info.pdfTitleColor;
    if (info.pdfFontSize !== undefined) dbUpdate.pdf_font_size = info.pdfFontSize;
    if (info.pdfFontFamily !== undefined) dbUpdate.pdf_font_family = info.pdfFontFamily;
    if (info.pdfBodyTextColor !== undefined) dbUpdate.pdf_body_text_color = info.pdfBodyTextColor;
    if (info.pdfBorderColor !== undefined) dbUpdate.pdf_border_color = info.pdfBorderColor;
    if (info.pdfLogoSize !== undefined) dbUpdate.pdf_logo_size = info.pdfLogoSize;
    if (info.pdfLogoPosition !== undefined) dbUpdate.pdf_logo_position = info.pdfLogoPosition;
    if (info.pdfTableSpacing !== undefined) dbUpdate.pdf_table_spacing = info.pdfTableSpacing;
    if (info.pdfShowBorders !== undefined) dbUpdate.pdf_show_borders = info.pdfShowBorders;

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
