
import { pool } from '../config/database';

async function listOrdersStatus() {
    try {
        const result = await pool.query(`
            SELECT id, status, payment_status
            FROM orders
            ORDER BY created_at DESC
        `);

        console.log(JSON.stringify(result.rows, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

listOrdersStatus();
