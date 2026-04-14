const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Use environment variables from process (Docker injects them) or fallback to .env
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function resetPassword() {
    try {
        const email = 'admin@evotech.ma';
        const newPassword = '123456';

        console.log(`Resetting password for ${email}...`);
        console.log(`DB Host: ${process.env.DB_HOST}`);

        // Simple Hash Function (matches auth.routes.js)
        const simpleHash = (str) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return `hash_${Math.abs(hash)}`;
        };

        const hashedPassword = simpleHash(newPassword);
        console.log(`Generated Hash: ${hashedPassword}`);

        // Update the user
        const result = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email, name, password_hash',
            [hashedPassword, email]
        );

        if (result.rowCount === 0) {
            console.log(`❌ User with email ${email} not found.`);
        } else {
            console.log(`✅ Password for ${result.rows[0].name} (${result.rows[0].email}) has been reset successfully.`);
            console.log(`New Hash in DB: ${result.rows[0].password_hash}`);
        }

    } catch (error) {
        console.error('❌ Password reset failed:', error);
    } finally {
        await pool.end();
    }
}

resetPassword();
