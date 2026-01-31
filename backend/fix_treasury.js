require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function main() {
    const client = await pool.connect();
    try {
        console.log('--- Starting Treasury Cleanup ---');
        await client.query('BEGIN');

        // 1. SALES GHOSTS
        // Find payments where invoice_id does not exist in invoices table
        const salesGhostsRes = await client.query(`
      SELECT tp.* 
      FROM treasury_payments tp
      LEFT JOIN invoices i ON tp.invoice_id = i.id
      WHERE tp.payment_type = 'sales' 
      AND tp.invoice_id IS NOT NULL 
      AND i.id IS NULL
    `);

        const salesGhosts = salesGhostsRes.rows;
        console.log(`Found ${salesGhosts.length} sales ghost transactions.`);

        for (const ghost of salesGhosts) {
            // Reverse balance if cleared
            if (ghost.status === 'cleared' && ghost.bank_account_id) {
                // Sales add money, so removing them means checking if we need to deduct?
                // Wait, normally a sales payment ADDS to balance.
                // So valid payment = balance + amount.
                // Ghost payment removal = balance - amount.
                console.log(`Reversing Sales Ghost ID ${ghost.id}: Deducting ${ghost.amount} from Bank Account ${ghost.bank_account_id}`);
                await client.query(`
          UPDATE treasury_bank_accounts 
          SET balance = balance - $1, updated_at = NOW()
          WHERE id = $2
        `, [ghost.amount, ghost.bank_account_id]);
            }

            // Delete
            await client.query('DELETE FROM treasury_payments WHERE id = $1', [ghost.id]);
            console.log(`Deleted Sales Ghost ID ${ghost.id}`);
        }

        // 2. PURCHASE GHOSTS
        // Find payments where invoice_id does not exist in purchase_invoices table
        // Note: ensure table name is 'purchase_invoices'
        const purchaseGhostsRes = await client.query(`
      SELECT tp.* 
      FROM treasury_payments tp
      LEFT JOIN purchase_invoices pi ON tp.invoice_id = pi.id
      WHERE tp.payment_type = 'purchase' 
      AND tp.invoice_id IS NOT NULL 
      AND pi.id IS NULL
    `);

        const purchaseGhosts = purchaseGhostsRes.rows;
        console.log(`Found ${purchaseGhosts.length} purchase ghost transactions.`);

        for (const ghost of purchaseGhosts) {
            // Reverse balance if cleared
            if (ghost.status === 'cleared' && ghost.bank_account_id) {
                // Purchases deduct money. Valid payment = balance - amount.
                // Ghost payment removal = balance + amount.
                console.log(`Reversing Purchase Ghost ID ${ghost.id}: Adding ${ghost.amount} to Bank Account ${ghost.bank_account_id}`);
                await client.query(`
          UPDATE treasury_bank_accounts 
          SET balance = balance + $1, updated_at = NOW()
          WHERE id = $2
        `, [ghost.amount, ghost.bank_account_id]);
            }

            // Delete
            await client.query('DELETE FROM treasury_payments WHERE id = $1', [ghost.id]);
            console.log(`Deleted Purchase Ghost ID ${ghost.id}`);
        }

        await client.query('COMMIT');
        console.log('--- Cleanup Complete (COMMITTED) ---');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error during cleanup (ROLLED BACK):', err);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
