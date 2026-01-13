import { pool } from '../config/database';

const migrate = async () => {
    const client = await pool.connect();
    try {
        console.log('🔄 Iniciando migração de histórico de preços...');
        await client.query('BEGIN');

        // 1. Adicionar coluna valid_from
        console.log('📊 Adicionando coluna valid_from...');
        await client.query(`
      ALTER TABLE product_supplier_costs 
      ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

        // 2. Remover constraint unique antiga (product_id, supplier_id)
        // Primeiro precisamos descobrir o nome da constraint se não soubermos, 
        // mas geralmente é product_supplier_costs_product_id_supplier_id_key ou similar.
        // Vamos tentar remover pelo nome padrão ou recriar se não existir.
        console.log('🔓 Removendo constraint unique antiga...');

        // Tenta descobrir o nome da constraint unique
        const constraintResult = await client.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'product_supplier_costs'::regclass
      AND contype = 'u'
    `);

        for (const row of constraintResult.rows) {
            console.log(`   - Removendo constraint: ${row.conname}`);
            await client.query(`ALTER TABLE product_supplier_costs DROP CONSTRAINT "${row.conname}"`);
        }

        // 3. Adicionar índice para performance em buscas históricas
        console.log('⚡ Criando índice para histórico...');
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_product_supplier_costs_history 
      ON product_supplier_costs (product_id, supplier_id, valid_from DESC)
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
