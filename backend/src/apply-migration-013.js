const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('Applying migration 013_make_contact_name_optional...');

        // Read the migration file
        const migrationPath = path.join(__dirname, '../migrations/013_make_contact_name_optional.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        // Execute the migration
        await client.query(migrationSql);

        console.log('Migration applied successfully!');
    } catch (error) {
        console.error('Error applying migration:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
