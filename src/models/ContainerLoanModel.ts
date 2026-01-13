import { BaseModel } from './BaseModel';
import { query } from '../config/database';
import { ApiResponse } from '../types';

export interface ContainerLoan {
    id?: number;
    loan_type: 'Empréstimo' | 'Comodato';
    direction: 'Saída' | 'Entrada';
    product_id: number;
    quantity: number;
    entity_type: 'Empresa' | 'Pessoa Física';
    entity_name: string;
    entity_contact?: string;
    entity_address?: string;
    loan_date: string;
    expected_return_date?: string;
    actual_return_date?: string;
    status?: 'Ativo' | 'Devolvido' | 'Cancelado';
    notes?: string;
    location_id?: number;
    user_id?: number;
}

export class ContainerLoanModel extends BaseModel {
    constructor() {
        super('container_loans');
    }

    // Buscar empréstimos com detalhes de produto e local
    async findAllWithDetails(options: any = {}): Promise<ApiResponse> {
        try {
            const {
                page = 1,
                limit = 50,
                sort = 'loan_date',
                order = 'DESC',
                status,
                direction,
                entity_type,
                search,
                location_id
            } = options;

            let whereClause = 'WHERE 1=1';
            const params: any[] = [];
            let paramIndex = 1;

            if (status) {
                whereClause += ` AND cl.status = $${paramIndex}`;
                params.push(status);
                paramIndex++;
            }

            if (direction) {
                whereClause += ` AND cl.direction = $${paramIndex}`;
                params.push(direction);
                paramIndex++;
            }

            if (entity_type) {
                whereClause += ` AND cl.entity_type = $${paramIndex}`;
                params.push(entity_type);
                paramIndex++;
            }

            if (location_id) {
                whereClause += ` AND cl.location_id = $${paramIndex}`;
                params.push(location_id);
                paramIndex++;
            }

            if (search) {
                whereClause += ` AND (cl.entity_name ILIKE $${paramIndex} OR p.name ILIKE $${paramIndex})`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            // Query para contar total
            const countQuery = `
        SELECT COUNT(*) as total 
        FROM container_loans cl
        LEFT JOIN products p ON cl.product_id = p.id
        ${whereClause}
      `;
            const countResult = await query(countQuery, params);
            const total = parseInt(countResult.rows[0].total);

            // Query para buscar os dados
            const offset = (page - 1) * limit;
            const dataQuery = `
        SELECT 
          cl.*,
          p.name as product_name,
          p.weight_kg as product_weight,
          l.name as location_name
        FROM container_loans cl
        LEFT JOIN products p ON cl.product_id = p.id
        LEFT JOIN locations l ON cl.location_id = l.id
        ${whereClause}
        ORDER BY cl.${sort} ${order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
            params.push(limit, offset);

            const dataResult = await query(dataQuery, params);

            return {
                success: true,
                data: dataResult.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Erro ao buscar empréstimos de recipientes:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }

    // Retornar empréstimo (marcar como devolvido)
    async returnLoan(id: number, actualReturnDate?: string): Promise<ApiResponse> {
        try {
            const result = await query(
                `UPDATE container_loans 
         SET status = 'Devolvido', 
             actual_return_date = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status = 'Ativo'
         RETURNING *`,
                [id, actualReturnDate || new Date().toISOString().split('T')[0]]
            );

            if (result.rows.length === 0) {
                return {
                    success: false,
                    error: 'Empréstimo não encontrado ou já devolvido'
                };
            }

            return {
                success: true,
                data: result.rows[0],
                message: 'Empréstimo devolvido com sucesso'
            };
        } catch (error) {
            console.error('Erro ao devolver empréstimo:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }

    // Cancelar empréstimo
    async cancelLoan(id: number): Promise<ApiResponse> {
        try {
            // Primeiro, verificar se o empréstimo está ativo
            const checkResult = await query(
                `SELECT * FROM container_loans WHERE id = $1`,
                [id]
            );

            if (checkResult.rows.length === 0) {
                return {
                    success: false,
                    error: 'Empréstimo não encontrado'
                };
            }

            const loan = checkResult.rows[0];
            if (loan.status !== 'Ativo') {
                return {
                    success: false,
                    error: 'Apenas empréstimos ativos podem ser cancelados'
                };
            }

            // Reverter o estoque manualmente antes de cancelar
            // Porque o trigger só funciona para status 'Devolvido'
            if (loan.direction === 'Saída') {
                await query(
                    `UPDATE stock 
           SET empty_quantity = empty_quantity + $1
           WHERE product_id = $2 AND location_id = $3`,
                    [loan.quantity, loan.product_id, loan.location_id]
                );
            } else if (loan.direction === 'Entrada') {
                await query(
                    `UPDATE stock 
           SET empty_quantity = empty_quantity - $1
           WHERE product_id = $2 AND location_id = $3`,
                    [loan.quantity, loan.product_id, loan.location_id]
                );
            }

            const result = await query(
                `UPDATE container_loans 
         SET status = 'Cancelado',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
                [id]
            );

            return {
                success: true,
                data: result.rows[0],
                message: 'Empréstimo cancelado com sucesso'
            };
        } catch (error) {
            console.error('Erro ao cancelar empréstimo:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }

    // Estatísticas de empréstimos
    async getStats(): Promise<ApiResponse> {
        try {
            const result = await query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'Ativo') as active_count,
          COUNT(*) FILTER (WHERE status = 'Devolvido') as returned_count,
          COUNT(*) FILTER (WHERE status = 'Cancelado') as cancelled_count,
          COUNT(*) FILTER (WHERE direction = 'Saída' AND status = 'Ativo') as lent_out_count,
          COUNT(*) FILTER (WHERE direction = 'Entrada' AND status = 'Ativo') as borrowed_in_count,
          COALESCE(SUM(quantity) FILTER (WHERE direction = 'Saída' AND status = 'Ativo'), 0) as total_lent_out,
          COALESCE(SUM(quantity) FILTER (WHERE direction = 'Entrada' AND status = 'Ativo'), 0) as total_borrowed_in,
          COUNT(*) FILTER (WHERE status = 'Ativo' AND expected_return_date < CURRENT_DATE) as overdue_count
        FROM container_loans
      `);

            return {
                success: true,
                data: result.rows[0]
            };
        } catch (error) {
            console.error('Erro ao buscar estatísticas de empréstimos:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
}
