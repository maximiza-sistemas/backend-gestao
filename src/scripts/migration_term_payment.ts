import { pool } from '../config/database';

const migrate = async () => {
    const client = await pool.connect();
    try {
        console.log('🔄 Iniciando migração para pagamento a prazo...');
        await client.query('BEGIN');

        // 1. Adicionar coluna is_term (a prazo)
        console.log('📊 Adicionando coluna is_term...');
        await client.query(`
            ALTER TABLE product_purchases 
            ADD COLUMN IF NOT EXISTS is_term BOOLEAN DEFAULT FALSE
        `);

        // 2. Adicionar coluna payment_date (data do pagamento)
        console.log('📊 Adicionando coluna payment_date...');
        await client.query(`
            ALTER TABLE product_purchases 
            ADD COLUMN IF NOT EXISTS payment_date DATE
        `);

        // 3. Migrar dados existentes: converter is_installment para is_term
        console.log('📊 Migrando dados existentes...');
        await client.query(`
            UPDATE product_purchases 
            SET is_term = is_installment 
            WHERE is_term IS NULL OR is_term = FALSE
        `);

        await client.query('COMMIT');
        console.log('✅ Migração concluída com sucesso!');
        console.log('ℹ️  Colunas adicionadas: is_term, payment_date');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro na migração:', error);
    } finally {
        client.release();
        process.exit();
    }
};

migrate();
