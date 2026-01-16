import { pool } from '../config/database';

async function testStockDecrement() {
    const client = await pool.connect();

    try {
        console.log('=== Teste de Decremento de Estoque ===\n');

        // Pegar um produto com estoque
        const stockRecord = await client.query(`
      SELECT s.id, s.product_id, s.location_id, s.full_quantity, p.name
      FROM stock s
      JOIN products p ON s.product_id = p.id
      WHERE s.full_quantity > 0
      LIMIT 1
    `);

        if (stockRecord.rows.length === 0) {
            console.log('Nenhum produto com estoque disponível para teste.');
            return;
        }

        const { id, product_id, location_id, full_quantity, name } = stockRecord.rows[0];

        console.log(`Produto: ${name} (ID: ${product_id})`);
        console.log(`Localização ID: ${location_id}`);
        console.log(`Estoque ANTES: ${full_quantity} cheios\n`);

        // Simular uma movimentação de saída
        console.log('Inserindo movimentação de saída (1 unidade)...');
        await client.query(`
      INSERT INTO stock_movements (product_id, location_id, movement_type, bottle_type, quantity, reason)
      VALUES ($1, $2, 'Saída', 'Cheio', 1, 'TESTE AUTOMÁTICO - Verificação de decremento')
    `, [product_id, location_id]);

        // Verificar estoque depois
        const after = await client.query(`
      SELECT full_quantity FROM stock WHERE id = $1
    `, [id]);

        const newQty = after.rows[0].full_quantity;
        console.log(`Estoque DEPOIS: ${newQty} cheios`);

        if (Number(newQty) === Number(full_quantity) - 1) {
            console.log('\n✅ SUCESSO! O estoque foi decrementado corretamente.');

            // Reverter o teste
            await client.query(`
        INSERT INTO stock_movements (product_id, location_id, movement_type, bottle_type, quantity, reason)
        VALUES ($1, $2, 'Entrada', 'Cheio', 1, 'TESTE AUTOMÁTICO - Reversão')
      `, [product_id, location_id]);
            console.log('(Teste revertido)');
        } else {
            console.log('\n❌ FALHA! O estoque não foi decrementado corretamente.');
        }

        // Verificar se não criou registro duplicado
        const stockCount = await client.query(`
      SELECT COUNT(*) as count FROM stock WHERE product_id = $1 AND location_id = $2
    `, [product_id, location_id]);

        console.log(`\nRegistros de estoque para este produto/localização: ${stockCount.rows[0].count}`);
        if (stockCount.rows[0].count === '1') {
            console.log('✅ Apenas 1 registro (correto!)');
        } else {
            console.log('❌ Mais de 1 registro (problema!)');
        }

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

testStockDecrement();
