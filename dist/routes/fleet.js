"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const FleetModel_1 = require("../models/FleetModel");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.get('/vehicles', async (req, res) => {
    try {
        const { status, type } = req.query;
        const vehicles = await FleetModel_1.FleetModel.findAllVehicles({
            status: status,
            type: type
        });
        return res.json({ success: true, data: vehicles });
    }
    catch (error) {
        console.error('Erro ao buscar veículos:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar veículos'
        });
    }
});
router.get('/vehicles/:id', async (req, res) => {
    try {
        const vehicle = await FleetModel_1.FleetModel.findVehicleById(parseInt(req.params.id));
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                error: 'Veículo não encontrado'
            });
        }
        return res.json({ success: true, data: vehicle });
    }
    catch (error) {
        console.error('Erro ao buscar veículo:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar veículo'
        });
    }
});
router.post('/vehicles', async (req, res) => {
    try {
        const vehicle = await FleetModel_1.FleetModel.createVehicle(req.body);
        return res.status(201).json({ success: true, data: vehicle });
    }
    catch (error) {
        console.error('Erro ao criar veículo:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao criar veículo'
        });
    }
});
router.put('/vehicles/:id', async (req, res) => {
    try {
        const vehicle = await FleetModel_1.FleetModel.updateVehicle(parseInt(req.params.id), req.body);
        return res.json({ success: true, data: vehicle });
    }
    catch (error) {
        console.error('Erro ao atualizar veículo:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao atualizar veículo'
        });
    }
});
router.delete('/vehicles/:id', async (req, res) => {
    try {
        await FleetModel_1.FleetModel.deleteVehicle(parseInt(req.params.id));
        return res.json({ success: true, message: 'Veículo deletado com sucesso' });
    }
    catch (error) {
        console.error('Erro ao deletar veículo:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao deletar veículo'
        });
    }
});
router.get('/drivers', async (req, res) => {
    try {
        const { status } = req.query;
        const drivers = await FleetModel_1.FleetModel.findAllDrivers(status);
        return res.json({ success: true, data: drivers });
    }
    catch (error) {
        console.error('Erro ao buscar motoristas:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar motoristas'
        });
    }
});
router.get('/drivers/:id', async (req, res) => {
    try {
        const driver = await FleetModel_1.FleetModel.findDriverById(parseInt(req.params.id));
        if (!driver) {
            return res.status(404).json({
                success: false,
                error: 'Motorista não encontrado'
            });
        }
        return res.json({ success: true, data: driver });
    }
    catch (error) {
        console.error('Erro ao buscar motorista:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar motorista'
        });
    }
});
router.post('/drivers', async (req, res) => {
    try {
        const driver = await FleetModel_1.FleetModel.createDriver(req.body);
        return res.status(201).json({ success: true, data: driver });
    }
    catch (error) {
        console.error('Erro ao criar motorista:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao criar motorista'
        });
    }
});
router.put('/drivers/:id', async (req, res) => {
    try {
        const driver = await FleetModel_1.FleetModel.updateDriver(parseInt(req.params.id), req.body);
        return res.json({ success: true, data: driver });
    }
    catch (error) {
        console.error('Erro ao atualizar motorista:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao atualizar motorista'
        });
    }
});
router.get('/maintenance', async (req, res) => {
    try {
        const { status, start_date, end_date } = req.query;
        const maintenance = await FleetModel_1.FleetModel.findAllMaintenance({
            status: status,
            start_date: start_date ? new Date(start_date) : undefined,
            end_date: end_date ? new Date(end_date) : undefined
        });
        return res.json({ success: true, data: maintenance });
    }
    catch (error) {
        console.error('Erro ao buscar manutenções:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar manutenções'
        });
    }
});
router.get('/vehicles/:vehicleId/maintenance', async (req, res) => {
    try {
        const maintenance = await FleetModel_1.FleetModel.findMaintenanceByVehicle(parseInt(req.params.vehicleId));
        return res.json({ success: true, data: maintenance });
    }
    catch (error) {
        console.error('Erro ao buscar manutenções:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar manutenções'
        });
    }
});
router.post('/maintenance', async (req, res) => {
    try {
        const maintenance = await FleetModel_1.FleetModel.createMaintenance(req.body);
        return res.status(201).json({ success: true, data: maintenance });
    }
    catch (error) {
        console.error('Erro ao criar manutenção:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao criar manutenção'
        });
    }
});
router.patch('/maintenance/:id/status', async (req, res) => {
    try {
        const { status, end_date } = req.body;
        await FleetModel_1.FleetModel.updateMaintenanceStatus(parseInt(req.params.id), status, end_date ? new Date(end_date) : undefined);
        return res.json({ success: true, message: 'Status atualizado com sucesso' });
    }
    catch (error) {
        console.error('Erro ao atualizar status:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao atualizar status'
        });
    }
});
router.get('/vehicles/:vehicleId/fueling', async (req, res) => {
    try {
        const fueling = await FleetModel_1.FleetModel.findFuelingByVehicle(parseInt(req.params.vehicleId));
        return res.json({ success: true, data: fueling });
    }
    catch (error) {
        console.error('Erro ao buscar abastecimentos:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar abastecimentos'
        });
    }
});
router.post('/fueling', async (req, res) => {
    try {
        const fueling = await FleetModel_1.FleetModel.createFueling(req.body);
        return res.status(201).json({ success: true, data: fueling });
    }
    catch (error) {
        console.error('Erro ao criar abastecimento:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao criar abastecimento'
        });
    }
});
router.get('/vehicles/:vehicleId/trips', async (req, res) => {
    try {
        const trips = await FleetModel_1.FleetModel.findTripsByVehicle(parseInt(req.params.vehicleId));
        return res.json({ success: true, data: trips });
    }
    catch (error) {
        console.error('Erro ao buscar viagens:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar viagens'
        });
    }
});
router.post('/trips', async (req, res) => {
    try {
        const trip = await FleetModel_1.FleetModel.createTrip(req.body);
        return res.status(201).json({ success: true, data: trip });
    }
    catch (error) {
        console.error('Erro ao criar viagem:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao criar viagem'
        });
    }
});
router.put('/trips/:id', async (req, res) => {
    try {
        const trip = await FleetModel_1.FleetModel.updateTrip(parseInt(req.params.id), req.body);
        return res.json({ success: true, data: trip });
    }
    catch (error) {
        console.error('Erro ao atualizar viagem:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao atualizar viagem'
        });
    }
});
router.get('/vehicles/:vehicleId/expenses', async (req, res) => {
    try {
        const expenses = await FleetModel_1.FleetModel.findExpensesByVehicle(parseInt(req.params.vehicleId));
        return res.json({ success: true, data: expenses });
    }
    catch (error) {
        console.error('Erro ao buscar despesas:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar despesas'
        });
    }
});
router.post('/expenses', async (req, res) => {
    try {
        const expense = await FleetModel_1.FleetModel.createExpense(req.body);
        return res.status(201).json({ success: true, data: expense });
    }
    catch (error) {
        console.error('Erro ao criar despesa:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao criar despesa'
        });
    }
});
router.get('/summary', async (req, res) => {
    try {
        const summary = await FleetModel_1.FleetModel.getFleetSummary();
        return res.json({ success: true, data: summary });
    }
    catch (error) {
        console.error('Erro ao buscar resumo:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar resumo da frota'
        });
    }
});
exports.default = router;
//# sourceMappingURL=fleet.js.map