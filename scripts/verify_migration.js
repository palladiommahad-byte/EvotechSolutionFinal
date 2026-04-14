/**
 * Migration Verification Script
 * Lists all tables in the database and counts rows to verify data integrity.
 * 
 * Usage: 
 * 1. Ensure you are in the project root directory.
 * 2. Run: node scripts/verify_migration.js
 * 
 * Note: Requires 'pg' and 'dotenv' packages. 
 * If you get "MODULE_NOT_FOUND", try running this from the 'backend' directory:
 *   cd backend
 *   node ../scripts/verify_migration.js
 */

const fs = require('fs');
const path = require('path');

// Try to load .env from backend directory
const envPath = path.resolve(__dirname, '../backend/.env');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
} else {
    // Fallback to current directory or standard .env
    require('dotenv').config();
}

const { Client } = require('pg');

const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function verifyMigration() {
    console.log('--- MIGRATION VERIFICATION REPORT ---');
    console.log(`📡 Connecting to: ${process.env.DB_NAME} @ ${process.env.DB_HOST}...`);

    try {
        await client.connect();
        console.log('[OK] Database Connection Established');

        // Check connection details
        const dbRes = await client.query('SELECT current_database(), current_user, inet_server_addr(), version();');
        console.log(`[INFO] Connected to: ${dbRes.rows[0].current_database} (PG Version: ${dbRes.rows[0].version})`);
        console.log(`[INFO] Server IP: ${dbRes.rows[0].inet_server_addr}`);

        console.log('\n--- TABLE STATISTICS ---');

        // Get all tables in public schema
        const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

        const tableNames = tablesRes.rows.map(row => row.table_name);

        if (tableNames.length === 0) {
            console.log('[WARN] No tables found in public schema!');
        } else {
            console.log(`[OK] Found ${tableNames.length} tables in 'public' schema.`);

            for (const table of tableNames) {
                try {
                    // Safe query using identifier
                    const countRes = await client.query(`SELECT COUNT(*) FROM "${table}"`);
                    const count = countRes.rows[0].count;
                    console.log(`   • ${table.padEnd(25)} : ${count} rows`);
                } catch (err) {
                    console.log(`   X ${table.padEnd(25)} : Error (${err.message})`);
                }
            }
        }

    } catch (err) {
        console.error('\n[FATAL] Connection Failed:', err.message);
        console.error('Please check your backend/.env credentials.');
    } finally {
        await client.end();
    }
}

verifyMigration();
