import { useState, useMemo } from 'react';
import { FileSpreadsheet, Download, FileText, ChevronDown, Loader2, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { taxReportsService } from '@/services/tax-reports.service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VAT_RATE } from '@/lib/moroccan-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { generateTaxReportPDF, generateVATReportPDF } from '@/lib/pdf-generator';
import { generateTaxReportExcel, generateLedgerExcel } from '@/lib/excel-generator';
import { generateTaxReportCSV } from '@/lib/csv-generator';
import { useSales } from '@/contexts/SalesContext';
import { usePurchases } from '@/contexts/PurchasesContext';

// Helper to filter documents by year and quarter
const filterByPeriod = <T extends { date: string }>(
  docs: T[],
  year: number,
  quarter: string
): T[] => {
  return docs.filter((doc) => {
    const docDate = new Date(doc.date);
    const docYear = docDate.getFullYear();

    if (docYear !== year) return false;

    if (quarter === 'all') return true;

    const docMonth = docDate.getMonth(); // 0-indexed
    const quarterMap: Record<string, number[]> = {
      q1: [0, 1, 2],   // Jan, Feb, Mar
      q2: [3, 4, 5],   // Apr, May, Jun
      q3: [6, 7, 8],   // Jul, Aug, Sep
      q4: [9, 10, 11], // Oct, Nov, Dec
    };

    return quarterMap[quarter]?.includes(docMonth) ?? false;
  });
};

// Get available years based on data
const getAvailableYears = (invoices: { date: string }[], purchaseInvoices: { date: string }[]): number[] => {
  const allDocs = [...invoices, ...purchaseInvoices];
  const years = new Set<number>();
  const currentYear = new Date().getFullYear();

  // Always include current year and previous 2 years
  years.add(currentYear);
  years.add(currentYear - 1);
  years.add(currentYear - 2);

  // Add years from actual data
  allDocs.forEach((doc) => {
    const year = new Date(doc.date).getFullYear();
    years.add(year);
  });

  return Array.from(years).sort((a, b) => b - a); // Descending order
};

export const TaxReports = () => {
  const { t } = useTranslation();
  const { invoices, isLoading: salesLoading } = useSales();
  const { purchaseInvoices, isLoading: purchasesLoading } = usePurchases();

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const isLoading = salesLoading || purchasesLoading;

  // Get available years
  const availableYears = useMemo(
    () => getAvailableYears(invoices, purchaseInvoices),
    [invoices, purchaseInvoices]
  );

  // Filter invoices by selected period
  const filteredSalesInvoices = useMemo(
    () => filterByPeriod(invoices, selectedYear, selectedQuarter),
    [invoices, selectedYear, selectedQuarter]
  );

  const filteredPurchaseInvoices = useMemo(
    () => filterByPeriod(purchaseInvoices, selectedYear, selectedQuarter),
    [purchaseInvoices, selectedYear, selectedQuarter]
  );

  // Calculate VAT from sales invoices (VAT Collected from customers)
  const vatCollected = useMemo(() => {
    return filteredSalesInvoices.reduce((sum, inv) => {
      // Each invoice item contributes to VAT
      const items = inv.items || [];
      const invoiceVat = items.reduce((itemSum, item) => {
        const itemTotal = Number(item?.total) || 0;
        return itemSum + (itemTotal * VAT_RATE);
      }, 0);
      return sum + invoiceVat;
    }, 0);
  }, [filteredSalesInvoices]);

  // Calculate VAT from purchase invoices (VAT Paid to suppliers)
  const vatPaid = useMemo(() => {
    return filteredPurchaseInvoices.reduce((sum, inv) => {
      // Each invoice item contributes to VAT
      const items = inv.items || [];
      const invoiceVat = items.reduce((itemSum, item) => {
        const itemTotal = Number(item?.total) || 0;
        return itemSum + (itemTotal * VAT_RATE);
      }, 0);
      return sum + invoiceVat;
    }, 0);
  }, [filteredPurchaseInvoices]);

  // VAT Due = VAT Collected - VAT Paid
  const vatDue = vatCollected - vatPaid;

  // Gross Revenue = sum of sales invoice totals
  const grossRevenue = useMemo(() => {
    return filteredSalesInvoices.reduce((sum, inv) => {
      const total = Number(inv?.total) || 0;
      return sum + total;
    }, 0);
  }, [filteredSalesInvoices]);

  // Expenses = sum of purchase invoice totals
  const expenses = useMemo(() => {
    return filteredPurchaseInvoices.reduce((sum, inv) => {
      const total = Number(inv?.total) || 0;
      return sum + total;
    }, 0);
  }, [filteredPurchaseInvoices]);

  // Net Profit = Gross Revenue - Expenses
  const netProfit = grossRevenue - expenses;

  // Prepare data for exports
  const taxReportData = {
    grossRevenue,
    expenses,
    netProfit,
    vatCollected,
    vatPaid,
    vatDue,
    period: {
      year: selectedYear,
      quarter: selectedQuarter === 'all' ? 'Annual' : selectedQuarter.toUpperCase(),
    },
    salesCount: filteredSalesInvoices.length,
    purchasesCount: filteredPurchaseInvoices.length,
  };

  // Handle quick actions
  const handleSaveReport = async () => {
    setIsSaving(true);
    try {
      await taxReportsService.save({
        year: selectedYear,
        quarter: selectedQuarter,
        data: taxReportData,
        status: 'draft' // Default to draft
      });

      toast({
        title: "Report Saved",
        description: `Tax report for ${selectedQuarter === 'all' ? 'Annual' : selectedQuarter} ${selectedYear} has been saved.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save tax report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateVATReport = () => {
    generateVATReportPDF({
      vatCollected,
      vatPaid,
      vatDue,
      period: taxReportData.period,
      salesInvoices: filteredSalesInvoices.map(inv => ({
        id: inv.id,
        client: inv.client,
        date: inv.date,
        total: inv.total,
        vat: (inv.items || []).reduce((sum, item) => sum + ((item.total || 0) * VAT_RATE), 0),
      })),
      purchaseInvoices: filteredPurchaseInvoices.map(inv => ({
        id: inv.id,
        supplier: inv.supplier,
        date: inv.date,
        total: inv.total,
        vat: (inv.items || []).reduce((sum, item) => sum + ((item.total || 0) * VAT_RATE), 0),
      })),
    });
  };

  const handleExportLedger = () => {
    generateLedgerExcel({
      salesInvoices: filteredSalesInvoices.map(inv => ({
        id: inv.id,
        documentId: inv.documentId,
        client: inv.client,
        date: inv.date,
        items: (inv.items || []).length,
        total: inv.total,
        status: inv.status,
        paymentMethod: inv.paymentMethod,
      })),
      purchaseInvoices: filteredPurchaseInvoices.map(inv => ({
        id: inv.id,
        documentId: inv.documentId,
        supplier: inv.supplier,
        date: inv.date,
        items: (inv.items || []).length,
        total: inv.total,
        status: inv.status,
        paymentMethod: inv.paymentMethod,
      })),
      summary: taxReportData,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">{t('taxReports.title')}</h1>
          <p className="text-muted-foreground">{t('taxReports.description')}</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={t('taxReports.year')} />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={t('taxReports.quarter')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
              <SelectItem value="q1">Q1</SelectItem>
              <SelectItem value="q2">Q2</SelectItem>
              <SelectItem value="q3">Q3</SelectItem>
              <SelectItem value="q4">Q4</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="default"
            className="gap-2"
            onClick={handleSaveReport}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('common.save') || 'Save'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                {t('common.export')}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => generateTaxReportPDF(taxReportData)}>
                <FileText className="w-4 h-4 mr-2" />
                {t('documents.exportAsPDF')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => generateTaxReportExcel(taxReportData)}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {t('documents.exportAsExcel')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => generateTaxReportCSV(taxReportData)}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {t('documents.exportAsCSV')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* VAT Section */}
      <div className="card-elevated p-6">
        <div className="mb-6">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-1">{t('taxReports.vatCalculation')}</h2>
          <p className="text-sm text-muted-foreground">{t('taxReports.vatAt', { rate: VAT_RATE * 100 })}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {t('taxReports.salesTransactions') || 'Sales'}: {filteredSalesInvoices.length} | {t('taxReports.purchaseTransactions') || 'Purchases'}: {filteredPurchaseInvoices.length}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="p-4 rounded-lg bg-success/5 border border-success/20 overflow-visible">
            <p className="text-sm text-muted-foreground mb-1">{t('taxReports.vatCollected')}</p>
            <p className="text-xl sm:text-2xl font-heading font-bold text-success break-words overflow-visible whitespace-normal leading-tight">{formatMAD(vatCollected)}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('taxReports.fromCustomerInvoices')}</p>
          </div>
          <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 overflow-visible">
            <p className="text-sm text-muted-foreground mb-1">{t('taxReports.vatPaid')}</p>
            <p className="text-xl sm:text-2xl font-heading font-bold text-destructive break-words overflow-visible whitespace-normal leading-tight">{formatMAD(vatPaid)}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('taxReports.fromSupplierInvoices')}</p>
          </div>
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 overflow-visible">
            <p className="text-sm text-muted-foreground mb-1">{t('taxReports.vatDue')}</p>
            <p className={`text-xl sm:text-2xl font-heading font-bold break-words overflow-visible whitespace-normal leading-tight ${vatDue >= 0 ? 'text-primary' : 'text-success'}`}>
              {vatDue >= 0 ? formatMAD(vatDue) : `(${formatMAD(Math.abs(vatDue))})`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {vatDue >= 0 ? t('taxReports.toBePaidToTaxAuthority') : t('taxReports.vatCredit') || 'VAT Credit (Recoverable)'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4 flex-wrap">
        <button
          className="flex-1 min-w-[200px] card-elevated p-4 text-left hover:shadow-elevated transition-shadow"
          onClick={handleGenerateVATReport}
        >
          <FileSpreadsheet className="w-6 h-6 text-primary mb-2" />
          <p className="font-medium text-foreground">{t('taxReports.generateVatReport')}</p>
          <p className="text-sm text-muted-foreground">{t('taxReports.monthlyVatDeclaration')}</p>
        </button>
        <button
          className="flex-1 min-w-[200px] card-elevated p-4 text-left hover:shadow-elevated transition-shadow"
          onClick={handleExportLedger}
        >
          <Download className="w-6 h-6 text-success mb-2" />
          <p className="font-medium text-foreground">{t('taxReports.exportLedger')}</p>
          <p className="text-sm text-muted-foreground">{t('taxReports.forAccountantReview')}</p>
        </button>
      </div>
    </div>
  );
};
