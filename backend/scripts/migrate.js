const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    // Connect to default 'postgres' db first to check/create target db
    database: 'postgres',
};

const targetDbName = process.env.DB_NAME;

async function migrate() {
    console.log(`Connecting to PostgreSQL at ${dbConfig.host}:${dbConfig.port}...`);

    // 1. Create Database if not exists
    const sysClient = new Client(dbConfig);
    try {
        await sysClient.connect();
        const res = await sysClient.query(`SELECT 1 FROM pg_database WHERE datname='${targetDbName}'`);

        if (res.rows.length === 0) {
            console.log(`Database ${targetDbName} does not exist. Creating...`);
            await sysClient.query(`CREATE DATABASE "${targetDbName}"`);
            console.log(`Database ${targetDbName} created successfully.`);
        } else {
            console.log(`Database ${targetDbName} already exists.`);
        }
    } catch (err) {
        console.error('Error connecting to system database:', err);
        process.exit(1);
    } finally {
        await sysClient.end();
    }

    // 2. Run Migration on Target Database
    const client = new Client({
        ...dbConfig,
        database: targetDbName,
    });

    try {
        await client.connect();
        console.log(`Connected to ${targetDbName}. Running migration...`);

        const migrationPath = path.join(__dirname, '../migrations/001_init_schema.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        await client.query(sql);
        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
