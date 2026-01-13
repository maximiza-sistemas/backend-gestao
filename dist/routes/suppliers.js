"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SupplierModel_1 = require("../models/SupplierModel");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.get('/', async (req, res) => {
    try {
        const { status, category, search, page, limit } = req.query;
        if (page) {
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 10;
            const result = await SupplierModel_1.SupplierModel.findPaginated(pageNum, limitNum, {
                status: status,
                category: category,
                search: search
            });
            return res.json({
                success: true,
                data: result.data,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: result.total,
                    totalPages: result.totalPages
                }
            });
        }
        const suppliers = await SupplierModel_1.SupplierModel.findAll({
            status: status,
            category: category,
            search: search
        });
        return res.json({ success: true, data: suppliers });
    }
    catch (error) {
        console.error('Erro ao buscar fornecedores:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar fornecedores'
        });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const supplier = await SupplierModel_1.SupplierModel.findById(parseInt(req.params.id));
        if (!supplier) {
            return res.status(404).json({
                success: false,
                error: 'Fornecedor não encontrado'
            });
        }
        return res.json({ success: true, data: supplier });
    }
    catch (error) {
        console.error('Erro ao buscar fornecedor:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar fornecedor'
        });
    }
});
router.post('/', async (req, res) => {
    try {
        const supplier = await SupplierModel_1.SupplierModel.create(req.body);
        return res.status(201).json({ success: true, data: supplier });
    }
    catch (error) {
        console.error('Erro ao criar fornecedor:', error);
        if (error.message === 'CNPJ já cadastrado') {
            return res.status(400).json({
                success: false,
                error: 'CNPJ já cadastrado'
            });
        }
        return res.status(500).json({
            success: false,
            error: 'Erro ao criar fornecedor'
        });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const supplier = await SupplierModel_1.SupplierModel.update(parseInt(req.params.id), req.body);
        return res.json({ success: true, data: supplier });
    }
    catch (error) {
        console.error('Erro ao atualizar fornecedor:', error);
        if (error.message === 'Fornecedor não encontrado') {
            return res.status(404).json({
                success: false,
                error: 'Fornecedor não encontrado'
            });
        }
        if (error.message === 'CNPJ já cadastrado para outro fornecedor') {
            return res.status(400).json({
                success: false,
                error: 'CNPJ já cadastrado para outro fornecedor'
            });
        }
        return res.status(500).json({
            success: false,
            error: 'Erro ao atualizar fornecedor'
        });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        await SupplierModel_1.SupplierModel.delete(parseInt(req.params.id));
        return res.json({ success: true, message: 'Fornecedor excluído com sucesso' });
    }
    catch (error) {
        console.error('Erro ao deletar fornecedor:', error);
        if (error.message === 'Fornecedor não encontrado') {
            return res.status(404).json({
                success: false,
                error: 'Fornecedor não encontrado'
            });
        }
        return res.status(500).json({
            success: false,
            error: 'Erro ao deletar fornecedor'
        });
    }
});
router.get('/data/categories', async (req, res) => {
    try {
        const categories = await SupplierModel_1.SupplierModel.getCategories();
        return res.json({ success: true, data: categories });
    }
    catch (error) {
        console.error('Erro ao buscar categorias:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar categorias'
        });
    }
});
router.get('/data/statistics', async (req, res) => {
    try {
        const statistics = await SupplierModel_1.SupplierModel.getStatistics();
        return res.json({ success: true, data: statistics });
    }
    catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar estatísticas'
        });
    }
});
exports.default = router;
//# sourceMappingURL=suppliers.js.map