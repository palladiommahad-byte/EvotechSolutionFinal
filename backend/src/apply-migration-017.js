require('dotenv').config();
const { query } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
    try {
        console.log('Applying migration 017_add_client_po_number...');

        const migrationPath = path.join(__dirname, '../migrations/017_add_client_po_number.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        await query(migrationSql);

        console.log('Migration 017 applied successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error applying migration:', error);
        process.exit(1);
    }
}

applyMigration();
