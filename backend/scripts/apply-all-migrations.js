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

        // List of migrations to apply (in order)
        const migrations = [
            '002_create_tax_reports.sql',
            // 003 was already applied separately
            '004_add_bank_account_to_treasury_payments.sql',
        ];

        for (const migrationFile of migrations) {
            console.log(`\n📄 Processing: ${migrationFile}`);
            console.log('─'.repeat(50));

            const migrationPath = path.join(__dirname, '../migrations', migrationFile);

            if (!fs.existsSync(migrationPath)) {
                console.log(`⚠️  File not found, skipping...`);
                continue;
            }

            const sql = fs.readFileSync(migrationPath, 'utf8');

            try {
                await client.query(sql);
                console.log(`✅ ${migrationFile} applied successfully!`);
            } catch (err) {
                // Check if error is due to table/column already existing
                if (err.message.includes('already exists')) {
                    console.log(`ℹ️  ${migrationFile} - Already applied (objects exist)`);
                } else {
                    throw err;
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
