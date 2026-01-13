
import { FinancialModel } from '../models/FinancialModel';
import { pool } from '../config/database';

async function listTransactions() {
    try {
        const transactions = await FinancialModel.findAllTransactions();
        console.log('Transactions found:', transactions.length);
        if (transactions.length > 0) {
            console.log('First transaction:', JSON.stringify(transactions[0], null, 2));
        }
    } catch (error) {
        console.error('Error listing transactions:', error);
    } finally {
        await pool.end();
    }
}

listTransactions();
