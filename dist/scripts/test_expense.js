"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FinancialModel_1 = require("../models/FinancialModel");
const database_1 = require("../config/database");
async function testExpenseCreation() {
    try {
        console.log('1. Fetching accounts...');
        const accounts = await FinancialModel_1.FinancialModel.findAllAccounts();
        if (accounts.length === 0) {
            console.error('No accounts found! Cannot create transaction.');
            return;
        }
        const accountId = accounts[0].id;
        console.log(`Using account: ${accounts[0].name} (ID: ${accountId})`);
        console.log('2. Creating Expense...');
        const newTransaction = await FinancialModel_1.FinancialModel.createTransaction({
            type: 'Despesa',
            description: 'Test Expense Script',
            amount: 50.00,
            transaction_date: new Date(),
            status: 'Pago',
            account_id: accountId,
            payment_method: 'Dinheiro'
        }, 1);
        console.log('Transaction created:', newTransaction.id);
        console.log('3. Listing transactions (filtering by today)...');
        const today = new Date().toISOString().split('T')[0];
        const transactions = await FinancialModel_1.FinancialModel.findAllTransactions({
            date_from: new Date(today),
            date_to: new Date(today)
        });
        const found = transactions.find((t) => t.id === newTransaction.id);
        if (found) {
            console.log('SUCCESS: Transaction found in list.');
        }
        else {
            console.error('FAILURE: Transaction NOT found in list.');
            console.log('List count:', transactions.length);
            console.log('Filter date:', today);
        }
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await database_1.pool.end();
    }
}
testExpenseCreation();
//# sourceMappingURL=test_expense.js.map