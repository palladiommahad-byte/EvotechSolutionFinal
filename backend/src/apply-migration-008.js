const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function applyMigration() {
    const migrationPath = path.join(__dirname, '../migrations/008_add_purchase_partial_payments.sql');

    try {
        console.log('Reading migration file...');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Applying migration 008_add_purchase_partial_payments...');
        await pool.query(sql);

        console.log('✅ Migration applied successfully!');
        console.log('- Added amount_paid column to purchase_invoices');
        console.log('- Updated status constraint to include partially_paid');
        console.log('- Created index on amount_paid');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

applyMigration();
