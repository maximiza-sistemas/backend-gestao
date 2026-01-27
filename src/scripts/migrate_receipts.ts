import { pool } from '../config/database';

async function createInitialPayments() {
    try {
        console.log('🔍 Verificando pedidos pagos sem registro de pagamento...\n');

        // Verificar métodos de pagamento usados
        const methodsResult = await pool.query(`SELECT DISTINCT payment_method FROM orders WHERE payment_method IS NOT NULL`);
        console.log('📊 Métodos de pagamento nos pedidos:', methodsResult.rows.map((r: any) => r.payment_method).join(', '));

        // Verificar pedidos pagos ou parciais que NÃO têm registro em order_payments
        const paidOrdersWithoutPaymentResult = await pool.query(`
            SELECT o.id, o.client_id, o.total_value, o.payment_status, o.payment_method, 
                   o.order_date, o.paid_amount, o.payment_cash_amount, c.name as client_name
            FROM orders o
            LEFT JOIN clients c ON o.client_id = c.id
            WHERE o.payment_status IN ('Pago', 'Parcial')
              AND NOT EXISTS (SELECT 1 FROM order_payments op WHERE op.order_id = o.id)
            ORDER BY o.id
        `);

        console.log(`\n📊 Pedidos pagos/parciais sem registro de pagamento: ${paidOrdersWithoutPaymentResult.rows.length}`);

        if (paidOrdersWithoutPaymentResult.rows.length > 0) {
            console.log('\n🔄 Criando registros de pagamento iniciais...');

            let created = 0;
            for (const order of paidOrdersWithoutPaymentResult.rows) {
                // Determinar valor do pagamento
                let paymentAmount = 0;

                if (order.payment_status === 'Pago') {
                    paymentAmount = parseFloat(order.paid_amount) || parseFloat(order.total_value) || 0;
                } else if (order.payment_status === 'Parcial') {
                    paymentAmount = parseFloat(order.payment_cash_amount) || parseFloat(order.paid_amount) || 0;
                }

                // Mapear método de pagamento para valores válidos
                let paymentMethod = order.payment_method || 'Dinheiro';
                const validMethods = ['Dinheiro', 'Pix', 'Cartão', 'Transferência', 'Depósito'];
                if (!validMethods.includes(paymentMethod)) {
                    // Se for Prazo, Misto ou outro, usar Dinheiro como padrão
                    paymentMethod = 'Dinheiro';
                }

                if (paymentAmount > 0) {
                    try {
                        await pool.query(`
                            INSERT INTO order_payments 
                            (order_id, amount, payment_method, notes, payment_date)
                            VALUES ($1, $2, $3, $4, $5)
                        `, [
                            order.id,
                            paymentAmount,
                            paymentMethod,
                            'Pagamento inicial (histórico)',
                            order.order_date
                        ]);
                        created++;
                        console.log(`  ✅ Pedido #${order.id} (${order.client_name}): R$ ${paymentAmount.toFixed(2)} - ${paymentMethod}`);
                    } catch (err: any) {
                        console.log(`  ❌ Erro no pedido #${order.id}: ${err.message}`);
                    }
                }
            }

            console.log(`\n✅ ${created} registros de pagamento criados!`);
        } else {
            console.log('\n✅ Todos os pedidos pagos já têm registro de pagamento.');
        }

        // Mostrar estado final
        const totalPayments = await pool.query('SELECT COUNT(*) as total FROM order_payments');
        const paymentsWithReceipt = await pool.query('SELECT COUNT(*) as total FROM order_payments WHERE receipt_file IS NOT NULL');

        console.log(`\n📊 Estado final:`);
        console.log(`   - Total de pagamentos registrados: ${totalPayments.rows[0].total}`);
        console.log(`   - Pagamentos com comprovante: ${paymentsWithReceipt.rows[0].total}`);
        console.log(`\n💡 Para adicionar comprovantes aos pagamentos existentes, use o modal de pagamento.`);

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        process.exit(0);
    }
}

createInitialPayments();
