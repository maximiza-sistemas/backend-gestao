/**
 * Script para atualizar paid_amount e pending_amount dos pedidos existentes
 * que foram registrados com pagamento à vista (payment_status = 'Pago')
 * 
 * Execute com: npx ts-node src/scripts/update_paid_amounts.ts
 */

import { pool } from '../config/database';

async function updatePaidAmounts() {
    const client = await pool.connect();

    try {
        console.log('🔄 Iniciando atualização de paid_amount para pedidos à vista...\n');

        // Buscar todos os pedidos com payment_status = 'Pago' que não têm paid_amount correto
        const ordersQuery = `
      SELECT 
        id, 
        total_value, 
        discount, 
        payment_status,
        payment_method,
        paid_amount,
        pending_amount
      FROM orders 
      WHERE payment_status = 'Pago'
        AND (paid_amount IS NULL OR paid_amount = 0 OR paid_amount != (total_value - COALESCE(discount, 0)))
      ORDER BY id
    `;

        const result = await client.query(ordersQuery);
        console.log(`📋 Encontrados ${result.rows.length} pedidos para atualizar.\n`);

        if (result.rows.length === 0) {
            console.log('✅ Nenhum pedido precisa ser atualizado.');
            return;
        }

        // Iniciar transação
        await client.query('BEGIN');

        let updatedCount = 0;

        for (const order of result.rows) {
            const totalValue = parseFloat(order.total_value) || 0;
            const discount = parseFloat(order.discount) || 0;
            const correctPaidAmount = totalValue - discount;
            const correctPendingAmount = 0; // Pagamento completo

            const updateQuery = `
        UPDATE orders 
        SET 
          paid_amount = $1,
          pending_amount = $2,
          updated_at = NOW()
        WHERE id = $3
      `;

            await client.query(updateQuery, [correctPaidAmount, correctPendingAmount, order.id]);

            console.log(`  ✅ Pedido #${order.id}: paid_amount atualizado para R$ ${correctPaidAmount.toFixed(2)}`);
            updatedCount++;
        }

        // Confirmar transação
        await client.query('COMMIT');

        console.log(`\n🎉 Atualização concluída! ${updatedCount} pedidos atualizados.`);

    } catch (error) {
        // Reverter em caso de erro
        await client.query('ROLLBACK');
        console.error('❌ Erro durante a atualização:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Executar o script
updatePaidAmounts()
    .then(() => {
        console.log('\n✨ Script finalizado com sucesso!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Script falhou:', error);
        process.exit(1);
    });
