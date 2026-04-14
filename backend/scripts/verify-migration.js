const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
};

async function verifyAllMigrations() {
    console.log('Verifying all migrations...\n');

    const client = new Client(dbConfig);

    try {
        await client.connect();

        console.log('═'.repeat(60));
        console.log('DATABASE MIGRATION STATUS');
        console.log('═'.repeat(60));

        // Check tax_reports table (Migration 002)
        const taxReportsCheck = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'tax_reports'
        `);

        console.log('\n📋 Migration 002: Tax Reports');
        console.log('─'.repeat(60));
        if (taxReportsCheck.rows.length > 0) {
            console.log('✅ tax_reports table: EXISTS');

            // Get columns
            const columns = await client.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'tax_reports'
                ORDER BY ordinal_position
            `);

            console.log('   Columns:');
            columns.rows.forEach(col => {
                console.log(`   - ${col.column_name} (${col.data_type})`);
            });
        } else {
            console.log('❌ tax_reports table: NOT FOUND');
        }

        // Check bank_account_id columns (Migration 003)
        const invoicesBankAccount = await client.query(`
            SELECT column_name 
            FROM information_schema.columns
            WHERE table_name = 'invoices' AND column_name = 'bank_account_id'
        `);

        const purchaseInvoicesBankAccount = await client.query(`
            SELECT column_name 
            FROM information_schema.columns
            WHERE table_name = 'purchase_invoices' AND column_name = 'bank_account_id'
        `);

        console.log('\n💰 Migration 003: Bank Account Tracking');
        console.log('─'.repeat(60));
        console.log(invoicesBankAccount.rows.length > 0
            ? '✅ invoices.bank_account_id: EXISTS'
            : '❌ invoices.bank_account_id: NOT FOUND');
        console.log(purchaseInvoicesBankAccount.rows.length > 0
            ? '✅ purchase_invoices.bank_account_id: EXISTS'
            : '❌ purchase_invoices.bank_account_id: NOT FOUND');

        // Summary
        console.log('\n' + '═'.repeat(60));
        const allGood = taxReportsCheck.rows.length > 0 &&
            invoicesBankAccount.rows.length > 0 &&
            purchaseInvoicesBankAccount.rows.length > 0;

        if (allGood) {
            console.log('🎉 ALL MIGRATIONS VERIFIED SUCCESSFULLY!');
        } else {
            console.log('⚠️  SOME MIGRATIONS MAY BE MISSING');
        }
        console.log('═'.repeat(60));

    } catch (err) {
        console.error('Verification failed:', err.message);
    } finally {
        await client.end();
    }
}

verifyAllMigrations();
