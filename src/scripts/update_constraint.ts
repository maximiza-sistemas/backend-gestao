
import { pool } from '../config/database';

async function updateConstraint() {
    const client = await pool.connect();
    try {
        console.log('Updating constraint...');
        await client.query('BEGIN');

        // Drop existing constraint
        await client.query(`
            ALTER TABLE financial_transactions 
            DROP CONSTRAINT IF EXISTS financial_transactions_type_check
        `);

        // Add new constraint
        await client.query(`
            ALTER TABLE financial_transactions 
            ADD CONSTRAINT financial_transactions_type_check 
            CHECK (type IN ('Receita', 'Despesa', 'Transferência', 'Depósito'))
        `);

        await client.query('COMMIT');
        console.log('Constraint updated successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating constraint:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

updateConstraint();
