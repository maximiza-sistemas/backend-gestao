import { pool } from '../config/database';

const migrate = async () => {
    const client = await pool.connect();
    try {
        console.log('🔄 Iniciando migração para comprovantes de pagamento...');
        await client.query('BEGIN');

        // Adicionar coluna receipt_file na tabela order_payments
        console.log('📊 Adicionando coluna receipt_file...');
        await client.query(`
            ALTER TABLE order_payments 
            ADD COLUMN IF NOT EXISTS receipt_file VARCHAR(255)
        `);

        await client.query('COMMIT');
        console.log('✅ Migração concluída com sucesso!');
        console.log('ℹ️  Coluna adicionada: receipt_file');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro na migração:', error);
    } finally {
        client.release();
        process.exit();
    }
};

migrate();
