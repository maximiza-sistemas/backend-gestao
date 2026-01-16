import { pool } from '../config/database';

async function verifyStockMovements() {
    try {
        console.log('=== Verificando Movimentações de Estoque para Vendas ===\n');

        // 1. Verificar se existe o trigger
        console.log('1. VERIFICANDO TRIGGER:');
        const triggerCheck = await pool.query(`
      SELECT trigger_name, event_manipulation, action_statement 
      FROM information_schema.triggers 
      WHERE trigger_name = 'update_stock_on_movement_trigger'
    `);

        if (triggerCheck.rows.length > 0) {
            console.log('   ✅ Trigger update_stock_on_movement_trigger EXISTE');
        } else {
            console.log('   ❌ Trigger update_stock_on_movement_trigger NÃO ENCONTRADO!');
        }

        // 2. Verificar últimas movimentações de saída por venda
        console.log('\n2. ÚLTIMAS MOVIMENTAÇÕES DE ESTOQUE (VENDAS):');
        const movements = await pool.query(`
      SELECT 
        sm.id,
        sm.order_id,
        p.name as product_name,
        l.name as location_name,
        sm.movement_type,
        sm.bottle_type,
        sm.quantity,
        sm.reason,
        sm.created_at
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN locations l ON sm.location_id = l.id
      WHERE sm.movement_type = 'Saída' AND sm.order_id IS NOT NULL
      ORDER BY sm.created_at DESC
      LIMIT 10
    `);

        if (movements.rows.length === 0) {
            console.log('   Nenhuma movimentação de saída por venda encontrada.');
        } else {
            movements.rows.forEach((m: any) => {
                console.log(`   📦 Movimento #${m.id} | Pedido #${m.order_id}`);
                console.log(`      Produto: ${m.product_name}`);
                console.log(`      Local: ${m.location_name}`);
                console.log(`      Tipo: ${m.movement_type} / ${m.bottle_type}`);
                console.log(`      Quantidade: ${m.quantity}`);
                console.log(`      Razão: ${m.reason}`);
                console.log(`      Data: ${m.created_at}`);
                console.log('');
            });
        }

        // 3. Verificar estoque atual
        console.log('\n3. ESTOQUE ATUAL (por produto/localização):');
        const stock = await pool.query(`
      SELECT 
        p.name as product_name,
        l.name as location_name,
        s.full_quantity,
        s.empty_quantity,
        s.maintenance_quantity
      FROM stock s
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN locations l ON s.location_id = l.id
      ORDER BY p.name, l.name
    `);

        if (stock.rows.length === 0) {
            console.log('   Nenhum registro de estoque encontrado.');
        } else {
            stock.rows.forEach((s: any) => {
                console.log(`   📊 ${s.product_name} | ${s.location_name}`);
                console.log(`      Cheios: ${s.full_quantity} | Vazios: ${s.empty_quantity} | Manutenção: ${s.maintenance_quantity}`);
            });
        }

        // 4. Comparar pedidos com movimentações
        console.log('\n4. PEDIDOS SEM MOVIMENTAÇÃO DE ESTOQUE (PROBLEMA):');
        const ordersWithoutMovement = await pool.query(`
      SELECT o.id, o.order_date, o.status, c.name as client_name
      FROM orders o
      LEFT JOIN clients c ON o.client_id = c.id
      WHERE NOT EXISTS (
        SELECT 1 FROM stock_movements sm WHERE sm.order_id = o.id
      )
      AND o.status NOT IN ('Cancelado')
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

        if (ordersWithoutMovement.rows.length === 0) {
            console.log('   ✅ Todos os pedidos têm movimentações de estoque associadas.');
        } else {
            console.log('   ⚠️ Pedidos sem movimentação de estoque:');
            ordersWithoutMovement.rows.forEach((o: any) => {
                console.log(`   - Pedido #${o.id} | ${o.client_name} | ${o.order_date} | Status: ${o.status}`);
            });
        }

        // 5. Resumo de totais
        console.log('\n5. RESUMO DE TOTAIS:');
        const totals = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM orders WHERE status != 'Cancelado') as total_orders,
        (SELECT COUNT(DISTINCT order_id) FROM stock_movements WHERE order_id IS NOT NULL) as orders_with_movement,
        (SELECT COALESCE(SUM(quantity), 0) FROM stock_movements WHERE movement_type = 'Saída' AND order_id IS NOT NULL) as total_sold
    `);

        const t = totals.rows[0];
        console.log(`   Total de pedidos ativos: ${t.total_orders}`);
        console.log(`   Pedidos com movimentação: ${t.orders_with_movement}`);
        console.log(`   Total de unidades vendidas: ${t.total_sold}`);

        console.log('\n=== Verificação Completa ===');

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await pool.end();
    }
}

verifyStockMovements();
