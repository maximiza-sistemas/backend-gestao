"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductModel = void 0;
const BaseModel_1 = require("./BaseModel");
class ProductModel extends BaseModel_1.BaseModel {
    constructor() {
        super('products');
    }
    async findActive() {
        const query = `
      SELECT 
        p.*,
        COALESCE(
          (SELECT pp.unit_price 
           FROM product_purchases pp 
           WHERE pp.product_id = p.id 
           ORDER BY pp.purchase_date DESC, pp.created_at DESC 
           LIMIT 1),
          p.price_buy
        ) as price_buy
      FROM products p
      WHERE p.status = $1 
      ORDER BY p.name
    `;
        return await this.customQuery(query, ['Ativo']);
    }
    async findWithStock() {
        try {
            const query = `
        SELECT 
          p.*,
          COALESCE(SUM(s.full_quantity), 0) as total_full,
          COALESCE(SUM(s.empty_quantity), 0) as total_empty,
          COALESCE(SUM(s.maintenance_quantity), 0) as total_maintenance,
          COALESCE(SUM(s.full_quantity + s.empty_quantity + s.maintenance_quantity), 0) as total_quantity,
          COUNT(DISTINCT s.location_id) as locations_count
        FROM products p
        LEFT JOIN stock s ON p.id = s.product_id
        WHERE p.status = 'Ativo'
        GROUP BY p.id, p.name, p.description, p.weight_kg, p.price_sell, p.price_buy, p.status, p.created_at, p.updated_at
        ORDER BY p.name
      `;
            return await this.customQuery(query);
        }
        catch (error) {
            console.error('Erro ao buscar produtos com estoque:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async findByPriceRange(minPrice, maxPrice) {
        return await this.customQuery('SELECT * FROM products WHERE price_sell BETWEEN $1 AND $2 AND status = $3 ORDER BY price_sell', [minPrice, maxPrice, 'Ativo']);
    }
    async getMostSold(limit = 10) {
        try {
            const query = `
        SELECT 
          p.*,
          COALESCE(SUM(oi.quantity), 0) as total_sold,
          COALESCE(SUM(oi.total_price), 0) as total_revenue,
          COUNT(DISTINCT oi.order_id) as orders_count
        FROM products p
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'Entregue'
        WHERE p.status = 'Ativo'
        GROUP BY p.id
        ORDER BY total_sold DESC
        LIMIT $1
      `;
            return await this.customQuery(query, [limit]);
        }
        catch (error) {
            console.error('Erro ao buscar produtos mais vendidos:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async getLowStock() {
        try {
            const query = `
        SELECT 
          p.*,
          s.location_id,
          l.name as location_name,
          s.full_quantity,
          s.empty_quantity,
          s.maintenance_quantity,
          s.min_stock_level,
          s.max_stock_level,
          (s.full_quantity + s.empty_quantity + s.maintenance_quantity) as total_quantity
        FROM products p
        JOIN stock s ON p.id = s.product_id
        JOIN locations l ON s.location_id = l.id
        WHERE p.status = 'Ativo' 
          AND s.min_stock_level > 0
          AND (s.full_quantity + s.empty_quantity + s.maintenance_quantity) <= s.min_stock_level
        ORDER BY 
          ((s.full_quantity + s.empty_quantity + s.maintenance_quantity)::float / s.min_stock_level) ASC,
          p.name, l.name
      `;
            return await this.customQuery(query);
        }
        catch (error) {
            console.error('Erro ao buscar produtos com baixo estoque:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async getStats() {
        try {
            const statsQuery = `
        SELECT 
          COUNT(*) as total_products,
          COUNT(CASE WHEN status = 'Ativo' THEN 1 END) as active_products,
          COUNT(CASE WHEN status = 'Inativo' THEN 1 END) as inactive_products,
          AVG(price_sell) as avg_sell_price,
          MIN(price_sell) as min_sell_price,
          MAX(price_sell) as max_sell_price,
          AVG(CASE WHEN price_buy IS NOT NULL THEN price_buy END) as avg_buy_price,
          AVG(CASE WHEN price_buy IS NOT NULL AND price_sell IS NOT NULL THEN (price_sell - price_buy) / price_buy * 100 END) as avg_margin_percentage
        FROM products
      `;
            return await this.customQuery(statsQuery);
        }
        catch (error) {
            console.error('Erro ao buscar estatísticas de produtos:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async getProfitabilityReport() {
        try {
            const query = `
        SELECT 
          p.*,
          COALESCE(SUM(oi.quantity), 0) as total_sold,
          COALESCE(SUM(oi.total_price), 0) as total_revenue,
          CASE 
            WHEN p.price_buy IS NOT NULL AND p.price_buy > 0 THEN
              COALESCE(SUM(oi.quantity * p.price_buy), 0)
            ELSE 0
          END as total_cost,
          CASE 
            WHEN p.price_buy IS NOT NULL AND p.price_buy > 0 THEN
              COALESCE(SUM(oi.total_price), 0) - COALESCE(SUM(oi.quantity * p.price_buy), 0)
            ELSE COALESCE(SUM(oi.total_price), 0)
          END as total_profit,
          CASE 
            WHEN p.price_buy IS NOT NULL AND p.price_buy > 0 AND SUM(oi.total_price) > 0 THEN
              ((COALESCE(SUM(oi.total_price), 0) - COALESCE(SUM(oi.quantity * p.price_buy), 0)) / COALESCE(SUM(oi.total_price), 1)) * 100
            ELSE NULL
          END as profit_margin_percentage
        FROM products p
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'Entregue'
        WHERE p.status = 'Ativo'
        GROUP BY p.id
        ORDER BY total_profit DESC
      `;
            return await this.customQuery(query);
        }
        catch (error) {
            console.error('Erro ao buscar relatório de rentabilidade:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async getPriceHistory(productId) {
        try {
            const query = `
        SELECT 
          id,
          name,
          price_sell as current_price,
          price_buy as current_cost,
          updated_at as price_date
        FROM products 
        WHERE id = $1
      `;
            return await this.customQuery(query, [productId]);
        }
        catch (error) {
            console.error('Erro ao buscar histórico de preços:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
}
exports.ProductModel = ProductModel;
//# sourceMappingURL=ProductModel.js.map