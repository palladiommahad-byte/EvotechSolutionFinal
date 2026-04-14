require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function main() {
    try {
        const searchTerms = ['FC-01/26/0016', 'FC-01/26/0011', 'FC-01/26/0017'];

        console.log('--- Fetching Treasury Payments Count ---');
        const res = await pool.query('SELECT count(*) FROM treasury_payments');
        console.log(`Total count: ${res.rows[0].count}`);

        // Filter in JS
        const suspicious = res.rows.filter(r => {
            const desc = r.description || r.notes || r.entity || '';
            return searchTerms.some(term => desc.includes(term));
        });

        console.log(`Found ${suspicious.length} matching treasury payments in memory filtering:`);
        suspicious.forEach(r => {
            console.log(`ID: ${r.id}, Amount: ${r.amount}, InvoiceID: ${r.invoice_id}, Notes: ${r.notes}, Entity: ${r.entity}`);
        });

        if (suspicious.length > 0) {
            console.log('\n--- Checking Invoice Existence ---');
            const invoiceIds = suspicious.map(r => r.invoice_id).filter(id => id);
            const invoiceNumbers = suspicious.map(r => r.invoice_number || '').filter(n => n);

            // Check logic: are these linked to actual invoices?
            // Check by Invoice ID
            if (invoiceIds.length > 0) {
                const invRes = await pool.query('SELECT id, status FROM invoices WHERE id = ANY($1)', [invoiceIds]);
                console.log('Existing Invoices (by ID):', invRes.rows);
            }

            // Check by Invoice Number (just in case)
            if (invoiceNumbers.length > 0) {
                const invNumRes = await pool.query('SELECT id, document_id FROM invoices WHERE document_id = ANY($1)', [invoiceNumbers]);
                console.log('Existing Invoices (by Document ID):', invNumRes.rows);
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
