import { pool } from '../config/database';

async function checkSchema() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'order_items';
    `);
        console.log('Columns in order_items:', res.rows);

        const res2 = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
        console.log('Tables:', res2.rows.map(r => r.table_name));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkSchema();
