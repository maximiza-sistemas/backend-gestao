"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientModel = void 0;
const BaseModel_1 = require("./BaseModel");
class ClientModel extends BaseModel_1.BaseModel {
    constructor() {
        super('clients');
    }
    async findAllWithLastPurchase(options = {}) {
        try {
            const { page = 1, limit = 50, sort = 'id', order = 'ASC', search, status, type } = options;
            let whereClause = 'WHERE 1=1';
            const params = [];
            let paramIndex = 1;
            if (status) {
                whereClause += ` AND c.status = $${paramIndex}`;
                params.push(status);
                paramIndex++;
            }
            if (type) {
                whereClause += ` AND c.type = $${paramIndex}`;
                params.push(type);
                paramIndex++;
            }
            if (search) {
                whereClause += ` AND (c.name ILIKE $${paramIndex} OR c.contact ILIKE $${paramIndex} OR c.cpf_cnpj ILIKE $${paramIndex})`;
                params.push(`%${search}%`);
                paramIndex++;
            }
            const countQuery = `
        SELECT COUNT(*) as total 
        FROM clients c 
        ${whereClause}
      `;
            const countResult = await this.customQuery(countQuery, params);
            const total = parseInt(countResult.data[0].total);
            const offset = (page - 1) * limit;
            const dataQuery = `
        SELECT 
          c.*,
          lp.last_order_date,
          lp.last_order_total,
          lp.order_count,
          lp.total_spent,
          COALESCE(ob.open_balance, 0) as open_balance
        FROM clients c
        LEFT JOIN LATERAL (
          SELECT 
            o.client_id,
            MAX(o.order_date) as last_order_date,
            MAX(o.total_value) as last_order_total,
            COUNT(o.id) as order_count,
            COALESCE(SUM(o.total_value), 0) as total_spent
          FROM orders o
          WHERE o.client_id = c.id AND o.status = 'Entregue'
          GROUP BY o.client_id
        ) lp ON true
        LEFT JOIN LATERAL (
          SELECT 
            COALESCE(SUM(o.pending_amount), 0) as open_balance
          FROM orders o
          WHERE o.client_id = c.id 
            AND o.status != 'Cancelado'
            AND o.pending_amount > 0
        ) ob ON true
        ${whereClause}
        ORDER BY c.${sort} ${order}
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
            console.error('Erro ao buscar clientes com última compra:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async findByCpfCnpj(cpfCnpj) {
        return await this.customQuery('SELECT * FROM clients WHERE cpf_cnpj = $1', [cpfCnpj]);
    }
    async findActive() {
        return await this.customQuery('SELECT * FROM clients WHERE status = $1 ORDER BY name', ['Ativo']);
    }
    async findByType(type) {
        return await this.customQuery('SELECT * FROM clients WHERE type = $1 ORDER BY name', [type]);
    }
    async findWithCreditLimit() {
        return await this.customQuery('SELECT * FROM clients WHERE credit_limit > 0 ORDER BY credit_limit DESC');
    }
    async getStats() {
        try {
            const statsQuery = `
        SELECT 
          COUNT(*) as total_clients,
          COUNT(CASE WHEN status = 'Ativo' THEN 1 END) as active_clients,
          COUNT(CASE WHEN status = 'Inativo' THEN 1 END) as inactive_clients,
          COUNT(CASE WHEN type = 'Residencial' THEN 1 END) as residential_clients,
          COUNT(CASE WHEN type = 'Comercial' THEN 1 END) as commercial_clients,
          COUNT(CASE WHEN type = 'Industrial' THEN 1 END) as industrial_clients,
          AVG(credit_limit) as avg_credit_limit,
          SUM(credit_limit) as total_credit_limit
        FROM clients
      `;
            return await this.customQuery(statsQuery);
        }
        catch (error) {
            console.error('Erro ao buscar estatísticas de clientes:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async getTopClientsBySpent(limit = 10) {
        try {
            const query = `
        SELECT 
          c.id,
          c.name,
          c.type,
          c.contact,
          COUNT(o.id) as total_orders,
          COALESCE(SUM(o.total_value), 0) as total_spent,
          MAX(o.order_date) as last_order_date
        FROM clients c
        LEFT JOIN orders o ON c.id = o.client_id AND o.status = 'Entregue'
        WHERE c.status = 'Ativo'
        GROUP BY c.id, c.name, c.type, c.contact
        ORDER BY total_spent DESC
        LIMIT $1
      `;
            return await this.customQuery(query, [limit]);
        }
        catch (error) {
            console.error('Erro ao buscar top clientes:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async getInactiveClients(daysSinceLastOrder = 90) {
        try {
            const query = `
        SELECT 
          c.*,
          MAX(o.order_date) as last_order_date,
          COUNT(o.id) as total_orders
        FROM clients c
        LEFT JOIN orders o ON c.id = o.client_id
        WHERE c.status = 'Ativo'
        GROUP BY c.id
        HAVING MAX(o.order_date) < CURRENT_DATE - INTERVAL '${daysSinceLastOrder} days' 
           OR MAX(o.order_date) IS NULL
        ORDER BY last_order_date ASC NULLS FIRST
      `;
            return await this.customQuery(query);
        }
        catch (error) {
            console.error('Erro ao buscar clientes inativos:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async getPurchaseHistory(clientId) {
        try {
            const query = `
        SELECT 
          o.id,
          o.order_date as "date",
          o.total_value as "totalValue",
          o.discount,
          COALESCE(o.paid_amount, 0) as "paidAmount",
          COALESCE(o.pending_amount, o.total_value - COALESCE(o.discount, 0)) as "pendingAmount",
          o.status,
          o.payment_method as "paymentMethod",
          o.payment_status as "paymentStatus",
          count(oi.id) as "itemsCount"
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.client_id = $1
        GROUP BY o.id
        ORDER BY o.order_date DESC
      `;
            return await this.customQuery(query, [clientId]);
        }
        catch (error) {
            console.error('Erro ao buscar histórico de compras:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
}
exports.ClientModel = ClientModel;
//# sourceMappingURL=ClientModel.js.map