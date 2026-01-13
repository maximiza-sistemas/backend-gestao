"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
async function checkMissingTransactions() {
    try {
        const result = await database_1.pool.query(`
            SELECT o.id, o.total_value, o.payment_method, o.payment_status, o.created_at
            FROM orders o
            LEFT JOIN financial_transactions t ON o.id = t.order_id
            WHERE o.status = 'Entregue' 
            AND o.payment_status != 'Pendente'
            AND t.id IS NULL
        `);
        console.log(`Found ${result.rows.length} delivered/paid orders without financial transactions.`);
        if (result.rows.length > 0) {
            console.log('Sample missing orders:', JSON.stringify(result.rows.slice(0, 3), null, 2));
        }
    }
    catch (error) {
        console.error('Error checking missing transactions:', error);
    }
    finally {
        await database_1.pool.end();
    }
}
checkMissingTransactions();
//# sourceMappingURL=check_sales_sync.js.map