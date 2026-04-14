const ExcelJS = require('exceljs');
const { query } = require('../config/database');

const REPORT_CONFIGS = {
    inventory: {
        title: 'Inventory Report',
        sql: `SELECT name, sku, category, stock as quantity, price, (stock * price) as total_value, status, created_at FROM products ORDER BY name ASC`,
        columns: [
            { header: 'Product Name', key: 'name', width: 30 },
            { header: 'SKU', key: 'sku', width: 15 },
            { header: 'Category', key: 'category', width: 20 },
            { header: 'Quantity', key: 'quantity', width: 12 },
            { header: 'Unit Price', key: 'price', width: 15 },
            { header: 'Total Value', key: 'total_value', width: 18 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Date Added', key: 'created_at', width: 20 }
        ]
    },
    'sales-invoice': {
        title: 'Sales Invoices Report',
        sql: `SELECT i.document_id, c.name as client_name, i.date, i.total, i.status, i.payment_method, i.created_at 
              FROM invoices i 
              LEFT JOIN contacts c ON i.client_id = c.id 
              ORDER BY i.date DESC`,
        columns: [
            { header: 'Invoice #', key: 'document_id', width: 15 },
            { header: 'Client', key: 'client_name', width: 25 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Total', key: 'total', width: 18 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Payment', key: 'payment_method', width: 15 },
            { header: 'Created At', key: 'created_at', width: 20 }
        ]
    },
    'sales-estimate': {
        title: 'Estimates Report',
        sql: `SELECT e.document_id, c.name as client_name, e.date, e.total, e.status, e.created_at 
              FROM estimates e 
              LEFT JOIN contacts c ON e.client_id = c.id 
              ORDER BY e.date DESC`,
        columns: [
            { header: 'Estimate #', key: 'document_id', width: 15 },
            { header: 'Client', key: 'client_name', width: 25 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Total', key: 'total', width: 18 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Created At', key: 'created_at', width: 20 }
        ]
    },
    'sales-delivery_note': {
        title: 'Delivery Notes Report',
        sql: `SELECT d.document_id, c.name as client_name, d.date, d.status, d.created_at 
              FROM delivery_notes d 
              LEFT JOIN contacts c ON d.client_id = c.id 
              WHERE d.document_type = 'delivery_note'
              ORDER BY d.date DESC`,
        columns: [
            { header: 'Note #', key: 'document_id', width: 15 },
            { header: 'Client', key: 'client_name', width: 25 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Created At', key: 'created_at', width: 20 }
        ]
    },
    'sales-divers': {
        title: 'Divers Notes Report',
        sql: `SELECT d.document_id, c.name as client_name, d.date, d.status, d.created_at 
              FROM delivery_notes d 
              LEFT JOIN contacts c ON d.client_id = c.id 
              WHERE d.document_type = 'divers'
              ORDER BY d.date DESC`,
        columns: [
            { header: 'Bon #', key: 'document_id', width: 15 },
            { header: 'Client', key: 'client_name', width: 25 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Created At', key: 'created_at', width: 20 }
        ]
    },
    'sales-credit_note': {
        title: 'Credit Notes Report',
        sql: `SELECT cn.document_id, c.name as client_name, cn.date, cn.total, cn.status, cn.created_at 
               FROM credit_notes cn 
               LEFT JOIN contacts c ON cn.client_id = c.id 
               ORDER BY cn.date DESC`,
        columns: [
            { header: 'Credit Note #', key: 'document_id', width: 15 },
            { header: 'Client', key: 'client_name', width: 25 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Total', key: 'total', width: 18 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Created At', key: 'created_at', width: 20 }
        ]
    },
    'purchases-purchase_order': {
        title: 'Purchase Orders Report',
        sql: `SELECT po.document_id, c.name as supplier_name, po.date, po.status, po.created_at 
              FROM purchase_orders po 
              LEFT JOIN contacts c ON po.supplier_id = c.id 
              ORDER BY po.date DESC`,
        columns: [
            { header: 'Order #', key: 'document_id', width: 15 },
            { header: 'Supplier', key: 'supplier_name', width: 25 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Created At', key: 'created_at', width: 20 }
        ]
    },
    'purchases-invoice': {
        title: 'Purchase Invoices Report',
        sql: `SELECT pi.document_id, c.name as supplier_name, pi.date, pi.total, pi.status, pi.payment_method, pi.created_at 
              FROM purchase_invoices pi 
              LEFT JOIN contacts c ON pi.supplier_id = c.id 
              ORDER BY pi.date DESC`,
        columns: [
            { header: 'Invoice #', key: 'document_id', width: 15 },
            { header: 'Supplier', key: 'supplier_name', width: 25 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Total', key: 'total', width: 18 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Payment', key: 'payment_method', width: 15 },
            { header: 'Created At', key: 'created_at', width: 20 }
        ]
    },
    'purchases-delivery_note': {
        title: 'Purchase Delivery Notes Report',
        sql: `SELECT d.document_id, c.name as supplier_name, d.date, d.status, d.created_at 
              FROM delivery_notes d 
              LEFT JOIN contacts c ON d.supplier_id = c.id 
              WHERE d.supplier_id IS NOT NULL
              ORDER BY d.date DESC`,
        columns: [
            { header: 'Note #', key: 'document_id', width: 15 },
            { header: 'Supplier', key: 'supplier_name', width: 25 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Created At', key: 'created_at', width: 20 }
        ]
    },
    'treasury': {
        title: 'Treasury Report',
        sql: `
            SELECT 
                ba.bank,
                ba.account_number,
                ba.balance,
                'bank' as account_type
            FROM treasury_bank_accounts ba
            UNION ALL
            SELECT 
                w.city as bank,
                'Warehouse Cash' as account_number,
                wc.amount as balance,
                'warehouse' as account_type
            FROM treasury_warehouse_cash wc
            LEFT JOIN warehouses w ON wc.warehouse_id = w.id
            ORDER BY account_type DESC, bank ASC
        `,
        columns: [
            { header: 'Account Type', key: 'account_type', width: 18 },
            { header: 'Bank/Warehouse', key: 'bank', width: 30 },
            { header: 'Account Number', key: 'account_number', width: 25 },
            { header: 'Balance', key: 'balance', width: 18 }
        ]
    },
};

/**
 * Generates a styled Excel report based on type
 * @param {string} type - Report type (inventory, sales-invoice, etc.)
 * @returns {Promise<Buffer>} The generated Excel file buffer
 */
/**
 * Core function to generate Excel buffer from data
 * @param {Array} columns - Column definitions
 * @param {Array} rows - Data rows
 * @param {string} title - Worksheet title
 * @returns {Promise<Buffer>}
 */
const createExcelBuffer = async (columns, rows, title) => {
    // 2. Create Workbook and Worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);

    // 3. Define Columns
    worksheet.columns = columns;

    // 4. Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF5B2C6F' } // Purple hex
        };
        cell.font = {
            name: 'Arial',
            color: { argb: 'FFFFFFFF' }, // White
            bold: true,
            size: 11
        };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });
    headerRow.height = 24;

    // 5. Add Data & Apply Row Styles
    rows.forEach((row, index) => {
        // Map row data to columns based on key
        const rowData = {};
        columns.forEach(col => {
            // Handle specific column types if needed
            let val = row[col.key] || row[col.key.replace(/([A-Z])/g, "_$1").toLowerCase()]; // Try camelCase and snake_case

            // Special handling for dates
            if (col.key === 'created_at' || col.key === 'date') {
                if (val) rowData[col.key] = new Date(val).toISOString().split('T')[0];
                else rowData[col.key] = '';
            }
            // Numbers
            else if (['total', 'quantity', 'price', 'total_value', 'amount', 'balance', 'runningBalance'].includes(col.key)) {
                rowData[col.key] = Number(val) || 0;
            } else {
                rowData[col.key] = val;
            }
        });

        const addedRow = worksheet.addRow(rowData);

        addedRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            // Borders
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
            };

            // Zebra Striping
            if (index % 2 !== 0) {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF9F9F9' }
                };
            }

            // Conditional formatting examples
            const colKey = columns[colNumber - 1]?.key;
            if (colKey === 'quantity' && cell.value < 10) {
                cell.font = { color: { argb: 'FFFF0000' }, bold: true };
            }
            if (colKey === 'status' && cell.value === 'draft') {
                cell.font = { color: { argb: 'FF808080' }, italic: true };
            }

            // Currency formatting
            if (['total', 'price', 'total_value', 'balance', 'amount', 'runningBalance'].includes(colKey)) {
                cell.numFmt = '#,##0.00 "DH"'; // Changed to DH as per screenshot
                cell.alignment = { horizontal: 'right' };
            }
        });
    });

    // 6. Freeze Top Row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // 7. Auto-Filter
    worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: worksheet.columns.length }
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
};

/**
 * Generates a styled Excel report based on type (Backend Data)
 * @param {string} type - Report type (inventory, sales-invoice, etc.)
 * @returns {Promise<Buffer>} The generated Excel file buffer
 */
const generateStyledReport = async (type = 'inventory') => {
    const config = REPORT_CONFIGS[type] || REPORT_CONFIGS['inventory'];

    // 1. Fetch data
    let rows = [];
    try {
        const result = await query(config.sql, []);
        rows = result.rows;
    } catch (error) {
        console.error('Error fetching data for report:', error);
        throw new Error('Database fetch failed');
    }

    return createExcelBuffer(config.columns, rows, config.title);
};

/**
 * Generates a styled Excel report from provided data (Frontend Data)
 * @param {Array} data - Array of objects
 * @param {Array} columns - Column definitions
 * @param {string} title - Report title
 * @returns {Promise<Buffer>}
 */
const generateStyledReportFromData = async (data, columns, title) => {
    return createExcelBuffer(columns, data, title || 'Export');
};

module.exports = {
    generateStyledReport,
    generateStyledReportFromData
};
