"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ClientModel_1 = require("../models/ClientModel");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const rateLimit_1 = require("../middleware/rateLimit");
const logger_1 = require("../middleware/logger");
const router = (0, express_1.Router)();
const clientModel = new ClientModel_1.ClientModel();
router.get('/', auth_1.requireAuth, validation_1.validatePagination, async (req, res) => {
    try {
        const result = await clientModel.findAllWithLastPurchase(req.query);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao listar clientes:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/active', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await clientModel.findActive();
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao listar clientes ativos:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/type/:type', auth_1.requireAuth, async (req, res) => {
    try {
        const { type } = req.params;
        if (!['Residencial', 'Comercial', 'Industrial'].includes(type)) {
            res.status(400).json({
                success: false,
                error: 'Tipo inválido'
            });
            return;
        }
        const result = await clientModel.findByType(type);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao listar clientes por tipo:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/stats', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await clientModel.getStats();
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar estatísticas de clientes:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/top-clients', auth_1.requireAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const result = await clientModel.getTopClientsBySpent(limit);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar top clientes:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/inactive', auth_1.requireAuth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 90;
        const result = await clientModel.getInactiveClients(days);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar clientes inativos:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/credit-limit', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await clientModel.findWithCreditLimit();
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar clientes com limite de crédito:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/:id/history', auth_1.requireAuth, validation_1.validateId, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await clientModel.getPurchaseHistory(id);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar histórico de compras:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/:id', auth_1.requireAuth, validation_1.validateId, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await clientModel.findById(id);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar cliente:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/cpf-cnpj/:cpfCnpj', auth_1.requireAuth, async (req, res) => {
    try {
        const { cpfCnpj } = req.params;
        const result = await clientModel.findByCpfCnpj(cpfCnpj);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar cliente por CPF/CNPJ:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.post('/', auth_1.requireAuth, rateLimit_1.createLimiter, (0, validation_1.validate)(validation_1.clientSchemas.create), (0, logger_1.activityLogger)('Criou cliente', 'clients'), async (req, res) => {
    try {
        const result = await clientModel.create(req.body);
        res.status(result.success ? 201 : 400).json(result);
    }
    catch (error) {
        console.error('Erro ao criar cliente:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.put('/:id', auth_1.requireAuth, validation_1.validateId, rateLimit_1.updateLimiter, (0, validation_1.validate)(validation_1.clientSchemas.update), (0, logger_1.activityLogger)('Atualizou cliente', 'clients'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await clientModel.update(id, req.body);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.delete('/:id', auth_1.requireAuth, validation_1.validateId, (0, logger_1.activityLogger)('Deletou cliente', 'clients'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await clientModel.delete(id);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao deletar cliente:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.patch('/:id/status', auth_1.requireAuth, validation_1.validateId, (0, logger_1.activityLogger)('Alterou status do cliente', 'clients'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status } = req.body;
        if (!['Ativo', 'Inativo'].includes(status)) {
            res.status(400).json({
                success: false,
                error: 'Status deve ser "Ativo" ou "Inativo"'
            });
            return;
        }
        const result = await clientModel.update(id, { status });
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao alterar status do cliente:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.patch('/:id/credit-limit', auth_1.requireAuth, validation_1.validateId, (0, logger_1.activityLogger)('Alterou limite de crédito do cliente', 'clients'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { credit_limit } = req.body;
        if (typeof credit_limit !== 'number' || credit_limit < 0) {
            res.status(400).json({
                success: false,
                error: 'Limite de crédito deve ser um número maior ou igual a zero'
            });
            return;
        }
        const result = await clientModel.update(id, { credit_limit });
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao alterar limite de crédito:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
exports.default = router;
//# sourceMappingURL=clients.js.map