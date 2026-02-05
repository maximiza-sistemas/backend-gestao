import { query } from '../config/database';

export interface DashboardStats {
  totalClients: number;
  totalOrders: number;
  monthlyRevenue: number;
  totalStock: number;
}

export interface MonthlySalesData {
  month: string;
  [key: string]: string | number;
}

export interface StockDistribution {
  name: string;
  value: number;
}

export class DashboardModel {
  /**
   * Busca estatísticas gerais para os KPIs do dashboard
   */
  async getStats(startDate?: string, endDate?: string): Promise<DashboardStats> {
    // Total de clientes ativos
    const clientsResult = await query(
      `SELECT COUNT(*) as total FROM clients WHERE status = 'Ativo'`
    );
    const totalClients = parseInt(clientsResult.rows[0]?.total || '0');

    // Construir filtro de data
    let dateFilter = '';
    const dateParams: any[] = [];

    if (startDate && endDate) {
      dateFilter = `AND order_date::date BETWEEN $1 AND $2`;
      dateParams.push(startDate, endDate);
    }

    // Total de pedidos (Filtrado ou Geral)
    const ordersResult = await query(
      `SELECT COUNT(*) as total FROM orders
       WHERE 1=1 ${dateFilter}`,
      dateParams
    );
    const totalOrders = parseInt(ordersResult.rows[0]?.total || '0');

    // Faturamento (Filtrado ou Geral)
    const revenueResult = await query(
      `SELECT COALESCE(SUM(total_value), 0) as revenue FROM orders
       WHERE status != 'Cancelado' ${dateFilter}`,
      dateParams
    );
    const monthlyRevenue = parseFloat(revenueResult.rows[0]?.revenue || '0');

    // Total de estoque (botijões cheios)
    const stockResult = await query(
      `SELECT COALESCE(SUM(full_quantity), 0) as total FROM stock`
    );
    const totalStock = parseInt(stockResult.rows[0]?.total || '0');

    return {
      totalClients,
      totalOrders,
      monthlyRevenue,
      totalStock,
    };
  }

  /**
   * Busca vendas mensais dos últimos 6 meses, separadas por localização
   */
  async getMonthlySales(): Promise<MonthlySalesData[]> {
    const result = await query(`
      SELECT
        TO_CHAR(o.order_date, 'Mon') as month,
        TO_CHAR(o.order_date, 'YYYY-MM') as year_month,
        COALESCE(l.name, 'Matriz') as location_name,
        COALESCE(SUM(o.total_value), 0) as total
      FROM orders o
      LEFT JOIN locations l ON l.id = o.location_id
      WHERE o.order_date >= CURRENT_DATE - INTERVAL '6 months'
        AND o.status != 'Cancelado'
      GROUP BY year_month, month, location_name
      ORDER BY year_month ASC
    `);

    // Agrupar por mês
    const salesByMonth = new Map<string, MonthlySalesData>();

    result.rows.forEach((row: any) => {
      const month = row.month;
      const locationName = row.location_name; // Use o nome real da localização
      const total = parseFloat(row.total || '0');

      if (!salesByMonth.has(month)) {
        salesByMonth.set(month, { month });
      }

      const entry = salesByMonth.get(month)!;
      entry[locationName] = total; // Atribuição dinâmica
    });

    return Array.from(salesByMonth.values());
  }

  /**
 * Busca distribuição de estoque por tipo de produto
 * Mostra apenas produtos que têm registro no estoque e quantidade > 0
 */
  async getStockDistribution(): Promise<StockDistribution[]> {
    const result = await query(`
    SELECT
      UPPER(p.name) as name,
      COALESCE(SUM(s.full_quantity), 0) as value
    FROM stock s
    INNER JOIN products p ON s.product_id = p.id
    WHERE s.full_quantity > 0
    GROUP BY UPPER(p.name)
    ORDER BY value DESC
  `);

    return result.rows.map((row: any) => ({
      name: row.name,
      value: parseInt(row.value || '0'),
    }));
  }
}
