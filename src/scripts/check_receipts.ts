import { pool } from '../config/database';

async function checkReceipts() {
    try {
        console.log('🔍 Verificando pagamentos com comprovante...\n');

        // Verificar quantos pagamentos existem total
        const totalResult = await pool.query('SELECT COUNT(*) as total FROM order_payments');

        console.log(`📊 Total de pagamentos registrados: ${totalResult.rows[0].total}`);

        // Verificar quantos têm comprovante
        const withReceiptResult = await pool.query(
            'SELECT COUNT(*) as total FROM order_payments WHERE receipt_file IS NOT NULL'
        );
        console.log(`📎 Pagamentos com comprovante: ${withReceiptResult.rows[0].total}`);

        // Listar alguns pagamentos com comprovante
        const receiptsResult = await pool.query(`
            SELECT op.id, op.order_id, op.receipt_file, op.payment_method, op.amount, op.payment_date
            FROM order_payments op 
            WHERE receipt_file IS NOT NULL 
            LIMIT 5
        `);

        if (receiptsResult.rows.length > 0) {
            console.log('\n📝 Exemplos de pagamentos com comprovante:');
            receiptsResult.rows.forEach((p: any) => {
                console.log(`  - ID: ${p.id}, Pedido: ${p.order_id}, Arquivo: ${p.receipt_file}, Valor: R$ ${p.amount}`);
            });
        } else {
            console.log('\n⚠️  Nenhum pagamento tem comprovante cadastrado!');
        }

        // Verificar se existem pagamentos recentes
        const recentResult = await pool.query(`
            SELECT op.id, op.order_id, op.receipt_file, op.payment_method, op.amount, op.payment_date
            FROM order_payments op 
            ORDER BY op.payment_date DESC
            LIMIT 5
        `);

        console.log('\n📅 Pagamentos mais recentes:');
        recentResult.rows.forEach((p: any) => {
            console.log(`  - ID: ${p.id}, Pedido: ${p.order_id}, Arquivo: ${p.receipt_file || 'SEM COMPROVANTE'}, Valor: R$ ${p.amount}, Data: ${p.payment_date}`);
        });

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        process.exit(0);
    }
}

checkReceipts();
