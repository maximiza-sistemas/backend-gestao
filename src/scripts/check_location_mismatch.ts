import { pool } from '../config/database';

async function checkLocationMismatch() {
    try {
        console.log('=== Verificando Incompatibilidade de Localização ===\n');

        // 1. Listar TODOS os registros de stock (sem filtro)
        console.log('1. TODOS OS REGISTROS DE ESTOQUE:');
        const allStock = await pool.query(`
      SELECT s.id, s.product_id, s.location_id, s.full_quantity,
             p.name as product_name, l.name as location_name
      FROM stock s
      JOIN products p ON s.product_id = p.id
      LEFT JOIN locations l ON s.location_id = l.id
      ORDER BY s.id DESC
      LIMIT 20
    `);

        allStock.rows.forEach((s: any) => {
            console.log(`   Stock #${s.id} | Prod: ${s.product_id} ("${s.product_name}") | Loc: ${s.location_id} ("${s.location_name || 'NULL'}") | Cheios: ${s.full_quantity}`);
        });

        // 2. Verificar movimentações criadas por pedidos recentes
        console.log('\n2. MOVIMENTAÇÕES DE PEDIDOS RECENTES:');
        const movements = await pool.query(`
      SELECT sm.id, sm.product_id, sm.location_id, sm.order_id, sm.quantity,
             p.name as product_name, l.name as location_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN locations l ON sm.location_id = l.id
      WHERE sm.order_id IS NOT NULL
      ORDER BY sm.created_at DESC
      LIMIT 10
    `);

        movements.rows.forEach((m: any) => {
            console.log(`   Mov #${m.id} | Pedido #${m.order_id}`);
            console.log(`   Prod: ${m.product_id} ("${m.product_name}") | Loc: ${m.location_id} ("${m.location_name || 'NULL'}") | Qtd: ${m.quantity}`);
            console.log('');
        });

        // 3. Verificar se há registros de stock com location_id inválido
        console.log('3. REGISTROS DE STOCK COM LOCALIZAÇÃO INEXISTENTE:');
        const orphan = await pool.query(`
      SELECT s.id, s.product_id, s.location_id, s.full_quantity, p.name
      FROM stock s
      JOIN products p ON s.product_id = p.id
      LEFT JOIN locations l ON s.location_id = l.id
      WHERE l.id IS NULL
    `);

        if (orphan.rows.length === 0) {
            console.log('   Nenhum registro órfão encontrado.');
        } else {
            orphan.rows.forEach((o: any) => {
                console.log(`   Stock #${o.id} | Prod: ${o.product_id} ("${o.name}") | Loc ID: ${o.location_id} (NÃO EXISTE!) | Cheios: ${o.full_quantity}`);
            });
        }

        // 4. Verificar pedidos recentes e qual location eles usam
        console.log('\n4. PEDIDOS RECENTES E SUAS LOCALIZAÇÕES:');
        const orders = await pool.query(`
      SELECT o.id, o.location_id, l.name as location_name, 
             (SELECT sm.location_id FROM stock_movements sm WHERE sm.order_id = o.id LIMIT 1) as movement_location_id
      FROM orders o
      LEFT JOIN locations l ON o.location_id = l.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

        orders.rows.forEach((o: any) => {
            console.log(`   Pedido #${o.id} | order.location_id: ${o.location_id || 'NULL'} ("${o.location_name || 'NULL'}") | movement.location_id: ${o.movement_location_id || 'NULL'}`);
        });

        // 5. Verificar primeira localização ativa (fallback)
        console.log('\n5. PRIMEIRA LOCALIZAÇÃO ATIVA (FALLBACK):');
        const firstLoc = await pool.query(`
      SELECT id, name FROM locations WHERE status = 'Ativo' ORDER BY id LIMIT 1
    `);

        if (firstLoc.rows.length > 0) {
            console.log(`   ID: ${firstLoc.rows[0].id} | Nome: "${firstLoc.rows[0].name}"`);
        } else {
            console.log('   Nenhuma localização ativa!');
        }

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await pool.end();
    }
}

checkLocationMismatch();
