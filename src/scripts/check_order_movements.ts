import { pool } from '../config/database';

async function checkOrderMovements() {
    try {
        console.log('=== Verificando Movimentações por Pedido ===\n');

        // Listar TODOS os pedidos com seus itens e movimentações
        const orders = await pool.query(`
      SELECT 
        o.id as order_id,
        o.created_at,
        o.status,
        o.location_id,
        c.name as client_name
      FROM orders o
      LEFT JOIN clients c ON o.client_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

        console.log(`Analisando os últimos ${orders.rows.length} pedidos:\n`);

        for (const order of orders.rows) {
            console.log(`📦 PEDIDO #${order.order_id} | ${order.client_name}`);
            console.log(`   Status: ${order.status} | Location ID: ${order.location_id || 'NULL'}`);
            console.log(`   Criado em: ${order.created_at}`);

            // Itens do pedido
            const items = await pool.query(`
        SELECT oi.*, p.name as product_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
      `, [order.order_id]);

            console.log(`   ITENS (${items.rows.length}):`);
            for (const item of items.rows) {
                console.log(`     - ${item.product_name} x${item.quantity}`);
            }

            // Movimentações
            const movements = await pool.query(`
        SELECT sm.*, p.name as product_name, l.name as location_name
        FROM stock_movements sm
        LEFT JOIN products p ON sm.product_id = p.id
        LEFT JOIN locations l ON sm.location_id = l.id
        WHERE sm.order_id = $1
      `, [order.order_id]);

            if (movements.rows.length === 0) {
                console.log(`   ⚠️ MOVIMENTAÇÕES: NENHUMA (PROBLEMA!)`);
            } else {
                console.log(`   MOVIMENTAÇÕES (${movements.rows.length}):`);
                for (const mov of movements.rows) {
                    console.log(`     - ${mov.movement_type} ${mov.bottle_type} | ${mov.product_name} x${mov.quantity} @ ${mov.location_name}`);
                }
            }
            console.log('');
        }

        // Verificar se há localizações ativas
        console.log('\n=== LOCALIZAÇÕES ATIVAS ===');
        const locations = await pool.query(`
      SELECT id, name, status FROM locations WHERE status = 'Ativo' ORDER BY id
    `);

        if (locations.rows.length === 0) {
            console.log('❌ NENHUMA LOCALIZAÇÃO ATIVA! Isso impede a criação de movimentações de estoque.');
        } else {
            locations.rows.forEach((l: any) => {
                console.log(`   ID: ${l.id} | ${l.name} | ${l.status}`);
            });
        }

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await pool.end();
    }
}

checkOrderMovements();
