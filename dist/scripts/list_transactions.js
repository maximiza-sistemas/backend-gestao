"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FinancialModel_1 = require("../models/FinancialModel");
const database_1 = require("../config/database");
async function listTransactions() {
    try {
        const transactions = await FinancialModel_1.FinancialModel.findAllTransactions();
        console.log('Transactions found:', transactions.length);
        if (transactions.length > 0) {
            console.log('First transaction:', JSON.stringify(transactions[0], null, 2));
        }
    }
    catch (error) {
        console.error('Error listing transactions:', error);
    }
    finally {
        await database_1.pool.end();
    }
}
listTransactions();
//# sourceMappingURL=list_transactions.js.map