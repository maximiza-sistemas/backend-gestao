"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FinancialModel_1 = require("../models/FinancialModel");
require("dotenv/config");
const database_1 = require("../config/database");
async function listAllTransactions() {
    try {
        console.log('Fetching ALL transactions from database...');
        const transactions = await FinancialModel_1.FinancialModel.findAllTransactions({});
        console.log(`Found ${transactions.length} transactions.`);
        if (transactions.length === 0) {
            console.log('No transactions found.');
        }
        else {
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
    }
    catch (error) {
        console.error('Error listing transactions:', error);
    }
    finally {
        await database_1.pool.end();
    }
}
listAllTransactions();
//# sourceMappingURL=list_all.js.map