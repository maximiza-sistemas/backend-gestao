"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ProductModel_1 = require("../models/ProductModel");
const ProductSupplierCostModel_1 = require("../models/ProductSupplierCostModel");
const ProductPurchaseModel_1 = require("../models/ProductPurchaseModel");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const rateLimit_1 = require("../middleware/rateLimit");
const logger_1 = require("../middleware/logger");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
const productModel = new ProductModel_1.ProductModel();
router.get('/', auth_1.requireAuth, validation_1.validatePagination, async (req, res) => {
    try {
        const result = await productModel.findAll(req.query);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao listar produtos:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/active', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await productModel.findActive();
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao listar produtos ativos:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/with-stock', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await productModel.findWithStock();
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao listar produtos com estoque:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/stats', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await productModel.getStats();
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar estatísticas de produtos:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/most-sold', auth_1.requireAuth, async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const result = await productModel.getMostSold(limit);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar produtos mais vendidos:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/low-stock', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await productModel.getLowStock();
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar produtos com baixo estoque:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/profitability', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await productModel.getProfitabilityReport();
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar relatório de rentabilidade:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/:id', auth_1.requireAuth, validation_1.validateId, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await productModel.findById(id);
        if (result.success && result.data) {
            res.json(result);
        }
        else {
            res.status(404).json({
                success: false,
                error: 'Produto não encontrado'
            });
        }
    }
    catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/:id/price-history', auth_1.requireAuth, validation_1.validateId, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await productModel.getPriceHistory(id);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar histórico de preços:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.post('/', auth_1.requireAuth, rateLimit_1.createLimiter, (0, logger_1.activityLogger)('create', 'product'), async (req, res) => {
    try {
        const { name, description, weight_kg, status, initial_full_quantity, initial_empty_quantity, initial_maintenance_quantity, min_stock_level, max_stock_level } = req.body;
        if (!name) {
            res.status(400).json({
                success: false,
                error: 'Nome do produto é obrigatório'
            });
            return;
        }
        const productData = {
            name: name.trim(),
            description: description?.trim() || null,
            weight_kg: weight_kg ? parseFloat(weight_kg) : null,
            price_sell: 0,
            price_buy: null,
            status: status || 'Ativo'
        };
        const result = await productModel.create(productData);
        if (result.success && result.data) {
            try {
                const productId = result.data.id;
                const locationsResult = await (0, database_1.query)('SELECT id FROM locations WHERE status = $1', ['Ativo']);
                if (locationsResult.rows.length === 0) {
                    const newLocation = await (0, database_1.query)(`INSERT INTO locations (name, status) VALUES ($1, $2) RETURNING id`, ['Matriz', 'Ativo']);
                    locationsResult.rows.push(newLocation.rows[0]);
                }
                const fullQty = initial_full_quantity ? parseInt(initial_full_quantity) : 0;
                const emptyQty = initial_empty_quantity ? parseInt(initial_empty_quantity) : 0;
                const maintenanceQty = initial_maintenance_quantity ? parseInt(initial_maintenance_quantity) : 0;
                const minStock = min_stock_level ? parseInt(min_stock_level) : 10;
                const maxStock = max_stock_level ? parseInt(max_stock_level) : 100;
                for (const location of locationsResult.rows) {
                    await (0, database_1.query)(`INSERT INTO stock (product_id, location_id, full_quantity, empty_quantity, maintenance_quantity, min_stock_level, max_stock_level)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (product_id, location_id) DO NOTHING`, [productId, location.id, fullQty, emptyQty, maintenanceQty, minStock, maxStock]);
                }
                console.log(`Registros de estoque criados para produto ${productId} em ${locationsResult.rows.length} localização(ões) com quantidades: ${fullQty} cheios, ${emptyQty} vazios, ${maintenanceQty} manutenção`);
            }
            catch (stockError) {
                console.error('Erro ao criar registros de estoque:', stockError);
            }
            res.status(201).json(result);
        }
        else {
            res.status(400).json(result);
        }
    }
    catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.put('/:id', auth_1.requireAuth, validation_1.validateId, rateLimit_1.updateLimiter, (0, logger_1.activityLogger)('update', 'product'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, description, weight_kg, price_sell, price_buy, status } = req.body;
        if (name && name.trim() === '') {
            res.status(400).json({
                success: false,
                error: 'Nome não pode ser vazio'
            });
            return;
        }
        if (price_sell !== undefined && price_sell <= 0) {
            res.status(400).json({
                success: false,
                error: 'Preço de venda deve ser maior que zero'
            });
            return;
        }
        if (price_buy !== undefined && price_buy < 0) {
            res.status(400).json({
                success: false,
                error: 'Preço de compra não pode ser negativo'
            });
            return;
        }
        const updateData = {};
        if (name !== undefined)
            updateData.name = name.trim();
        if (description !== undefined)
            updateData.description = description?.trim() || null;
        if (weight_kg !== undefined)
            updateData.weight_kg = weight_kg ? parseFloat(weight_kg) : null;
        if (price_sell !== undefined)
            updateData.price_sell = parseFloat(price_sell);
        if (price_buy !== undefined)
            updateData.price_buy = price_buy ? parseFloat(price_buy) : null;
        if (status !== undefined)
            updateData.status = status;
        const result = await productModel.update(id, updateData);
        if (result.success) {
            res.json(result);
        }
        else {
            res.status(404).json(result);
        }
    }
    catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.delete('/:id', auth_1.requireAuth, validation_1.validateId, (0, logger_1.activityLogger)('delete', 'product'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await productModel.update(id, { status: 'Inativo' });
        if (result.success) {
            res.json({
                success: true,
                message: 'Produto desativado com sucesso'
            });
        }
        else {
            res.status(404).json(result);
        }
    }
    catch (error) {
        console.error('Erro ao excluir produto:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.post('/sync-stock', auth_1.requireAuth, async (req, res) => {
    try {
        const productsResult = await (0, database_1.query)('SELECT id FROM products WHERE status = $1', ['Ativo']);
        let locationsResult = await (0, database_1.query)('SELECT id FROM locations WHERE status = $1', ['Ativo']);
        if (locationsResult.rows.length === 0) {
            const newLocation = await (0, database_1.query)(`INSERT INTO locations (name, status) VALUES ($1, $2) RETURNING id`, ['Matriz', 'Ativo']);
            locationsResult.rows.push(newLocation.rows[0]);
        }
        let syncedCount = 0;
        for (const product of productsResult.rows) {
            for (const location of locationsResult.rows) {
                const insertResult = await (0, database_1.query)(`INSERT INTO stock (product_id, location_id, full_quantity, empty_quantity, maintenance_quantity, min_stock_level, max_stock_level)
             VALUES ($1, $2, 0, 0, 0, 10, 100)
             ON CONFLICT (product_id, location_id) DO NOTHING
             RETURNING id`, [product.id, location.id]);
                if (insertResult.rows.length > 0) {
                    syncedCount++;
                }
            }
        }
        res.json({
            success: true,
            message: `${syncedCount} registros de estoque sincronizados`,
            data: {
                products: productsResult.rows.length,
                locations: locationsResult.rows.length,
                synced: syncedCount
            }
        });
    }
    catch (error) {
        console.error('Erro ao sincronizar estoque:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/:id/costs', auth_1.requireAuth, validation_1.validateId, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const costs = await ProductSupplierCostModel_1.ProductSupplierCostModel.getByProduct(id);
        res.json({
            success: true,
            data: costs
        });
    }
    catch (error) {
        console.error('Erro ao buscar custos do produto:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.post('/:id/costs', auth_1.requireAuth, validation_1.validateId, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { supplier_id, cost_price, is_default } = req.body;
        if (!supplier_id || cost_price === undefined) {
            res.status(400).json({
                success: false,
                error: 'Fornecedor e preço de custo são obrigatórios'
            });
            return;
        }
        const cost = await ProductSupplierCostModel_1.ProductSupplierCostModel.upsert(id, parseInt(supplier_id), parseFloat(cost_price), is_default);
        res.json({
            success: true,
            data: cost
        });
    }
    catch (error) {
        console.error('Erro ao salvar custo do produto:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.delete('/:id/costs/:supplierId', auth_1.requireAuth, validation_1.validateId, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const supplierId = parseInt(req.params.supplierId);
        await ProductSupplierCostModel_1.ProductSupplierCostModel.delete(id, supplierId);
        res.json({
            success: true,
            message: 'Custo removido com sucesso'
        });
    }
    catch (error) {
        console.error('Erro ao remover custo do produto:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/:id/purchases', auth_1.requireAuth, validation_1.validateId, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const purchases = await ProductPurchaseModel_1.ProductPurchaseModel.getByProduct(id);
        res.json({
            success: true,
            data: purchases
        });
    }
    catch (error) {
        console.error('Erro ao buscar compras do produto:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.post('/:id/purchases', auth_1.requireAuth, validation_1.validateId, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { unit_price, quantity, purchase_date, is_installment, installment_count, notes } = req.body;
        if (!unit_price || unit_price <= 0) {
            res.status(400).json({
                success: false,
                error: 'Preço unitário é obrigatório e deve ser maior que zero'
            });
            return;
        }
        if (!quantity || quantity <= 0) {
            res.status(400).json({
                success: false,
                error: 'Quantidade é obrigatória e deve ser maior que zero'
            });
            return;
        }
        const purchase = await ProductPurchaseModel_1.ProductPurchaseModel.create({
            product_id: id,
            unit_price: parseFloat(unit_price),
            quantity: parseInt(quantity),
            purchase_date,
            is_installment,
            installment_count: installment_count ? parseInt(installment_count) : undefined,
            notes
        });
        res.status(201).json({
            success: true,
            data: purchase
        });
    }
    catch (error) {
        console.error('Erro ao registrar compra:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/:id/purchases/:purchaseId/installments', auth_1.requireAuth, validation_1.validateId, async (req, res) => {
    try {
        const purchaseId = parseInt(req.params.purchaseId);
        const installments = await ProductPurchaseModel_1.ProductPurchaseModel.getInstallments(purchaseId);
        res.json({
            success: true,
            data: installments
        });
    }
    catch (error) {
        console.error('Erro ao buscar parcelas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.put('/:id/purchases/:purchaseId/installments/:installmentId', auth_1.requireAuth, validation_1.validateId, async (req, res) => {
    try {
        const installmentId = parseInt(req.params.installmentId);
        const { paid_amount, paid_date } = req.body;
        if (paid_amount === undefined || !paid_date) {
            res.status(400).json({
                success: false,
                error: 'Valor pago e data de pagamento são obrigatórios'
            });
            return;
        }
        const installment = await ProductPurchaseModel_1.ProductPurchaseModel.updateInstallment(installmentId, {
            paid_amount: parseFloat(paid_amount),
            paid_date
        });
        res.json({
            success: true,
            data: installment
        });
    }
    catch (error) {
        console.error('Erro ao atualizar parcela:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.delete('/:id/purchases/:purchaseId', auth_1.requireAuth, validation_1.validateId, async (req, res) => {
    try {
        const purchaseId = parseInt(req.params.purchaseId);
        await ProductPurchaseModel_1.ProductPurchaseModel.delete(purchaseId);
        res.json({
            success: true,
            message: 'Compra removida com sucesso'
        });
    }
    catch (error) {
        console.error('Erro ao excluir compra:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
exports.default = router;
//# sourceMappingURL=products.js.map