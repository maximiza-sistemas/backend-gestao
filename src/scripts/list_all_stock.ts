import { pool } from '../config/database';

async function listAllStock() {
    try {
        console.log('=== TODOS OS REGISTROS DE ESTOQUE ===\n');

        const result = await pool.query(`
      SELECT s.id, s.product_id, s.location_id, s.full_quantity, s.empty_quantity,
             p.name as product_name, l.name as location_name
      FROM stock s
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN locations l ON s.location_id = l.id
      ORDER BY p.name, l.name
    `);

        result.rows.forEach((s: any) => {
            console.log(`Stock #${s.id} | Prod ID: ${s.product_id} ("${s.product_name}") | Loc ID: ${s.location_id} ("${s.location_name}") | Cheios: ${s.full_quantity}`);
        });

        console.log(`\nTotal: ${result.rows.length} registros`);

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await pool.end();
    }
}

listAllStock();
