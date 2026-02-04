const fs = require('fs');
const path = require('path');
const { pool } = require('../backend/src/config/database');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const migrate = async () => {
    const client = await pool.connect();
    try {
        console.log('Applying migration 006_create_prelevements.sql...');
        const sqlPath = path.join(__dirname, '../backend/migrations/006_create_prelevements.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');

        console.log('Migration applied successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
};

migrate();
