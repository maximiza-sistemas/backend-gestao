"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
router.post('/run-delivery-routes', async (req, res) => {
    try {
        const migrationPath = path_1.default.join(__dirname, '../database/migrations/003_add_delivery_routes.sql');
        const sql = fs_1.default.readFileSync(migrationPath, 'utf8');
        console.log('🔄 Executando migração de rotas de entrega...');
        await (0, database_1.query)(sql);
        console.log('✅ Migração executada com sucesso!');
        res.json({
            success: true,
            message: 'Migração de rotas de entrega executada com sucesso!'
        });
    }
    catch (error) {
        console.error('❌ Erro ao executar migração:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao executar migração',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
router.post('/run-financial', async (req, res) => {
    try {
        const migrationPath = path_1.default.join(__dirname, '../database/migrations/005_add_financial_tables.sql');
        const sql = fs_1.default.readFileSync(migrationPath, 'utf8');
        console.log('🔄 Executando migração do módulo financeiro...');
        await (0, database_1.query)(sql);
        console.log('✅ Migração executada com sucesso!');
        res.json({
            success: true,
            message: 'Migração do módulo financeiro executada com sucesso!'
        });
    }
    catch (error) {
        console.error('❌ Erro ao executar migração:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao executar migração',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
exports.default = router;
//# sourceMappingURL=migration.js.map