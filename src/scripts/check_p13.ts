import { pool } from '../config/database';

async function checkP13() {
    try {
        console.log('=== Verificação Específica P13 ===\n');

        // 1. Todos os produtos que contêm P13 no nome
        console.log('1. PRODUTOS COM "P13" OU "p13":');
        const products = await pool.query(`
      SELECT * FROM products WHERE UPPER(name) LIKE '%P13%'
    `);
        products.rows.forEach((p: any) => {
            console.log(`   ID: ${p.id} | Nome: "${p.name}" | Ativo: ${p.is_active}`);
        });

        // 2. Registros de stock para esses produtos
        console.log('\n2. ESTOQUE PARA ESSES PRODUTOS:');
        for (const p of products.rows) {
            const stock = await pool.query(`
        SELECT s.*, l.name as loc_name 
        FROM stock s 
        LEFT JOIN locations l ON s.location_id = l.id
        WHERE s.product_id = $1
      `, [p.id]);

            stock.rows.forEach((s: any) => {
                console.log(`   Prod ID ${p.id} ("${p.name}") @ Location ${s.location_id} ("${s.loc_name}")`);
                console.log(`      Stock ID: ${s.id} | Cheios: ${s.full_quantity} | Vazios: ${s.empty_quantity}`);
            });
        }

        // 3. Verificar se há registros de stock "órfãos" (sem produto ou localização)
        console.log('\n3. REGISTROS DE STOCK ÓRFÃOS:');
        const orphans = await pool.query(`
      SELECT s.* FROM stock s
      WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = s.product_id)
         OR NOT EXISTS (SELECT 1 FROM locations l WHERE l.id = s.location_id)
    `);

        if (orphans.rows.length === 0) {
            console.log('   Nenhum registro órfão.');
        } else {
            orphans.rows.forEach((o: any) => {
                console.log(`   Stock #${o.id} | Prod ID: ${o.product_id} | Loc ID: ${o.location_id} | Cheios: ${o.full_quantity}`);
            });
        }

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await pool.end();
    }
}

checkP13();
