const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function applyMigration() {
    const migrationPath = path.join(__dirname, '../migrations/012_add_patente.sql');

    try {
        console.log('Reading migration file...');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Applying migration 012_add_patente...');
        await pool.query(sql);

        console.log('✅ Migration applied successfully!');
        console.log('- Added patente column to company_settings');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

applyMigration();
