"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
async function updateConstraint() {
    const client = await database_1.pool.connect();
    try {
        console.log('Updating constraint...');
        await client.query('BEGIN');
        await client.query(`
            ALTER TABLE financial_transactions 
            DROP CONSTRAINT IF EXISTS financial_transactions_type_check
        `);
        await client.query(`
            ALTER TABLE financial_transactions 
            ADD CONSTRAINT financial_transactions_type_check 
            CHECK (type IN ('Receita', 'Despesa', 'Transferência', 'Depósito'))
        `);
        await client.query('COMMIT');
        console.log('Constraint updated successfully.');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating constraint:', error);
    }
    finally {
        client.release();
        await database_1.pool.end();
    }
}
updateConstraint();
//# sourceMappingURL=update_constraint.js.map