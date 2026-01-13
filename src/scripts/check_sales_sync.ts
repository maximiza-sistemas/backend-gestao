
import { pool } from '../config/database';

async function checkMissingTransactions() {
    try {
        // Find orders that are 'Entregue' and paid, but have no transaction
        const result = await pool.query(`
            SELECT o.id, o.total_value, o.payment_method, o.payment_status, o.created_at
            FROM orders o
            LEFT JOIN financial_transactions t ON o.id = t.order_id
            WHERE o.status = 'Entregue' 
            AND o.payment_status != 'Pendente'
            AND t.id IS NULL
        `);

        console.log(`Found ${result.rows.length} delivered/paid orders without financial transactions.`);

        if (result.rows.length > 0) {
            console.log('Sample missing orders:', JSON.stringify(result.rows.slice(0, 3), null, 2));
        }

    } catch (error) {
        console.error('Error checking missing transactions:', error);
    } finally {
        await pool.end();
    }
}

checkMissingTransactions();
