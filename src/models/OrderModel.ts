import { BaseModel } from './BaseModel';
import { Order, CreateOrderRequest, ApiResponse } from '../types';
import { query, transaction } from '../config/database';
import { ProductSupplierCostModel } from './ProductSupplierCostModel';

export class OrderModel extends BaseModel {
  constructor() {
    super('orders');
  }

  // Criar pedido com itens
  async createWithItems(orderData: CreateOrderRequest): Promise<ApiResponse> {
    return await this.executeTransaction(async (client) => {
      try {
        // Calcular total do pedido
        let totalValue = 0;
        for (const item of orderData.items) {
          totalValue += item.quantity * item.unit_price;
        }
        totalValue -= (orderData.discount || 0);

        // Calcular valores bruto e líquido
        const expenses = (orderData as any).expenses || 0;
        const grossValue = totalValue;
        const netValue = grossValue - expenses;

        // Criar o pedido
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
          payment_details: (orderData as any).payment_details || null
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

        // Criar os itens do pedido
        const items = [];
        for (const item of orderData.items) {
          // Buscar custo do produto
          let costPrice = 0;
          try {
            // Se um fornecedor foi selecionado para o item, tenta pegar o custo atual dele
            if (item.supplier_id) {
              const supplierCost = await ProductSupplierCostModel.getCurrentCost(item.product_id, item.supplier_id);
              if (supplierCost !== null) {
                costPrice = supplierCost;
              }
            }

            // Se não achou custo específico (ou não tem fornecedor), tenta o padrão
            if (costPrice === 0) {
              const defaultCost = await ProductSupplierCostModel.getDefaultCost(item.product_id);
              if (defaultCost !== null) {
                costPrice = defaultCost;
              } else {
                // Fallback para o preço de compra no cadastro do produto
                const prodResult = await client.query('SELECT price_buy FROM products WHERE id = $1', [item.product_id]);
                if (prodResult.rows.length > 0) {
                  costPrice = parseFloat(prodResult.rows[0].price_buy || '0');
                }
              }
            }
          } catch (err) {
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

          // Criar movimentação de estoque (saída)
          // Determinar location_id: usar o fornecido ou buscar a primeira localização ativa
          let movementLocationId = orderData.location_id;
          if (!movementLocationId) {
            const locationResult = await client.query(
              "SELECT id FROM locations WHERE status = 'Ativo' ORDER BY id LIMIT 1"
            );
            if (locationResult.rows.length > 0) {
              movementLocationId = locationResult.rows[0].id;
            }
          }

          // Só criar movimentação se tiver uma localização válida
          if (movementLocationId) {
            const stockMovementQuery = `
              INSERT INTO stock_movements (product_id, location_id, order_id, movement_type, bottle_type, quantity, reason, user_id) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `;

            await client.query(stockMovementQuery, [
              item.product_id,
              movementLocationId,
              order.id,
              'Saída',
              'Cheio', // Assume que é saída de botijões cheios
              item.quantity,
              `Venda - Pedido #${order.id}`,
              orderData.user_id
            ]);
          }
        }

        return {
          ...order,
          items
        };
      } catch (error) {
        console.error('Erro ao criar pedido com itens:', error);
        throw error;
      }
    });
  }

  // Buscar pedidos com detalhes completos
  async findAllWithDetails(options: any = {}): Promise<ApiResponse> {
    try {
      const {
        page = 1,
        limit = 50,
        sort = 'order_date',
        order = 'DESC',
        search,
        status,
        client_id,
        date_from,
        date_to
      } = options;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      // Filtros
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

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM orders o
        JOIN clients c ON o.client_id = c.id
        ${whereClause}
        `;
      const countResult = await this.customQuery(countQuery, params);
      const total = parseInt(countResult.data[0].total);

      // Query principal
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
    } catch (error) {
      console.error('Erro ao buscar pedidos com detalhes:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Buscar pedido com itens
  async findByIdWithItems(id: number): Promise<ApiResponse> {
    try {
      // Buscar o pedido principal
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

      // Buscar os itens do pedido
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
    } catch (error) {
      console.error('Erro ao buscar pedido com itens:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Atualizar status do pedido
  async updateStatus(id: number, status: string, userId?: number): Promise<ApiResponse> {
    return await this.executeTransaction(async (client) => {
      try {
        // Atualizar o pedido
        const updateResult = await client.query(
          'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
          [status, id]
        );

        if (updateResult.rows.length === 0) {
          throw new Error('Pedido não encontrado');
        }

        const order = updateResult.rows[0];

        // Se o pedido foi entregue
        if (status === 'Entregue') {
          // Verificar se já existe transação para este pedido para evitar duplicidade
          const existingTransaction = await client.query(
            'SELECT id FROM financial_transactions WHERE order_id = $1',
            [order.id]
          );

          if (existingTransaction.rows.length === 0) {
            // Buscar conta 'Caixa Gaveta' ou criar se não existir
            let accountId;
            const accountResult = await client.query(
              "SELECT id FROM financial_accounts WHERE name = 'Caixa Gaveta' LIMIT 1"
            );

            if (accountResult.rows.length > 0) {
              accountId = accountResult.rows[0].id;
            } else {
              // Criar conta Caixa Gaveta padrão
              const newAccount = await client.query(
                `INSERT INTO financial_accounts(name, type, initial_balance, current_balance, is_active)
        VALUES('Caixa Gaveta', 'Caixa', 0, 0, true)
                 RETURNING id`
              );
              accountId = newAccount.rows[0].id;
            }

            // Buscar categoria 'Vendas' ou criar
            let categoryId;
            const categoryResult = await client.query(
              "SELECT id FROM financial_categories WHERE name = 'Vendas' AND type = 'Receita' LIMIT 1"
            );

            if (categoryResult.rows.length > 0) {
              categoryId = categoryResult.rows[0].id;
            } else {
              const newCategory = await client.query(
                `INSERT INTO financial_categories(name, type, description, color, icon, is_active)
        VALUES('Vendas', 'Receita', 'Receita de Vendas', '#10B981', 'fas fa-shopping-cart', true)
                 RETURNING id`
              );
              categoryId = newCategory.rows[0].id;
            }

            // Definir status da transação baseado no status de pagamento do pedido
            const isPaid = order.payment_status !== 'Pendente';
            const transactionStatus = isPaid ? 'Pago' : 'Pendente';
            const paymentDate = isPaid ? new Date() : null;

            // Criar transação financeira
            const transactionCode = `TRN${Date.now()} `;
            await client.query(
              `INSERT INTO financial_transactions(
          transaction_code, type, category_id, account_id,
          order_id, client_id, description, amount, payment_method,
          transaction_date, due_date, payment_date, status, user_id
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
              [
                transactionCode,
                'Receita',
                categoryId,
                accountId,
                order.id,
                order.client_id,
                `Venda - Pedido #${order.id} `,
                order.total_value,
                order.payment_method,
                new Date(), // transaction_date
                new Date(), // due_date
                paymentDate,
                transactionStatus,
                userId || null
              ]
            );

            // NOTA: O trigger update_balance_after_transaction no banco de dados
            // já atualiza automaticamente o saldo da conta quando uma transação é criada
            // NÃO fazer atualização manual aqui para evitar duplicação
          }
        }

        // Log da atividade
        if (userId) {
          await client.query(
            'INSERT INTO activity_logs (user_id, action, table_name, record_id) VALUES ($1, $2, $3, $4)',
            [userId, `Alterou status do pedido para: ${status} `, 'orders', id]
          );
        }

        return updateResult.rows[0];
      } catch (error) {
        console.error('Erro ao atualizar status do pedido:', error);
        throw error;
      }
    });
  }

  // Atualizar status de pagamento do pedido
  async updatePaymentStatus(id: number, status: 'Pendente' | 'Pago', userId?: number): Promise<ApiResponse> {
    return await this.executeTransaction(async (client) => {
      try {
        // 1. Buscar o pedido atual para verificar estado anterior
        const currentOrderResult = await client.query('SELECT * FROM orders WHERE id = $1', [id]);
        if (currentOrderResult.rows.length === 0) {
          throw new Error('Pedido não encontrado');
        }
        const currentOrder = currentOrderResult.rows[0];

        // Se o status não mudou, não faz nada
        if (currentOrder.payment_status === status) {
          return currentOrder;
        }

        // 2. Atualizar o status de pagamento do pedido
        const updateResult = await client.query(
          'UPDATE orders SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
          [status, id]
        );
        const updatedOrder = updateResult.rows[0];

        // 3. Buscar transação financeira associada
        const transactionResult = await client.query(
          'SELECT * FROM financial_transactions WHERE order_id = $1',
          [id]
        );

        if (transactionResult.rows.length > 0) {
          const transaction = transactionResult.rows[0];
          const isPaid = status === 'Pago';
          const paymentDate = isPaid ? new Date() : null;
          const transactionStatus = isPaid ? 'Pago' : 'Pendente';

          // Atualizar transação
          await client.query(
            `UPDATE financial_transactions 
             SET status = $1, payment_date = $2 
             WHERE id = $3`,
            [transactionStatus, paymentDate, transaction.id]
          );

          // 4. Atualizar saldo da conta
          // Se mudou para Pago: Adicionar ao saldo
          // Se mudou para Pendente: Remover do saldo (estorno)
          if (transaction.account_id) {
            const amount = parseFloat(transaction.amount);
            const balanceChange = isPaid ? amount : -amount;

            await client.query(
              `UPDATE financial_accounts 
               SET current_balance = current_balance + $1 
               WHERE id = $2`,
              [balanceChange, transaction.account_id]
            );
          }
        }

        // Log da atividade
        if (userId) {
          await client.query(
            'INSERT INTO activity_logs (user_id, action, table_name, record_id) VALUES ($1, $2, $3, $4)',
            [userId, `Alterou status de pagamento para: ${status} `, 'orders', id]
          );
        }

        return updatedOrder;
      } catch (error) {
        console.error('Erro ao atualizar status de pagamento:', error);
        throw error;
      }
    });
  }

  // Estatísticas de pedidos
  async getStats(): Promise<ApiResponse> {
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
    } catch (error) {
      console.error('Erro ao buscar estatísticas de pedidos:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Vendas por período
  async getSalesByPeriod(startDate: Date, endDate: Date): Promise<ApiResponse> {
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
    } catch (error) {
      console.error('Erro ao buscar vendas por período:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Vendas por local
  async getSalesByLocation(): Promise<ApiResponse> {
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
    } catch (error) {
      console.error('Erro ao buscar vendas por local:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Deletar pedido com cascata manual para tabelas que não têm ON DELETE CASCADE
  async delete(id: number): Promise<ApiResponse> {
    return await this.executeTransaction(async (client) => {
      try {
        // Verificar se o pedido existe
        const orderResult = await client.query('SELECT * FROM orders WHERE id = $1', [id]);
        if (orderResult.rows.length === 0) {
          throw new Error('Pedido não encontrado');
        }

        const order = orderResult.rows[0];

        // Verificar se o pedido pode ser deletado (apenas Pendente)
        if (order.status !== 'Pendente') {
          throw new Error('Apenas pedidos pendentes podem ser deletados');
        }

        // 1. Reverter movimentações de estoque (criar movimentação de entrada para cada saída)
        const stockMovements = await client.query(
          `SELECT product_id, location_id, quantity, bottle_type 
           FROM stock_movements 
           WHERE order_id = $1 AND movement_type = 'Saída'`,
          [id]
        );

        // Criar movimentações de entrada para reverter o estoque
        for (const mov of stockMovements.rows) {
          await client.query(
            `INSERT INTO stock_movements (product_id, location_id, movement_type, bottle_type, quantity, reason)
             VALUES ($1, $2, 'Entrada', $3, $4, $5)`,
            [mov.product_id, mov.location_id, mov.bottle_type, mov.quantity, `Estorno - Pedido #${id} excluído`]
          );
        }

        // Agora deletar as movimentações originais do pedido
        await client.query('DELETE FROM stock_movements WHERE order_id = $1', [id]);

        // 2. Deletar contas a receber relacionadas
        await client.query('DELETE FROM receivables WHERE order_id = $1', [id]);

        // 3. Limpar referências em route_stops (SET NULL ao invés de DELETE)
        await client.query('UPDATE route_stops SET order_id = NULL WHERE order_id = $1', [id]);

        // 4. Limpar referências em product_maintenance (SET NULL ao invés de DELETE)
        await client.query('UPDATE product_maintenance SET client_order_id = NULL WHERE client_order_id = $1', [id]);

        // 5. Deletar pagamentos do pedido (order_payments já tem CASCADE, mas por segurança)
        await client.query('DELETE FROM order_payments WHERE order_id = $1', [id]);

        // 6. Deletar transações financeiras relacionadas
        await client.query('DELETE FROM financial_transactions WHERE order_id = $1', [id]);

        // 7. Deletar itens do pedido (order_items já tem CASCADE, mas por segurança)
        await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);

        // 8. Finalmente, deletar o pedido
        const deleteResult = await client.query('DELETE FROM orders WHERE id = $1 RETURNING *', [id]);

        return deleteResult.rows[0];
      } catch (error: any) {
        console.error('Erro ao deletar pedido:', error);
        throw error;
      }
    });
  }

  // Atualizar desconto do pedido
  async updateDiscount(id: number, discount: number): Promise<ApiResponse> {
    try {
      // Buscar pedido atual
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

      const result = await this.customQuery(
        `UPDATE orders 
         SET discount = $1, pending_amount = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4 
         RETURNING *`,
        [discount, newPendingAmount, newPaymentStatus, id]
      );

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
    } catch (error) {
      console.error('Erro ao atualizar desconto:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }
}
