require('dotenv').config();
const { query } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
    try {
        console.log('Applying migration 014_fix_company_settings...');

        const migrationPath = path.join(__dirname, '../migrations/014_fix_company_settings.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        await query(migrationSql);

        console.log('Migration 014 applied successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error applying migration:', error);
        process.exit(1);
    }
}

applyMigration();
