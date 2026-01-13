"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductSupplierCostModel = void 0;
const database_1 = require("../config/database");
class ProductSupplierCostModel {
    static async create(productId, supplierId, costPrice, isDefault = false) {
        const client = await database_1.pool.connect();
        try {
            await client.query('BEGIN');
            if (isDefault) {
                await client.query('UPDATE product_supplier_costs SET is_default = false WHERE product_id = $1', [productId]);
            }
            const result = await client.query(`INSERT INTO product_supplier_costs (product_id, supplier_id, cost_price, is_default, valid_from) 
                 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
                 RETURNING *`, [productId, supplierId, costPrice, isDefault]);
            await client.query('COMMIT');
            return result.rows[0];
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    static async upsert(productId, supplierId, costPrice, isDefault = false) {
        return this.create(productId, supplierId, costPrice, isDefault);
    }
    static async getByProduct(productId) {
        const result = await database_1.pool.query(`
            SELECT psc.*, s.name as supplier_name
            FROM product_supplier_costs psc
            JOIN suppliers s ON psc.supplier_id = s.id
            WHERE psc.product_id = $1
            ORDER BY psc.valid_from DESC
        `, [productId]);
        return result.rows;
    }
    static async getCurrentCost(productId, supplierId) {
        const result = await database_1.pool.query(`
            SELECT cost_price 
            FROM product_supplier_costs 
            WHERE product_id = $1 AND supplier_id = $2
            ORDER BY valid_from DESC
            LIMIT 1
        `, [productId, supplierId]);
        if (result.rows.length > 0) {
            return parseFloat(result.rows[0].cost_price);
        }
        return null;
    }
    static async getDefaultCost(productId) {
        const result = await database_1.pool.query(`
            SELECT cost_price 
            FROM product_supplier_costs 
            WHERE product_id = $1 AND is_default = true
            ORDER BY valid_from DESC
            LIMIT 1
        `, [productId]);
        if (result.rows.length > 0) {
            return parseFloat(result.rows[0].cost_price);
        }
        return null;
    }
    static async delete(productId, supplierId) {
        await database_1.pool.query('DELETE FROM product_supplier_costs WHERE product_id = $1 AND supplier_id = $2', [productId, supplierId]);
    }
}
exports.ProductSupplierCostModel = ProductSupplierCostModel;
//# sourceMappingURL=ProductSupplierCostModel.js.map