import { pool } from '../config/database';

async function resetFinancialBalances() {
    try {
        console.log('=== Resetando Saldos de Contas Financeiras sem Transações ===\n');

        // 1. Identificar contas com saldo mas sem transações
        const inconsistent = await pool.query(`
      SELECT fa.id, fa.name, fa.current_balance, fa.initial_balance
      FROM financial_accounts fa
      WHERE (fa.current_balance != 0 OR fa.initial_balance != 0)
        AND NOT EXISTS (
          SELECT 1 FROM financial_transactions ft WHERE ft.account_id = fa.id
        )
    `);

        if (inconsistent.rows.length === 0) {
            console.log('Nenhuma conta inconsistente encontrada. Tudo OK!');
            return;
        }

        console.log('Contas a serem resetadas:');
        inconsistent.rows.forEach((acc: any) => {
            console.log(`  - ${acc.name} (ID: ${acc.id}): R$ ${Number(acc.current_balance).toFixed(2)}`);
        });

        // 2. Resetar os saldos para zero
        console.log('\nResetando saldos...');

        for (const acc of inconsistent.rows) {
            await pool.query(`
        UPDATE financial_accounts 
        SET current_balance = 0, initial_balance = 0 
        WHERE id = $1
      `, [acc.id]);
            console.log(`  ✅ ${acc.name} (ID: ${acc.id}) - Saldo resetado para R$ 0.00`);
        }

        console.log('\n=== Saldos resetados com sucesso! ===');

        // 3. Verificar resultado
        const totalBalance = await pool.query(`
      SELECT COALESCE(SUM(current_balance), 0) as total_balance
      FROM financial_accounts
      WHERE is_active = true
    `);

        console.log(`\nNovo saldo total: R$ ${Number(totalBalance.rows[0].total_balance).toFixed(2)}`);

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await pool.end();
    }
}

resetFinancialBalances();
