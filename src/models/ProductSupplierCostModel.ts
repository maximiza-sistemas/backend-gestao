import { pool } from '../config/database';

export interface ProductSupplierCost {
    id: number;
    product_id: number;
    supplier_id: number;
    cost_price: number;
    is_default: boolean;
    created_at: Date;
    updated_at: Date;
    supplier_name?: string;
}

export class ProductSupplierCostModel {
    // Create new cost record (History)
    static async create(productId: number, supplierId: number, costPrice: number, isDefault: boolean = false): Promise<ProductSupplierCost> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // If setting as default, unset others for this product
            if (isDefault) {
                await client.query(
                    'UPDATE product_supplier_costs SET is_default = false WHERE product_id = $1',
                    [productId]
                );
            }

            // Always insert a new record for history
            const result = await client.query(
                `INSERT INTO product_supplier_costs (product_id, supplier_id, cost_price, is_default, valid_from) 
                 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
                 RETURNING *`,
                [productId, supplierId, costPrice, isDefault]
            );

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Alias for upsert to maintain compatibility but redirect to create
    static async upsert(productId: number, supplierId: number, costPrice: number, isDefault: boolean = false): Promise<ProductSupplierCost> {
        return this.create(productId, supplierId, costPrice, isDefault);
    }

    // Get all costs for a product (History)
    static async getByProduct(productId: number): Promise<ProductSupplierCost[]> {
        const result = await pool.query(`
            SELECT psc.*, s.name as supplier_name
            FROM product_supplier_costs psc
            JOIN suppliers s ON psc.supplier_id = s.id
            WHERE psc.product_id = $1
            ORDER BY psc.valid_from DESC
        `, [productId]);
        return result.rows;
    }

    // Get current valid cost for a supplier
    static async getCurrentCost(productId: number, supplierId: number): Promise<number | null> {
        const result = await pool.query(`
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

    // Get default cost for a product (Most recent default)
    static async getDefaultCost(productId: number): Promise<number | null> {
        const result = await pool.query(`
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

    // Delete cost (Soft delete or hard delete? For history, maybe we shouldn't delete, but user asked to remove. 
    // Let's keep delete for now, but maybe it should only delete the specific record or all history for that supplier?)
    // For now, let's delete all history for that supplier to keep it simple as "remove supplier cost"
    static async delete(productId: number, supplierId: number): Promise<void> {
        await pool.query(
            'DELETE FROM product_supplier_costs WHERE product_id = $1 AND supplier_id = $2',
            [productId, supplierId]
        );
    }
}
