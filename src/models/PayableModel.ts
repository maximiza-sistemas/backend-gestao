import { BaseModel } from './BaseModel';
import { ApiResponse } from '../types';

export class PayableModel extends BaseModel {
  constructor() {
    super('payables');
  }

  // Buscar todas as contas a pagar com filtros
  async findAllWithFilters(options: any = {}): Promise<ApiResponse> {
    try {
      const {
        page = 1,
        limit = 50,
        sort = 'due_date',
        order = 'ASC',
        search,
        status,
        date_from,
        date_to,
        category
      } = options;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (search) {
        whereClause += ` AND (supplier ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (status && status !== 'Todos') {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (category) {
        whereClause += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      if (date_from) {
        whereClause += ` AND due_date >= $${paramIndex}`;
        params.push(date_from);
        paramIndex++;
      }

      if (date_to) {
        whereClause += ` AND due_date <= $${paramIndex}`;
        params.push(date_to);
        paramIndex++;
      }

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM payables
        ${whereClause}
      `;
      const countResult = await this.customQuery(countQuery, params);
      const total = parseInt(countResult.data[0].total);

      // Query principal
      const offset = (page - 1) * limit;
      const dataQuery = `
        SELECT *
        FROM payables
        ${whereClause}
        ORDER BY ${sort} ${order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const dataResult = await this.customQuery(dataQuery, params);

      return {
        success: true,
        data: dataResult.data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Erro ao buscar contas a pagar:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Obter estatísticas
  async getStats(): Promise<ApiResponse> {
    try {
      const query = `
        SELECT
          COUNT(*) as total_payables,
          COALESCE(SUM(CASE WHEN status = 'A Pagar' THEN amount ELSE 0 END), 0) as total_a_pagar,
          COALESCE(SUM(CASE WHEN status = 'Vencido' THEN amount ELSE 0 END), 0) as total_vencido,
          COALESCE(SUM(CASE WHEN status = 'Pago' THEN amount ELSE 0 END), 0) as total_pago,
          COALESCE(SUM(amount), 0) as total_amount
        FROM payables
      `;

      return await this.customQuery(query);
    } catch (error) {
      console.error('Erro ao buscar estatísticas de contas a pagar:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Atualizar status
  async updateStatus(id: number, status: string, userId: number): Promise<ApiResponse> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date()
      };

      if (status === 'Pago') {
        updateData.payment_date = new Date();
      }

      const result = await this.update(id, updateData);
      return result;
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }
}
