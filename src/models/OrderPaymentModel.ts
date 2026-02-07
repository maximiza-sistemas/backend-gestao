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

    // Atualizar pagamento
    async updatePayment(paymentId: number, data: {
        amount?: number;
        payment_method?: 'Dinheiro' | 'Pix' | 'Cartão' | 'Transferência' | 'Depósito';
        notes?: string;
        payment_date?: string;
        receipt_file?: string;
    }): Promise<ApiResponse> {
        try {
            // Buscar pagamento existente
            const existingResult = await this.customQuery(
                `SELECT op.*, o.total_value, o.discount, o.paid_amount
                 FROM order_payments op
                 JOIN orders o ON o.id = op.order_id
                 WHERE op.id = $1`,
                [paymentId]
            );

            if (!existingResult.data || existingResult.data.length === 0) {
                return {
                    success: false,
                    error: 'Pagamento não encontrado'
                };
            }

            const existing = existingResult.data[0];

            // Validar novo valor se fornecido
            if (data.amount !== undefined) {
                const orderTotal = parseFloat(existing.total_value) - parseFloat(existing.discount || 0);
                const currentPaid = parseFloat(existing.paid_amount || 0);
                const oldAmount = parseFloat(existing.amount);
                // Max = o que falta pagar + o valor antigo deste pagamento
                const maxPayment = orderTotal - currentPaid + oldAmount;

                if (data.amount > maxPayment) {
                    return {
                        success: false,
                        error: `Valor máximo permitido: R$ ${maxPayment.toFixed(2)}`
                    };
                }
            }

            // Montar SET dinâmico
            const fields: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (data.amount !== undefined) {
                fields.push(`amount = $${paramIndex++}`);
                values.push(data.amount);
            }
            if (data.payment_method !== undefined) {
                fields.push(`payment_method = $${paramIndex++}`);
                values.push(data.payment_method);
            }
            if (data.notes !== undefined) {
                fields.push(`notes = $${paramIndex++}`);
                values.push(data.notes);
            }
            if (data.payment_date !== undefined) {
                fields.push(`payment_date = $${paramIndex++}`);
                values.push(data.payment_date);
            }
            if (data.receipt_file !== undefined) {
                fields.push(`receipt_file = $${paramIndex++}`);
                values.push(data.receipt_file);
            }

            if (fields.length === 0) {
                return {
                    success: false,
                    error: 'Nenhum campo para atualizar'
                };
            }

            values.push(paymentId);
            const result = await this.customQuery(
                `UPDATE order_payments SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
                values
            );

            return {
                success: true,
                data: result.data[0],
                message: 'Pagamento atualizado com sucesso'
            };
        } catch (error) {
            console.error('Erro ao atualizar pagamento:', error);
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
