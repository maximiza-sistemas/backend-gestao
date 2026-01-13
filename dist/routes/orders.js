"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const OrderModel_1 = require("../models/OrderModel");
const OrderPaymentModel_1 = require("../models/OrderPaymentModel");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const rateLimit_1 = require("../middleware/rateLimit");
const logger_1 = require("../middleware/logger");
const router = (0, express_1.Router)();
const orderModel = new OrderModel_1.OrderModel();
const orderPaymentModel = new OrderPaymentModel_1.OrderPaymentModel();
router.get('/', auth_1.requireAuth, validation_1.validatePagination, async (req, res) => {
    try {
        const result = await orderModel.findAllWithDetails(req.query);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao listar pedidos:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/stats', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await orderModel.getStats();
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar estatísticas de pedidos:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/sales-by-period', auth_1.requireAuth, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        if (!start_date || !end_date) {
            res.status(400).json({
                success: false,
                error: 'Datas de início e fim são obrigatórias'
            });
            return;
        }
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            res.status(400).json({
                success: false,
                error: 'Formato de data inválido'
            });
            return;
        }
        const result = await orderModel.getSalesByPeriod(startDate, endDate);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar vendas por período:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/sales-by-location', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await orderModel.getSalesByLocation();
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar vendas por local:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/client/:clientId', auth_1.requireAuth, validation_1.validatePagination, async (req, res) => {
    try {
        const clientId = parseInt(req.params.clientId);
        if (isNaN(clientId)) {
            res.status(400).json({
                success: false,
                error: 'ID do cliente inválido'
            });
            return;
        }
        const options = {
            ...req.query,
            client_id: clientId
        };
        const result = await orderModel.findAllWithDetails(options);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar pedidos do cliente:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/:id', auth_1.requireAuth, validation_1.validateId, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await orderModel.findByIdWithItems(id);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar pedido:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.post('/', auth_1.requireAuth, rateLimit_1.createLimiter, (0, validation_1.validate)(validation_1.orderSchemas.create), (0, logger_1.activityLogger)('Criou pedido', 'orders'), async (req, res) => {
    try {
        const orderData = {
            ...req.body,
            user_id: req.user.id
        };
        const result = await orderModel.createWithItems(orderData);
        res.status(result.success ? 201 : 400).json(result);
    }
    catch (error) {
        console.error('Erro ao criar pedido:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.put('/:id', auth_1.requireAuth, validation_1.validateId, rateLimit_1.updateLimiter, (0, logger_1.activityLogger)('Atualizou pedido', 'orders'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const allowedFields = [
            'delivery_date',
            'delivery_address',
            'payment_method',
            'notes'
        ];
        const updateData = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }
        if (Object.keys(updateData).length === 0) {
            res.status(400).json({
                success: false,
                error: 'Nenhum campo válido para atualização fornecido'
            });
            return;
        }
        const result = await orderModel.update(id, updateData);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao atualizar pedido:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.patch('/:id/status', auth_1.requireAuth, validation_1.validateId, (0, validation_1.validate)(validation_1.orderSchemas.updateStatus), (0, logger_1.activityLogger)('Alterou status do pedido', 'orders'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status } = req.body;
        const result = await orderModel.updateStatus(id, status, req.user.id);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao atualizar status do pedido:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.patch('/:id/payment-status', auth_1.requireAuth, validation_1.validateId, (0, logger_1.activityLogger)('Alterou status de pagamento do pedido', 'orders'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { payment_status } = req.body;
        if (!['Pendente', 'Pago', 'Parcial', 'Vencido'].includes(payment_status)) {
            res.status(400).json({
                success: false,
                error: 'Status de pagamento inválido'
            });
            return;
        }
        const result = await orderModel.updatePaymentStatus(id, payment_status, req.user.id);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao atualizar status de pagamento:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.delete('/:id', auth_1.requireAuth, validation_1.validateId, (0, logger_1.activityLogger)('Deletou pedido', 'orders'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const orderResult = await orderModel.findById(id);
        if (!orderResult.success || !orderResult.data) {
            res.status(404).json({
                success: false,
                error: 'Pedido não encontrado'
            });
            return;
        }
        const order = orderResult.data;
        if (order.status !== 'Pendente') {
            res.status(400).json({
                success: false,
                error: 'Apenas pedidos pendentes podem ser deletados'
            });
            return;
        }
        const result = await orderModel.delete(id);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao deletar pedido:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/:id/items', auth_1.requireAuth, validation_1.validateId, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await orderModel.findByIdWithItems(id);
        if (result.success && result.data) {
            res.json({
                success: true,
                data: result.data.items || []
            });
        }
        else {
            res.json(result);
        }
    }
    catch (error) {
        console.error('Erro ao buscar itens do pedido:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/:id/payments', auth_1.requireAuth, validation_1.validateId, async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const result = await orderPaymentModel.findByOrderId(orderId);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar pagamentos:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.post('/:id/payments', auth_1.requireAuth, validation_1.validateId, rateLimit_1.createLimiter, (0, logger_1.activityLogger)('Registrou pagamento', 'order_payments'), async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const { amount, payment_method, notes, payment_date } = req.body;
        if (!amount || amount <= 0) {
            res.status(400).json({
                success: false,
                error: 'Valor do pagamento deve ser maior que zero'
            });
            return;
        }
        if (!['Dinheiro', 'Pix', 'Cartão', 'Transferência', 'Depósito'].includes(payment_method)) {
            res.status(400).json({
                success: false,
                error: 'Método de pagamento inválido'
            });
            return;
        }
        const result = await orderPaymentModel.create({
            order_id: orderId,
            amount,
            payment_method,
            notes,
            user_id: req.user?.id,
            payment_date
        });
        res.status(result.success ? 201 : 400).json(result);
    }
    catch (error) {
        console.error('Erro ao registrar pagamento:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.delete('/:id/payments/:paymentId', auth_1.requireAuth, rateLimit_1.createLimiter, (0, logger_1.activityLogger)('Excluiu pagamento', 'order_payments'), async (req, res) => {
    try {
        const paymentId = parseInt(req.params.paymentId);
        if (isNaN(paymentId)) {
            res.status(400).json({
                success: false,
                error: 'ID do pagamento inválido'
            });
            return;
        }
        const result = await orderPaymentModel.deletePayment(paymentId);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao excluir pagamento:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/:id/payment-summary', auth_1.requireAuth, validation_1.validateId, async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const result = await orderPaymentModel.getPaymentSummary(orderId);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar resumo de pagamentos:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.patch('/:id/discount', auth_1.requireAuth, validation_1.validateId, (0, logger_1.activityLogger)('Atualizou desconto do pedido', 'orders'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { discount } = req.body;
        if (typeof discount !== 'number' || discount < 0) {
            res.status(400).json({
                success: false,
                error: 'Desconto deve ser um número maior ou igual a zero'
            });
            return;
        }
        const result = await orderModel.updateDiscount(id, discount);
        res.status(result.success ? 200 : 400).json(result);
    }
    catch (error) {
        console.error('Erro ao atualizar desconto do pedido:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
exports.default = router;
//# sourceMappingURL=orders.js.map