const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function verifyHash() {
    try {
        const email = 'admin@evotech.ma';

        console.log(`Checking password hash for ${email}...`);

        const result = await pool.query(
            'SELECT password_hash FROM users WHERE email = $1',
            [email]
        );

        if (result.rowCount === 0) {
            console.log(`❌ User with email ${email} not found.`);
        } else {
            const hash = result.rows[0].password_hash;
            console.log(`Current Hash: ${hash.substring(0, 10)}...`);

            if (hash.startsWith('$2')) {
                console.log(`✅ Hash format is correct (bcrypt).`);
            } else {
                console.log(`❌ Hash format is INCORRECT (not bcrypt).`);
            }
        }

    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        await pool.end();
    }
}

verifyHash();
