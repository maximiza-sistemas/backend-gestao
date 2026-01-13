"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const migrate = async () => {
    const client = await database_1.pool.connect();
    try {
        console.log('🔄 Iniciando migração de histórico de preços...');
        await client.query('BEGIN');
        console.log('📊 Adicionando coluna valid_from...');
        await client.query(`
      ALTER TABLE product_supplier_costs 
      ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
        console.log('🔓 Removendo constraint unique antiga...');
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
        console.log('⚡ Criando índice para histórico...');
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_product_supplier_costs_history 
      ON product_supplier_costs (product_id, supplier_id, valid_from DESC)
    `);
        await client.query('COMMIT');
        console.log('✅ Migração concluída com sucesso!');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro na migração:', error);
    }
    finally {
        client.release();
        process.exit();
    }
};
migrate();
//# sourceMappingURL=migration_price_history.js.map