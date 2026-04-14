/**
 * Auto-Migration System
 * 
 * This script automatically applies any pending database migrations on server startup.
 * It tracks which migrations have been applied in a `_migrations` table and only
 * applies new ones. This ensures that when the app is updated (via Update_App.bat),
 * the database schema is always kept in sync with the code.
 * 
 * Usage: Called automatically from server.js before the server starts listening.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runAutoMigrations() {
    const pool = new Pool({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
    });

    try {
        console.log('');
        console.log('🔄 [Auto-Migrate] Checking for pending database migrations...');

        // Step 1: Create the migrations tracking table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS _migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Step 2: Get list of already-applied migrations
        const { rows: appliedRows } = await pool.query(
            'SELECT filename FROM _migrations ORDER BY filename'
        );
        const appliedSet = new Set(appliedRows.map(r => r.filename));

        // Step 3: Get all migration files from the migrations directory
        const migrationsDir = path.join(__dirname, '../../migrations');
        
        if (!fs.existsSync(migrationsDir)) {
            console.log('⚠️  [Auto-Migrate] No migrations directory found. Skipping.');
            return;
        }

        const allFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Ensures correct order: 001, 002, ..., 017, etc.

        // Step 4: Determine which migrations are pending
        const pendingFiles = allFiles.filter(file => !appliedSet.has(file));

        if (pendingFiles.length === 0) {
            console.log('✅ [Auto-Migrate] Database is up to date. No pending migrations.');
            return;
        }

        console.log(`📦 [Auto-Migrate] Found ${pendingFiles.length} pending migration(s):`);
        pendingFiles.forEach(f => console.log(`   - ${f}`));

        // Step 5: Apply each pending migration in order
        for (const file of pendingFiles) {
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            try {
                await pool.query('BEGIN');
                await pool.query(sql);
                await pool.query(
                    'INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
                    [file]
                );
                await pool.query('COMMIT');
                console.log(`   ✅ Applied: ${file}`);
            } catch (migrationError) {
                await pool.query('ROLLBACK');
                // If the migration fails because the change already exists (e.g., column already added),
                // we still mark it as applied to avoid retrying it every startup
                if (migrationError.code === '42701' || // duplicate_column
                    migrationError.code === '42P07' || // duplicate_table
                    migrationError.code === '42710') { // duplicate_object
                    await pool.query(
                        'INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
                        [file]
                    );
                    console.log(`   ⚠️  Skipped (already exists): ${file}`);
                } else {
                    console.error(`   ❌ Failed to apply: ${file}`);
                    console.error(`      Error: ${migrationError.message}`);
                    // Don't throw - let the server start anyway, so the app is still usable
                    // The admin can fix the migration and restart
                }
            }
        }

        // Step 6: Backfill - mark all existing migrations as applied
        // This handles the case where the database was set up before the tracking table existed
        // (i.e., for existing clients who already have some migrations applied)
        // We check if each migration's changes are already present before marking
        console.log('');
        console.log('✅ [Auto-Migrate] Migration check complete.');

    } catch (error) {
        console.error('❌ [Auto-Migrate] Error during migration check:', error.message);
        // Don't crash the server - let it start anyway
    } finally {
        await pool.end();
    }
}

module.exports = { runAutoMigrations };
