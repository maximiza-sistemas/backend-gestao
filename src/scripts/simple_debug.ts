import { pool } from '../config/database';

async function simpleDebug() {
    try {
        // Último pedido
        const lastOrder = await pool.query(`
      SELECT o.id FROM orders o ORDER BY o.created_at DESC LIMIT 1
    `);

        if (lastOrder.rows.length === 0) return;

        const orderId = lastOrder.rows[0].id;
        console.log('Pedido ID:', orderId);

        // Item do pedido
        const item = await pool.query(`
      SELECT oi.product_id, p.name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [orderId]);

        if (item.rows.length > 0) {
            console.log('Item produto ID:', item.rows[0].product_id);
            console.log('Item produto nome:', item.rows[0].name);
        }

        // Movimentação
        const mov = await pool.query(`
      SELECT sm.product_id, sm.location_id
      FROM stock_movements sm
      WHERE sm.order_id = $1
    `, [orderId]);

        if (mov.rows.length > 0) {
            console.log('Mov produto ID:', mov.rows[0].product_id);
            console.log('Mov location ID:', mov.rows[0].location_id);
        }

        // Todos os estoques
        console.log('\nTodos os estoques:');
        const stocks = await pool.query(`
      SELECT s.id, s.product_id, s.location_id, s.full_quantity, p.name
      FROM stock s
      JOIN products p ON s.product_id = p.id
      ORDER BY s.id
    `);

        stocks.rows.forEach((s: any) => {
            console.log(`  Stock ${s.id}: prod=${s.product_id} loc=${s.location_id} qty=${s.full_quantity} (${s.name})`);
        });

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await pool.end();
    }
}

simpleDebug();
