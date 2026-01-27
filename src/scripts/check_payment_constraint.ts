import { pool } from '../config/database';

async function checkPaymentConstraint() {
    try {
        console.log('=== Verificando Constraint payment_method ===\n');

        // 1. Verificar constraint atual
        console.log('1. CONSTRAINT PAYMENT_METHOD NA TABELA:');
        const constraint = await pool.query(`
      SELECT pg_get_constraintdef(c.oid) as definition
      FROM pg_constraint c
      JOIN pg_class r ON c.conrelid = r.oid
      WHERE r.relname = 'financial_transactions' 
        AND c.conname = 'financial_transactions_payment_method_check'
    `);

        if (constraint.rows.length > 0) {
            console.log(`   ${constraint.rows[0].definition}`);
        } else {
            console.log('   Constraint não encontrada');
        }

        // 2. Verificar pedido problemático
        console.log('\n2. PEDIDO #34:');
        const order = await pool.query(`
      SELECT id, payment_method, payment_status FROM orders WHERE id = 34
    `);

        if (order.rows.length > 0) {
            console.log(`   payment_method: "${order.rows[0].payment_method}"`);
            console.log(`   payment_status: "${order.rows[0].payment_status}"`);
        }

        // 3. Todos os payment_methods distintos em orders
        console.log('\n3. PAYMENT_METHODS USADOS NOS PEDIDOS:');
        const methods = await pool.query(`
      SELECT DISTINCT payment_method, COUNT(*) as count FROM orders GROUP BY payment_method
    `);

        methods.rows.forEach((m: any) => {
            console.log(`   "${m.payment_method}": ${m.count} pedidos`);
        });

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await pool.end();
    }
}

checkPaymentConstraint();
