"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const RouteModel_1 = require("../models/RouteModel");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const rateLimit_1 = require("../middleware/rateLimit");
const logger_1 = require("../middleware/logger");
const router = (0, express_1.Router)();
const routeModel = new RouteModel_1.RouteModel();
router.get('/', auth_1.requireAuth, validation_1.validatePagination, async (req, res) => {
    try {
        const result = await routeModel.findAllWithDetails(req.query);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao listar rotas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/stats', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await routeModel.getStats();
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar estatísticas de rotas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({
                success: false,
                error: 'ID inválido'
            });
            return;
        }
        const result = await routeModel.findByIdWithStops(id);
        if (result.success && result.data) {
            res.json(result);
        }
        else {
            res.status(404).json({
                success: false,
                error: 'Rota não encontrada'
            });
        }
    }
    catch (error) {
        console.error('Erro ao buscar rota:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.post('/', auth_1.requireAuth, rateLimit_1.createLimiter, (0, logger_1.activityLogger)('create', 'delivery_route'), async (req, res) => {
    try {
        const { route, stops } = req.body;
        if (!route || !route.route_name) {
            res.status(400).json({
                success: false,
                error: 'Nome da rota é obrigatório'
            });
            return;
        }
        if (!route.route_code) {
            route.route_code = `RT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
        }
        const result = await routeModel.createWithStops(route, stops || [], req.user.id);
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Erro ao criar rota:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.put('/:id', auth_1.requireAuth, rateLimit_1.updateLimiter, (0, logger_1.activityLogger)('update', 'delivery_route'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({
                success: false,
                error: 'ID inválido'
            });
            return;
        }
        const updateData = {};
        const allowedFields = [
            'route_name', 'route_date', 'vehicle_plate', 'driver_name',
            'status', 'notes', 'total_distance_km', 'total_duration_minutes'
        ];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });
        const result = await routeModel.update(id, updateData);
        if (result.success) {
            res.json(result);
        }
        else {
            res.status(404).json(result);
        }
    }
    catch (error) {
        console.error('Erro ao atualizar rota:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.put('/:id/status', auth_1.requireAuth, rateLimit_1.updateLimiter, (0, logger_1.activityLogger)('update_status', 'delivery_route'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status } = req.body;
        if (isNaN(id)) {
            res.status(400).json({
                success: false,
                error: 'ID inválido'
            });
            return;
        }
        if (!status) {
            res.status(400).json({
                success: false,
                error: 'Status é obrigatório'
            });
            return;
        }
        const validStatuses = ['Planejada', 'Em Andamento', 'Concluída', 'Cancelada'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({
                success: false,
                error: 'Status inválido'
            });
            return;
        }
        const result = await routeModel.updateStatus(id, status, req.user.id);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao atualizar status da rota:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.put('/stops/:stopId', auth_1.requireAuth, rateLimit_1.updateLimiter, (0, logger_1.activityLogger)('update', 'delivery_route_stop'), async (req, res) => {
    try {
        const stopId = parseInt(req.params.stopId);
        if (isNaN(stopId)) {
            res.status(400).json({
                success: false,
                error: 'ID da parada inválido'
            });
            return;
        }
        const result = await routeModel.updateStop(stopId, req.body);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao atualizar parada:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.delete('/:id', auth_1.requireAuth, (0, logger_1.activityLogger)('delete', 'delivery_route'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({
                success: false,
                error: 'ID inválido'
            });
            return;
        }
        const result = await routeModel.delete(id);
        if (result.success) {
            res.json({
                success: true,
                message: 'Rota excluída com sucesso'
            });
        }
        else {
            res.status(404).json(result);
        }
    }
    catch (error) {
        console.error('Erro ao excluir rota:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
exports.default = router;
//# sourceMappingURL=deliveryRoutes.js.map