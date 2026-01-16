import { pool } from '../config/database';

async function cleanupDuplicateStock() {
    const client = await pool.connect();

    try {
        console.log('=== Limpando Registros de Estoque Duplicados ===\n');

        // 1. Mostrar todos os registros de estoque P13
        console.log('1. REGISTROS DE ESTOQUE ATUAIS:');
        const stocks = await client.query(`
      SELECT s.id, s.product_id, s.location_id, s.full_quantity, s.empty_quantity,
             p.name as product_name, l.name as location_name
      FROM stock s
      JOIN products p ON s.product_id = p.id
      JOIN locations l ON s.location_id = l.id
      WHERE UPPER(p.name) LIKE '%P13%'
      ORDER BY s.id
    `);

        stocks.rows.forEach((s: any) => {
            console.log(`   Stock #${s.id} | Prod ${s.product_id} ("${s.product_name}") | Loc ${s.location_id} ("${s.location_name}") | Cheios: ${s.full_quantity}`);
        });

        if (stocks.rows.length === 0) {
            console.log('   Nenhum estoque encontrado.');
            return;
        }

        await client.query('BEGIN');

        // 2. Identificar o registro "bom" (maior estoque positivo) e os "ruins"
        const goodRecord = stocks.rows.find((s: any) => s.full_quantity > 0) || stocks.rows[0];
        const badRecords = stocks.rows.filter((s: any) => s.id !== goodRecord.id);

        console.log(`\n2. REGISTRO A MANTER: Stock #${goodRecord.id} (Cheios: ${goodRecord.full_quantity})`);
        console.log(`   REGISTROS A REMOVER: ${badRecords.map((s: any) => `#${s.id}`).join(', ') || 'nenhum'}`);

        if (badRecords.length === 0) {
            console.log('   Não há registros duplicados para remover.');
            await client.query('ROLLBACK');
            return;
        }

        // 3. Deletar os registros ruins diretamente
        for (const bad of badRecords) {
            // Primeiro, atualizar movimentações para apontar para o produto correto
            await client.query(
                'UPDATE stock_movements SET product_id = $1, location_id = $2 WHERE product_id = $3 AND location_id = $4',
                [goodRecord.product_id, goodRecord.location_id, bad.product_id, bad.location_id]
            );
            console.log(`   Movimentações atualizadas de Prod ${bad.product_id}/Loc ${bad.location_id}`);

            // Deletar registro de estoque ruim
            await client.query('DELETE FROM stock WHERE id = $1', [bad.id]);
            console.log(`   Stock #${bad.id} deletado`);
        }

        await client.query('COMMIT');

        // 4. Mostrar resultado
        console.log('\n3. RESULTADO FINAL:');
        const finalStocks = await client.query(`
      SELECT s.id, s.product_id, s.location_id, s.full_quantity, s.empty_quantity,
             p.name as product_name, l.name as location_name
      FROM stock s
      JOIN products p ON s.product_id = p.id
      JOIN locations l ON s.location_id = l.id
      WHERE UPPER(p.name) LIKE '%P13%'
      ORDER BY s.id
    `);

        finalStocks.rows.forEach((s: any) => {
            console.log(`   Stock #${s.id} | ${s.product_name} @ ${s.location_name} | Cheios: ${s.full_quantity}`);
        });

        console.log('\n=== Limpeza Concluída! ===');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanupDuplicateStock();
