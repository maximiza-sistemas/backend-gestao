import { pool } from '../config/database';

async function diagnoseStockMismatch() {
    try {
        console.log('=== Diagnóstico de Incompatibilidade de Estoque ===\n');

        // 1. Listar todos os registros de estoque
        console.log('1. TODOS OS REGISTROS DE ESTOQUE:');
        const allStock = await pool.query(`
      SELECT s.id, s.product_id, s.location_id, s.full_quantity,
             p.name as product_name, l.name as location_name
      FROM stock s
      JOIN products p ON s.product_id = p.id
      JOIN locations l ON s.location_id = l.id
      ORDER BY p.name, l.name
    `);

        allStock.rows.forEach((s: any) => {
            console.log(`   Stock #${s.id}: Prod ${s.product_id} ("${s.product_name}") + Loc ${s.location_id} ("${s.location_name}") = ${s.full_quantity} cheios`);
        });

        // 2. Listar últimas movimentações de pedidos
        console.log('\n2. ÚLTIMAS MOVIMENTAÇÕES DE PEDIDOS:');
        const movements = await pool.query(`
      SELECT sm.id, sm.product_id, sm.location_id, sm.order_id, sm.quantity,
             sm.movement_type, sm.bottle_type, sm.created_at,
             p.name as product_name, l.name as location_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      JOIN locations l ON sm.location_id = l.id
      WHERE sm.order_id IS NOT NULL
      ORDER BY sm.created_at DESC
      LIMIT 5
    `);

        movements.rows.forEach((m: any) => {
            console.log(`   Mov #${m.id}: Pedido #${m.order_id}`);
            console.log(`      Prod ${m.product_id} ("${m.product_name}") + Loc ${m.location_id} ("${m.location_name}")`);
            console.log(`      ${m.movement_type} ${m.bottle_type} x${m.quantity} @ ${m.created_at}`);

            // Verificar se existe registro de estoque correspondente
            const stockMatch = allStock.rows.find((s: any) =>
                s.product_id === m.product_id && s.location_id === m.location_id
            );

            if (stockMatch) {
                console.log(`      ✅ Corresponde a Stock #${stockMatch.id}`);
            } else {
                console.log(`      ❌ NÃO CORRESPONDE a nenhum registro de estoque existente!`);
            }
            console.log('');
        });

        // 3. Verificar registros com quantidade negativa
        console.log('3. REGISTROS COM QUANTIDADE NEGATIVA:');
        const negative = await pool.query(`
      SELECT s.id, s.product_id, s.location_id, s.full_quantity,
             p.name as product_name, l.name as location_name
      FROM stock s
      JOIN products p ON s.product_id = p.id
      JOIN locations l ON s.location_id = l.id
      WHERE s.full_quantity < 0
    `);

        if (negative.rows.length === 0) {
            console.log('   Nenhum registro negativo.');
        } else {
            negative.rows.forEach((s: any) => {
                console.log(`   Stock #${s.id}: Prod ${s.product_id} ("${s.product_name}") + Loc ${s.location_id} ("${s.location_name}") = ${s.full_quantity} (NEGATIVO!)`);
            });
        }

        // 4. Verificar a primeira localização ativa (fallback usado no OrderModel)
        console.log('\n4. PRIMEIRA LOCALIZAÇÃO ATIVA (USADO COMO FALLBACK):');
        const firstLoc = await pool.query(`
      SELECT id, name FROM locations WHERE status = 'Ativo' ORDER BY id LIMIT 1
    `);

        if (firstLoc.rows.length > 0) {
            console.log(`   ID: ${firstLoc.rows[0].id} | Nome: "${firstLoc.rows[0].name}"`);
        }

        // 5. Verificar constraint UNIQUE na tabela stock
        console.log('\n5. CONSTRAINT UNIQUE NA TABELA STOCK:');
        const constraint = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'stock' AND constraint_type = 'UNIQUE'
    `);

        if (constraint.rows.length === 0) {
            console.log('   ⚠️ NENHUM CONSTRAINT UNIQUE! Isso permite registros duplicados.');
        } else {
            constraint.rows.forEach((c: any) => {
                console.log(`   ${c.constraint_name}: ${c.constraint_type}`);
            });
        }

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await pool.end();
    }
}

diagnoseStockMismatch();
