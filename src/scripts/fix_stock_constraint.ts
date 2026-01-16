import { pool } from '../config/database';

async function fixStockConstraint() {
    const client = await pool.connect();

    try {
        console.log('=== Corrigindo Constraint UNIQUE na Tabela Stock ===\n');

        await client.query('BEGIN');

        // 1. Verificar se a constraint existe
        console.log('1. Verificando constraint existente...');
        const existing = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'stock' AND constraint_type = 'UNIQUE'
    `);

        if (existing.rows.length > 0) {
            console.log(`   Constraint já existe: ${existing.rows[0].constraint_name}`);
        } else {
            console.log('   ❌ Constraint UNIQUE não existe!');
        }

        // 2. Encontrar e resolver duplicatas
        console.log('\n2. Verificando duplicatas na tabela stock...');
        const duplicates = await client.query(`
      SELECT product_id, location_id, COUNT(*) as count, 
             array_agg(id) as ids, array_agg(full_quantity) as quantities
      FROM stock
      GROUP BY product_id, location_id
      HAVING COUNT(*) > 1
    `);

        if (duplicates.rows.length > 0) {
            console.log(`   Encontradas ${duplicates.rows.length} combinações duplicadas:`);

            for (const dup of duplicates.rows) {
                console.log(`\n   Prod ${dup.product_id} + Loc ${dup.location_id}:`);
                console.log(`      IDs: ${dup.ids.join(', ')}`);
                console.log(`      Quantidades: ${dup.quantities.join(', ')}`);

                // Manter o registro com maior quantidade positiva, ou o mais antigo
                const toKeep = dup.ids[0];
                const toDelete = dup.ids.slice(1);

                // Somar todas as quantidades no registro que vamos manter
                const totalFull = dup.quantities.filter((q: number) => q > 0).reduce((a: number, b: number) => a + b, 0);

                await client.query(
                    'UPDATE stock SET full_quantity = $1 WHERE id = $2',
                    [totalFull, toKeep]
                );

                // Deletar os duplicados
                for (const id of toDelete) {
                    await client.query('DELETE FROM stock WHERE id = $1', [id]);
                    console.log(`      Deletado Stock #${id}`);
                }

                console.log(`      Mantido Stock #${toKeep} com full_quantity = ${totalFull}`);
            }
        } else {
            console.log('   Nenhuma duplicata encontrada.');
        }

        // 3. Remover registros com quantidade negativa (são incorretos)
        console.log('\n3. Removendo registros com quantidade negativa...');
        const negatives = await client.query('DELETE FROM stock WHERE full_quantity < 0 RETURNING id');
        console.log(`   Removidos ${negatives.rows.length} registros negativos.`);

        // 4. Criar a constraint UNIQUE se não existir
        console.log('\n4. Criando constraint UNIQUE...');
        try {
            await client.query(`
        ALTER TABLE stock ADD CONSTRAINT stock_product_location_unique 
        UNIQUE (product_id, location_id)
      `);
            console.log('   ✅ Constraint criada com sucesso!');
        } catch (e: any) {
            if (e.code === '42710') {
                console.log('   Constraint já existe.');
            } else {
                throw e;
            }
        }

        await client.query('COMMIT');

        // 5. Mostrar resultado final
        console.log('\n5. RESULTADO FINAL:');
        const finalStock = await client.query(`
      SELECT s.id, s.product_id, s.location_id, s.full_quantity,
             p.name, l.name as loc_name
      FROM stock s
      JOIN products p ON s.product_id = p.id
      JOIN locations l ON s.location_id = l.id
      ORDER BY p.name, l.name
    `);

        finalStock.rows.forEach((s: any) => {
            console.log(`   Stock #${s.id}: ${s.name} @ ${s.loc_name} = ${s.full_quantity} cheios`);
        });

        console.log('\n=== Correção Concluída! ===');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

fixStockConstraint();
