const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
};

async function applyAllMigrations() {
    console.log('Checking and applying all pending migrations...\n');

    const client = new Client(dbConfig);

    try {
        await client.connect();
        console.log('Connected to database successfully!\n');

        // Read all migration files from directory
        const migrationsDir = path.join(__dirname, '../migrations');
        const files = fs.readdirSync(migrationsDir);

        // Filter for SQL files and sort them
        const migrations = files
            .filter(file => file.endsWith('.sql'))
            .sort(); // Sorts alphabetically (001, 002, etc.)

        console.log(`Found ${migrations.length} migration files.`);

        for (const migrationFile of migrations) {
            console.log(`\n📄 Processing: ${migrationFile}`);
            console.log('─'.repeat(50));

            const migrationPath = path.join(migrationsDir, migrationFile);
            const sql = fs.readFileSync(migrationPath, 'utf8');

            try {
                await client.query(sql);
                console.log(`✅ ${migrationFile} applied successfully!`);
            } catch (err) {
                // Check if error is due to table/column already existing
                // Postgres error code 42P07 is duplicate_table, 42701 is duplicate_column
                // But we mainly check the message for "already exists" to be safe across versions
                if (err.message.includes('already exists')) {
                    console.log(`ℹ️  ${migrationFile} - Already applied (objects exist)`);
                } else {
                    console.error(`❌ Error in ${migrationFile}: ${err.message}`);
                    throw err; // Stop on error
                }
            }
        }

        console.log('\n' + '═'.repeat(50));
        console.log('🎉 All migrations processed successfully!');
        console.log('═'.repeat(50));

    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        console.error('Full error:', JSON.stringify(err, null, 2));
        process.exit(1);
    } finally {
        await client.end();
        console.log('\nDatabase connection closed.');
    }
}

applyAllMigrations();
