const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'evotech_db',
};

async function verifyMigrations() {
    console.log('Verifying migrations...\n');
    const client = new Client(dbConfig);

    try {
        await client.connect();

        // Check 002: tax_reports table
        const check002 = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'tax_reports'
            );
        `);
        console.log(`Migration 002 (tax_reports table): ${check002.rows[0].exists ? '✅ Applied' : '❌ MISSING'}`);

        // Check 003: bank_account_id in invoices
        const check003Invoices = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'invoices' AND column_name = 'bank_account_id'
            );
        `);
        // Check 003: bank_account_id in purchase_invoices
        const check003PurchaseInvoices = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'purchase_invoices' AND column_name = 'bank_account_id'
            );
        `);
        const is003Applied = check003Invoices.rows[0].exists && check003PurchaseInvoices.rows[0].exists;
        console.log(`Migration 003 (bank_account_id in invoices/purchases): ${is003Applied ? '✅ Applied' : '❌ MISSING'}`);
        if (!is003Applied) {
            console.log(`  - invoices.bank_account_id: ${check003Invoices.rows[0].exists ? '✅' : '❌'}`);
            console.log(`  - purchase_invoices.bank_account_id: ${check003PurchaseInvoices.rows[0].exists ? '✅' : '❌'}`);
        }

        // Check 004: bank_account_id in treasury_payments
        const check004 = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'treasury_payments' AND column_name = 'bank_account_id'
            );
        `);
        console.log(`Migration 004 (bank_account_id in treasury_payments): ${check004.rows[0].exists ? '✅ Applied' : '❌ MISSING'}`);

        // Check 005: delivery_note_id in invoices
        const check005Col = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'invoices' AND column_name = 'delivery_note_id'
            );
        `);

        // Check 005: create_invoice_from_bl function
        const check005Func = await client.query(`
             SELECT EXISTS (
                SELECT FROM pg_proc 
                WHERE proname = 'create_invoice_from_bl'
            );
        `);

        const is005Applied = check005Col.rows[0].exists && check005Func.rows[0].exists;
        console.log(`Migration 005 (auto_invoice_logic): ${is005Applied ? '✅ Applied' : '❌ MISSING'}`);
        if (!is005Applied) {
            console.log(`  - delivery_note_id column: ${check005Col.rows[0].exists ? '✅' : '❌'}`);
            console.log(`  - create_invoice_from_bl function: ${check005Func.rows[0].exists ? '✅' : '❌'}`);
        }

    } catch (err) {
        console.error('Verification failed:', err.message);
    } finally {
        await client.end();
    }
}

verifyMigrations();
