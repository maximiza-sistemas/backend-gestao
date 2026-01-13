"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductPurchaseModel = void 0;
const database_1 = require("../config/database");
class ProductPurchaseModel {
    static async create(data) {
        const client = await database_1.pool.connect();
        try {
            await client.query('BEGIN');
            const totalAmount = data.unit_price * data.quantity;
            const isInstallment = data.is_installment || false;
            const installmentCount = isInstallment ? (data.installment_count || 1) : 1;
            const purchaseResult = await client.query(`
                INSERT INTO product_purchases 
                (product_id, unit_price, quantity, total_amount, purchase_date, is_installment, installment_count, notes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [
                data.product_id,
                data.unit_price,
                data.quantity,
                totalAmount,
                data.purchase_date || new Date().toISOString().split('T')[0],
                isInstallment,
                installmentCount,
                data.notes || null
            ]);
            const purchase = purchaseResult.rows[0];
            if (isInstallment && installmentCount > 1) {
                const installmentAmount = Math.round((totalAmount / installmentCount) * 100) / 100;
                const purchaseDate = new Date(purchase.purchase_date);
                for (let i = 1; i <= installmentCount; i++) {
                    const dueDate = new Date(purchaseDate);
                    dueDate.setMonth(dueDate.getMonth() + i);
                    await client.query(`
                        INSERT INTO purchase_installments 
                        (purchase_id, installment_number, due_date, amount, status)
                        VALUES ($1, $2, $3, $4, 'Pendente')
                    `, [purchase.id, i, dueDate.toISOString().split('T')[0], installmentAmount]);
                }
            }
            await client.query('COMMIT');
            return purchase;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    static async getByProduct(productId) {
        const result = await database_1.pool.query(`
            SELECT 
                pp.*,
                p.name as product_name,
                COALESCE(
                    (SELECT SUM(pi.paid_amount) FROM purchase_installments pi WHERE pi.purchase_id = pp.id),
                    CASE WHEN pp.is_installment = false THEN pp.total_amount ELSE 0 END
                ) as paid_amount
            FROM product_purchases pp
            JOIN products p ON pp.product_id = p.id
            WHERE pp.product_id = $1
            ORDER BY pp.purchase_date DESC, pp.created_at DESC
        `, [productId]);
        return result.rows.map(row => ({
            ...row,
            unit_price: parseFloat(row.unit_price),
            total_amount: parseFloat(row.total_amount),
            paid_amount: parseFloat(row.paid_amount || 0),
            pending_amount: parseFloat(row.total_amount) - parseFloat(row.paid_amount || 0)
        }));
    }
    static async getLatestPrice(productId) {
        const result = await database_1.pool.query(`
            SELECT unit_price 
            FROM product_purchases 
            WHERE product_id = $1
            ORDER BY purchase_date DESC, created_at DESC
            LIMIT 1
        `, [productId]);
        if (result.rows.length > 0) {
            return parseFloat(result.rows[0].unit_price);
        }
        return null;
    }
    static async getInstallments(purchaseId) {
        const result = await database_1.pool.query(`
            SELECT * FROM purchase_installments
            WHERE purchase_id = $1
            ORDER BY installment_number
        `, [purchaseId]);
        const today = new Date().toISOString().split('T')[0];
        return result.rows.map(row => ({
            ...row,
            amount: parseFloat(row.amount),
            paid_amount: parseFloat(row.paid_amount || 0),
            status: row.status === 'Pago'
                ? 'Pago'
                : (row.due_date < today ? 'Vencido' : 'Pendente')
        }));
    }
    static async updateInstallment(installmentId, data) {
        const result = await database_1.pool.query(`
            UPDATE purchase_installments
            SET 
                paid_amount = $1,
                paid_date = $2,
                status = CASE WHEN $1 >= amount THEN 'Pago' ELSE status END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `, [data.paid_amount, data.paid_date, installmentId]);
        if (result.rows.length === 0) {
            throw new Error('Parcela não encontrada');
        }
        return {
            ...result.rows[0],
            amount: parseFloat(result.rows[0].amount),
            paid_amount: parseFloat(result.rows[0].paid_amount)
        };
    }
    static async delete(purchaseId) {
        await database_1.pool.query('DELETE FROM product_purchases WHERE id = $1', [purchaseId]);
    }
}
exports.ProductPurchaseModel = ProductPurchaseModel;
//# sourceMappingURL=ProductPurchaseModel.js.map