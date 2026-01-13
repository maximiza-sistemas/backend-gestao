"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
async function checkDuplicateAccounts() {
    try {
        const result = await database_1.pool.query(`
            SELECT name, COUNT(*) as count, array_agg(id) as ids
            FROM financial_accounts
            GROUP BY name
            HAVING COUNT(*) > 1
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
checkDuplicateAccounts();
//# sourceMappingURL=check_duplicates.js.map