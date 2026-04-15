const { query, getClient } = require('../config/database');

const DOCUMENT_PREFIXES = {
    invoice: 'FC',           // Facture Client
    estimate: 'DV',          // Devis
    purchase_order: 'BC',    // Bon de Commande
    delivery_note: 'BL',     // Bon de Livraison
    credit_note: 'AV',       // Avoir
    statement: 'RL',         // Relevé
    purchase_invoice: 'FA',  // Facture Achat
    divers: 'DIV',           // Divers
    prelevement: 'PRL',      // Prélèvement
};

const TABLE_MAP = {
    invoice: 'invoices',
    estimate: 'estimates',
    purchase_order: 'purchase_orders',
    delivery_note: 'delivery_notes',
    credit_note: 'credit_notes',
    statement: 'statements',
    purchase_invoice: 'purchase_invoices',
    divers: 'delivery_notes', // stored in delivery_notes with document_type='divers'
    prelevement: 'prelevements'
};

/**
 * Generates a unique document ID in the format PREFIX-MM/YY/NNNN
 * Uses the legacy SELECT-based approach (safe for low-concurrency doc types).
 *
 * @param {string} type - The document type (e.g., 'delivery_note', 'estimate')
 * @param {Date} date   - The document date (defaults to now)
 * @returns {Promise<string>} The generated document ID
 */
async function generateDocumentNumber(type, date = new Date()) {
    const prefix = DOCUMENT_PREFIXES[type];
    if (!prefix) {
        throw new Error(`Unknown document type: ${type}`);
    }

    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2); // YY format
    const baseId = `${prefix}-${month}/${year}/`;

    // Determine table
    let table = TABLE_MAP[type];
    if (!table) {
        throw new Error(`No table mapped for type: ${type}`);
    }

    let sql = `SELECT document_id FROM ${table} WHERE document_id LIKE $1`;
    const params = [`${baseId}%`];

    // Special handling for divers sharing the same table as delivery_notes
    if (type === 'divers') {
        sql += ` AND document_type = 'divers'`;
    } else if (type === 'delivery_note') {
        sql += ` AND (document_type = 'delivery_note' OR document_type IS NULL)`;
    }

    sql += ` ORDER BY document_id DESC LIMIT 1`;

    const result = await query(sql, params);

    let nextSerial = 1;
    if (result.rows.length > 0) {
        const lastId = result.rows[0].document_id;
        const parts = lastId.split('/');
        if (parts.length === 3) {
            const serialPart = parts[2]; // NNNN
            const lastSerial = parseInt(serialPart, 10);
            if (!isNaN(lastSerial)) {
                nextSerial = lastSerial + 1;
            }
        }
    }

    const serial = String(nextSerial).padStart(4, '0');
    return `${baseId}${serial}`;
}

/**
 * Generates a safe, unique invoice number using a row-locked sequence table.
 * This is the ONLY correct way to generate invoice numbers in this system.
 *
 * MUST be called inside an active database transaction (pass the pg client).
 * Uses SELECT ... FOR UPDATE to prevent race conditions under concurrent requests.
 *
 * @param {object} pgClient - An active pg transaction client (from getClient())
 * @param {Date}   date     - The invoice date (used to determine month/year portion)
 * @returns {Promise<string>} e.g. "FC-04/26/0001"
 */
async function generateInvoiceNumberSafe(pgClient, date = new Date()) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year  = String(d.getFullYear()).slice(-2); // YY
    const currentMonthYear = `${month}/${year}`;

    // Row-lock the invoice sequence row. No other concurrent transaction can
    // read or update this row until our transaction commits or rolls back.
    const seqResult = await pgClient.query(
        `SELECT last_month_year, last_seq
           FROM document_sequences
          WHERE doc_type = 'invoice'
          FOR UPDATE`,
        []
    );

    if (seqResult.rows.length === 0) {
        throw new Error(
            'document_sequences row for "invoice" not found. ' +
            'Please run migration 016_invoice_bl_workflow.sql.'
        );
    }

    const row = seqResult.rows[0];
    let nextSeq;

    if (row.last_month_year === currentMonthYear) {
        // Same month/year → just increment
        nextSeq = row.last_seq + 1;
    } else {
        // New month → reset counter from 1
        nextSeq = 1;
    }

    // Persist the new sequence state
    await pgClient.query(
        `UPDATE document_sequences
            SET last_month_year = $1,
                last_seq        = $2
          WHERE doc_type = 'invoice'`,
        [currentMonthYear, nextSeq]
    );

    const serial = String(nextSeq).padStart(4, '0');
    return `FC${month}${year}/${serial}`;
}

module.exports = {
    generateDocumentNumber,
    generateInvoiceNumberSafe,
    DOCUMENT_PREFIXES,
};
