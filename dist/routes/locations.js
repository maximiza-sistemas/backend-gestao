"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await (0, database_1.query)(`SELECT id, name, cnpj, address, city, state, phone, status, created_at, updated_at
                 FROM locations
                 ORDER BY name`);
        res.json({
            success: true,
            data: result.rows
        });
    }
    catch (error) {
        console.error('Erro ao listar filiais:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await (0, database_1.query)('SELECT * FROM locations WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                error: 'Filial não encontrada'
            });
            return;
        }
        res.json({
            success: true,
            data: result.rows[0]
        });
    }
    catch (error) {
        console.error('Erro ao buscar filial:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { name, cnpj, address, city, state, phone } = req.body;
        if (!name) {
            res.status(400).json({
                success: false,
                error: 'Nome da filial é obrigatório'
            });
            return;
        }
        const result = await (0, database_1.query)(`INSERT INTO locations (name, cnpj, address, city, state, phone, status)
                 VALUES ($1, $2, $3, $4, $5, $6, 'Ativo')
                 RETURNING *`, [name, cnpj || null, address || null, city || null, state || null, phone || null]);
        const productsResult = await (0, database_1.query)('SELECT id FROM products WHERE status = $1', ['Ativo']);
        const locationId = result.rows[0].id;
        for (const product of productsResult.rows) {
            await (0, database_1.query)(`INSERT INTO stock (product_id, location_id, full_quantity, empty_quantity, maintenance_quantity, min_stock_level, max_stock_level)
                     VALUES ($1, $2, 0, 0, 0, 10, 100)
                     ON CONFLICT (product_id, location_id) DO NOTHING`, [product.id, locationId]);
        }
        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Filial cadastrada com sucesso'
        });
    }
    catch (error) {
        console.error('Erro ao criar filial:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.put('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, cnpj, address, city, state, phone, status } = req.body;
        const result = await (0, database_1.query)(`UPDATE locations
                 SET name = COALESCE($1, name),
                     cnpj = COALESCE($2, cnpj),
                     address = COALESCE($3, address),
                     city = COALESCE($4, city),
                     state = COALESCE($5, state),
                     phone = COALESCE($6, phone),
                     status = COALESCE($7, status),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $8
                 RETURNING *`, [name, cnpj, address, city, state, phone, status, id]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                error: 'Filial não encontrada'
            });
            return;
        }
        res.json({
            success: true,
            data: result.rows[0],
            message: 'Filial atualizada com sucesso'
        });
    }
    catch (error) {
        console.error('Erro ao atualizar filial:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const stockCheck = await (0, database_1.query)(`SELECT COUNT(*) as count FROM stock WHERE location_id = $1 
                 AND (full_quantity > 0 OR empty_quantity > 0 OR maintenance_quantity > 0)`, [id]);
        if (parseInt(stockCheck.rows[0].count) > 0) {
            res.status(400).json({
                success: false,
                error: 'Não é possível excluir filial com estoque. Transfira o estoque primeiro.'
            });
            return;
        }
        await (0, database_1.query)('DELETE FROM stock WHERE location_id = $1', [id]);
        const result = await (0, database_1.query)('DELETE FROM locations WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                error: 'Filial não encontrada'
            });
            return;
        }
        res.json({
            success: true,
            message: 'Filial excluída com sucesso'
        });
    }
    catch (error) {
        console.error('Erro ao excluir filial:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.patch('/:id/toggle-status', auth_1.requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await (0, database_1.query)(`UPDATE locations
                 SET status = CASE WHEN status = 'Ativo' THEN 'Inativo' ELSE 'Ativo' END,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1
                 RETURNING *`, [id]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                error: 'Filial não encontrada'
            });
            return;
        }
        res.json({
            success: true,
            data: result.rows[0],
            message: `Filial ${result.rows[0].status === 'Ativo' ? 'ativada' : 'desativada'} com sucesso`
        });
    }
    catch (error) {
        console.error('Erro ao alternar status da filial:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
exports.default = router;
//# sourceMappingURL=locations.js.map