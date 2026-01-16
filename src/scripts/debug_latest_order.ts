import { pool } from '../config/database';

async function debugLatestOrder() {
    try {
        console.log('=== Debug do Último Pedido e Estoque ===\n');

        // 1. Último pedido criado
        console.log('1. ÚLTIMO PEDIDO CRIADO:');
        const lastOrder = await pool.query(`
      SELECT o.id, o.created_at, o.client_id, c.name as client_name
      FROM orders o
      JOIN clients c ON o.client_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 1
    `);

        if (lastOrder.rows.length === 0) {
            console.log('   Nenhum pedido encontrado.');
            return;
        }

        const order = lastOrder.rows[0];
        console.log(`   Pedido #${order.id} | Cliente: ${order.client_name} | ${order.created_at}`);

        // 2. Itens do pedido
        console.log('\n2. ITENS DESSE PEDIDO:');
        const items = await pool.query(`
      SELECT oi.*, p.name as product_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [order.id]);

        items.rows.forEach((item: any) => {
            console.log(`   Product ID: ${item.product_id} ("${item.product_name}") x${item.quantity}`);
        });

        // 3. Movimentações criadas para esse pedido
        console.log('\n3. MOVIMENTAÇÕES DE ESTOQUE PARA ESSE PEDIDO:');
        const movements = await pool.query(`
      SELECT sm.*, p.name as product_name, l.name as location_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      JOIN locations l ON sm.location_id = l.id
      WHERE sm.order_id = $1
    `, [order.id]);

        movements.rows.forEach((m: any) => {
            console.log(`   Mov #${m.id}: Prod ${m.product_id} ("${m.product_name}") + Loc ${m.location_id} ("${m.location_name}")`);
            console.log(`       ${m.movement_type} ${m.bottle_type} x${m.quantity}`);
        });

        if (movements.rows.length > 0) {
            const mov = movements.rows[0];

            // 4. Verificar se existe registro de estoque para essa combinação
            console.log(`\n4. REGISTROS DE ESTOQUE PARA Prod ${mov.product_id} + Loc ${mov.location_id}:`);
            const stockRecords = await pool.query(`
        SELECT * FROM stock WHERE product_id = $1 AND location_id = $2
      `, [mov.product_id, mov.location_id]);

            console.log(`   Encontrados: ${stockRecords.rows.length} registro(s)`);
            stockRecords.rows.forEach((s: any) => {
                console.log(`   Stock #${s.id}: full_quantity = ${s.full_quantity}`);
            });
        }

        // 5. TODOS os registros de estoque atuais
        console.log('\n5. TODOS OS REGISTROS DE ESTOQUE:');
        const allStock = await pool.query(`
      SELECT s.id, s.product_id, s.location_id, s.full_quantity, p.name, l.name as loc_name
      FROM stock s
      JOIN products p ON s.product_id = p.id
      JOIN locations l ON s.location_id = l.id
      ORDER BY s.id DESC
    `);

        allStock.rows.forEach((s: any) => {
            console.log(`   Stock #${s.id}: Prod ${s.product_id} ("${s.name}") + Loc ${s.location_id} ("${s.loc_name}") = ${s.full_quantity}`);
        });

        // 6. Verificar se a constraint existe
        console.log('\n6. CONSTRAINTS NA TABELA STOCK:');
        const constraints = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'stock'
    `);

        constraints.rows.forEach((c: any) => {
            console.log(`   ${c.constraint_name}: ${c.constraint_type}`);
        });

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await pool.end();
    }
}

debugLatestOrder();
