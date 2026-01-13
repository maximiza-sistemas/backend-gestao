"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DashboardModel_1 = require("../models/DashboardModel");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const dashboardModel = new DashboardModel_1.DashboardModel();
router.use(auth_1.authenticateToken);
router.get('/stats', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const stats = await dashboardModel.getStats(startDate, endDate);
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        console.error('Erro ao buscar estatísticas do dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar estatísticas do dashboard',
            message: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.get('/monthly-sales', async (req, res) => {
    try {
        const monthlySales = await dashboardModel.getMonthlySales();
        res.json({
            success: true,
            data: monthlySales,
        });
    }
    catch (error) {
        console.error('Erro ao buscar vendas mensais:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar vendas mensais',
            message: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.get('/stock-distribution', async (req, res) => {
    try {
        const stockDistribution = await dashboardModel.getStockDistribution();
        res.json({
            success: true,
            data: stockDistribution,
        });
    }
    catch (error) {
        console.error('Erro ao buscar distribuição de estoque:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar distribuição de estoque',
            message: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map