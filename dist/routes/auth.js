"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserModel_1 = require("../models/UserModel");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const rateLimit_1 = require("../middleware/rateLimit");
const logger_1 = require("../middleware/logger");
const router = (0, express_1.Router)();
const userModel = new UserModel_1.UserModel();
router.post('/login', rateLimit_1.loginLimiter, (0, validation_1.validate)(validation_1.userSchemas.login), (0, logger_1.activityLogger)('Login realizado'), async (req, res) => {
    try {
        const { email, password } = req.body;
        const userResult = await userModel.findByEmail(email);
        if (!userResult.success || !userResult.data) {
            res.status(401).json({
                success: false,
                error: 'Credenciais inválidas'
            });
            return;
        }
        const user = userResult.data;
        if (user.status !== 'Ativo') {
            res.status(401).json({
                success: false,
                error: 'Usuário inativo'
            });
            return;
        }
        const isPasswordValid = await userModel.verifyPassword(password, user.password_hash);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                error: 'Credenciais inválidas'
            });
            return;
        }
        const token = (0, auth_1.generateToken)({
            user_id: user.id,
            email: user.email,
            role: user.role
        });
        const { password_hash, ...userWithoutPassword } = user;
        const response = {
            token,
            user: userWithoutPassword,
            expires_in: 7 * 24 * 60 * 60
        };
        res.json({
            success: true,
            data: response,
            message: 'Login realizado com sucesso'
        });
    }
    catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.post('/logout', (0, logger_1.activityLogger)('Logout realizado'), async (req, res) => {
    res.json({
        success: true,
        message: 'Logout realizado com sucesso'
    });
});
router.get('/me', auth_1.requireAuth, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
            return;
        }
        const userResult = await userModel.findById(req.user.id);
        if (!userResult.success || !userResult.data) {
            res.status(404).json({
                success: false,
                error: 'Usuário não encontrado'
            });
            return;
        }
        res.json({
            success: true,
            data: userResult.data
        });
    }
    catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.post('/refresh', auth_1.requireAuth, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
            return;
        }
        const token = (0, auth_1.generateToken)({
            user_id: req.user.id,
            email: req.user.email,
            role: req.user.role
        });
        res.json({
            success: true,
            data: {
                token,
                expires_in: 7 * 24 * 60 * 60
            },
            message: 'Token renovado com sucesso'
        });
    }
    catch (error) {
        console.error('Erro ao renovar token:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map