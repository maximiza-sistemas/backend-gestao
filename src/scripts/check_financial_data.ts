import { pool } from '../config/database';

async function checkFinancialData() {
    try {
        console.log('=== Verificando Dados Financeiros ===\n');

        // 1. Verificar contas financeiras
        console.log('1. CONTAS FINANCEIRAS (financial_accounts):');
        const accounts = await pool.query(`
      SELECT id, name, type, initial_balance, current_balance, is_active, created_at
      FROM financial_accounts
      ORDER BY id
    `);

        if (accounts.rows.length === 0) {
            console.log('   Nenhuma conta encontrada.');
        } else {
            accounts.rows.forEach((acc: any) => {
                console.log(`   ID: ${acc.id} | Nome: ${acc.name} | Tipo: ${acc.type}`);
                console.log(`      Saldo Inicial: R$ ${Number(acc.initial_balance).toFixed(2)}`);
                console.log(`      Saldo Atual: R$ ${Number(acc.current_balance).toFixed(2)}`);
                console.log(`      Ativo: ${acc.is_active ? 'Sim' : 'Não'}`);
                console.log(`      Criado em: ${acc.created_at}`);
                console.log('');
            });
        }

        // 2. Verificar transações financeiras
        console.log('\n2. TRANSAÇÕES FINANCEIRAS (financial_transactions):');
        const transactions = await pool.query(`
      SELECT id, transaction_code, type, amount, status, description, created_at
      FROM financial_transactions
      ORDER BY created_at DESC
      LIMIT 20
    `);

        if (transactions.rows.length === 0) {
            console.log('   Nenhuma transação encontrada.');
        } else {
            transactions.rows.forEach((tx: any) => {
                console.log(`   ID: ${tx.id} | Código: ${tx.transaction_code}`);
                console.log(`      Tipo: ${tx.type} | Valor: R$ ${Number(tx.amount).toFixed(2)} | Status: ${tx.status}`);
                console.log(`      Descrição: ${tx.description}`);
                console.log(`      Data: ${tx.created_at}`);
                console.log('');
            });
        }

        // 3. Soma total de saldos
        console.log('\n3. SOMA TOTAL DOS SALDOS:');
        const totalBalance = await pool.query(`
      SELECT 
        COALESCE(SUM(current_balance), 0) as total_balance,
        COALESCE(SUM(initial_balance), 0) as total_initial
      FROM financial_accounts
      WHERE is_active = true
    `);

        const { total_balance, total_initial } = totalBalance.rows[0];
        console.log(`   Saldo Inicial Total: R$ ${Number(total_initial).toFixed(2)}`);
        console.log(`   Saldo Atual Total: R$ ${Number(total_balance).toFixed(2)}`);

        // 4. Verificar se há saldos inconsistentes (sem transações correspondentes)
        console.log('\n4. CONTAS COM SALDO MAS SEM TRANSAÇÃO ASSOCIADA:');
        const inconsistent = await pool.query(`
      SELECT fa.id, fa.name, fa.current_balance
      FROM financial_accounts fa
      WHERE fa.current_balance != 0
        AND NOT EXISTS (
          SELECT 1 FROM financial_transactions ft WHERE ft.account_id = fa.id
        )
    `);

        if (inconsistent.rows.length === 0) {
            console.log('   Nenhuma conta inconsistente encontrada.');
        } else {
            console.log('   ⚠️ ATENÇÃO: Contas com saldo sem transações correspondentes:');
            inconsistent.rows.forEach((acc: any) => {
                console.log(`   - ${acc.name} (ID: ${acc.id}): R$ ${Number(acc.current_balance).toFixed(2)}`);
            });
        }

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await pool.end();
    }
}

checkFinancialData();
