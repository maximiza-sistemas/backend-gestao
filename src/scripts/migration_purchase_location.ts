import { pool } from '../config/database';

const migrate = async () => {
    const client = await pool.connect();
    try {
        console.log('🔄 Iniciando migração para adicionar location_id nas compras...');
        await client.query('BEGIN');

        // 1. Adicionar coluna location_id na tabela product_purchases
        console.log('📊 Adicionando coluna location_id...');
        await client.query(`
            ALTER TABLE product_purchases 
            ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL
        `);

        // 2. Criar índice para location_id
        console.log('⚡ Criando índice para location_id...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_product_purchases_location_id 
            ON product_purchases(location_id)
        `);

        await client.query('COMMIT');
        console.log('✅ Migração concluída com sucesso!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro na migração:', error);
    } finally {
        client.release();
        process.exit();
    }
};

migrate();
