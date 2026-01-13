
import { FinancialModel } from '../models/FinancialModel';
import { pool } from '../config/database';

async function testExpenseCreation() {
    try {
        console.log('1. Fetching accounts...');
        const accounts = await FinancialModel.findAllAccounts();
        if (accounts.length === 0) {
            console.error('No accounts found! Cannot create transaction.');
            return;
        }
        const accountId = accounts[0].id;
        console.log(`Using account: ${accounts[0].name} (ID: ${accountId})`);

        console.log('2. Creating Expense...');
        const newTransaction = await FinancialModel.createTransaction({
            type: 'Despesa',
            description: 'Test Expense Script',
            amount: 50.00,
            transaction_date: new Date(), // Now
            status: 'Pago',
            account_id: accountId,
            payment_method: 'Dinheiro'
        } as any, 1); // userId = 1 for test
        console.log('Transaction created:', newTransaction.id);

        console.log('3. Listing transactions (filtering by today)...');
        const today = new Date().toISOString().split('T')[0];
        const transactions = await FinancialModel.findAllTransactions({
            date_from: new Date(today),
            date_to: new Date(today)
        });

        const found = transactions.find((t: any) => t.id === newTransaction.id);
        if (found) {
            console.log('SUCCESS: Transaction found in list.');
        } else {
            console.error('FAILURE: Transaction NOT found in list.');
            console.log('List count:', transactions.length);
            console.log('Filter date:', today);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

testExpenseCreation();
