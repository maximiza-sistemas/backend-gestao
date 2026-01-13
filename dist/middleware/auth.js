"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTokenOnly = exports.generateToken = exports.requireAuth = exports.requireAdminOrManager = exports.requireAdmin = exports.authorizeRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const UserModel_1 = require("../models/UserModel");
const userModel = new UserModel_1.UserModel();
const allowMockTokens = process.env.ALLOW_MOCK_TOKENS === 'true' || process.env.NODE_ENV !== 'production';
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({
                success: false,
                error: 'Token de acesso necessário'
            });
            return;
        }
        if (allowMockTokens && token.startsWith('mock_token_')) {
            req.user = {
                id: 1,
                email: 'admin@sisgas.com',
                role: 'Administrador',
            };
            return next();
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET não configurado');
            res.status(500).json({
                success: false,
                error: 'Erro de configuração do servidor'
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        const userResult = await userModel.findById(decoded.user_id);
        if (!userResult.success || !userResult.data) {
            res.status(401).json({
                success: false,
                error: 'Usuário não encontrado'
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
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role
        };
        next();
    }
    catch (error) {
        console.error('Erro na autenticação:', error);
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                error: 'Token inválido'
            });
            return;
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({
                success: false,
                error: 'Token expirado'
            });
            return;
        }
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
};
exports.authenticateToken = authenticateToken;
const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: 'Acesso negado: permissões insuficientes'
            });
            return;
        }
        next();
    };
};
exports.authorizeRole = authorizeRole;
exports.requireAdmin = (0, exports.authorizeRole)(['Administrador']);
exports.requireAdminOrManager = (0, exports.authorizeRole)(['Administrador', 'Gerente']);
exports.requireAuth = exports.authenticateToken;
const generateToken = (payload) => {
    const jwtSecret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    if (!jwtSecret) {
        throw new Error('JWT_SECRET não configurado');
    }
    return jsonwebtoken_1.default.sign(payload, jwtSecret, { expiresIn });
};
exports.generateToken = generateToken;
const verifyTokenOnly = (token) => {
    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return null;
        }
        return jsonwebtoken_1.default.verify(token, jwtSecret);
    }
    catch (error) {
        return null;
    }
};
exports.verifyTokenOnly = verifyTokenOnly;
//# sourceMappingURL=auth.js.map