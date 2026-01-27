import { pool } from '../config/database';

async function updateTransactionDates() {
    try {
        console.log('=== Atualizando Datas das Transações Financeiras ===\n');

        // 1. Mostrar transações antes da atualização
        console.log('1. TRANSAÇÕES VINCULADAS A PEDIDOS (ANTES):');
        const before = await pool.query(`
      SELECT t.id, t.transaction_code, t.transaction_date, o.order_date, o.id as order_id
      FROM financial_transactions t
      JOIN orders o ON t.order_id = o.id
      WHERE t.transaction_date::date != o.order_date::date
      ORDER BY t.id
    `);

        console.log(`   ${before.rows.length} transações com data diferente do pedido:`);
        before.rows.forEach((t: any) => {
            const transDate = new Date(t.transaction_date).toLocaleDateString('pt-BR');
            const orderDate = new Date(t.order_date).toLocaleDateString('pt-BR');
            console.log(`   - Transação ${t.transaction_code}: ${transDate} → Pedido #${t.order_id}: ${orderDate}`);
        });

        if (before.rows.length === 0) {
            console.log('\n✅ Todas as transações já têm a data correta!');
            return;
        }

        // 2. Atualizar transaction_date e due_date para usar order_date
        console.log('\n2. ATUALIZANDO DATAS...');
        const updateResult = await pool.query(`
      UPDATE financial_transactions t
      SET 
        transaction_date = o.order_date,
        due_date = o.order_date
      FROM orders o
      WHERE t.order_id = o.id
        AND t.transaction_date::date != o.order_date::date
      RETURNING t.id, t.transaction_code
    `);

        console.log(`   ✅ ${updateResult.rows.length} transações atualizadas!`);

        // 3. Verificar resultado
        console.log('\n3. RESULTADO FINAL:');
        const after = await pool.query(`
      SELECT t.id, t.transaction_code, t.transaction_date, o.order_date, o.id as order_id
      FROM financial_transactions t
      JOIN orders o ON t.order_id = o.id
      ORDER BY t.transaction_date DESC
      LIMIT 10
    `);

        after.rows.forEach((t: any) => {
            const transDate = new Date(t.transaction_date).toLocaleDateString('pt-BR');
            const orderDate = new Date(t.order_date).toLocaleDateString('pt-BR');
            const match = transDate === orderDate ? '✅' : '❌';
            console.log(`   ${match} ${t.transaction_code}: Trans ${transDate} | Pedido ${orderDate}`);
        });

        console.log('\n=== Atualização Concluída! ===');

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await pool.end();
    }
}

updateTransactionDates();
