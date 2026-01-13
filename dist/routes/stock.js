"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const StockModel_1 = require("../models/StockModel");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const rateLimit_1 = require("../middleware/rateLimit");
const logger_1 = require("../middleware/logger");
const router = (0, express_1.Router)();
const stockModel = new StockModel_1.StockModel();
router.get('/', auth_1.requireAuth, validation_1.validatePagination, async (req, res) => {
    try {
        const result = await stockModel.findAllWithDetails(req.query);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao listar estoque:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/consolidated', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await stockModel.findConsolidated();
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar estoque consolidado:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/low-stock', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await stockModel.getLowStockReport();
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar produtos com estoque baixo:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/stats', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await stockModel.getStats();
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar estatísticas do estoque:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/product/:productId/location/:locationId', auth_1.requireAuth, async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        const locationId = parseInt(req.params.locationId);
        if (isNaN(productId) || isNaN(locationId)) {
            res.status(400).json({
                success: false,
                error: 'IDs de produto e local devem ser números válidos'
            });
            return;
        }
        const result = await stockModel.findByProductAndLocation(productId, locationId);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar estoque específico:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/movements', auth_1.requireAuth, validation_1.validatePagination, async (req, res) => {
    try {
        const result = await stockModel.getMovements(req.query);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar movimentações de estoque:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.put('/product/:productId/location/:locationId', auth_1.requireAuth, rateLimit_1.updateLimiter, (0, validation_1.validate)(validation_1.stockSchemas.update), (0, logger_1.activityLogger)('Atualizou estoque', 'stock'), async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        const locationId = parseInt(req.params.locationId);
        if (isNaN(productId) || isNaN(locationId)) {
            res.status(400).json({
                success: false,
                error: 'IDs de produto e local devem ser números válidos'
            });
            return;
        }
        const result = await stockModel.updateStock(productId, locationId, req.body, req.user.id);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao atualizar estoque:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.post('/movements', auth_1.requireAuth, rateLimit_1.createLimiter, (0, validation_1.validate)(validation_1.stockSchemas.movement), (0, logger_1.activityLogger)('Criou movimentação de estoque', 'stock_movements'), async (req, res) => {
    try {
        const movementData = {
            ...req.body,
            user_id: req.user.id
        };
        const result = await stockModel.createMovement(movementData);
        res.status(result.success ? 201 : 400).json(result);
    }
    catch (error) {
        console.error('Erro ao criar movimentação de estoque:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/movements/product/:productId', auth_1.requireAuth, validation_1.validatePagination, async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        if (isNaN(productId)) {
            res.status(400).json({
                success: false,
                error: 'ID do produto deve ser um número válido'
            });
            return;
        }
        const options = {
            ...req.query,
            product_id: productId
        };
        const result = await stockModel.getMovements(options);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar movimentações do produto:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/movements/location/:locationId', auth_1.requireAuth, validation_1.validatePagination, async (req, res) => {
    try {
        const locationId = parseInt(req.params.locationId);
        if (isNaN(locationId)) {
            res.status(400).json({
                success: false,
                error: 'ID do local deve ser um número válido'
            });
            return;
        }
        const options = {
            ...req.query,
            location_id: locationId
        };
        const result = await stockModel.getMovements(options);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar movimentações do local:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.post('/adjust', auth_1.requireAuth, rateLimit_1.createLimiter, (0, logger_1.activityLogger)('Realizou ajuste de estoque', 'stock_movements'), async (req, res) => {
    try {
        const { product_id, location_id, bottle_type, quantity, reason, adjustment_type } = req.body;
        if (!product_id || !location_id || !bottle_type || !quantity || !adjustment_type) {
            res.status(400).json({
                success: false,
                error: 'Todos os campos são obrigatórios: product_id, location_id, bottle_type, quantity, adjustment_type'
            });
            return;
        }
        if (!['Cheio', 'Vazio', 'Manutenção'].includes(bottle_type)) {
            res.status(400).json({
                success: false,
                error: 'Tipo de botijão deve ser: Cheio, Vazio ou Manutenção'
            });
            return;
        }
        if (!['add', 'subtract', 'set'].includes(adjustment_type)) {
            res.status(400).json({
                success: false,
                error: 'Tipo de ajuste deve ser: add, subtract ou set'
            });
            return;
        }
        if (typeof quantity !== 'number' || quantity < 0) {
            res.status(400).json({
                success: false,
                error: 'Quantidade deve ser um número não-negativo'
            });
            return;
        }
        let finalAdjustmentType = 'add';
        let finalQuantity = quantity;
        if (adjustment_type === 'set') {
            const currentStock = await stockModel.findByProductAndLocation(product_id, location_id);
            if (currentStock.success && currentStock.data && currentStock.data.length > 0) {
                const stock = currentStock.data[0];
                const currentQty = bottle_type === 'Cheio'
                    ? stock.full_quantity
                    : bottle_type === 'Vazio'
                        ? stock.empty_quantity
                        : stock.maintenance_quantity;
                const difference = quantity - currentQty;
                if (difference > 0) {
                    finalAdjustmentType = 'add';
                    finalQuantity = difference;
                }
                else if (difference < 0) {
                    finalAdjustmentType = 'subtract';
                    finalQuantity = Math.abs(difference);
                }
                else {
                    res.json({
                        success: true,
                        message: 'Nenhum ajuste necessário'
                    });
                    return;
                }
            }
        }
        else {
            finalAdjustmentType = adjustment_type;
        }
        const movementData = {
            product_id,
            location_id,
            movement_type: finalAdjustmentType === 'add' ? 'Entrada' : 'Saída',
            bottle_type,
            quantity: finalQuantity,
            reason: reason || `Ajuste ${adjustment_type === 'set' ? 'de definição' : finalAdjustmentType === 'add' ? 'positivo' : 'negativo'} de estoque`,
            user_id: req.user.id
        };
        const result = await stockModel.createMovement(movementData);
        res.status(result.success ? 201 : 400).json(result);
    }
    catch (error) {
        console.error('Erro ao realizar ajuste de estoque:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.post('/transfer', auth_1.requireAuth, rateLimit_1.createLimiter, (0, logger_1.activityLogger)('Realizou transferência de estoque', 'stock_movements'), async (req, res) => {
    try {
        const { product_id, from_location_id, to_location_id, bottle_type, quantity, reason } = req.body;
        if (!product_id || !from_location_id || !to_location_id || !bottle_type || !quantity) {
            res.status(400).json({
                success: false,
                error: 'Todos os campos são obrigatórios: product_id, from_location_id, to_location_id, bottle_type, quantity'
            });
            return;
        }
        if (from_location_id === to_location_id) {
            res.status(400).json({
                success: false,
                error: 'Local de origem e destino devem ser diferentes'
            });
            return;
        }
        if (!['Cheio', 'Vazio', 'Manutenção'].includes(bottle_type)) {
            res.status(400).json({
                success: false,
                error: 'Tipo de botijão deve ser: Cheio, Vazio ou Manutenção'
            });
            return;
        }
        if (typeof quantity !== 'number' || quantity <= 0) {
            res.status(400).json({
                success: false,
                error: 'Quantidade deve ser um número positivo'
            });
            return;
        }
        const movementReason = reason || `Transferência entre locais`;
        const outMovement = {
            product_id,
            location_id: from_location_id,
            movement_type: 'Transferência',
            bottle_type,
            quantity: -quantity,
            reason: `${movementReason} (Saída)`,
            user_id: req.user.id
        };
        const inMovement = {
            product_id,
            location_id: to_location_id,
            movement_type: 'Transferência',
            bottle_type,
            quantity: quantity,
            reason: `${movementReason} (Entrada)`,
            user_id: req.user.id
        };
        const outResult = await stockModel.createMovement(outMovement);
        if (!outResult.success) {
            res.status(400).json(outResult);
            return;
        }
        const inResult = await stockModel.createMovement(inMovement);
        if (!inResult.success) {
            res.status(400).json(inResult);
            return;
        }
        res.status(201).json({
            success: true,
            message: 'Transferência realizada com sucesso',
            data: {
                out_movement: outResult.data,
                in_movement: inResult.data
            }
        });
    }
    catch (error) {
        console.error('Erro ao realizar transferência de estoque:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.delete('/product/:productId/location/:locationId', auth_1.requireAuth, rateLimit_1.createLimiter, (0, logger_1.activityLogger)('Excluiu registro de estoque', 'stock'), async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        const locationId = parseInt(req.params.locationId);
        if (isNaN(productId) || isNaN(locationId)) {
            res.status(400).json({
                success: false,
                error: 'IDs de produto e local devem ser números válidos'
            });
            return;
        }
        const result = await stockModel.deleteStock(productId, locationId);
        res.status(result.success ? 200 : 404).json(result);
    }
    catch (error) {
        console.error('Erro ao excluir estoque:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
exports.default = router;
//# sourceMappingURL=stock.js.map