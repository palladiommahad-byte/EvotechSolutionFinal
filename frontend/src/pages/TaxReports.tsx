import { FileSpreadsheet, Calculator, TrendingUp, Download, Calendar, FileText, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { generateTaxReportPDF } from '@/lib/pdf-generator';
import { generateTaxReportExcel } from '@/lib/excel-generator';
import { generateTaxReportCSV } from '@/lib/csv-generator';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';

const vatData = {
  collected: 245600,
  paid: 156800,
  due: 88800,
};

const revenueData = {
  grossRevenue: 4856000,
  expenses: 3245000,
  netProfit: 1611000,
};

export const TaxReports = () => {
  const { t } = useTranslation();
  const estimatedIS = calculateCorporateTax(revenueData.netProfit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">{t('taxReports.title')}</h1>
          <p className="text-muted-foreground">{t('taxReports.description')}</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="2024">
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={t('taxReports.year')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2022">2022</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="q1">
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={t('taxReports.quarter')} />
            </SelectTrigger>
            <SelectContent>
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
              <DropdownMenuItem onClick={() => generateTaxReportPDF({
                grossRevenue: revenueData.grossRevenue,
                expenses: revenueData.expenses,
                netProfit: revenueData.netProfit,
                estimatedIS: estimatedIS,
              })}>
                <FileText className="w-4 h-4 mr-2" />
                {t('documents.exportAsPDF')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => generateTaxReportExcel({
                grossRevenue: revenueData.grossRevenue,
                expenses: revenueData.expenses,
                netProfit: revenueData.netProfit,
                estimatedIS: estimatedIS,
              })}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {t('documents.exportAsExcel')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => generateTaxReportCSV({
                grossRevenue: revenueData.grossRevenue,
                expenses: revenueData.expenses,
                netProfit: revenueData.netProfit,
                estimatedIS: estimatedIS,
              })}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {t('documents.exportAsCSV')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
            <p className="text-xl sm:text-2xl font-heading font-bold text-success break-words overflow-visible whitespace-normal leading-tight">{formatMAD(vatData.collected)}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('taxReports.fromCustomerInvoices')}</p>
          </div>
          <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 overflow-visible">
            <p className="text-sm text-muted-foreground mb-1">{t('taxReports.vatPaid')}</p>
            <p className="text-xl sm:text-2xl font-heading font-bold text-destructive break-words overflow-visible whitespace-normal leading-tight">{formatMAD(vatData.paid)}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('taxReports.fromSupplierInvoices')}</p>
          </div>
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 overflow-visible">
            <p className="text-sm text-muted-foreground mb-1">{t('taxReports.vatDue')}</p>
            <p className="text-xl sm:text-2xl font-heading font-bold text-primary break-words overflow-visible whitespace-normal leading-tight">{formatMAD(vatData.due)}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('taxReports.toBePaidToTaxAuthority')}</p>
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
                  <CurrencyDisplay amount={revenueData.grossRevenue} />
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border gap-4 overflow-visible">
                <span className="text-muted-foreground flex-shrink-0">{t('taxReports.totalExpenses')}</span>
                <span className="font-medium text-destructive break-words overflow-visible whitespace-normal text-right min-w-0">
                  -<CurrencyDisplay amount={revenueData.expenses} />
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border gap-4 overflow-visible">
                <span className="font-medium text-foreground flex-shrink-0">{t('taxReports.netProfit')}</span>
                <span className="font-bold text-success break-words overflow-visible whitespace-normal text-right min-w-0">
                  <CurrencyDisplay amount={revenueData.netProfit} />
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
                </ul>
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-2 gap-4 overflow-visible">
                  <span className="text-muted-foreground flex-shrink-0">{t('taxReports.taxableIncome')}</span>
                  <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
                    <CurrencyDisplay amount={revenueData.netProfit} />
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
        <button className="card-elevated p-4 text-left hover:shadow-elevated transition-shadow">
          <FileSpreadsheet className="w-6 h-6 text-primary mb-2" />
          <p className="font-medium text-foreground">{t('taxReports.generateVatReport')}</p>
          <p className="text-sm text-muted-foreground">{t('taxReports.monthlyVatDeclaration')}</p>
        </button>
        <button className="card-elevated p-4 text-left hover:shadow-elevated transition-shadow">
          <Calculator className="w-6 h-6 text-info mb-2" />
          <p className="font-medium text-foreground">{t('taxReports.isSimulation')}</p>
          <p className="text-sm text-muted-foreground">{t('taxReports.annualTaxProjection')}</p>
        </button>
        <button className="card-elevated p-4 text-left hover:shadow-elevated transition-shadow">
          <Download className="w-6 h-6 text-success mb-2" />
          <p className="font-medium text-foreground">{t('taxReports.exportLedger')}</p>
          <p className="text-sm text-muted-foreground">{t('taxReports.forAccountantReview')}</p>
        </button>
        <button className="card-elevated p-4 text-left hover:shadow-elevated transition-shadow">
          <Calendar className="w-6 h-6 text-warning mb-2" />
          <p className="font-medium text-foreground">{t('taxReports.taxCalendar')}</p>
          <p className="text-sm text-muted-foreground">{t('taxReports.upcomingDeadlines')}</p>
        </button>
      </div>
    </div>
  );
};
