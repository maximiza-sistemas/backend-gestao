import { pool } from '../config/database';

async function recalculateFinancialBalances() {
    try {
        console.log('=== Recalculando Saldos das Contas Financeiras ===\n');

        // 1. Zerar todos os saldos
        console.log('1. Zerando todos os saldos...');
        await pool.query('UPDATE financial_accounts SET current_balance = 0');
        console.log('   ✅ Saldos zerados\n');

        // 2. Recalcular saldos baseado em transações pagas
        console.log('2. Recalculando saldos baseado em transações pagas...');

        // Receitas
        const receitas = await pool.query(`
      SELECT account_id, SUM(amount) as total
      FROM financial_transactions
      WHERE type = 'Receita' AND status = 'Pago'
      GROUP BY account_id
    `);

        for (const row of receitas.rows) {
            await pool.query(
                'UPDATE financial_accounts SET current_balance = current_balance + $1 WHERE id = $2',
                [row.total, row.account_id]
            );
            console.log(`   + Receitas na conta ${row.account_id}: R$ ${Number(row.total).toFixed(2)}`);
        }

        // Despesas
        const despesas = await pool.query(`
      SELECT account_id, SUM(amount) as total
      FROM financial_transactions
      WHERE type = 'Despesa' AND status = 'Pago'
      GROUP BY account_id
    `);

        for (const row of despesas.rows) {
            await pool.query(
                'UPDATE financial_accounts SET current_balance = current_balance - $1 WHERE id = $2',
                [row.total, row.account_id]
            );
            console.log(`   - Despesas na conta ${row.account_id}: R$ ${Number(row.total).toFixed(2)}`);
        }

        // Transferências (debitar origem, creditar destino)
        const transferencias = await pool.query(`
      SELECT account_id, destination_account_id, SUM(amount) as total
      FROM financial_transactions
      WHERE type = 'Transferência' AND status = 'Pago' AND destination_account_id IS NOT NULL
      GROUP BY account_id, destination_account_id
    `);

        for (const row of transferencias.rows) {
            await pool.query(
                'UPDATE financial_accounts SET current_balance = current_balance - $1 WHERE id = $2',
                [row.total, row.account_id]
            );
            await pool.query(
                'UPDATE financial_accounts SET current_balance = current_balance + $1 WHERE id = $2',
                [row.total, row.destination_account_id]
            );
            console.log(`   ↔ Transferência ${row.account_id} → ${row.destination_account_id}: R$ ${Number(row.total).toFixed(2)}`);
        }

        // 3. Mostrar saldos finais
        console.log('\n3. Saldos finais:');
        const accounts = await pool.query(`
      SELECT id, name, current_balance
      FROM financial_accounts
      ORDER BY id
    `);

        for (const acc of accounts.rows) {
            console.log(`   ${acc.name} (ID: ${acc.id}): R$ ${Number(acc.current_balance).toFixed(2)}`);
        }

        // 4. Soma total
        const total = await pool.query(`
      SELECT COALESCE(SUM(current_balance), 0) as total
      FROM financial_accounts
    `);
        console.log(`\n   TOTAL: R$ ${Number(total.rows[0].total).toFixed(2)}`);

        console.log('\n=== Saldos recalculados com sucesso! ===');

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await pool.end();
    }
}

recalculateFinancialBalances();
