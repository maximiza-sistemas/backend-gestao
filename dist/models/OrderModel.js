"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderModel = void 0;
const BaseModel_1 = require("./BaseModel");
const ProductSupplierCostModel_1 = require("./ProductSupplierCostModel");
class OrderModel extends BaseModel_1.BaseModel {
    constructor() {
        super('orders');
    }
    async createWithItems(orderData) {
        return await this.executeTransaction(async (client) => {
            try {
                let totalValue = 0;
                for (const item of orderData.items) {
                    totalValue += item.quantity * item.unit_price;
                }
                totalValue -= (orderData.discount || 0);
                const expenses = orderData.expenses || 0;
                const grossValue = totalValue;
                const netValue = grossValue - expenses;
                const orderToCreate = {
                    client_id: orderData.client_id,
                    user_id: orderData.user_id || null,
                    location_id: orderData.location_id || null,
                    vehicle_id: orderData.vehicle_id || null,
                    order_date: orderData.order_date || new Date(),
                    delivery_date: orderData.delivery_date || null,
                    delivery_address: orderData.delivery_address || null,
                    total_value: totalValue,
                    discount: orderData.discount || 0,
                    payment_method: orderData.payment_method || null,
                    payment_status: orderData.payment_status || 'Pendente',
                    payment_cash_amount: orderData.payment_cash_amount || 0,
                    payment_term_amount: orderData.payment_term_amount || 0,
                    payment_installments: orderData.payment_installments || 1,
                    payment_due_date: orderData.payment_due_date || null,
                    notes: orderData.notes || null,
                    status: orderData.status || 'Pendente',
                    expenses: expenses,
                    gross_value: grossValue,
                    net_value: netValue,
                    payment_details: orderData.payment_details || null
                };
                const orderFields = Object.keys(orderToCreate);
                const orderValues = Object.values(orderToCreate);
                const orderPlaceholders = orderValues.map((_, index) => `$${index + 1}`).join(', ');
                const orderQuery = `
          INSERT INTO orders (${orderFields.join(', ')}) 
          VALUES (${orderPlaceholders}) 
          RETURNING *
        `;
                const orderResult = await client.query(orderQuery, orderValues);
                const order = orderResult.rows[0];
                const items = [];
                for (const item of orderData.items) {
                    let costPrice = 0;
                    try {
                        if (item.supplier_id) {
                            const supplierCost = await ProductSupplierCostModel_1.ProductSupplierCostModel.getCurrentCost(item.product_id, item.supplier_id);
                            if (supplierCost !== null) {
                                costPrice = supplierCost;
                            }
                        }
                        if (costPrice === 0) {
                            const defaultCost = await ProductSupplierCostModel_1.ProductSupplierCostModel.getDefaultCost(item.product_id);
                            if (defaultCost !== null) {
                                costPrice = defaultCost;
                            }
                            else {
                                const prodResult = await client.query('SELECT price_buy FROM products WHERE id = $1', [item.product_id]);
                                if (prodResult.rows.length > 0) {
                                    costPrice = parseFloat(prodResult.rows[0].price_buy || '0');
                                }
                            }
                        }
                    }
                    catch (err) {
                        console.error(`Erro ao buscar custo para produto ${item.product_id}:`, err);
                    }
                    const itemQuery = `
            INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, cost_price) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING *
          `;
                    const totalPrice = item.quantity * item.unit_price;
                    const itemResult = await client.query(itemQuery, [
                        order.id,
                        item.product_id,
                        item.quantity,
                        item.unit_price,
                        totalPrice,
                        costPrice
                    ]);
                    items.push(itemResult.rows[0]);
                    const stockMovementQuery = `
            INSERT INTO stock_movements (product_id, location_id, order_id, movement_type, bottle_type, quantity, reason, user_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `;
                    await client.query(stockMovementQuery, [
                        item.product_id,
                        orderData.location_id || 1,
                        order.id,
                        'Saída',
                        'Cheio',
                        item.quantity,
                        `Venda - Pedido #${order.id}`,
                        orderData.user_id
                    ]);
                }
                return {
                    ...order,
                    items
                };
            }
            catch (error) {
                console.error('Erro ao criar pedido com itens:', error);
                throw error;
            }
        });
    }
    async findAllWithDetails(options = {}) {
        try {
            const { page = 1, limit = 50, sort = 'order_date', order = 'DESC', search, status, client_id, date_from, date_to } = options;
            let whereClause = 'WHERE 1=1';
            const params = [];
            let paramIndex = 1;
            if (status) {
                whereClause += ` AND o.status = $${paramIndex} `;
                params.push(status);
                paramIndex++;
            }
            if (client_id) {
                whereClause += ` AND o.client_id = $${paramIndex} `;
                params.push(client_id);
                paramIndex++;
            }
            if (date_from) {
                whereClause += ` AND o.order_date >= $${paramIndex} `;
                params.push(date_from);
                paramIndex++;
            }
            if (date_to) {
                whereClause += ` AND o.order_date <= $${paramIndex} `;
                params.push(date_to);
                paramIndex++;
            }
            if (search) {
                whereClause += ` AND(c.name ILIKE $${paramIndex} OR CAST(o.id AS TEXT) ILIKE $${paramIndex})`;
                params.push(`% ${search}% `);
                paramIndex++;
            }
            const countQuery = `
        SELECT COUNT(*) as total 
        FROM orders o
        JOIN clients c ON o.client_id = c.id
        ${whereClause}
        `;
            const countResult = await this.customQuery(countQuery, params);
            const total = parseInt(countResult.data[0].total);
            const offset = (page - 1) * limit;
            const dataQuery = `
        SELECT
        o.id,
          o.client_id,
          o.user_id,
          o.location_id,
          o.vehicle_id,
          o.order_date as "date",
          o.delivery_date as "deliveryDate",
          o.delivery_address as "deliveryAddress",
          o.total_value as "totalValue",
          o.discount,
          o.payment_method as "paymentMethod",
          o.payment_status as "paymentStatus",
          o.payment_cash_amount as "cashAmount",
          o.payment_term_amount as "termAmount",
          o.payment_installments as "installments",
          o.payment_due_date as "dueDate",
          COALESCE(o.paid_amount, 0) as "paid_amount",
          COALESCE(o.pending_amount, o.total_value - COALESCE(o.discount, 0)) as "pending_amount",
          COALESCE(o.expenses, 0) as "expenses",
          COALESCE(o.gross_value, o.total_value) as "gross_value",
          COALESCE(o.net_value, o.total_value - COALESCE(o.expenses, 0)) as "net_value",
          o.notes,
          o.status,
          o.created_at,
          o.updated_at,
          c.name as "clientName",
          c.type as "clientType",
          c.contact as "clientContact",
          u.name as "userName",
          l.name as "locationName",
          v.plate as "vehiclePlate",
          CASE 
            WHEN o.payment_method = 'Misto' THEN
        CONCAT('Misto (R$ ', o.payment_cash_amount, ' à vista + R$ ', o.payment_term_amount, ' a prazo)')
            ELSE o.payment_method
        END as "paymentMethodDisplay"
        FROM orders o
        JOIN clients c ON o.client_id = c.id
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN locations l ON o.location_id = l.id
        LEFT JOIN vehicles v ON o.vehicle_id = v.id
        ${whereClause}
        ORDER BY o.${sort} ${order}
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
            console.error('Erro ao buscar pedidos com detalhes:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async findByIdWithItems(id) {
        try {
            const orderQuery = `
        SELECT
        o.id,
          o.client_id,
          o.user_id,
          o.location_id,
          o.vehicle_id,
          o.order_date as "date",
          o.delivery_date as "deliveryDate",
          o.delivery_address as "deliveryAddress",
          o.total_value as "totalValue",
          o.discount,
          o.payment_method as "paymentMethod",
          o.payment_status as "paymentStatus",
          o.payment_cash_amount as "cashAmount",
          o.payment_term_amount as "termAmount",
          o.payment_installments as "installments",
          o.payment_due_date as "dueDate",
          o.notes,
          o.status,
          o.created_at,
          o.updated_at,
          c.name as "clientName",
          c.type as "clientType",
          c.contact as "clientContact",
          c.address as "clientAddress",
          u.name as "userName",
          l.name as "locationName",
          v.plate as "vehiclePlate"
        FROM orders o
        JOIN clients c ON o.client_id = c.id
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN locations l ON o.location_id = l.id
        LEFT JOIN vehicles v ON o.vehicle_id = v.id
        WHERE o.id = $1
          `;
            const orderResult = await this.customQuery(orderQuery, [id]);
            if (!orderResult.success || orderResult.data.length === 0) {
                return {
                    success: false,
                    error: 'Pedido não encontrado'
                };
            }
            const order = orderResult.data[0];
            const itemsQuery = `
        SELECT
        oi.*,
          p.name as product_name,
          p.description as product_description,
          p.weight_kg
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
        ORDER BY oi.id
      `;
            const itemsResult = await this.customQuery(itemsQuery, [id]);
            return {
                success: true,
                data: {
                    ...order,
                    items: itemsResult.data || []
                }
            };
        }
        catch (error) {
            console.error('Erro ao buscar pedido com itens:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async updateStatus(id, status, userId) {
        return await this.executeTransaction(async (client) => {
            try {
                const updateResult = await client.query('UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *', [status, id]);
                if (updateResult.rows.length === 0) {
                    throw new Error('Pedido não encontrado');
                }
                const order = updateResult.rows[0];
                if (status === 'Entregue') {
                    const existingTransaction = await client.query('SELECT id FROM financial_transactions WHERE order_id = $1', [order.id]);
                    if (existingTransaction.rows.length === 0) {
                        let accountId;
                        const accountResult = await client.query("SELECT id FROM financial_accounts WHERE name = 'Caixa Gaveta' LIMIT 1");
                        if (accountResult.rows.length > 0) {
                            accountId = accountResult.rows[0].id;
                        }
                        else {
                            const newAccount = await client.query(`INSERT INTO financial_accounts(name, type, initial_balance, current_balance, is_active)
        VALUES('Caixa Gaveta', 'Caixa', 0, 0, true)
                 RETURNING id`);
                            accountId = newAccount.rows[0].id;
                        }
                        let categoryId;
                        const categoryResult = await client.query("SELECT id FROM financial_categories WHERE name = 'Vendas' AND type = 'Receita' LIMIT 1");
                        if (categoryResult.rows.length > 0) {
                            categoryId = categoryResult.rows[0].id;
                        }
                        else {
                            const newCategory = await client.query(`INSERT INTO financial_categories(name, type, description, color, icon, is_active)
        VALUES('Vendas', 'Receita', 'Receita de Vendas', '#10B981', 'fas fa-shopping-cart', true)
                 RETURNING id`);
                            categoryId = newCategory.rows[0].id;
                        }
                        const isPaid = order.payment_status !== 'Pendente';
                        const transactionStatus = isPaid ? 'Pago' : 'Pendente';
                        const paymentDate = isPaid ? new Date() : null;
                        const transactionCode = `TRN${Date.now()} `;
                        await client.query(`INSERT INTO financial_transactions(
          transaction_code, type, category_id, account_id,
          order_id, client_id, description, amount, payment_method,
          transaction_date, due_date, payment_date, status, user_id
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, [
                            transactionCode,
                            'Receita',
                            categoryId,
                            accountId,
                            order.id,
                            order.client_id,
                            `Venda - Pedido #${order.id} `,
                            order.total_value,
                            order.payment_method,
                            new Date(),
                            new Date(),
                            paymentDate,
                            transactionStatus,
                            userId || null
                        ]);
                        if (isPaid) {
                            await client.query(`UPDATE financial_accounts 
                 SET current_balance = current_balance + $1 
                 WHERE id = $2`, [order.total_value, accountId]);
                        }
                    }
                }
                if (userId) {
                    await client.query('INSERT INTO activity_logs (user_id, action, table_name, record_id) VALUES ($1, $2, $3, $4)', [userId, `Alterou status do pedido para: ${status} `, 'orders', id]);
                }
                return updateResult.rows[0];
            }
            catch (error) {
                console.error('Erro ao atualizar status do pedido:', error);
                throw error;
            }
        });
    }
    async updatePaymentStatus(id, status, userId) {
        return await this.executeTransaction(async (client) => {
            try {
                const currentOrderResult = await client.query('SELECT * FROM orders WHERE id = $1', [id]);
                if (currentOrderResult.rows.length === 0) {
                    throw new Error('Pedido não encontrado');
                }
                const currentOrder = currentOrderResult.rows[0];
                if (currentOrder.payment_status === status) {
                    return currentOrder;
                }
                const updateResult = await client.query('UPDATE orders SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *', [status, id]);
                const updatedOrder = updateResult.rows[0];
                const transactionResult = await client.query('SELECT * FROM financial_transactions WHERE order_id = $1', [id]);
                if (transactionResult.rows.length > 0) {
                    const transaction = transactionResult.rows[0];
                    const isPaid = status === 'Pago';
                    const paymentDate = isPaid ? new Date() : null;
                    const transactionStatus = isPaid ? 'Pago' : 'Pendente';
                    await client.query(`UPDATE financial_transactions 
             SET status = $1, payment_date = $2 
             WHERE id = $3`, [transactionStatus, paymentDate, transaction.id]);
                    if (transaction.account_id) {
                        const amount = parseFloat(transaction.amount);
                        const balanceChange = isPaid ? amount : -amount;
                        await client.query(`UPDATE financial_accounts 
               SET current_balance = current_balance + $1 
               WHERE id = $2`, [balanceChange, transaction.account_id]);
                    }
                }
                if (userId) {
                    await client.query('INSERT INTO activity_logs (user_id, action, table_name, record_id) VALUES ($1, $2, $3, $4)', [userId, `Alterou status de pagamento para: ${status} `, 'orders', id]);
                }
                return updatedOrder;
            }
            catch (error) {
                console.error('Erro ao atualizar status de pagamento:', error);
                throw error;
            }
        });
    }
    async getStats() {
        try {
            const statsQuery = `
        SELECT
        COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'Pendente' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status = 'Em Rota' THEN 1 END) as in_route_orders,
          COUNT(CASE WHEN status = 'Entregue' THEN 1 END) as delivered_orders,
          COUNT(CASE WHEN status = 'Cancelado' THEN 1 END) as cancelled_orders,
          COALESCE(SUM(CASE WHEN status = 'Entregue' THEN total_value END), 0) as total_revenue,
          COALESCE(AVG(CASE WHEN status = 'Entregue' THEN total_value END), 0) as avg_order_value,
          COUNT(CASE WHEN order_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as orders_last_30_days,
          COUNT(CASE WHEN order_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as orders_last_7_days
        FROM orders
          `;
            return await this.customQuery(statsQuery);
        }
        catch (error) {
            console.error('Erro ao buscar estatísticas de pedidos:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async getSalesByPeriod(startDate, endDate) {
        try {
            const query = `
        SELECT
        DATE_TRUNC('day', order_date) as date,
          COUNT(*) as orders_count,
          SUM(total_value) as total_revenue,
          AVG(total_value) as avg_order_value
        FROM orders
        WHERE status = 'Entregue' 
          AND order_date BETWEEN $1 AND $2
        GROUP BY DATE_TRUNC('day', order_date)
        ORDER BY date
          `;
            return await this.customQuery(query, [startDate, endDate]);
        }
        catch (error) {
            console.error('Erro ao buscar vendas por período:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async getSalesByLocation() {
        try {
            const query = `
        SELECT
        l.id,
          l.name as location_name,
          COUNT(o.id) as orders_count,
          COALESCE(SUM(o.total_value), 0) as total_revenue,
          COALESCE(AVG(o.total_value), 0) as avg_order_value
        FROM locations l
        LEFT JOIN orders o ON l.id = o.location_id AND o.status = 'Entregue'
        GROUP BY l.id, l.name
        ORDER BY total_revenue DESC
          `;
            return await this.customQuery(query);
        }
        catch (error) {
            console.error('Erro ao buscar vendas por local:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async updateDiscount(id, discount) {
        try {
            const orderResult = await this.findById(id);
            if (!orderResult.success || !orderResult.data) {
                return {
                    success: false,
                    error: 'Pedido não encontrado'
                };
            }
            const order = orderResult.data;
            const totalValue = parseFloat(order.total_value);
            const paidAmount = parseFloat(order.paid_amount || 0);
            const newPendingAmount = Math.max(0, (totalValue - discount) - paidAmount);
            const newPaymentStatus = newPendingAmount <= 0 ? 'Pago' : (paidAmount > 0 ? 'Parcial' : 'Pendente');
            const result = await this.customQuery(`UPDATE orders 
         SET discount = $1, pending_amount = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4 
         RETURNING *`, [discount, newPendingAmount, newPaymentStatus, id]);
            if (!result.success || !result.data || result.data.length === 0) {
                return {
                    success: false,
                    error: 'Erro ao atualizar desconto'
                };
            }
            return {
                success: true,
                data: result.data[0],
                message: 'Desconto atualizado com sucesso'
            };
        }
        catch (error) {
            console.error('Erro ao atualizar desconto:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
}
exports.OrderModel = OrderModel;
//# sourceMappingURL=OrderModel.js.map