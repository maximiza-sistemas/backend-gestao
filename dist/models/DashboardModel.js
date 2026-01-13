"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardModel = void 0;
const database_1 = require("../config/database");
class DashboardModel {
    async getStats(startDate, endDate) {
        const clientsResult = await (0, database_1.query)(`SELECT COUNT(*) as total FROM clients WHERE status = 'Ativo'`);
        const totalClients = parseInt(clientsResult.rows[0]?.total || '0');
        let dateFilter = '';
        const dateParams = [];
        if (startDate && endDate) {
            dateFilter = `AND order_date::date BETWEEN $1 AND $2`;
            dateParams.push(startDate, endDate);
        }
        const ordersResult = await (0, database_1.query)(`SELECT COUNT(*) as total FROM orders
       WHERE 1=1 ${dateFilter}`, dateParams);
        const totalOrders = parseInt(ordersResult.rows[0]?.total || '0');
        const revenueResult = await (0, database_1.query)(`SELECT COALESCE(SUM(total_value), 0) as revenue FROM orders
       WHERE status != 'Cancelado' ${dateFilter}`, dateParams);
        const monthlyRevenue = parseFloat(revenueResult.rows[0]?.revenue || '0');
        const stockResult = await (0, database_1.query)(`SELECT COALESCE(SUM(full_quantity), 0) as total FROM stock`);
        const totalStock = parseInt(stockResult.rows[0]?.total || '0');
        return {
            totalClients,
            totalOrders,
            monthlyRevenue,
            totalStock,
        };
    }
    async getMonthlySales() {
        const result = await (0, database_1.query)(`
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
        const salesByMonth = new Map();
        result.rows.forEach((row) => {
            const month = row.month;
            const locationName = row.location_name;
            const total = parseFloat(row.total || '0');
            if (!salesByMonth.has(month)) {
                salesByMonth.set(month, { month });
            }
            const entry = salesByMonth.get(month);
            entry[locationName] = total;
        });
        return Array.from(salesByMonth.values());
    }
    async getStockDistribution() {
        const result = await (0, database_1.query)(`
      SELECT
        p.name,
        COALESCE(SUM(s.full_quantity), 0) as value
      FROM products p
      LEFT JOIN stock s ON s.product_id = p.id
      GROUP BY p.name
      ORDER BY value DESC
    `);
        return result.rows.map((row) => ({
            name: row.name,
            value: parseInt(row.value || '0'),
        }));
    }
}
exports.DashboardModel = DashboardModel;
//# sourceMappingURL=DashboardModel.js.map