import { BaseModel } from './BaseModel';
import { ApiResponse } from '../types';

interface CreatePaymentRequest {
    order_id: number;
    amount: number;
    payment_method: 'Dinheiro' | 'Pix' | 'Cartão' | 'Transferência' | 'Depósito';
    notes?: string;
    user_id?: number;
    payment_date?: string;
    receipt_file?: string; // Nome do arquivo do comprovante
}

export class OrderPaymentModel extends BaseModel {
    constructor() {
        super('order_payments');
    }

    // Criar pagamento
    async create(paymentData: CreatePaymentRequest): Promise<ApiResponse> {
        try {
            // Verificar se o pedido existe e buscar valores
            const orderCheck = await this.customQuery(
                `SELECT id, total_value, discount, paid_amount, pending_amount 
         FROM orders WHERE id = $1`,
                [paymentData.order_id]
            );

            if (!orderCheck.data || orderCheck.data.length === 0) {
                return {
                    success: false,
                    error: 'Pedido não encontrado'
                };
            }

            const order = orderCheck.data[0];
            const orderTotal = parseFloat(order.total_value) - parseFloat(order.discount || 0);
            const currentPaid = parseFloat(order.paid_amount || 0);
            const maxPayment = orderTotal - currentPaid;

            if (paymentData.amount > maxPayment) {
                return {
                    success: false,
                    error: `Valor máximo permitido: R$ ${maxPayment.toFixed(2)}`
                };
            }

            // Inserir pagamento
            const paymentDate = paymentData.payment_date || new Date().toISOString().split('T')[0];
            const result = await this.customQuery(
                `INSERT INTO order_payments (order_id, amount, payment_method, notes, user_id, payment_date, receipt_file)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
                [
                    paymentData.order_id,
                    paymentData.amount,
                    paymentData.payment_method,
                    paymentData.notes || null,
                    paymentData.user_id || null,
                    paymentDate,
                    paymentData.receipt_file || null
                ]
            );

            return {
                success: true,
                data: result.data[0],
                message: 'Pagamento registrado com sucesso'
            };
        } catch (error) {
            console.error('Erro ao criar pagamento:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }

    // Buscar pagamentos de um pedido
    async findByOrderId(orderId: number): Promise<ApiResponse> {
        try {
            const result = await this.customQuery(
                `SELECT 
           op.*,
           u.name as user_name
         FROM order_payments op
         LEFT JOIN users u ON op.user_id = u.id
         WHERE op.order_id = $1
         ORDER BY op.payment_date DESC`,
                [orderId]
            );

            return {
                success: true,
                data: result.data || []
            };
        } catch (error) {
            console.error('Erro ao buscar pagamentos:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }

    // Excluir pagamento
    async deletePayment(paymentId: number): Promise<ApiResponse> {
        try {
            const result = await this.customQuery(
                `DELETE FROM order_payments WHERE id = $1 RETURNING *`,
                [paymentId]
            );

            if (!result.data || result.data.length === 0) {
                return {
                    success: false,
                    error: 'Pagamento não encontrado'
                };
            }

            return {
                success: true,
                data: result.data[0],
                message: 'Pagamento excluído com sucesso'
            };
        } catch (error) {
            console.error('Erro ao excluir pagamento:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }

    // Resumo de pagamentos
    async getPaymentSummary(orderId: number): Promise<ApiResponse> {
        try {
            const result = await this.customQuery(
                `SELECT 
           o.id,
           o.total_value,
           o.discount,
           o.paid_amount,
           o.pending_amount,
           o.payment_status,
           (SELECT COUNT(*) FROM order_payments WHERE order_id = o.id) as payment_count
         FROM orders o
         WHERE o.id = $1`,
                [orderId]
            );

            return {
                success: true,
                data: result.data[0] || null
            };
        } catch (error) {
            console.error('Erro ao buscar resumo de pagamentos:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
}
