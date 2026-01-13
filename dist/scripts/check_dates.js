"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
async function checkTransactionDates() {
    try {
        const result = await database_1.pool.query(`
            SELECT id, transaction_code, type, description, transaction_date, created_at 
            FROM financial_transactions 
            ORDER BY transaction_date DESC
        `);
        console.log('Total transactions:', result.rows.length);
        console.log('Transactions:', JSON.stringify(result.rows, null, 2));
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const endOfToday = today.toISOString().split('T')[0];
        console.log('Current Month Range (Frontend Default):', { start: startOfMonth, end: endOfToday });
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await database_1.pool.end();
    }
}
checkTransactionDates();
//# sourceMappingURL=check_dates.js.map