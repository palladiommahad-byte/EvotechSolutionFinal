// Moroccan Business Logic Utilities

export const VAT_RATE = 0.20; // 20% TVA

export const formatMAD = (amount: number): string => {
  // Handle NaN or invalid numbers
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0,00\u00A0DH';
  }

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
  // Handle NaN or invalid numbers
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0,00\u00A0DH';
  }

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

// Moroccan Corporate Tax (IS) rates - 2025 rates
// Progressive tax brackets based on net taxable profit
export const calculateCorporateTax = (profit: number): number => {
  // 2025 Moroccan IS rates:
  // - 17.5% for profit up to 300,000 MAD
  // - 20% for profit between 300,001 and 1,000,000 MAD
  // - 22.75% for profit between 1,000,001 and 100,000,000 MAD
  // - 31.25% for profit above 100,000,000 MAD

  if (profit <= 0) return 0;

  if (profit <= 300000) {
    return roundTo2Decimals(profit * 0.175);
  }

  if (profit <= 1000000) {
    const tax1 = 300000 * 0.175; // 52,500
    const tax2 = (profit - 300000) * 0.20;
    return roundTo2Decimals(tax1 + tax2);
  }

  if (profit <= 100000000) {
    const tax1 = 300000 * 0.175;  // 52,500
    const tax2 = 700000 * 0.20;   // 140,000
    const tax3 = (profit - 1000000) * 0.2275;
    return roundTo2Decimals(tax1 + tax2 + tax3);
  }

  // Above 100M MAD
  const tax1 = 300000 * 0.175;      // 52,500
  const tax2 = 700000 * 0.20;       // 140,000
  const tax3 = 99000000 * 0.2275;   // 22,522,500
  const tax4 = (profit - 100000000) * 0.3125;
  return roundTo2Decimals(tax1 + tax2 + tax3 + tax4);
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
  unit?: string;        // Unit of measure (e.g. pcs, kg, m²)
  unitPrice: number;
  total: number;
}

export const calculateInvoiceTotals = (
  items: InvoiceItem[],
  discountType: 'percentage' | 'fixed' = 'fixed',
  discountValue: number = 0
) => {
  // Calculate initial subtotal by summing all item totals
  const initialSubtotal = roundTo2Decimals(
    items.reduce((sum, item) => {
      const qty   = Number(item.quantity)  || 0;
      const price = Number(item.unitPrice) || 0;
      const stored = Number(item.total)    || 0;
      const itemTotal = stored || roundTo2Decimals(qty * price);
      return sum + roundTo2Decimals(itemTotal);
    }, 0)
  );

  // Calculate discount amount
  let discountAmount = 0;
  if (discountValue > 0) {
    if (discountType === 'percentage') {
      discountAmount = roundTo2Decimals(initialSubtotal * (discountValue / 100));
    } else {
      discountAmount = roundTo2Decimals(discountValue);
    }
  }

  // Ensure discount doesn't exceed initial subtotal
  discountAmount = Math.min(discountAmount, initialSubtotal);

  // Calculate subtotal after discount
  const subtotal = roundTo2Decimals(initialSubtotal - discountAmount);

  // Calculate VAT from subtotal after discount
  const vat = calculateVAT(subtotal);

  // Calculate total (subtotal + VAT), ensuring it's rounded
  const total = roundTo2Decimals(subtotal + vat);

  return {
    initialSubtotal,
    discountAmount,
    subtotal,
    vat,
    total,
  };
};
