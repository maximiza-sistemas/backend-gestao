import { pool } from '../config/database';

async function debugStockIssue() {
    try {
        console.log('=== Diagnóstico Completo de Estoque ===\n');

        // 1. Verificar se o trigger existe
        console.log('1. TRIGGERS NA TABELA stock_movements:');
        const triggers = await pool.query(`
      SELECT tgname as trigger_name, tgenabled as enabled
      FROM pg_trigger 
      WHERE tgrelid = 'stock_movements'::regclass
    `);

        if (triggers.rows.length === 0) {
            console.log('   ❌ NENHUM TRIGGER ENCONTRADO na tabela stock_movements!');
            console.log('   Este é o problema - o trigger não existe no banco de produção.');
        } else {
            triggers.rows.forEach((t: any) => {
                const status = t.enabled === 'O' ? '✅ Ativo' : '❌ Desativado';
                console.log(`   ${status} - ${t.trigger_name}`);
            });
        }

        // 2. Verificar função do trigger
        console.log('\n2. FUNÇÃO update_stock_on_movement:');
        const func = await pool.query(`
      SELECT proname, prosrc 
      FROM pg_proc 
      WHERE proname = 'update_stock_on_movement'
    `);

        if (func.rows.length === 0) {
            console.log('   ❌ Função update_stock_on_movement NÃO EXISTE!');
        } else {
            console.log('   ✅ Função existe');
        }

        // 3. Listar últimos pedidos
        console.log('\n3. ÚLTIMOS 5 PEDIDOS CRIADOS:');
        const orders = await pool.query(`
      SELECT o.id, o.created_at, o.status, c.name as client_name,
             (SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = o.id) as total_qty
      FROM orders o
      LEFT JOIN clients c ON o.client_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

        orders.rows.forEach((o: any) => {
            console.log(`   Pedido #${o.id} | ${o.client_name} | Qtd: ${o.total_qty} | ${o.status} | ${o.created_at}`);
        });

        // 4. Verificar se esses pedidos têm movimentações
        console.log('\n4. MOVIMENTAÇÕES PARA ESSES PEDIDOS:');
        for (const o of orders.rows) {
            const movs = await pool.query(`
        SELECT sm.id, sm.movement_type, sm.bottle_type, sm.quantity, p.name as product
        FROM stock_movements sm
        LEFT JOIN products p ON sm.product_id = p.id
        WHERE sm.order_id = $1
      `, [o.id]);

            if (movs.rows.length === 0) {
                console.log(`   ❌ Pedido #${o.id}: NENHUMA movimentação`);
            } else {
                movs.rows.forEach((m: any) => {
                    console.log(`   ✅ Pedido #${o.id}: ${m.movement_type} ${m.bottle_type} | ${m.product} | Qtd: ${m.quantity}`);
                });
            }
        }

        // 5. Verificar estoque atual
        console.log('\n5. ESTOQUE ATUAL:');
        const stock = await pool.query(`
      SELECT p.name as product, l.name as location, s.full_quantity, s.empty_quantity
      FROM stock s
      JOIN products p ON s.product_id = p.id
      JOIN locations l ON s.location_id = l.id
      ORDER BY p.name, l.name
    `);

        if (stock.rows.length === 0) {
            console.log('   Nenhum registro de estoque encontrado.');
        } else {
            stock.rows.forEach((s: any) => {
                console.log(`   ${s.product} @ ${s.location}: Cheios=${s.full_quantity}, Vazios=${s.empty_quantity}`);
            });
        }

        // 6. Testar uma movimentação manual
        console.log('\n6. TESTE MANUAL DE MOVIMENTAÇÃO:');

        // Pegar um produto e local existentes
        const prodLoc = await pool.query(`
      SELECT s.product_id, s.location_id, s.full_quantity, p.name
      FROM stock s
      JOIN products p ON s.product_id = p.id
      WHERE s.full_quantity > 0
      LIMIT 1
    `);

        if (prodLoc.rows.length === 0) {
            console.log('   Não há estoque para testar.');
        } else {
            const { product_id, location_id, full_quantity, name } = prodLoc.rows[0];
            console.log(`   Produto: ${name} (ID: ${product_id})`);
            console.log(`   Estoque ANTES: ${full_quantity} cheios`);

            // Inserir movimentação de teste
            await pool.query(`
        INSERT INTO stock_movements (product_id, location_id, movement_type, bottle_type, quantity, reason)
        VALUES ($1, $2, 'Saída', 'Cheio', 1, 'TESTE - Verificação de trigger')
      `, [product_id, location_id]);

            // Verificar se o estoque mudou
            const after = await pool.query(`
        SELECT full_quantity FROM stock WHERE product_id = $1 AND location_id = $2
      `, [product_id, location_id]);

            const newQty = after.rows[0].full_quantity;
            console.log(`   Estoque DEPOIS: ${newQty} cheios`);

            if (Number(newQty) === Number(full_quantity) - 1) {
                console.log('   ✅ TRIGGER FUNCIONANDO! Estoque foi decrementado automaticamente.');

                // Reverter o teste
                await pool.query(`
          INSERT INTO stock_movements (product_id, location_id, movement_type, bottle_type, quantity, reason)
          VALUES ($1, $2, 'Entrada', 'Cheio', 1, 'TESTE - Reversão')
        `, [product_id, location_id]);
                console.log('   (Teste revertido)');
            } else {
                console.log('   ❌ TRIGGER NÃO FUNCIONANDO! Estoque não foi alterado.');
                console.log('   O trigger precisa ser criado no banco de produção.');
            }
        }

        console.log('\n=== Diagnóstico Completo ===');

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await pool.end();
    }
}

debugStockIssue();
