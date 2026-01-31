/**
 * Migration Verification Script (Backend Context)
 * Lists all tables to help identify schema mismatches.
 */
require('dotenv').config();
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

    try {
        await client.connect();
        console.log('[OK] Database Connection Established');

        const dbRes = await client.query('SELECT current_database(), current_user, inet_server_addr();');
        console.log(`[INFO] DB: ${dbRes.rows[0].current_database} | User: ${dbRes.rows[0].current_user} | Host: ${dbRes.rows[0].inet_server_addr}`);

        console.log('\n--- TABLE CHECK ---');

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
            console.log(`[OK] Found ${tableNames.length} tables.`);

            console.log('\n--- ROW COUNTS ---');
            for (const table of tableNames) {
                try {
                    const countRes = await client.query(`SELECT COUNT(*) FROM "${table}"`);
                    console.log(`${table}: ${countRes.rows[0].count}`);
                } catch (err) {
                    console.log(`Error counting ${table}: ${err.message}`);
                }
            }
        }

    } catch (err) {
        console.error('[FATAL] Connection Failed:', err.message);
    } finally {
        await client.end();
    }
}

verifyMigration();
