"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ContainerLoanModel_1 = require("../models/ContainerLoanModel");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../middleware/logger");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = (0, express_1.Router)();
const containerLoanModel = new ContainerLoanModel_1.ContainerLoanModel();
const createLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 30,
    message: { success: false, error: 'Muitas requisições. Tente novamente em breve.' }
});
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await containerLoanModel.findAllWithDetails({
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50,
            status: req.query.status,
            direction: req.query.direction,
            entity_type: req.query.entity_type,
            search: req.query.search,
            location_id: req.query.location_id ? parseInt(req.query.location_id) : undefined
        });
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao listar empréstimos:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/stats', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await containerLoanModel.getStats();
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
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
            res.status(400).json({ success: false, error: 'ID inválido' });
            return;
        }
        const result = await containerLoanModel.findById(id);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar empréstimo:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.post('/', auth_1.requireAuth, createLimiter, (0, logger_1.activityLogger)('Criou empréstimo de recipiente', 'container_loans'), async (req, res) => {
    try {
        const { loan_type, direction, product_id, quantity, entity_type, entity_name, entity_contact, entity_address, loan_date, expected_return_date, notes, location_id } = req.body;
        if (!loan_type || !direction || !product_id || !quantity || !entity_type || !entity_name) {
            res.status(400).json({
                success: false,
                error: 'Campos obrigatórios: loan_type, direction, product_id, quantity, entity_type, entity_name'
            });
            return;
        }
        if (quantity <= 0) {
            res.status(400).json({
                success: false,
                error: 'Quantidade deve ser maior que zero'
            });
            return;
        }
        const result = await containerLoanModel.create({
            loan_type,
            direction,
            product_id,
            quantity,
            entity_type,
            entity_name,
            entity_contact: entity_contact || null,
            entity_address: entity_address || null,
            loan_date: loan_date || new Date().toISOString().split('T')[0],
            expected_return_date: expected_return_date || null,
            notes: notes || null,
            location_id,
            user_id: req.user?.id
        });
        res.status(result.success ? 201 : 400).json(result);
    }
    catch (error) {
        console.error('Erro ao criar empréstimo:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.put('/:id', auth_1.requireAuth, createLimiter, (0, logger_1.activityLogger)('Atualizou empréstimo de recipiente', 'container_loans'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ success: false, error: 'ID inválido' });
            return;
        }
        const result = await containerLoanModel.update(id, req.body);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao atualizar empréstimo:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.post('/:id/return', auth_1.requireAuth, createLimiter, (0, logger_1.activityLogger)('Registrou devolução de empréstimo', 'container_loans'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ success: false, error: 'ID inválido' });
            return;
        }
        const { actual_return_date } = req.body;
        const result = await containerLoanModel.returnLoan(id, actual_return_date);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao devolver empréstimo:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.delete('/:id', auth_1.requireAuth, createLimiter, (0, logger_1.activityLogger)('Cancelou empréstimo de recipiente', 'container_loans'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ success: false, error: 'ID inválido' });
            return;
        }
        const result = await containerLoanModel.cancelLoan(id);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao cancelar empréstimo:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
const upload_1 = require("../middleware/upload");
const database_1 = require("../config/database");
const fs_1 = __importDefault(require("fs"));
router.post('/:id/contract', auth_1.requireAuth, createLimiter, (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'ID inválido' });
        return;
    }
    (0, upload_1.uploadContract)(req, res, async (err) => {
        if (err) {
            res.status(400).json({
                success: false,
                error: err.message || 'Erro ao fazer upload do contrato'
            });
            return;
        }
        if (!req.file) {
            res.status(400).json({
                success: false,
                error: 'Nenhum arquivo enviado'
            });
            return;
        }
        try {
            const loanCheck = await (0, database_1.query)('SELECT id, contract_file FROM container_loans WHERE id = $1', [id]);
            if (loanCheck.rowCount === 0) {
                (0, upload_1.deleteContractFile)(req.file.filename);
                res.status(404).json({
                    success: false,
                    error: 'Empréstimo não encontrado'
                });
                return;
            }
            const oldContract = loanCheck.rows[0].contract_file;
            if (oldContract) {
                (0, upload_1.deleteContractFile)(oldContract);
            }
            await (0, database_1.query)('UPDATE container_loans SET contract_file = $1, updated_at = NOW() WHERE id = $2', [req.file.filename, id]);
            res.json({
                success: true,
                message: 'Contrato enviado com sucesso',
                data: {
                    filename: req.file.filename,
                    originalName: req.file.originalname,
                    size: req.file.size
                }
            });
        }
        catch (error) {
            console.error('Erro ao salvar contrato:', error);
            (0, upload_1.deleteContractFile)(req.file.filename);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });
});
router.get('/:id/contract', auth_1.requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ success: false, error: 'ID inválido' });
            return;
        }
        const result = await (0, database_1.query)('SELECT contract_file FROM container_loans WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            res.status(404).json({ success: false, error: 'Empréstimo não encontrado' });
            return;
        }
        const contractFile = result.rows[0].contract_file;
        if (!contractFile) {
            res.status(404).json({ success: false, error: 'Nenhum contrato encontrado para este empréstimo' });
            return;
        }
        const filePath = (0, upload_1.getContractPath)(contractFile);
        if (!fs_1.default.existsSync(filePath)) {
            res.status(404).json({ success: false, error: 'Arquivo de contrato não encontrado' });
            return;
        }
        res.download(filePath, contractFile);
    }
    catch (error) {
        console.error('Erro ao baixar contrato:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.delete('/:id/contract', auth_1.requireAuth, createLimiter, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ success: false, error: 'ID inválido' });
            return;
        }
        const result = await (0, database_1.query)('SELECT contract_file FROM container_loans WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            res.status(404).json({ success: false, error: 'Empréstimo não encontrado' });
            return;
        }
        const contractFile = result.rows[0].contract_file;
        if (!contractFile) {
            res.status(404).json({ success: false, error: 'Nenhum contrato para deletar' });
            return;
        }
        (0, upload_1.deleteContractFile)(contractFile);
        await (0, database_1.query)('UPDATE container_loans SET contract_file = NULL, updated_at = NOW() WHERE id = $1', [id]);
        res.json({
            success: true,
            message: 'Contrato deletado com sucesso'
        });
    }
    catch (error) {
        console.error('Erro ao deletar contrato:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.delete('/:id/permanent', auth_1.requireAuth, createLimiter, (0, logger_1.activityLogger)('Excluiu empréstimo de recipiente permanentemente', 'container_loans'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ success: false, error: 'ID inválido' });
            return;
        }
        const loanCheck = await (0, database_1.query)('SELECT id, contract_file FROM container_loans WHERE id = $1', [id]);
        if (loanCheck.rowCount === 0) {
            res.status(404).json({
                success: false,
                error: 'Empréstimo não encontrado'
            });
            return;
        }
        const contractFile = loanCheck.rows[0].contract_file;
        if (contractFile) {
            (0, upload_1.deleteContractFile)(contractFile);
        }
        await (0, database_1.query)('DELETE FROM container_loans WHERE id = $1', [id]);
        res.json({
            success: true,
            message: 'Empréstimo excluído permanentemente'
        });
    }
    catch (error) {
        console.error('Erro ao excluir empréstimo:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
exports.default = router;
//# sourceMappingURL=containerLoans.js.map