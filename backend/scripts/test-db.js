const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query } = require('../src/config/database');

async function testConnection() {
    console.log(`Testing connection to database: ${process.env.DB_NAME}...`);
    try {
        // Test query
        const res = await query('SELECT NOW() as current_time, current_database() as db_name');
        console.log('✅ Connection successful!');
        console.log(`Current Time: ${res.rows[0].current_time}`);
        console.log(`Connected to Database: ${res.rows[0].db_name}`);

        // Check if tables exist
        const tableCount = await query(`
            SELECT count(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log(`✅ Database contains ${tableCount.rows[0].count} tables.`);

        // Check if admin user exists
        const userCount = await query('SELECT count(*) FROM users');
        console.log(`✅ Found ${userCount.rows[0].count} user(s) in 'users' table.`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Connection failed!');
        console.error(err);
        process.exit(1);
    }
}

testConnection();
