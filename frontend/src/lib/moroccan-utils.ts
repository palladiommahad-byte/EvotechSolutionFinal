// Moroccan Business Logic Utilities

export const VAT_RATE = 0.20; // 20% TVA

export const formatMAD = (amount: number): string => {
  // Format large numbers with M/k suffixes
  if (Math.abs(amount) >= 1000000) {
    const millions = amount / 1000000;
    return `${millions.toFixed(2)}M DH`;
  } else if (Math.abs(amount) >= 1000) {
    const thousands = amount / 1000;
    return `${thousands.toFixed(2)}k DH`;
  } else {
    // For smaller numbers, use standard formatting
    return new Intl.NumberFormat('fr-MA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + '\u00A0DH';
  }
};

export const formatMADFull = (amount: number): string => {
  // Always format as full number with proper formatting
  // Use non-breaking space (\u00A0) before DH to keep price on same line
  return new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + '\u00A0DH';
};

// Helper function to round to 2 decimal places
const roundTo2Decimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};

export const calculateVAT = (amount: number): number => {
  return roundTo2Decimals(amount * VAT_RATE);
};

export const calculateTotalWithVAT = (amount: number): number => {
  return roundTo2Decimals(amount * (1 + VAT_RATE));
};

export const calculateAmountWithoutVAT = (totalWithVAT: number): number => {
  return roundTo2Decimals(totalWithVAT / (1 + VAT_RATE));
};

// Moroccan Corporate Tax (IS) rates
export const calculateCorporateTax = (profit: number): number => {
  if (profit <= 300000) return profit * 0.10;
  if (profit <= 1000000) return 30000 + (profit - 300000) * 0.20;
  return 30000 + 140000 + (profit - 1000000) * 0.31;
};

// Moroccan Business Identifier Validation
export const validateICE = (ice: string): boolean => {
  return /^\d{15}$/.test(ice);
};

export const validateIF = (ifNumber: string): boolean => {
  return /^\d{8}$/.test(ifNumber);
};

export const validateRC = (rc: string): boolean => {
  return rc.length > 0 && rc.length <= 20;
};

export const validateTP = (tp: string): boolean => {
  return /^\d+$/.test(tp);
};

export const validateCNSS = (cnss: string): boolean => {
  return /^\d{7,10}$/.test(cnss);
};

export interface MoroccanBusinessInfo {
  ice: string; // Identifiant Commun de l'Entreprise
  ifNumber: string; // Identifiant Fiscal
  rc: string; // Registre de Commerce
  tp: string; // Taxe Professionnelle
  cnss: string; // Caisse Nationale de Sécurité Sociale
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export const calculateInvoiceTotals = (items: InvoiceItem[]) => {
  // Calculate subtotal by summing all item totals, rounding each item total to 2 decimals
  const subtotal = roundTo2Decimals(
    items.reduce((sum, item) => {
      // Use item.total if available, otherwise calculate it
      // This ensures consistency - item.total should already be rounded in the component
      const itemTotal = item.total || roundTo2Decimals(item.quantity * item.unitPrice);
      return sum + roundTo2Decimals(itemTotal);
    }, 0)
  );
  
  // Calculate VAT from subtotal (already rounded to 2 decimals)
  const vat = calculateVAT(subtotal);
  
  // Calculate total (subtotal + VAT), ensuring it's rounded
  const total = roundTo2Decimals(subtotal + vat);
  
  return {
    subtotal,
    vat,
    total,
  };
};
