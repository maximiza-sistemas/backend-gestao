"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const rateLimit_1 = require("./middleware/rateLimit");
const logger_1 = require("./middleware/logger");
const routes_1 = __importDefault(require("./routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
const isProduction = process.env.NODE_ENV === 'production';
const defaultDevOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
];
const allowedOrigins = isProduction
    ? (process.env.FRONTEND_URLS?.split(',').map((url) => url.trim()).filter(Boolean) ??
        ['https://seu-frontend.com'])
    : defaultDevOrigins;
const isOriginAllowed = (origin) => {
    if (!isProduction) {
        return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
    }
    if (allowedOrigins.includes(origin))
        return true;
    return false;
};
app.use((0, cors_1.default)({
    origin: isProduction
        ? (origin, callback) => {
            if (!origin) {
                return callback(null, true);
            }
            if (isOriginAllowed(origin)) {
                return callback(null, true);
            }
            return callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Disposition'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
}));
app.use((0, compression_1.default)());
app.use(rateLimit_1.generalLimiter);
app.use(logger_1.httpLogger);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.set('trust proxy', 1);
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API da Distribuidora de Gás',
        version: '1.0.0',
        documentation: '/api/health',
        timestamp: new Date().toISOString()
    });
});
app.use('/api', routes_1.default);
app.use(logger_1.errorLogger);
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    if (err.isJoi) {
        res.status(400).json({
            success: false,
            error: 'Dados inválidos',
            details: err.details
        });
        return;
    }
    if (err instanceof SyntaxError && 'body' in err) {
        res.status(400).json({
            success: false,
            error: 'JSON inválido'
        });
        return;
    }
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Erro interno do servidor';
    res.status(status).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Rota não encontrada',
        path: req.originalUrl,
        method: req.method
    });
});
const startServer = async () => {
    try {
        console.log('🚀 Iniciando servidor...');
        console.log('📊 Testando conexão com o banco de dados...');
        const dbConnected = await (0, database_1.testConnection)();
        if (!dbConnected) {
            console.error('❌ Falha na conexão com o banco de dados');
            process.exit(1);
        }
        const server = app.listen(PORT, () => {
            console.log(`✅ Servidor rodando na porta ${PORT}`);
            console.log(`🌐 URL: http://localhost:${PORT}`);
            console.log(`📋 Health Check: http://localhost:${PORT}/api/health`);
            console.log(`🔒 Ambiente: ${process.env.NODE_ENV || 'development'}`);
        });
        const gracefulShutdown = (signal) => {
            console.log(`\n🛑 Recebido sinal ${signal}. Iniciando graceful shutdown...`);
            server.close((err) => {
                if (err) {
                    console.error('❌ Erro ao fechar servidor:', err);
                    process.exit(1);
                }
                console.log('✅ Servidor fechado com sucesso');
                process.exit(0);
            });
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
        });
        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error);
            process.exit(1);
        });
    }
    catch (error) {
        console.error('💥 Erro ao iniciar servidor:', error);
        process.exit(1);
    }
};
if (require.main === module) {
    startServer();
}
exports.default = app;
//# sourceMappingURL=server.js.map