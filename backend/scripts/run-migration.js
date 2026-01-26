require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

const runMigration = async () => {
    const client = await pool.connect();
    try {
        console.log('Running migration: 002_create_tax_reports.sql');
        const migrationPath = path.join(__dirname, '../migrations/002_create_tax_reports.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');

        console.log('✅ Migration completed successfully');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
    } finally {
        client.release();
        pool.end();
    }
};

runMigration();
