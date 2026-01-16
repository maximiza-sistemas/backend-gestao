import { pool } from '../config/database';

async function investigateProducts() {
    try {
        console.log('=== Investigando Produtos ===\n');

        // 1. Listar TODOS os produtos
        console.log('1. TODOS OS PRODUTOS:');
        const products = await pool.query(`
      SELECT id, name, status, created_at 
      FROM products 
      ORDER BY created_at DESC
    `);

        products.rows.forEach((p: any) => {
            console.log(`   ID: ${p.id} | Nome: "${p.name}" | Status: ${p.status} | Criado: ${p.created_at}`);
        });

        // 2. Verificar produtos duplicados por nome
        console.log('\n2. PRODUTOS DUPLICADOS (mesmo nome ou similar):');
        const duplicates = await pool.query(`
      SELECT UPPER(name) as normalized_name, COUNT(*) as count, 
             array_agg(id) as ids, array_agg(name) as names
      FROM products
      GROUP BY UPPER(name)
      HAVING COUNT(*) > 1
    `);

        if (duplicates.rows.length === 0) {
            console.log('   Nenhum duplicado encontrado.');
        } else {
            duplicates.rows.forEach((d: any) => {
                console.log(`   "${d.normalized_name}": ${d.count} registros`);
                console.log(`      IDs: ${d.ids.join(', ')}`);
                console.log(`      Nomes: ${d.names.map((n: string) => `"${n}"`).join(', ')}`);
            });
        }

        // 3. Verificar últimos produtos criados
        console.log('\n3. ÚLTIMOS 5 PRODUTOS CRIADOS:');
        const recent = await pool.query(`
      SELECT id, name, created_at 
      FROM products 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

        recent.rows.forEach((p: any) => {
            console.log(`   ID: ${p.id} | "${p.name}" | ${p.created_at}`);
        });

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await pool.end();
    }
}

investigateProducts();
