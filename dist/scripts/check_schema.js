"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
async function checkSchema() {
    try {
        const res = await database_1.pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'order_items';
    `);
        console.log('Columns in order_items:', res.rows);
        const res2 = await database_1.pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
        console.log('Tables:', res2.rows.map(r => r.table_name));
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await database_1.pool.end();
    }
}
checkSchema();
//# sourceMappingURL=check_schema.js.map