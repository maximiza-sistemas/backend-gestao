import { pool } from '../config/database';

async function cleanupNegatives() {
    const client = await pool.connect();

    try {
        console.log('=== Limpando Registros Negativos ===\n');

        await client.query('BEGIN');

        // 1. Listar registros negativos
        console.log('1. Registros com quantidade negativa:');
        const negatives = await client.query(`
      SELECT s.id, s.product_id, s.location_id, s.full_quantity, p.name
      FROM stock s
      JOIN products p ON s.product_id = p.id
      WHERE s.full_quantity < 0
    `);

        if (negatives.rows.length === 0) {
            console.log('   Nenhum registro negativo encontrado.');
        } else {
            negatives.rows.forEach((s: any) => {
                console.log(`   Stock #${s.id}: ${s.name} = ${s.full_quantity} (NEGATIVO)`);
            });

            // 2. Deletar registros negativos
            console.log('\n2. Deletando registros negativos...');
            const deleted = await client.query('DELETE FROM stock WHERE full_quantity < 0 RETURNING id');
            console.log(`   Deletados ${deleted.rows.length} registros.`);
        }

        await client.query('COMMIT');

        // 3. Mostrar estoque final
        console.log('\n3. ESTOQUE FINAL:');
        const finalStock = await client.query(`
      SELECT p.name, l.name as loc, s.full_quantity
      FROM stock s
      JOIN products p ON s.product_id = p.id
      JOIN locations l ON s.location_id = l.id
      WHERE p.status = 'Ativo'
      ORDER BY p.name
    `);

        finalStock.rows.forEach((s: any) => {
            console.log(`   ${s.name} @ ${s.loc}: ${s.full_quantity} cheios`);
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanupNegatives();
