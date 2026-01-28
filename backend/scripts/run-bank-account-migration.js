const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
};

async function runMigration() {
    console.log(`Connecting to database ${dbConfig.database} at ${dbConfig.host}:${dbConfig.port}...`);

    const client = new Client(dbConfig);

    try {
        await client.connect();
        console.log('Connected successfully!');

        // Read the migration file
        const migrationPath = path.join(__dirname, '../migrations/003_add_bank_account_to_invoices.sql');
        console.log(`Reading migration file: ${migrationPath}`);

        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Executing migration...');
        await client.query(sql);

        console.log('✅ Migration 003_add_bank_account_to_invoices completed successfully!');
        console.log('   - Added bank_account_id column to invoices table');
        console.log('   - Added bank_account_id column to purchase_invoices table');
        console.log('   - Created indexes for performance');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        console.error('Full error:', err);
        process.exit(1);
    } finally {
        await client.end();
        console.log('Database connection closed.');
    }
}

runMigration();
