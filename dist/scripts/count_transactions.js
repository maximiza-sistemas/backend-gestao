"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const database_1 = require("../config/database");
async function countTransactions() {
    const client = await database_1.pool.connect();
    try {
        const res = await client.query('SELECT COUNT(*) FROM financial_transactions');
        console.log('Total Transactions:', res.rows[0].count);
        const res2 = await client.query("SELECT COUNT(*) FROM financial_transactions WHERE description LIKE 'Venda - Pedido #%'");
        console.log('Sales Transactions:', res2.rows[0].count);
    }
    finally {
        client.release();
    }
}
countTransactions();
//# sourceMappingURL=count_transactions.js.map