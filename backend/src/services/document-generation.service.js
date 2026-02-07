const { query } = require('../config/database');

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
    statement: 'statements', // Verify table name
    purchase_invoice: 'purchase_invoices',
    divers: 'delivery_notes', // stored in delivery_notes with document_type='divers'
    prelevement: 'prelevements'
};

/**
 * Generates a unique document ID in the format PREFIX-MM/YY/NNNN
 * @param {string} type - The document type (e.g., 'invoice', 'delivery_note')
 * @param {Date} date - The document date (defaults to now)
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
        // Fallback or error
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

module.exports = {
    generateDocumentNumber,
    DOCUMENT_PREFIXES
};
