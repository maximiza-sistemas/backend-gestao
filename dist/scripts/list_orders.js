"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
async function listOrdersStatus() {
    try {
        const result = await database_1.pool.query(`
            SELECT id, status, payment_status
            FROM orders
            ORDER BY created_at DESC
        `);
        console.log(JSON.stringify(result.rows, null, 2));
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await database_1.pool.end();
    }
}
listOrdersStatus();
//# sourceMappingURL=list_orders.js.map