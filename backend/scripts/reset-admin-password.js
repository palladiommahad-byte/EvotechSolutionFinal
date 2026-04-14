const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'evotech_db',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function resetPassword() {
    const email = 'admin@evotech.ma'; // Default admin email
    const newPassword = 'admin123';

    try {
        console.log(`Resetting password for ${email}...`);

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update the user
        const result = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email, name',
            [hashedPassword, email]
        );

        if (result.rowCount === 0) {
            console.error('User not found!');
        } else {
            console.log('Password reset successfully!');
            console.log('User:', result.rows[0]);
            console.log(`New password: ${newPassword}`);
        }
    } catch (error) {
        console.error('Error resetting password:', error);
    } finally {
        await pool.end();
    }
}

resetPassword();
