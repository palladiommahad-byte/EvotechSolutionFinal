import { useState, useMemo } from 'react';
import { FileSpreadsheet, Download, FileText, ChevronDown, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatMAD, VAT_RATE } from '@/lib/moroccan-utils';
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
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

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

// Extract HT (pre-tax) amount from a document — pure helper, defined outside component
const getHT = (inv: { total: number; subtotal?: number }): number => {
  const ttc = Number(inv.total) || 0;
  return inv.subtotal != null ? Number(inv.subtotal) : ttc / (1 + 0.20);
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

  // VAT Collected = TTC - HT for each sales invoice
  const vatCollected = useMemo(() => {
    return filteredSalesInvoices.reduce((sum, inv) => {
      const ttc = Number(inv.total) || 0;
      const ht = getHT(inv);
      return sum + (ttc - ht);
    }, 0);
  }, [filteredSalesInvoices]);

  // VAT Paid = TTC - HT for each purchase invoice
  const vatPaid = useMemo(() => {
    return filteredPurchaseInvoices.reduce((sum, inv) => {
      const ttc = Number(inv.total) || 0;
      const ht = getHT(inv);
      return sum + (ttc - ht);
    }, 0);
  }, [filteredPurchaseInvoices]);

  // VAT Due = VAT Collected - VAT Paid
  const vatDue = vatCollected - vatPaid;

  // Gross Revenue = sum of HT sales (excluding VAT — correct for tax reporting)
  const grossRevenue = useMemo(() => {
    return filteredSalesInvoices.reduce((sum, inv) => sum + getHT(inv), 0);
  }, [filteredSalesInvoices]);

  // Expenses = sum of HT purchases (excluding VAT)
  const expenses = useMemo(() => {
    return filteredPurchaseInvoices.reduce((sum, inv) => sum + getHT(inv), 0);
  }, [filteredPurchaseInvoices]);

  // Net Profit = Gross Revenue - Expenses
  const netProfit = grossRevenue - expenses;

  // Monthly breakdown for bar chart
  const monthlyData = useMemo(() => {
    const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const months = MONTHS.map((name, i) => ({ name, revenue: 0, expenses: 0, vatCollected: 0, vatPaid: 0 }));

    filteredSalesInvoices.forEach(inv => {
      const m = new Date(inv.date).getMonth();
      const ttc = Number(inv.total) || 0;
      const ht = inv.subtotal != null ? Number(inv.subtotal) : ttc / (1 + VAT_RATE);
      months[m].revenue += ht;
      months[m].vatCollected += ttc - ht;
    });
    filteredPurchaseInvoices.forEach(inv => {
      const m = new Date(inv.date).getMonth();
      const ttc = Number(inv.total) || 0;
      const ht = inv.subtotal != null ? Number(inv.subtotal) : ttc / (1 + VAT_RATE);
      months[m].expenses += ht;
      months[m].vatPaid += ttc - ht;
    });

    // Only return months that have data (or all if quarter filter applied)
    if (selectedQuarter === 'all') {
      return months.filter(m => m.revenue > 0 || m.expenses > 0);
    }
    const quarterMonths: Record<string, number[]> = { q1: [0,1,2], q2: [3,4,5], q3: [6,7,8], q4: [9,10,11] };
    return quarterMonths[selectedQuarter]?.map(i => months[i]) ?? [];
  }, [filteredSalesInvoices, filteredPurchaseInvoices, selectedQuarter]);

  // VAT pie chart data
  const vatPieData = useMemo(() => [
    { name: t('taxReports.vatCollected') || 'TVA Collectée', value: vatCollected },
    { name: t('taxReports.vatPaid') || 'TVA Déductible', value: vatPaid },
  ], [vatCollected, vatPaid, t]);

  const PIE_COLORS = ['#22c55e', '#ef4444'];

  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toString();
  };

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
          <p className="text-muted-foreground">
            {selectedQuarter === 'all'
              ? `Année complète ${selectedYear}`
              : `${selectedQuarter.toUpperCase()} ${selectedYear} — ${
                  selectedQuarter === 'q1' ? 'Jan · Fév · Mar'
                  : selectedQuarter === 'q2' ? 'Avr · Mai · Jun'
                  : selectedQuarter === 'q3' ? 'Jul · Aoû · Sep'
                  : 'Oct · Nov · Déc'
                }`
            }
          </p>
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">{t('taxReports.grossRevenue') || 'Revenus bruts'}</p>
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <p className="text-xl font-heading font-bold text-success">{formatMAD(grossRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">{filteredSalesInvoices.length} factures</p>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">{t('taxReports.totalExpenses') || 'Dépenses totales'}</p>
            <TrendingDown className="w-4 h-4 text-destructive" />
          </div>
          <p className="text-xl font-heading font-bold text-destructive">{formatMAD(expenses)}</p>
          <p className="text-xs text-muted-foreground mt-1">{filteredPurchaseInvoices.length} achats</p>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">{t('taxReports.netProfit') || 'Bénéfice net'}</p>
            {netProfit >= 0
              ? <TrendingUp className="w-4 h-4 text-primary" />
              : <TrendingDown className="w-4 h-4 text-destructive" />}
          </div>
          <p className={`text-xl font-heading font-bold ${netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {netProfit < 0 && '-'}{formatMAD(Math.abs(netProfit))}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {grossRevenue > 0 ? `${((netProfit / grossRevenue) * 100).toFixed(1)}% marge` : '—'}
          </p>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">{t('taxReports.vatDue') || 'TVA due'}</p>
            <Minus className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className={`text-xl font-heading font-bold ${vatDue >= 0 ? 'text-foreground' : 'text-success'}`}>
            {vatDue >= 0 ? formatMAD(vatDue) : `(${formatMAD(Math.abs(vatDue))})`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {vatDue >= 0 ? 'À payer à la DGI' : 'Crédit TVA récupérable'}
          </p>
        </div>
      </div>

      {/* VAT Section */}
      <div className="card-elevated p-6">
        <div className="mb-6">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-1">{t('taxReports.vatCalculation')}</h2>
          <p className="text-sm text-muted-foreground">{t('taxReports.vatAt', { rate: VAT_RATE * 100 })}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {filteredSalesInvoices.length} ventes · {filteredPurchaseInvoices.length} achats
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-success/5 border border-success/20">
            <p className="text-sm text-muted-foreground mb-1">{t('taxReports.vatCollected')}</p>
            <p className="text-2xl font-heading font-bold text-success">{formatMAD(vatCollected)}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('taxReports.fromCustomerInvoices')}</p>
          </div>
          <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
            <p className="text-sm text-muted-foreground mb-1">{t('taxReports.vatPaid')}</p>
            <p className="text-2xl font-heading font-bold text-destructive">{formatMAD(vatPaid)}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('taxReports.fromSupplierInvoices')}</p>
          </div>
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">{t('taxReports.vatDue')}</p>
            <p className={`text-2xl font-heading font-bold ${vatDue >= 0 ? 'text-primary' : 'text-success'}`}>
              {vatDue >= 0 ? formatMAD(vatDue) : `(${formatMAD(Math.abs(vatDue))})`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {vatDue >= 0 ? t('taxReports.toBePaidToTaxAuthority') : t('taxReports.vatCredit') || 'Crédit TVA'}
            </p>
          </div>
        </div>

        {/* VAT Pie Chart */}
        {(vatCollected > 0 || vatPaid > 0) && (
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vatPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {vatPieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatMAD(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Monthly Revenue vs Expenses Chart */}
      {monthlyData.length > 0 && (
        <div className="card-elevated p-6">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-1">Revenus vs Dépenses</h2>
          <p className="text-sm text-muted-foreground mb-6">Par mois sur la période sélectionnée</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatMAD(value),
                    name === 'revenue' ? 'Revenus' : 'Dépenses',
                  ]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend formatter={(value) => value === 'revenue' ? 'Revenus' : 'Dépenses'} />
                <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} name="revenue" />
                <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
