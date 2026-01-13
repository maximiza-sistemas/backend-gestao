"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceivableModel = void 0;
const BaseModel_1 = require("./BaseModel");
class ReceivableModel extends BaseModel_1.BaseModel {
    constructor() {
        super('receivables');
    }
    async findAllWithFilters(options = {}) {
        try {
            const { page = 1, limit = 50, sort = 'due_date', order = 'ASC', search, status, date_from, date_to } = options;
            let whereClause = 'WHERE 1=1';
            const params = [];
            let paramIndex = 1;
            if (search) {
                whereClause += ` AND (client_name ILIKE $${paramIndex} OR invoice_id ILIKE $${paramIndex})`;
                params.push(`%${search}%`);
                paramIndex++;
            }
            if (status && status !== 'Todos') {
                whereClause += ` AND status = $${paramIndex}`;
                params.push(status);
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
            const countQuery = `
        SELECT COUNT(*) as total
        FROM receivables
        ${whereClause}
      `;
            const countResult = await this.customQuery(countQuery, params);
            const total = parseInt(countResult.data[0].total);
            const offset = (page - 1) * limit;
            const dataQuery = `
        SELECT *
        FROM receivables
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
        }
        catch (error) {
            console.error('Erro ao buscar contas a receber:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async getStats() {
        try {
            const query = `
        SELECT
          COUNT(*) as total_receivables,
          COALESCE(SUM(CASE WHEN status = 'A Vencer' THEN amount ELSE 0 END), 0) as total_a_vencer,
          COALESCE(SUM(CASE WHEN status = 'Vencido' THEN amount ELSE 0 END), 0) as total_vencido,
          COALESCE(SUM(CASE WHEN status = 'Pago' THEN amount ELSE 0 END), 0) as total_pago,
          COALESCE(SUM(amount), 0) as total_amount
        FROM receivables
      `;
            return await this.customQuery(query);
        }
        catch (error) {
            console.error('Erro ao buscar estatísticas de contas a receber:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async updateStatus(id, status, userId) {
        try {
            const updateData = {
                status,
                updated_at: new Date()
            };
            if (status === 'Pago') {
                updateData.payment_date = new Date();
            }
            const result = await this.update(id, updateData);
            return result;
        }
        catch (error) {
            console.error('Erro ao atualizar status:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
}
exports.ReceivableModel = ReceivableModel;
//# sourceMappingURL=ReceivableModel.js.map