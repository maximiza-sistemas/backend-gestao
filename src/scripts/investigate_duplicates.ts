import { pool } from '../config/database';

async function investigateDuplicates() {
    try {
        console.log('=== Investigando Duplicatas de Estoque ===\n');

        // 1. Verificar todos os registros de estoque com P13
        console.log('1. REGISTROS DE ESTOQUE COM "P13" (case insensitive):');
        const stocks = await pool.query(`
      SELECT s.id, s.product_id, s.location_id, s.full_quantity, s.empty_quantity,
             p.name as product_name, l.name as location_name
      FROM stock s
      JOIN products p ON s.product_id = p.id
      JOIN locations l ON s.location_id = l.id
      WHERE UPPER(p.name) LIKE '%P13%'
      ORDER BY p.name, l.name
    `);

        stocks.rows.forEach((s: any) => {
            console.log(`   Stock ID: ${s.id} | Product ID: ${s.product_id} | Location ID: ${s.location_id}`);
            console.log(`   Produto: "${s.product_name}" @ "${s.location_name}"`);
            console.log(`   Cheios: ${s.full_quantity} | Vazios: ${s.empty_quantity}`);
            console.log('');
        });

        // 2. Verificar se há produtos duplicados
        console.log('\n2. PRODUTOS COM NOME SIMILAR A "P13":');
        const products = await pool.query(`
      SELECT id, name FROM products WHERE UPPER(name) LIKE '%P13%' ORDER BY id
    `);

        products.rows.forEach((p: any) => {
            console.log(`   ID: ${p.id} | Nome: "${p.name}"`);
        });

        // 3. Verificar localizações TROPICAL
        console.log('\n3. LOCALIZAÇÕES COM NOME "TROPICAL":');
        const locations = await pool.query(`
      SELECT id, name, status FROM locations WHERE UPPER(name) LIKE '%TROPICAL%' ORDER BY id
    `);

        locations.rows.forEach((l: any) => {
            console.log(`   ID: ${l.id} | Nome: "${l.name}" | Status: ${l.status}`);
        });

        // 4. Verificar movimentações recentes para P13
        console.log('\n4. ÚLTIMAS MOVIMENTAÇÕES PARA P13:');
        const movements = await pool.query(`
      SELECT sm.id, sm.product_id, sm.location_id, sm.movement_type, sm.bottle_type, 
             sm.quantity, sm.reason, sm.created_at,
             p.name as product_name, l.name as location_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      JOIN locations l ON sm.location_id = l.id
      WHERE UPPER(p.name) LIKE '%P13%'
      ORDER BY sm.created_at DESC
      LIMIT 10
    `);

        movements.rows.forEach((m: any) => {
            console.log(`   Mov #${m.id} | Produto ID: ${m.product_id} | Location ID: ${m.location_id}`);
            console.log(`   "${m.product_name}" @ "${m.location_name}"`);
            console.log(`   ${m.movement_type} ${m.bottle_type} x${m.quantity}`);
            console.log(`   Razão: ${m.reason}`);
            console.log(`   Data: ${m.created_at}`);
            console.log('');
        });

        // 5. Verificar todas as localizações ativas
        console.log('\n5. TODAS AS LOCALIZAÇÕES:');
        const allLocs = await pool.query(`
      SELECT id, name, status FROM locations ORDER BY id
    `);

        allLocs.rows.forEach((l: any) => {
            console.log(`   ID: ${l.id} | "${l.name}" | ${l.status}`);
        });

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await pool.end();
    }
}

investigateDuplicates();
