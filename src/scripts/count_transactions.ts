import 'dotenv/config';
import { pool } from '../config/database';

async function countTransactions() {
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT COUNT(*) FROM financial_transactions');
        console.log('Total Transactions:', res.rows[0].count);

        const res2 = await client.query("SELECT COUNT(*) FROM financial_transactions WHERE description LIKE 'Venda - Pedido #%'");
        console.log('Sales Transactions:', res2.rows[0].count);
    } finally {
        client.release();
    }
}

countTransactions();
