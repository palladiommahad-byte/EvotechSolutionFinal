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
 * (e.g. BL-06/26/0008, DV-06/26/0001)
 * Uses the legacy SELECT-based approach (safe for low-concurrency doc types).
 * NOTE: invoices use generateInvoiceNumberSafe which produces FC-MMYY/NNNN format.
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

async function generateInvoiceNumberSafe(pgClient, date = new Date()) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year  = String(d.getFullYear()).slice(-2); // YY
    const baseId = `FC${month}${year}/`;

    // Row-lock the invoice sequence row to act as a global mutex for invoice generation.
    // This prevents race conditions when generating invoices concurrently.
    const seqResult = await pgClient.query(
        `SELECT 1
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

    // Now safely determine the max ID for this specific month/year
    const result = await pgClient.query(
        `SELECT document_id FROM invoices
         WHERE document_id LIKE $1
         ORDER BY document_id DESC LIMIT 1`,
        [`${baseId}%`]
    );

    let nextSeq = 1;
    if (result.rows.length > 0) {
        const lastId = result.rows[0].document_id;
        const parts = lastId.split('/');
        if (parts.length === 2) {
            const serialPart = parts[1]; // NNNN
            const lastSerial = parseInt(serialPart, 10);
            if (!isNaN(lastSerial)) {
                nextSeq = lastSerial + 1;
            }
        }
    }

    const serial = String(nextSeq).padStart(4, '0');
    return `${baseId}${serial}`;
}

module.exports = {
    generateDocumentNumber,
    generateInvoiceNumberSafe,
    DOCUMENT_PREFIXES,
};
