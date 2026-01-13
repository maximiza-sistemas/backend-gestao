
import { pool } from '../config/database';

async function listSalesTransactions() {
    try {
        const result = await pool.query(`
            SELECT t.id, t.transaction_code, t.amount, t.description, t.order_id, t.transaction_date
            FROM financial_transactions t
            WHERE t.order_id IS NOT NULL
            ORDER BY t.transaction_date DESC
        `);

        console.log(`Found ${result.rows.length} sales transactions.`);
        if (result.rows.length > 0) {
            console.log(JSON.stringify(result.rows.slice(0, 3), null, 2));
        } else {
            console.log('No sales transactions found.');
        }

        // Also check total orders count
        const orders = await pool.query('SELECT COUNT(*) as count FROM orders');
        console.log(`Total orders in DB: ${orders.rows[0].count}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

listSalesTransactions();
