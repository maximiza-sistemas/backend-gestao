
import { pool } from '../config/database';

async function checkDuplicateAccounts() {
    try {
        const result = await pool.query(`
            SELECT name, COUNT(*) as count, array_agg(id) as ids
            FROM financial_accounts
            GROUP BY name
            HAVING COUNT(*) > 1
        `);

        console.log(JSON.stringify(result.rows, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkDuplicateAccounts();
