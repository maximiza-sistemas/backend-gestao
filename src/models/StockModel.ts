import { BaseModel } from './BaseModel';
import { Stock, UpdateStockRequest, CreateStockMovementRequest, ApiResponse } from '../types';

export class StockModel extends BaseModel {
  constructor() {
    super('stock');
  }

  // Buscar estoque com detalhes de produto e local
  async findAllWithDetails(options: any = {}): Promise<ApiResponse> {
    try {
      const {
        page = 1,
        limit = 50,
        sort = 'p.name',
        order = 'ASC',
        search,
        location_id,
        product_id,
        low_stock_only = false
      } = options;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      // Filtros
      if (location_id) {
        whereClause += ` AND s.location_id = $${paramIndex}`;
        params.push(location_id);
        paramIndex++;
      }

      if (product_id) {
        whereClause += ` AND s.product_id = $${paramIndex}`;
        params.push(product_id);
        paramIndex++;
      }

      if (search) {
        whereClause += ` AND (p.name ILIKE $${paramIndex} OR l.name ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (low_stock_only) {
        whereClause += ` AND s.min_stock_level > 0 AND (s.full_quantity + s.empty_quantity + s.maintenance_quantity) <= s.min_stock_level`;
      }

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM stock s
        JOIN products p ON s.product_id = p.id
        JOIN locations l ON s.location_id = l.id
        ${whereClause}
      `;
      const countResult = await this.customQuery(countQuery, params);
      const total = parseInt(countResult.data[0].total);

      // Query principal
      const offset = (page - 1) * limit;
      const dataQuery = `
        SELECT 
          s.*,
          p.name as product_name,
          p.description as product_description,
          p.weight_kg,
          p.price_sell,
          l.name as location_name,
          l.city as location_city,
          (s.full_quantity + s.empty_quantity + s.maintenance_quantity) as total_quantity,
          CASE
            WHEN s.min_stock_level > 0 THEN
              ROUND(CAST(((s.full_quantity + s.empty_quantity + s.maintenance_quantity)::float / s.min_stock_level) * 100 AS numeric), 2)
            ELSE NULL
          END as stock_level_percentage
        FROM stock s
        JOIN products p ON s.product_id = p.id
        JOIN locations l ON s.location_id = l.id
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
      console.error('Erro ao buscar estoque com detalhes:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Buscar estoque consolidado (soma de todos os locais)
  async findConsolidated(): Promise<ApiResponse> {
    try {
      const query = `
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description,
          p.weight_kg,
          p.price_sell,
          COALESCE(SUM(s.full_quantity), 0) as total_full,
          COALESCE(SUM(s.empty_quantity), 0) as total_empty,
          COALESCE(SUM(s.maintenance_quantity), 0) as total_maintenance,
          COALESCE(SUM(s.full_quantity + s.empty_quantity + s.maintenance_quantity), 0) as total_quantity,
          COUNT(DISTINCT s.location_id) as locations_count,
          COALESCE(SUM(s.min_stock_level), 0) as total_min_stock_level,
          COALESCE(SUM(s.max_stock_level), 0) as total_max_stock_level
        FROM products p
        LEFT JOIN stock s ON p.id = s.product_id
        WHERE p.status = 'Ativo'
        GROUP BY p.id, p.name, p.description, p.weight_kg, p.price_sell
        ORDER BY p.name
      `;

      return await this.customQuery(query);
    } catch (error) {
      console.error('Erro ao buscar estoque consolidado:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Buscar estoque por produto e local
  async findByProductAndLocation(productId: number, locationId: number): Promise<ApiResponse> {
    try {
      const query = `
        SELECT 
          s.*,
          p.name as product_name,
          l.name as location_name,
          (s.full_quantity + s.empty_quantity + s.maintenance_quantity) as total_quantity
        FROM stock s
        JOIN products p ON s.product_id = p.id
        JOIN locations l ON s.location_id = l.id
        WHERE s.product_id = $1 AND s.location_id = $2
      `;

      return await this.customQuery(query, [productId, locationId]);
    } catch (error) {
      console.error('Erro ao buscar estoque por produto e local:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Atualizar estoque
  async updateStock(productId: number, locationId: number, stockData: UpdateStockRequest, userId?: number): Promise<ApiResponse> {
    return await this.executeTransaction(async (client) => {
      try {
        // Buscar estoque atual
        const currentStockResult = await client.query(
          'SELECT * FROM stock WHERE product_id = $1 AND location_id = $2',
          [productId, locationId]
        );

        if (currentStockResult.rows.length === 0) {
          // Criar novo registro de estoque
          const insertQuery = `
            INSERT INTO stock (product_id, location_id, full_quantity, empty_quantity, maintenance_quantity, min_stock_level, max_stock_level) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *
          `;

          const result = await client.query(insertQuery, [
            productId,
            locationId,
            stockData.full_quantity || 0,
            stockData.empty_quantity || 0,
            stockData.maintenance_quantity || 0,
            stockData.min_stock_level || 0,
            stockData.max_stock_level || 0
          ]);

          return result.rows[0];
        } else {
          // Atualizar estoque existente
          const currentStock = currentStockResult.rows[0];
          const updateFields: string[] = [];
          const updateValues: any[] = [];
          let paramIndex = 1;

          if (stockData.full_quantity !== undefined) {
            updateFields.push(`full_quantity = $${paramIndex}`);
            updateValues.push(stockData.full_quantity);
            paramIndex++;
          }

          if (stockData.empty_quantity !== undefined) {
            updateFields.push(`empty_quantity = $${paramIndex}`);
            updateValues.push(stockData.empty_quantity);
            paramIndex++;
          }

          if (stockData.maintenance_quantity !== undefined) {
            updateFields.push(`maintenance_quantity = $${paramIndex}`);
            updateValues.push(stockData.maintenance_quantity);
            paramIndex++;
          }

          if (stockData.min_stock_level !== undefined) {
            updateFields.push(`min_stock_level = $${paramIndex}`);
            updateValues.push(stockData.min_stock_level);
            paramIndex++;
          }

          if (stockData.max_stock_level !== undefined) {
            updateFields.push(`max_stock_level = $${paramIndex}`);
            updateValues.push(stockData.max_stock_level);
            paramIndex++;
          }

          if (updateFields.length === 0) {
            throw new Error('Nenhum campo válido para atualização');
          }

          updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
          updateValues.push(productId, locationId);

          const updateQuery = `
            UPDATE stock 
            SET ${updateFields.join(', ')} 
            WHERE product_id = $${paramIndex} AND location_id = $${paramIndex + 1} 
            RETURNING *
          `;

          const result = await client.query(updateQuery, updateValues);

          // Log da atividade se houve mudanças significativas
          if (userId) {
            const changes: string[] = [];
            if (stockData.full_quantity !== undefined && stockData.full_quantity !== currentStock.full_quantity) {
              changes.push(`Cheios: ${currentStock.full_quantity} → ${stockData.full_quantity}`);
            }
            if (stockData.empty_quantity !== undefined && stockData.empty_quantity !== currentStock.empty_quantity) {
              changes.push(`Vazios: ${currentStock.empty_quantity} → ${stockData.empty_quantity}`);
            }
            if (stockData.maintenance_quantity !== undefined && stockData.maintenance_quantity !== currentStock.maintenance_quantity) {
              changes.push(`Manutenção: ${currentStock.maintenance_quantity} → ${stockData.maintenance_quantity}`);
            }

            if (changes.length > 0) {
              await client.query(
                'INSERT INTO activity_logs (user_id, action, table_name, record_id) VALUES ($1, $2, $3, $4)',
                [userId, `Atualizou estoque: ${changes.join(', ')}`, 'stock', result.rows[0].id]
              );
            }
          }

          return result.rows[0];
        }
      } catch (error) {
        console.error('Erro ao atualizar estoque:', error);
        throw error;
      }
    });
  }

  // Criar movimentação de estoque
  async createMovement(movementData: CreateStockMovementRequest): Promise<ApiResponse> {
    return await this.executeTransaction(async (client) => {
      try {
        // Criar a movimentação (o trigger irá atualizar o estoque automaticamente)
        const movementQuery = `
          INSERT INTO stock_movements (product_id, location_id, order_id, movement_type, bottle_type, quantity, reason, user_id) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
          RETURNING *
        `;

        const result = await client.query(movementQuery, [
          movementData.product_id,
          movementData.location_id,
          movementData.order_id,
          movementData.movement_type,
          movementData.bottle_type,
          movementData.quantity,
          movementData.reason,
          movementData.user_id
        ]);

        return result.rows[0];
      } catch (error) {
        console.error('Erro ao criar movimentação de estoque:', error);
        throw error;
      }
    });
  }

  // Buscar movimentações de estoque
  async getMovements(options: any = {}): Promise<ApiResponse> {
    try {
      const {
        page = 1,
        limit = 50,
        sort = 'created_at',
        order = 'DESC',
        product_id,
        location_id,
        movement_type,
        date_from,
        date_to
      } = options;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (product_id) {
        whereClause += ` AND sm.product_id = $${paramIndex}`;
        params.push(product_id);
        paramIndex++;
      }

      if (location_id) {
        whereClause += ` AND sm.location_id = $${paramIndex}`;
        params.push(location_id);
        paramIndex++;
      }

      if (movement_type) {
        whereClause += ` AND sm.movement_type = $${paramIndex}`;
        params.push(movement_type);
        paramIndex++;
      }

      if (date_from) {
        whereClause += ` AND sm.created_at >= $${paramIndex}`;
        params.push(date_from);
        paramIndex++;
      }

      if (date_to) {
        whereClause += ` AND sm.created_at <= $${paramIndex}`;
        params.push(date_to);
        paramIndex++;
      }

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM stock_movements sm
        ${whereClause}
      `;
      const countResult = await this.customQuery(countQuery, params);
      const total = parseInt(countResult.data[0].total);

      // Query principal
      const offset = (page - 1) * limit;
      const dataQuery = `
        SELECT 
          sm.*,
          p.name as product_name,
          l.name as location_name,
          u.name as user_name,
          o.id as order_number
        FROM stock_movements sm
        JOIN products p ON sm.product_id = p.id
        JOIN locations l ON sm.location_id = l.id
        LEFT JOIN users u ON sm.user_id = u.id
        LEFT JOIN orders o ON sm.order_id = o.id
        ${whereClause}
        ORDER BY sm.${sort} ${order}
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
      console.error('Erro ao buscar movimentações de estoque:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Relatório de estoque baixo
  async getLowStockReport(): Promise<ApiResponse> {
    try {
      const query = `
        SELECT 
          s.*,
          p.name as product_name,
          l.name as location_name,
          (s.full_quantity + s.empty_quantity + s.maintenance_quantity) as total_quantity,
          CASE
            WHEN s.min_stock_level > 0 THEN
              ROUND(CAST(((s.full_quantity + s.empty_quantity + s.maintenance_quantity)::float / s.min_stock_level) * 100 AS numeric), 2)
            ELSE NULL
          END as stock_level_percentage,
          (s.min_stock_level - (s.full_quantity + s.empty_quantity + s.maintenance_quantity)) as quantity_needed
        FROM stock s
        JOIN products p ON s.product_id = p.id
        JOIN locations l ON s.location_id = l.id
        WHERE s.min_stock_level > 0
          AND (s.full_quantity + s.empty_quantity + s.maintenance_quantity) <= s.min_stock_level
        ORDER BY stock_level_percentage ASC, quantity_needed DESC
      `;

      return await this.customQuery(query);
    } catch (error) {
      console.error('Erro ao gerar relatório de estoque baixo:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Estatísticas gerais do estoque
  async getStats(): Promise<ApiResponse> {
    try {
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT s.product_id) as total_products_in_stock,
          COUNT(DISTINCT s.location_id) as total_locations_with_stock,
          COALESCE(SUM(s.full_quantity), 0) as total_full_bottles,
          COALESCE(SUM(s.empty_quantity), 0) as total_empty_bottles,
          COALESCE(SUM(s.maintenance_quantity), 0) as total_maintenance_bottles,
          COALESCE(SUM(s.full_quantity + s.empty_quantity + s.maintenance_quantity), 0) as total_bottles,
          COUNT(CASE WHEN s.min_stock_level > 0 AND (s.full_quantity + s.empty_quantity + s.maintenance_quantity) <= s.min_stock_level THEN 1 END) as low_stock_items,
          COALESCE(AVG(s.full_quantity + s.empty_quantity + s.maintenance_quantity), 0) as avg_stock_per_item
        FROM stock s
        JOIN products p ON s.product_id = p.id
        WHERE p.status = 'Ativo'
      `;

      return await this.customQuery(statsQuery);
    } catch (error) {
      console.error('Erro ao buscar estatísticas do estoque:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Excluir registro de estoque
  async deleteStock(productId: number, locationId: number): Promise<ApiResponse> {
    try {
      const result = await this.customQuery(
        `DELETE FROM stock WHERE product_id = $1 AND location_id = $2 RETURNING *`,
        [productId, locationId]
      );

      if (!result.data || result.data.length === 0) {
        return {
          success: false,
          error: 'Registro de estoque não encontrado'
        };
      }

      return {
        success: true,
        data: result.data[0],
        message: 'Estoque excluído com sucesso'
      };
    } catch (error) {
      console.error('Erro ao excluir estoque:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }
}
