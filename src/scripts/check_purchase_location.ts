import { pool } from '../config/database';

const checkPurchaseLocation = async () => {
    try {
        console.log('🔍 Verificando compras com location_id...\n');

        // Check if column exists
        const columnCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'product_purchases' AND column_name = 'location_id'
        `);

        if (columnCheck.rows.length === 0) {
            console.log('❌ Coluna location_id NÃO existe na tabela product_purchases!');
            console.log('Execute a migração: npx ts-node src/scripts/migration_purchase_location.ts');
            process.exit(1);
        }

        console.log('✅ Coluna location_id existe na tabela\n');

        // Get recent purchases with location info
        const result = await pool.query(`
            SELECT 
                pp.id,
                p.name as product_name,
                pp.unit_price,
                pp.purchase_date,
                pp.location_id,
                l.name as location_name
            FROM product_purchases pp
            JOIN products p ON pp.product_id = p.id
            LEFT JOIN locations l ON pp.location_id = l.id
            ORDER BY pp.created_at DESC
            LIMIT 10
        `);

        console.log('📋 Últimas 10 compras:\n');
        console.log('ID | Produto | Preço | Data | Location ID | Empresa');
        console.log('---|---------|-------|------|-------------|--------');

        result.rows.forEach(row => {
            console.log(`${row.id} | ${row.product_name} | R$ ${parseFloat(row.unit_price).toFixed(2)} | ${row.purchase_date} | ${row.location_id || 'NULL'} | ${row.location_name || '-'}`);
        });

        const withLocation = result.rows.filter(r => r.location_id !== null).length;
        const withoutLocation = result.rows.filter(r => r.location_id === null).length;

        console.log(`\n📊 Resumo: ${withLocation} com empresa, ${withoutLocation} sem empresa`);

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        process.exit();
    }
};

checkPurchaseLocation();
