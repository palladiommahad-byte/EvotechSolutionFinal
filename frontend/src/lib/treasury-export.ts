import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatMAD } from './moroccan-utils';
import type { Payment, BankAccount } from '@/contexts/TreasuryContext';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

interface TreasuryExportData {
    dateRange: string;
    kpis: {
        totalBank: number;
        totalWarehouseCash: number;
        realTimeBalance: number;
        netLiquidity: number;
    };
    bankAccounts: BankAccount[];
    salesPayments: Payment[];
    purchasePayments: Payment[];
}

/**
 * Export Treasury data to Excel format
 */
export const exportTreasuryToExcel = (data: TreasuryExportData) => {
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
        ['Treasury Report'],
        ['Date Range:', data.dateRange],
        [''],
        ['Key Performance Indicators'],
        ['Total Bank', formatMAD(data.kpis.totalBank)],
        ['Total Warehouse Cash', formatMAD(data.kpis.totalWarehouseCash)],
        ['Real-Time Balance', formatMAD(data.kpis.realTimeBalance)],
        ['Net Liquidity', formatMAD(data.kpis.netLiquidity)],
        [''],
        ['Bank Accounts'],
        ['Bank', 'Account Number', 'Balance'],
        ...data.bankAccounts.map(acc => [
            acc.bank,
            acc.accountNumber,
            acc.balance
        ]),
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Sales Payments Sheet
    if (data.salesPayments.length > 0) {
        const salesData = [
            ['Sales Payments'],
            ['Date Range:', data.dateRange],
            [''],
            ['Invoice', 'Client', 'Date', 'Amount', 'Method', 'Bank', 'Status'],
            ...data.salesPayments.map(p => [
                p.invoiceNumber || '-',
                p.entity || '-',
                p.date,
                p.amount,
                p.paymentMethod,
                p.bank || '-',
                p.status
            ])
        ];
        const salesSheet = XLSX.utils.aoa_to_sheet(salesData);
        XLSX.utils.book_append_sheet(workbook, salesSheet, 'Sales Payments');
    }

    // Purchase Payments Sheet
    if (data.purchasePayments.length > 0) {
        const purchaseData = [
            ['Purchase Payments'],
            ['Date Range:', data.dateRange],
            [''],
            ['Invoice', 'Supplier', 'Date', 'Amount', 'Method', 'Bank', 'Status'],
            ...data.purchasePayments.map(p => [
                p.invoiceNumber || '-',
                p.entity || '-',
                p.date,
                p.amount,
                p.paymentMethod,
                p.bank || '-',
                p.status
            ])
        ];
        const purchaseSheet = XLSX.utils.aoa_to_sheet(purchaseData);
        XLSX.utils.book_append_sheet(workbook, purchaseSheet, 'Purchase Payments');
    }

    // Generate filename with date range
    const sanitizedDateRange = data.dateRange.replace(/[^a-z0-9]/gi, '_');
    const filename = `Treasury_Report_${sanitizedDateRange}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);
};

/**
 * Export Treasury data to PDF format
 */
export const exportTreasuryToPDF = (data: TreasuryExportData) => {
    const doc = new jsPDF();
    let yPosition = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Treasury Report', 14, yPosition);
    yPosition += 10;

    // Date Range
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date Range: ${data.dateRange}`, 14, yPosition);
    yPosition += 10;

    // KPIs Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Performance Indicators', 14, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const kpiData = [
        ['Total Bank', formatMAD(data.kpis.totalBank)],
        ['Total Warehouse Cash', formatMAD(data.kpis.totalWarehouseCash)],
        ['Real-Time Balance', formatMAD(data.kpis.realTimeBalance)],
        ['Net Liquidity', formatMAD(data.kpis.netLiquidity)],
    ];

    doc.autoTable({
        startY: yPosition,
        head: [['Metric', 'Value']],
        body: kpiData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        margin: { left: 14 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Bank Accounts Section
    if (data.bankAccounts.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Bank Accounts', 14, yPosition);
        yPosition += 8;

        const bankData = data.bankAccounts.map(acc => [
            acc.bank,
            acc.accountNumber,
            formatMAD(acc.balance)
        ]);

        doc.autoTable({
            startY: yPosition,
            head: [['Bank', 'Account Number', 'Balance']],
            body: bankData,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] },
            margin: { left: 14 },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Sales Payments Section
    if (data.salesPayments.length > 0) {
        // Add new page if needed
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Sales Payments', 14, yPosition);
        yPosition += 8;

        const salesData = data.salesPayments.map(p => [
            p.invoiceNumber || '-',
            p.entity || '-',
            p.date,
            formatMAD(p.amount),
            p.paymentMethod,
            p.status
        ]);

        doc.autoTable({
            startY: yPosition,
            head: [['Invoice', 'Client', 'Date', 'Amount', 'Method', 'Status']],
            body: salesData,
            theme: 'grid',
            headStyles: { fillColor: [46, 204, 113] },
            margin: { left: 14 },
            styles: { fontSize: 8 },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Purchase Payments Section
    if (data.purchasePayments.length > 0) {
        // Add new page if needed
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Purchase Payments', 14, yPosition);
        yPosition += 8;

        const purchaseData = data.purchasePayments.map(p => [
            p.invoiceNumber || '-',
            p.entity || '-',
            p.date,
            formatMAD(p.amount),
            p.paymentMethod,
            p.status
        ]);

        doc.autoTable({
            startY: yPosition,
            head: [['Invoice', 'Supplier', 'Date', 'Amount', 'Method', 'Status']],
            body: purchaseData,
            theme: 'grid',
            headStyles: { fillColor: [231, 76, 60] },
            margin: { left: 14 },
            styles: { fontSize: 8 },
        });
    }

    // Generate filename with date range
    const sanitizedDateRange = data.dateRange.replace(/[^a-z0-9]/gi, '_');
    const filename = `Treasury_Report_${sanitizedDateRange}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Download file
    doc.save(filename);
};
