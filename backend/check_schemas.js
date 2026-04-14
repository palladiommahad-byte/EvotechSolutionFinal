/**
 * Schema Inspection Script
 * Lists all database schemas to find Supabase artifacts.
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

async function checkSchemas() {
    console.log('--- CHECKING DATABASE SCHEMAS ---');

    try {
        await client.connect();

        const res = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      AND schema_name NOT LIKE 'pg_temp_%'
      AND schema_name NOT LIKE 'pg_toast_temp_%';
    `);

        const schemas = res.rows.map(r => r.schema_name);

        console.log('Found Schemas:', schemas.join(', '));

        const supabaseSchemas = ['auth', 'storage', 'realtime', 'graphql', 'vault'];
        const foundSupabase = schemas.filter(s => supabaseSchemas.includes(s));

        if (foundSupabase.length > 0) {
            console.log('⚠️  POTENTIAL SUPABASE ARTIFACTS FOUND:', foundSupabase.join(', '));
        } else {
            console.log('✅  No obviously Supabase-specific schemas found (auth, storage, realtime).');
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

checkSchemas();
