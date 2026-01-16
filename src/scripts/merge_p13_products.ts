import { pool } from '../config/database';

async function mergeAllP13Products() {
    const client = await pool.connect();

    try {
        console.log('=== Unificando TODOS os Produtos P13/p13 ===\n');

        // Identificar os produtos
        const products = await client.query(`
      SELECT * FROM products WHERE UPPER(name) = 'P13'
      ORDER BY id
    `);

        console.log('Produtos encontrados:');
        products.rows.forEach((p: any) => {
            console.log(`   ID: ${p.id} | Nome: "${p.name}"`);
        });

        if (products.rows.length < 2) {
            console.log('\nMenos de 2 produtos. Não há duplicatas.');
            return;
        }

        // Manter o primeiro (ID menor)
        const keepProduct = products.rows[0];
        const duplicateProducts = products.rows.slice(1);

        console.log(`\nVou MANTER: ID ${keepProduct.id} ("${keepProduct.name}")`);
        console.log(`Vou REMOVER: ${duplicateProducts.map((p: any) => `ID ${p.id}`).join(', ')}`);

        await client.query('BEGIN');

        for (const removeProduct of duplicateProducts) {
            console.log(`\n--- Processando produto duplicado ID ${removeProduct.id} ---`);

            // 1. Atualizar order_items
            try {
                const orderItems = await client.query(
                    'UPDATE order_items SET product_id = $1 WHERE product_id = $2 RETURNING id',
                    [keepProduct.id, removeProduct.id]
                );
                console.log(`1. Atualizados ${orderItems.rows.length} itens de pedido`);
            } catch (e) { console.log('1. Tabela order_items: ignorada'); }

            // 2. Atualizar stock_movements
            try {
                const movements = await client.query(
                    'UPDATE stock_movements SET product_id = $1 WHERE product_id = $2 RETURNING id',
                    [keepProduct.id, removeProduct.id]
                );
                console.log(`2. Atualizadas ${movements.rows.length} movimentações de estoque`);
            } catch (e) { console.log('2. Tabela stock_movements: ignorada'); }

            // 3. Consolidar estoque
            const stockToRemove = await client.query(
                'SELECT * FROM stock WHERE product_id = $1',
                [removeProduct.id]
            );

            for (const s of stockToRemove.rows) {
                const existingStock = await client.query(
                    'SELECT * FROM stock WHERE product_id = $1 AND location_id = $2',
                    [keepProduct.id, s.location_id]
                );

                if (existingStock.rows.length > 0) {
                    await client.query(
                        `UPDATE stock 
             SET full_quantity = full_quantity + $1,
                 empty_quantity = empty_quantity + $2,
                 maintenance_quantity = maintenance_quantity + $3
             WHERE product_id = $4 AND location_id = $5`,
                        [s.full_quantity, s.empty_quantity, s.maintenance_quantity, keepProduct.id, s.location_id]
                    );
                    console.log(`3. Consolidado estoque loc ${s.location_id}: +${s.full_quantity} cheios`);
                } else {
                    await client.query(
                        'UPDATE stock SET product_id = $1 WHERE id = $2',
                        [keepProduct.id, s.id]
                    );
                    console.log(`3. Transferido registro de estoque ID ${s.id}`);
                }
            }

            // 4. Remover registros de estoque duplicados restantes
            await client.query('DELETE FROM stock WHERE product_id = $1', [removeProduct.id]);
            console.log('4. Removidos registros de estoque duplicados');

            // 5. Desativar o produto duplicado
            await client.query(
                "UPDATE products SET is_active = false, name = name || '_DUP_DESAT' WHERE id = $1",
                [removeProduct.id]
            );
            console.log('5. Produto duplicado desativado');
        }

        await client.query('COMMIT');
        console.log('\n=== Unificação Concluída com Sucesso! ===');

        // Mostrar resultado final
        const finalStock = await client.query(`
      SELECT s.*, p.name, l.name as loc_name
      FROM stock s
      JOIN products p ON s.product_id = p.id
      JOIN locations l ON s.location_id = l.id
      WHERE p.id = $1
    `, [keepProduct.id]);

        console.log('\nEstoque consolidado para P13:');
        finalStock.rows.forEach((s: any) => {
            console.log(`   ${s.name} @ ${s.loc_name}: Cheios=${s.full_quantity}, Vazios=${s.empty_quantity}`);
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

mergeAllP13Products();
