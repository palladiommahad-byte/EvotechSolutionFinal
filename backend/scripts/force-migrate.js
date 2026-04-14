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

async function forceMigrate() {
    const client = new Client(dbConfig);
    try {
        await client.connect();
        const sql = `
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    city VARCHAR(100),
    address TEXT,
    ice VARCHAR(50),
    if_number VARCHAR(50),
    rc VARCHAR(50),
    contact_type VARCHAR(20) NOT NULL CHECK (contact_type IN ('client', 'supplier')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    total_transactions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
`;
        console.log('Applying SQL directly:');
        console.log(sql);
        await client.query(sql);
        console.log('✅ Migration forced successfully!');
    } catch (err) {
        console.error('❌ Force Migration Failed:', err.message);
    } finally {
        await client.end();
    }
}

forceMigrate();
