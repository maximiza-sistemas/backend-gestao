"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserModel_1 = require("../models/UserModel");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const rateLimit_1 = require("../middleware/rateLimit");
const logger_1 = require("../middleware/logger");
const router = (0, express_1.Router)();
const userModel = new UserModel_1.UserModel();
router.get('/', auth_1.requireAuth, auth_1.requireAdminOrManager, validation_1.validatePagination, async (req, res) => {
    try {
        const result = await userModel.findAll(req.query);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/active', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await userModel.findActive();
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao listar usuários ativos:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/role/:role', auth_1.requireAuth, auth_1.requireAdminOrManager, async (req, res) => {
    try {
        const { role } = req.params;
        if (!['Administrador', 'Gerente', 'Vendedor'].includes(role)) {
            res.status(400).json({
                success: false,
                error: 'Role inválido'
            });
            return;
        }
        const result = await userModel.findByRole(role);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao listar usuários por role:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/activity-logs', auth_1.requireAuth, auth_1.requireAdminOrManager, validation_1.validatePagination, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const logsQuery = `
        SELECT
          al.id,
          al.action,
          al.table_name,
          al.record_id,
          al.ip_address,
          al.created_at,
          u.name as user_name,
          u.email as user_email
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT $1 OFFSET $2
      `;
        const countQuery = `SELECT COUNT(*) FROM activity_logs`;
        const { query } = await Promise.resolve().then(() => __importStar(require('../config/database')));
        const [logsResult, countResult] = await Promise.all([
            query(logsQuery, [limit, offset]),
            query(countQuery)
        ]);
        const total = parseInt(countResult.rows[0].count);
        res.json({
            success: true,
            data: logsResult.rows,
            pagination: {
                total,
                limit,
                offset,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error('Erro ao buscar logs de atividade:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/:id', auth_1.requireAuth, auth_1.requireAdminOrManager, validation_1.validateId, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await userModel.findById(id);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.post('/', auth_1.requireAuth, auth_1.requireAdmin, rateLimit_1.createLimiter, (0, validation_1.validate)(validation_1.userSchemas.create), (0, logger_1.activityLogger)('Criou usuário', 'users'), async (req, res) => {
    try {
        const result = await userModel.create(req.body);
        res.status(result.success ? 201 : 400).json(result);
    }
    catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.put('/:id', auth_1.requireAuth, auth_1.requireAdmin, validation_1.validateId, rateLimit_1.updateLimiter, (0, validation_1.validate)(validation_1.userSchemas.update), (0, logger_1.activityLogger)('Atualizou usuário', 'users'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (id === req.user.id && req.body.status === 'Inativo') {
            res.status(400).json({
                success: false,
                error: 'Você não pode desativar sua própria conta'
            });
            return;
        }
        const result = await userModel.update(id, req.body);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.delete('/:id', auth_1.requireAuth, auth_1.requireAdmin, validation_1.validateId, (0, logger_1.activityLogger)('Deletou usuário', 'users'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (id === req.user.id) {
            res.status(400).json({
                success: false,
                error: 'Você não pode deletar sua própria conta'
            });
            return;
        }
        const result = await userModel.delete(id);
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao deletar usuário:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.patch('/:id/status', auth_1.requireAuth, auth_1.requireAdmin, validation_1.validateId, (0, logger_1.activityLogger)('Alterou status do usuário', 'users'), async (req, res) => {
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
        if (id === req.user.id && status === 'Inativo') {
            res.status(400).json({
                success: false,
                error: 'Você não pode desativar sua própria conta'
            });
            return;
        }
        const result = await userModel.update(id, { status });
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao alterar status do usuário:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.put('/:id/password', auth_1.requireAuth, validation_1.validateId, rateLimit_1.updateLimiter, (0, logger_1.activityLogger)('Alterou senha', 'users'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password) {
            res.status(400).json({
                success: false,
                error: 'Senha atual e nova senha são obrigatórias'
            });
            return;
        }
        if (new_password.length < 6) {
            res.status(400).json({
                success: false,
                error: 'Nova senha deve ter pelo menos 6 caracteres'
            });
            return;
        }
        if (id !== req.user.id && req.user.role !== 'Administrador') {
            res.status(403).json({
                success: false,
                error: 'Você só pode alterar sua própria senha'
            });
            return;
        }
        const userResult = await userModel.findByEmail(req.user.email);
        if (!userResult.success || !userResult.data) {
            res.status(404).json({
                success: false,
                error: 'Usuário não encontrado'
            });
            return;
        }
        if (id === req.user.id) {
            const isCurrentPasswordValid = await userModel.verifyPassword(current_password, userResult.data.password_hash);
            if (!isCurrentPasswordValid) {
                res.status(400).json({
                    success: false,
                    error: 'Senha atual incorreta'
                });
                return;
            }
        }
        const result = await userModel.update(id, { password: new_password });
        if (result.success) {
            res.json({
                success: true,
                message: 'Senha alterada com sucesso'
            });
        }
        else {
            res.status(400).json(result);
        }
    }
    catch (error) {
        console.error('Erro ao alterar senha:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map