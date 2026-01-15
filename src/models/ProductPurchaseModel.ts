import { pool } from '../config/database';

export interface ProductPurchase {
    id: number;
    product_id: number;
    product_name?: string;
    location_id?: number | null;  // Empresa/Filial que realizou a compra
    location_name?: string;  // Nome da empresa/filial
    unit_price: number;
    quantity: number;
    total_amount: number;
    purchase_date: string;
    is_term: boolean;  // A prazo
    payment_date?: string | null;  // Data do pagamento (para compras a prazo)
    notes?: string;
    created_at: string;
    updated_at?: string;
}

export interface PurchaseInstallment {
    id: number;
    purchase_id: number;
    installment_number: number;
    due_date: string;
    amount: number;
    paid_amount: number;
    paid_date?: string;
    status: 'Pendente' | 'Pago' | 'Vencido';
    created_at: string;
}

export interface CreatePurchaseData {
    product_id: number;
    unit_price: number;
    quantity: number;
    purchase_date?: string;
    is_term?: boolean;
    payment_date?: string | null;
    location_id?: number | null;  // Empresa/Filial que realizou a compra
    notes?: string;
}

export interface UpdateInstallmentData {
    paid_amount: number;
    paid_date: string;
}

export class ProductPurchaseModel {
    // Create new purchase
    static async create(data: CreatePurchaseData): Promise<ProductPurchase> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Calculate total amount
            const totalAmount = data.unit_price * data.quantity;
            const isTerm = data.is_term || false;

            // Gerar data local para fallback (evita problemas de timezone)
            const getLocalDate = () => {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            // Insert purchase - usando is_installment (campo original da tabela)
            // Usando ::DATE cast explícito para garantir interpretação correta
            const purchaseResult = await client.query(`
                INSERT INTO product_purchases 
                (product_id, unit_price, quantity, total_amount, purchase_date, is_installment, location_id, notes)
                VALUES ($1, $2, $3, $4, $5::DATE, $6, $7, $8)
                RETURNING *
            `, [
                data.product_id,
                data.unit_price,
                data.quantity,
                totalAmount,
                data.purchase_date || getLocalDate(),
                isTerm,
                data.location_id || null,
                data.notes || null
            ]);

            const purchase = purchaseResult.rows[0];

            await client.query('COMMIT');
            return purchase;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Get all purchases for a product
    static async getByProduct(productId: number): Promise<ProductPurchase[]> {
        const result = await pool.query(`
            SELECT 
                pp.*,
                p.name as product_name,
                l.name as location_name,
                COALESCE(
                    (SELECT SUM(pi.paid_amount) FROM purchase_installments pi WHERE pi.purchase_id = pp.id),
                    CASE WHEN pp.is_installment = false THEN pp.total_amount ELSE 0 END
                ) as paid_amount
            FROM product_purchases pp
            JOIN products p ON pp.product_id = p.id
            LEFT JOIN locations l ON pp.location_id = l.id
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

    // Get latest purchase price for a product
    static async getLatestPrice(productId: number): Promise<number | null> {
        const result = await pool.query(`
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

    // Get installments for a purchase
    static async getInstallments(purchaseId: number): Promise<PurchaseInstallment[]> {
        const result = await pool.query(`
            SELECT * FROM purchase_installments
            WHERE purchase_id = $1
            ORDER BY installment_number
        `, [purchaseId]);

        // Update status based on due date
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

    // Update installment payment
    static async updateInstallment(installmentId: number, data: UpdateInstallmentData): Promise<PurchaseInstallment> {
        const result = await pool.query(`
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

    // Delete purchase
    static async delete(purchaseId: number): Promise<void> {
        await pool.query('DELETE FROM product_purchases WHERE id = $1', [purchaseId]);
    }
}
