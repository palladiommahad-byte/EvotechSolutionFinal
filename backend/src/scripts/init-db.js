const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function initDb() {
    const migrationsDir = path.join(__dirname, '../../migrations');

    try {
        // Get all SQL files from migrations directory
        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Sort to ensure correct order (001, 002, etc.)

        console.log(`Found ${files.length} migration files.`);

        for (const file of files) {
            const filePath = path.join(migrationsDir, file);
            console.log(`Reading migration file: ${file}`);
            const sql = fs.readFileSync(filePath, 'utf8');

            console.log(`Applying migration: ${file}`);
            await pool.query(sql);
            console.log(`✅ ${file} applied successfully!`);
        }

        console.log('🎉 All migrations applied successfully!');

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

initDb();
