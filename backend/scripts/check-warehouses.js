const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'EvotechSolution',
    password: process.env.DB_PASSWORD || 'HelloFace34',
    port: process.env.DB_PORT || 5432,
});

async function checkWarehouses() {
    try {
        const res = await pool.query("SELECT * FROM warehouses");
        console.log('Warehouses:', res.rows);
    } catch (err) {
        console.error('Error querying warehouses:', err.message);
        // Try identifying the table name if 'settings_warehouses' is wrong
        try {
            const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
            console.log('Available tables:', tables.rows.map(r => r.table_name).filter(t => t.includes('warehouse')));
        } catch (e) {
            console.error(e);
        }
    } finally {
        pool.end();
    }
}

checkWarehouses();
