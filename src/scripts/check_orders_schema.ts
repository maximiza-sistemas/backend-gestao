import { pool } from '../config/database';

async function checkSchema() {
    try {
        // Verificar colunas da tabela orders
        const ordersResult = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'orders' 
            ORDER BY ordinal_position
        `);

        console.log('📊 Colunas da tabela orders:');
        ordersResult.rows.forEach((row: any) => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });

        // Verificar colunas da tabela order_payments
        const paymentsResult = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'order_payments' 
            ORDER BY ordinal_position
        `);

        console.log('\n📊 Colunas da tabela order_payments:');
        paymentsResult.rows.forEach((row: any) => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });

        // Verificar quantos pedidos existem com pagamento "Pago" que deveriam ter comprovante
        const paidOrdersResult = await pool.query(`
            SELECT COUNT(*) as total 
            FROM orders 
            WHERE payment_status = 'Pago'
        `);
        console.log(`\n💰 Pedidos pagos (à vista): ${paidOrdersResult.rows[0].total}`);

        // Verificar quantos têm pagamento parcial
        const partialOrdersResult = await pool.query(`
            SELECT COUNT(*) as total 
            FROM orders 
            WHERE payment_status = 'Parcial'
        `);
        console.log(`💰 Pedidos com pagamento parcial: ${partialOrdersResult.rows[0].total}`);

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        process.exit(0);
    }
}

checkSchema();
