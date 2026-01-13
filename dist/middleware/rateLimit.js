"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportLimiter = exports.updateLimiter = exports.createLimiter = exports.loginLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || (process.env.NODE_ENV === 'development' ? '1000' : '100')),
    message: {
        success: false,
        error: 'Muitas requisições deste IP, tente novamente em alguns minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        error: 'Muitas tentativas de login. Tente novamente em 15 minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});
exports.createLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000,
    max: 50,
    message: {
        success: false,
        error: 'Muitas criações de registros. Tente novamente em alguns minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.updateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        error: 'Muitas atualizações. Tente novamente em alguns minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.reportLimiter = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        error: 'Muitas consultas de relatórios. Tente novamente em alguns minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
//# sourceMappingURL=rateLimit.js.map