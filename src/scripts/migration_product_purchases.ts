import { pool } from '../config/database';

const migrate = async () => {
    const client = await pool.connect();
    try {
        console.log('🔄 Iniciando migração de compras de produtos...');
        await client.query('BEGIN');

        // 1. Criar tabela de compras de produtos
        console.log('📊 Criando tabela product_purchases...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS product_purchases (
                id SERIAL PRIMARY KEY,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                unit_price DECIMAL(10, 2) NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                total_amount DECIMAL(10, 2) NOT NULL,
                purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
                is_installment BOOLEAN DEFAULT FALSE,
                installment_count INTEGER DEFAULT 1,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Criar tabela de parcelas
        console.log('📊 Criando tabela purchase_installments...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS purchase_installments (
                id SERIAL PRIMARY KEY,
                purchase_id INTEGER NOT NULL REFERENCES product_purchases(id) ON DELETE CASCADE,
                installment_number INTEGER NOT NULL,
                due_date DATE NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                paid_amount DECIMAL(10, 2) DEFAULT 0,
                paid_date DATE,
                status VARCHAR(20) DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Pago', 'Vencido')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Criar índices
        console.log('⚡ Criando índices...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_product_purchases_product_id 
            ON product_purchases(product_id)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_product_purchases_date 
            ON product_purchases(purchase_date DESC)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_purchase_installments_purchase_id 
            ON purchase_installments(purchase_id)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_purchase_installments_status 
            ON purchase_installments(status)
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
