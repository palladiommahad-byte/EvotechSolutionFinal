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

// Moroccan Corporate Tax (IS) rates - 2026 rates (simplified two-tier system)
export const calculateCorporateTax = (profit: number): number => {
  // 2026 Moroccan IS rates (simplified system):
  // - 20% for profit up to 99,999,999 MAD
  // - 35% for profit above 100,000,000 MAD

  if (profit <= 0) return 0;

  if (profit <= 99999999) {
    return roundTo2Decimals(profit * 0.20);
  }

  // Above 99,999,999 MAD
  const tax1 = 99999999 * 0.20;
  const tax2 = (profit - 99999999) * 0.35;
  return roundTo2Decimals(tax1 + tax2);
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
      // Always prefer qty×price (matches what renderItemRow displays); fall back
      // to stored total only when both qty and price are unavailable.
      const computed = roundTo2Decimals(qty * price);
      const itemTotal = computed > 0 ? computed : stored;
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
