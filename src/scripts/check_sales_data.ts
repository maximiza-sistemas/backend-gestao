
import { query } from '../config/database';
import 'dotenv/config';

async function checkData() {
    try {
        console.log('--- Locations ---');
        const locations = await query('SELECT * FROM locations');
        console.table(locations.rows);

        console.log('\n--- Orders (Last 5) ---');
        const orders = await query('SELECT id, order_date, total_value, location_id FROM orders ORDER BY id DESC LIMIT 5');
        console.table(orders.rows);

        console.log('\n--- Monthly Sales Query Result ---');
        const result = await query(`
      SELECT
        TO_CHAR(o.order_date, 'Mon') as month,
        TO_CHAR(o.order_date, 'YYYY-MM') as year_month,
        COALESCE(l.name, 'Matriz') as location_name,
        COALESCE(SUM(o.total_value), 0) as total
      FROM orders o
      LEFT JOIN locations l ON l.id = o.location_id
      WHERE o.order_date >= CURRENT_DATE - INTERVAL '6 months'
        AND o.status != 'Cancelado'
      GROUP BY year_month, month, location_name
      ORDER BY year_month ASC
    `);
        console.table(result.rows);

    } catch (error) {
        console.error(error);
    }
}

checkData();
