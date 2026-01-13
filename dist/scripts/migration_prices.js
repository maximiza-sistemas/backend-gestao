"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
async function migrate() {
    try {
        console.log('Starting migration...');
        await database_1.pool.query(`
      CREATE TABLE IF NOT EXISTS product_supplier_costs (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
        cost_price DECIMAL(10, 2) NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(product_id, supplier_id)
      );
    `);
        console.log('Created product_supplier_costs table.');
        const checkCol = await database_1.pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'order_items' AND column_name = 'cost_price';
    `);
        if (checkCol.rows.length === 0) {
            await database_1.pool.query(`
        ALTER TABLE order_items 
        ADD COLUMN cost_price DECIMAL(10, 2) DEFAULT 0;
      `);
            console.log('Added cost_price to order_items.');
        }
        else {
            console.log('cost_price column already exists in order_items.');
        }
        console.log('Migration completed successfully.');
    }
    catch (error) {
        console.error('Migration failed:', error);
    }
    finally {
        await database_1.pool.end();
    }
}
migrate();
//# sourceMappingURL=migration_prices.js.map