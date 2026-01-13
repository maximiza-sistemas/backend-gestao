
import { pool } from '../config/database';

async function mergeAccounts() {
    const client = await pool.connect();
    try {
        console.log('Starting account merge...');
        await client.query('BEGIN');

        // Find duplicates
        const duplicates = await client.query(`
            SELECT name, array_agg(id ORDER BY id) as ids
            FROM financial_accounts
            GROUP BY name
            HAVING COUNT(*) > 1
        `);

        for (const row of duplicates.rows) {
            const ids = row.ids;
            const targetId = ids[0];
            const sourceIds = ids.slice(1);

            console.log(`Merging accounts for "${row.name}": Keeping ${targetId}, merging ${sourceIds.join(', ')}`);

            // Move transactions (account_id)
            await client.query(`
                UPDATE financial_transactions 
                SET account_id = $1 
                WHERE account_id = ANY($2)
            `, [targetId, sourceIds]);

            // Move transactions (destination_account_id)
            await client.query(`
                UPDATE financial_transactions 
                SET destination_account_id = $1 
                WHERE destination_account_id = ANY($2)
            `, [targetId, sourceIds]);

            // Delete duplicate accounts
            await client.query(`
                DELETE FROM financial_accounts 
                WHERE id = ANY($1)
            `, [sourceIds]);

            console.log(`Merged and deleted ${sourceIds.length} accounts.`);
        }

        await client.query('COMMIT');
        console.log('Merge completed successfully.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error merging accounts:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

mergeAccounts();
