"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const FinancialModel_1 = require("../models/FinancialModel");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.get('/categories', async (req, res) => {
    try {
        const { type } = req.query;
        const categories = await FinancialModel_1.FinancialModel.findAllCategories(type);
        res.json({ success: true, data: categories });
    }
    catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar categorias'
        });
    }
});
router.post('/categories', async (req, res) => {
    try {
        const category = await FinancialModel_1.FinancialModel.createCategory(req.body);
        res.status(201).json({ success: true, data: category });
    }
    catch (error) {
        console.error('Erro ao criar categoria:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao criar categoria'
        });
    }
});
router.get('/accounts', async (req, res) => {
    try {
        const accounts = await FinancialModel_1.FinancialModel.findAllAccounts();
        res.json({ success: true, data: accounts });
    }
    catch (error) {
        console.error('Erro ao buscar contas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar contas'
        });
    }
});
router.get('/accounts/:id', async (req, res) => {
    try {
        const account = await FinancialModel_1.FinancialModel.findAccountById(parseInt(req.params.id));
        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'Conta não encontrada'
            });
        }
        return res.json({ success: true, data: account });
    }
    catch (error) {
        console.error('Erro ao buscar conta:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar conta'
        });
    }
});
router.post('/accounts', async (req, res) => {
    try {
        const account = await FinancialModel_1.FinancialModel.createAccount(req.body);
        res.status(201).json({ success: true, data: account });
    }
    catch (error) {
        console.error('Erro ao criar conta:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao criar conta'
        });
    }
});
router.get('/transactions', async (req, res) => {
    try {
        const filters = {
            type: req.query.type,
            status: req.query.status,
            category_id: req.query.category_id ? parseInt(req.query.category_id) : undefined,
            account_id: req.query.account_id ? parseInt(req.query.account_id) : undefined,
            client_id: req.query.client_id ? parseInt(req.query.client_id) : undefined,
            date_from: req.query.date_from ? new Date(req.query.date_from) : undefined,
            date_to: req.query.date_to ? new Date(req.query.date_to) : undefined
        };
        const transactions = await FinancialModel_1.FinancialModel.findAllTransactions(filters);
        res.json({ success: true, data: transactions });
    }
    catch (error) {
        console.error('Erro ao buscar transações:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar transações'
        });
    }
});
router.get('/transactions/:id', async (req, res) => {
    try {
        const transaction = await FinancialModel_1.FinancialModel.findTransactionById(parseInt(req.params.id));
        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transação não encontrada'
            });
        }
        return res.json({ success: true, data: transaction });
    }
    catch (error) {
        console.error('Erro ao buscar transação:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar transação'
        });
    }
});
router.post('/transactions', async (req, res) => {
    try {
        const userId = req.user.id;
        const transaction = await FinancialModel_1.FinancialModel.createTransaction(req.body, userId);
        res.status(201).json({ success: true, data: transaction });
    }
    catch (error) {
        console.error('Erro ao criar transação:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao criar transação'
        });
    }
});
router.put('/transactions/:id', async (req, res) => {
    try {
        const transaction = await FinancialModel_1.FinancialModel.updateTransaction(parseInt(req.params.id), req.body);
        res.json({ success: true, data: transaction });
    }
    catch (error) {
        console.error('Erro ao atualizar transação:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao atualizar transação'
        });
    }
});
router.delete('/transactions/:id', async (req, res) => {
    try {
        await FinancialModel_1.FinancialModel.deleteTransaction(parseInt(req.params.id));
        res.json({ success: true, message: 'Transação deletada com sucesso' });
    }
    catch (error) {
        console.error('Erro ao deletar transação:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao deletar transação'
        });
    }
});
router.patch('/transactions/:id/status', async (req, res) => {
    try {
        const { status, payment_date } = req.body;
        await FinancialModel_1.FinancialModel.updateTransactionStatus(parseInt(req.params.id), status, payment_date ? new Date(payment_date) : undefined);
        res.json({ success: true, message: 'Status atualizado com sucesso' });
    }
    catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao atualizar status'
        });
    }
});
router.get('/summary', async (req, res) => {
    try {
        const filters = {
            date_from: req.query.date_from ? new Date(req.query.date_from) : undefined,
            date_to: req.query.date_to ? new Date(req.query.date_to) : undefined,
            account_id: req.query.account_id ? parseInt(req.query.account_id) : undefined
        };
        const summary = await FinancialModel_1.FinancialModel.getFinancialSummary(filters);
        res.json({ success: true, data: summary });
    }
    catch (error) {
        console.error('Erro ao buscar resumo:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar resumo financeiro'
        });
    }
});
router.get('/cash-flow', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'Datas de início e fim são obrigatórias'
            });
        }
        const cashFlow = await FinancialModel_1.FinancialModel.getCashFlow(new Date(start_date), new Date(end_date));
        return res.json({ success: true, data: cashFlow });
    }
    catch (error) {
        console.error('Erro ao buscar fluxo de caixa:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar fluxo de caixa'
        });
    }
});
router.get('/category-breakdown', async (req, res) => {
    try {
        const { type, start_date, end_date } = req.query;
        if (!type || (type !== 'Receita' && type !== 'Despesa')) {
            return res.status(400).json({
                success: false,
                error: 'Tipo deve ser "Receita" ou "Despesa"'
            });
        }
        const breakdown = await FinancialModel_1.FinancialModel.getCategoryBreakdown(type, start_date ? new Date(start_date) : undefined, end_date ? new Date(end_date) : undefined);
        return res.json({ success: true, data: breakdown });
    }
    catch (error) {
        console.error('Erro ao buscar breakdown:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar breakdown por categoria'
        });
    }
});
exports.default = router;
//# sourceMappingURL=financial.js.map