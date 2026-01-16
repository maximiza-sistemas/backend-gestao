import { pool } from '../config/database';

async function consolidateP13() {
    const client = await pool.connect();

    try {
        console.log('=== Consolidando Produtos P13 ===\n');

        await client.query('BEGIN');

        // 1. Listar todos os produtos P13
        console.log('1. Produtos com nome P13/p13:');
        const products = await client.query(`
      SELECT id, name, status FROM products WHERE UPPER(name) = 'P13' OR UPPER(name) LIKE 'P13%' ORDER BY id
    `);

        products.rows.forEach((p: any) => {
            console.log(`   ID: ${p.id} | Nome: "${p.name}" | Status: ${p.status}`);
        });

        if (products.rows.length <= 1) {
            console.log('Apenas 1 ou nenhum produto P13. Não há duplicatas.');
            return;
        }

        // 2. Escolher o produto principal (primeiro ativo, ou primeiro da lista)
        const mainProduct = products.rows.find((p: any) => p.status === 'Ativo') || products.rows[0];
        const duplicates = products.rows.filter((p: any) => p.id !== mainProduct.id);

        console.log(`\nProduto PRINCIPAL: ID ${mainProduct.id} ("${mainProduct.name}")`);
        console.log(`Duplicatas: ${duplicates.map((d: any) => `ID ${d.id}`).join(', ')}`);

        // 3. Mover order_items para o produto principal
        console.log('\n2. Atualizando order_items...');
        for (const dup of duplicates) {
            const result = await client.query(
                'UPDATE order_items SET product_id = $1 WHERE product_id = $2 RETURNING id',
                [mainProduct.id, dup.id]
            );
            console.log(`   Movidos ${result.rows.length} itens de produto ${dup.id} para ${mainProduct.id}`);
        }

        // 4. Mover stock_movements para o produto principal
        console.log('\n3. Atualizando stock_movements...');
        for (const dup of duplicates) {
            const result = await client.query(
                'UPDATE stock_movements SET product_id = $1 WHERE product_id = $2 RETURNING id',
                [mainProduct.id, dup.id]
            );
            console.log(`   Movidas ${result.rows.length} movimentações de produto ${dup.id} para ${mainProduct.id}`);
        }

        // 5. Consolidar estoque
        console.log('\n4. Consolidando estoque...');
        for (const dup of duplicates) {
            // Pegar estoques do duplicado
            const dupStocks = await client.query(
                'SELECT * FROM stock WHERE product_id = $1',
                [dup.id]
            );

            for (const dupStock of dupStocks.rows) {
                // Verificar se existe estoque do produto principal nessa localização
                const mainStockResult = await client.query(
                    'SELECT id, full_quantity FROM stock WHERE product_id = $1 AND location_id = $2',
                    [mainProduct.id, dupStock.location_id]
                );

                if (mainStockResult.rows.length > 0) {
                    // Somar quantidades (apenas se positivas)
                    const addQty = dupStock.full_quantity > 0 ? dupStock.full_quantity : 0;
                    await client.query(
                        'UPDATE stock SET full_quantity = full_quantity + $1 WHERE id = $2',
                        [addQty, mainStockResult.rows[0].id]
                    );
                    console.log(`   Adicionado ${addQty} ao estoque principal`);
                } else {
                    // Criar novo registro para o produto principal
                    await client.query(
                        'UPDATE stock SET product_id = $1 WHERE id = $2',
                        [mainProduct.id, dupStock.id]
                    );
                    console.log(`   Transferido estoque ${dupStock.id} para produto principal`);
                }
            }

            // Deletar estoques restantes do duplicado
            await client.query('DELETE FROM stock WHERE product_id = $1', [dup.id]);
        }

        // 6. Desativar produtos duplicados
        console.log('\n5. Desativando produtos duplicados...');
        for (const dup of duplicates) {
            await client.query(
                "UPDATE products SET status = 'Inativo', name = name || '_DUPLICADO' WHERE id = $1",
                [dup.id]
            );
            console.log(`   Produto ${dup.id} desativado`);
        }

        await client.query('COMMIT');

        // 7. Mostrar resultado final
        console.log('\n6. RESULTADO FINAL:');
        const finalStock = await client.query(`
      SELECT s.id, s.product_id, s.location_id, s.full_quantity, p.name, l.name as loc
      FROM stock s
      JOIN products p ON s.product_id = p.id
      JOIN locations l ON s.location_id = l.id
      ORDER BY p.name
    `);

        finalStock.rows.forEach((s: any) => {
            console.log(`   ${s.name} @ ${s.loc}: ${s.full_quantity} cheios`);
        });

        console.log('\n=== Consolidação Concluída! ===');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

consolidateP13();
