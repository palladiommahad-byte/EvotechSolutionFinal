import { useState, useMemo } from 'react';
import { FileSpreadsheet, Calculator, TrendingUp, Download, Calendar, FileText, ChevronDown, Loader2, Save } from 'lucide-react';
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
import { formatMAD, VAT_RATE, calculateCorporateTax } from '@/lib/moroccan-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { generateTaxReportPDF, generateVATReportPDF } from '@/lib/pdf-generator';
import { generateTaxReportExcel, generateLedgerExcel } from '@/lib/excel-generator';
import { generateTaxReportCSV } from '@/lib/csv-generator';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';
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

  // State for period selection
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // State for modals
  const [showISSimulation, setShowISSimulation] = useState(false);
  const [showTaxCalendar, setShowTaxCalendar] = useState(false);

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

  // Estimated Corporate Tax (IS)
  const estimatedIS = calculateCorporateTax(Math.max(0, netProfit));

  // Prepare data for exports
  const taxReportData = {
    grossRevenue,
    expenses,
    netProfit,
    estimatedIS,
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
        vat: inv.items.reduce((sum, item) => sum + (item.total * VAT_RATE), 0),
      })),
      purchaseInvoices: filteredPurchaseInvoices.map(inv => ({
        id: inv.id,
        supplier: inv.supplier,
        date: inv.date,
        total: inv.total,
        vat: inv.items.reduce((sum, item) => sum + (item.total * VAT_RATE), 0),
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
        items: inv.items.length,
        total: inv.total,
        status: inv.status,
        paymentMethod: inv.paymentMethod,
      })),
      purchaseInvoices: filteredPurchaseInvoices.map(inv => ({
        id: inv.id,
        documentId: inv.documentId,
        supplier: inv.supplier,
        date: inv.date,
        items: inv.items.length,
        total: inv.total,
        status: inv.status,
        paymentMethod: inv.paymentMethod,
      })),
      summary: taxReportData,
    });
  };

  // Annual projection for IS Simulation
  const annualProjection = useMemo(() => {
    const monthsCompleted = selectedQuarter === 'all'
      ? 12
      : selectedQuarter === 'q1' ? 3
        : selectedQuarter === 'q2' ? 6
          : selectedQuarter === 'q3' ? 9
            : 12;

    const projectedAnnualRevenue = (grossRevenue / monthsCompleted) * 12;
    const projectedAnnualExpenses = (expenses / monthsCompleted) * 12;
    const projectedNetProfit = projectedAnnualRevenue - projectedAnnualExpenses;
    const projectedIS = calculateCorporateTax(Math.max(0, projectedNetProfit));

    return {
      projectedAnnualRevenue,
      projectedAnnualExpenses,
      projectedNetProfit,
      projectedIS,
      monthsCompleted,
    };
  }, [grossRevenue, expenses, selectedQuarter]);

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

      {/* Transaction Summary */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{t('taxReports.salesTransactions') || 'Sales Transactions'}: <strong className="text-foreground">{filteredSalesInvoices.length}</strong></span>
        <span>{t('taxReports.purchaseTransactions') || 'Purchase Transactions'}: <strong className="text-foreground">{filteredPurchaseInvoices.length}</strong></span>
      </div>

      {/* VAT Section */}
      <div className="card-elevated p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-semibold text-foreground">{t('taxReports.vatCalculation')}</h2>
            <p className="text-sm text-muted-foreground">{t('taxReports.vatAt', { rate: VAT_RATE * 100 })}</p>
          </div>
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

        <div className="flex items-center gap-4 p-4 bg-section rounded-lg">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">{t('taxReports.nextVatDeclarationDue')}</p>
            <p className="text-xs text-muted-foreground">{t('taxReports.before20thNextMonth')}</p>
          </div>
        </div>
      </div>

      {/* Corporate Tax Section */}
      <div className="card-elevated p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-lg bg-info/10">
            <FileSpreadsheet className="w-5 h-5 text-info" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-semibold text-foreground">{t('taxReports.corporateTax')}</h2>
            <p className="text-sm text-muted-foreground">{t('taxReports.moroccanCorporateTaxEstimator')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <h3 className="font-medium text-foreground">{t('taxReports.financialSummary')}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border gap-4 overflow-visible">
                <span className="text-muted-foreground flex-shrink-0">{t('taxReports.grossRevenue')}</span>
                <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
                  <CurrencyDisplay amount={grossRevenue} />
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border gap-4 overflow-visible">
                <span className="text-muted-foreground flex-shrink-0">{t('taxReports.totalExpenses')}</span>
                <span className="font-medium text-destructive break-words overflow-visible whitespace-normal text-right min-w-0">
                  -<CurrencyDisplay amount={expenses} />
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border gap-4 overflow-visible">
                <span className="font-medium text-foreground flex-shrink-0">{t('taxReports.netProfit')}</span>
                <span className={`font-bold break-words overflow-visible whitespace-normal text-right min-w-0 ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {netProfit < 0 && '-'}<CurrencyDisplay amount={Math.abs(netProfit)} />
                </span>
              </div>
            </div>
          </div>

          {/* Tax Calculation */}
          <div className="p-6 bg-section rounded-lg">
            <h3 className="font-medium text-foreground mb-4">{t('taxReports.isTaxCalculation')}</h3>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">{t('taxReports.moroccanIsRates')}</p>
                <ul className="space-y-1 ml-4">
                  <li>{t('taxReports.isRate10')}</li>
                  <li>{t('taxReports.isRate20')}</li>
                  <li>{t('taxReports.isRate31')}</li>
                  <li>{t('taxReports.isRate35')}</li>
                </ul>
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-2 gap-4 overflow-visible">
                  <span className="text-muted-foreground flex-shrink-0">{t('taxReports.taxableIncome')}</span>
                  <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
                    <CurrencyDisplay amount={Math.max(0, netProfit)} />
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 px-4 bg-primary/10 rounded-lg gap-4 overflow-visible">
                  <span className="font-medium text-foreground flex-shrink-0">{t('taxReports.estimatedIsTax')}</span>
                  <span className="text-lg sm:text-xl font-heading font-bold text-primary break-words overflow-visible whitespace-normal leading-tight text-right">
                    <CurrencyDisplay amount={estimatedIS} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tax Calendar */}
        <div className="mt-6 p-4 bg-warning/5 border border-warning/20 rounded-lg">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-warning mt-0.5" />
            <div>
              <p className="font-medium text-foreground">{t('taxReports.importantTaxDeadlines')}</p>
              <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                <li>{t('taxReports.q1IsAdvance')}</li>
                <li>{t('taxReports.q2IsAdvance')}</li>
                <li>{t('taxReports.q3IsAdvance')}</li>
                <li>{t('taxReports.q4IsAdvance')}</li>
                <li>{t('taxReports.annualIsDeclaration')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          className="card-elevated p-4 text-left hover:shadow-elevated transition-shadow"
          onClick={handleGenerateVATReport}
        >
          <FileSpreadsheet className="w-6 h-6 text-primary mb-2" />
          <p className="font-medium text-foreground">{t('taxReports.generateVatReport')}</p>
          <p className="text-sm text-muted-foreground">{t('taxReports.monthlyVatDeclaration')}</p>
        </button>
        <button
          className="card-elevated p-4 text-left hover:shadow-elevated transition-shadow"
          onClick={() => setShowISSimulation(true)}
        >
          <Calculator className="w-6 h-6 text-info mb-2" />
          <p className="font-medium text-foreground">{t('taxReports.isSimulation')}</p>
          <p className="text-sm text-muted-foreground">{t('taxReports.annualTaxProjection')}</p>
        </button>
        <button
          className="card-elevated p-4 text-left hover:shadow-elevated transition-shadow"
          onClick={handleExportLedger}
        >
          <Download className="w-6 h-6 text-success mb-2" />
          <p className="font-medium text-foreground">{t('taxReports.exportLedger')}</p>
          <p className="text-sm text-muted-foreground">{t('taxReports.forAccountantReview')}</p>
        </button>
        <button
          className="card-elevated p-4 text-left hover:shadow-elevated transition-shadow"
          onClick={() => setShowTaxCalendar(true)}
        >
          <Calendar className="w-6 h-6 text-warning mb-2" />
          <p className="font-medium text-foreground">{t('taxReports.taxCalendar')}</p>
          <p className="text-sm text-muted-foreground">{t('taxReports.upcomingDeadlines')}</p>
        </button>
      </div>

      {/* IS Simulation Modal */}
      <Dialog open={showISSimulation} onOpenChange={setShowISSimulation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('taxReports.isSimulation')}</DialogTitle>
            <DialogDescription>
              {t('taxReports.annualProjectionBased') || 'Annual projection based on current period data'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="text-sm text-muted-foreground mb-4">
              {t('taxReports.basedOnMonths', { months: annualProjection.monthsCompleted }) ||
                `Based on ${annualProjection.monthsCompleted} months of data`}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('taxReports.projectedRevenue') || 'Projected Annual Revenue'}</span>
                <span className="font-medium"><CurrencyDisplay amount={annualProjection.projectedAnnualRevenue} /></span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('taxReports.projectedExpenses') || 'Projected Annual Expenses'}</span>
                <span className="font-medium text-destructive">-<CurrencyDisplay amount={annualProjection.projectedAnnualExpenses} /></span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium">{t('taxReports.projectedProfit') || 'Projected Net Profit'}</span>
                <span className={`font-bold ${annualProjection.projectedNetProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  <CurrencyDisplay amount={annualProjection.projectedNetProfit} />
                </span>
              </div>
              <div className="flex justify-between py-3 px-4 bg-primary/10 rounded-lg">
                <span className="font-medium">{t('taxReports.projectedIS') || 'Projected IS Tax'}</span>
                <span className="font-bold text-primary"><CurrencyDisplay amount={annualProjection.projectedIS} /></span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              {t('taxReports.projectionDisclaimer') ||
                '* This is an estimate based on current data extrapolated to a full year. Actual tax liability may vary.'}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tax Calendar Modal */}
      <Dialog open={showTaxCalendar} onOpenChange={setShowTaxCalendar}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('taxReports.taxCalendar')}</DialogTitle>
            <DialogDescription>
              {t('taxReports.moroccanTaxDeadlines') || 'Moroccan tax deadlines and important dates'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-3">
              <div className="p-3 bg-section rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="font-medium">{t('taxReports.vatDeclaration') || 'VAT Declaration'}</span>
                </div>
                <p className="text-sm text-muted-foreground ml-4">
                  {t('taxReports.vatDeadlineDesc') || 'Before the 20th of each month for the previous month'}
                </p>
              </div>
              <div className="p-3 bg-section rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-info" />
                  <span className="font-medium">{t('taxReports.isQuarterlyAdvances') || 'IS Quarterly Advances'}</span>
                </div>
                <ul className="text-sm text-muted-foreground ml-4 space-y-1">
                  <li>Q1: {t('taxReports.q1Deadline') || 'Before March 31'}</li>
                  <li>Q2: {t('taxReports.q2Deadline') || 'Before June 30'}</li>
                  <li>Q3: {t('taxReports.q3Deadline') || 'Before September 30'}</li>
                  <li>Q4: {t('taxReports.q4Deadline') || 'Before December 31'}</li>
                </ul>
              </div>
              <div className="p-3 bg-section rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <span className="font-medium">{t('taxReports.annualDeclaration') || 'Annual IS Declaration'}</span>
                </div>
                <p className="text-sm text-muted-foreground ml-4">
                  {t('taxReports.annualDeadlineDesc') || 'Before March 31 of the following year'}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
