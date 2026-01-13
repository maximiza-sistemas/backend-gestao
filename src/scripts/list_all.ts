
import { FinancialModel } from '../models/FinancialModel';
import 'dotenv/config';
import { pool } from '../config/database';

async function listAllTransactions() {
    try {
        console.log('Fetching ALL transactions from database...');
        // Passing empty object or undefined should return all, based on my previous analysis of FinancialModel
        const transactions = await FinancialModel.findAllTransactions({});

        console.log(`Found ${transactions.length} transactions.`);

        if (transactions.length === 0) {
            console.log('No transactions found.');
        } else {
            console.log('---------------------------------------------------');
            console.log('ID | Date       | Type      | Amount   | Description');
            console.log('---------------------------------------------------');
            transactions.forEach(t => {
                const date = new Date(t.transaction_date).toLocaleDateString('pt-BR');
                const amount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount);
                console.log(`${t.id.toString().padEnd(3)}| ${date} | ${t.type.padEnd(9)} | ${amount.padEnd(8)} | ${t.description}`);
            });
            console.log('---------------------------------------------------');
        }

    } catch (error) {
        console.error('Error listing transactions:', error);
    } finally {
        await pool.end();
    }
}

listAllTransactions();
