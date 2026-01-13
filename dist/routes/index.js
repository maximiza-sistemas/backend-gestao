"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const auth_2 = __importDefault(require("./auth"));
const users_1 = __importDefault(require("./users"));
const clients_1 = __importDefault(require("./clients"));
const products_1 = __importDefault(require("./products"));
const orders_1 = __importDefault(require("./orders"));
const stock_1 = __importDefault(require("./stock"));
const reports_1 = __importDefault(require("./reports"));
const dashboard_1 = __importDefault(require("./dashboard"));
const deliveryRoutes_1 = __importDefault(require("./deliveryRoutes"));
const migration_1 = __importDefault(require("./migration"));
const financial_1 = __importDefault(require("./financial"));
const fleet_1 = __importDefault(require("./fleet"));
const suppliers_1 = __importDefault(require("./suppliers"));
const containerLoans_1 = __importDefault(require("./containerLoans"));
const locations_1 = __importDefault(require("./locations"));
const router = (0, express_1.Router)();
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API da Distribuidora de Gás funcionando',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
router.use('/auth', auth_2.default);
router.use('/migration', migration_1.default);
router.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    return (0, auth_1.requireAuth)(req, res, next);
});
router.use('/users', users_1.default);
router.use('/clients', clients_1.default);
router.use('/products', products_1.default);
router.use('/orders', orders_1.default);
router.use('/stock', stock_1.default);
router.use('/reports', reports_1.default);
router.use('/dashboard', dashboard_1.default);
router.use('/delivery-routes', deliveryRoutes_1.default);
router.use('/financial', financial_1.default);
router.use('/fleet', fleet_1.default);
router.use('/suppliers', suppliers_1.default);
router.use('/container-loans', containerLoans_1.default);
router.use('/locations', locations_1.default);
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint não encontrado',
        path: req.originalUrl,
        method: req.method
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map