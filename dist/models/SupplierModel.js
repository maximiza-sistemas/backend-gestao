"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierModel = void 0;
const database_1 = require("../config/database");
class SupplierModel {
    static async query(text, params) {
        return database_1.pool.query(text, params);
    }
    static async findAll(filters) {
        let query = 'SELECT * FROM suppliers WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        if (filters) {
            if (filters.status) {
                query += ` AND status = $${paramIndex}`;
                params.push(filters.status);
                paramIndex++;
            }
            if (filters.category) {
                query += ` AND category = $${paramIndex}`;
                params.push(filters.category);
                paramIndex++;
            }
            if (filters.search) {
                query += ` AND (LOWER(name) LIKE LOWER($${paramIndex}) OR LOWER(cnpj) LIKE LOWER($${paramIndex}) OR LOWER(email) LIKE LOWER($${paramIndex}))`;
                params.push(`%${filters.search}%`);
                paramIndex++;
            }
        }
        query += ' ORDER BY name';
        const result = await this.query(query, params);
        return result.rows;
    }
    static async findById(id) {
        const result = await this.query('SELECT * FROM suppliers WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    static async findByCNPJ(cnpj) {
        const result = await this.query('SELECT * FROM suppliers WHERE cnpj = $1', [cnpj]);
        return result.rows[0] || null;
    }
    static async create(data) {
        if (data.cnpj) {
            const existing = await this.findByCNPJ(data.cnpj);
            if (existing) {
                throw new Error('CNPJ já cadastrado');
            }
        }
        const result = await this.query(`INSERT INTO suppliers (
                name, category, contact, email, address, 
                city, state, zip_code, cnpj, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`, [
            data.name,
            data.category || null,
            data.contact || null,
            data.email || null,
            data.address || null,
            data.city || null,
            data.state || null,
            data.zip_code || null,
            data.cnpj || null,
            data.status || 'Ativo'
        ]);
        return result.rows[0];
    }
    static async update(id, data) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        const updateableFields = [
            'name', 'category', 'contact', 'email', 'address',
            'city', 'state', 'zip_code', 'cnpj', 'status'
        ];
        for (const field of updateableFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = $${paramIndex}`);
                values.push(data[field]);
                paramIndex++;
            }
        }
        if (fields.length === 0) {
            throw new Error('Nenhum campo para atualizar');
        }
        if (data.cnpj) {
            const existing = await this.findByCNPJ(data.cnpj);
            if (existing && existing.id !== id) {
                throw new Error('CNPJ já cadastrado para outro fornecedor');
            }
        }
        values.push(id);
        const result = await this.query(`UPDATE suppliers SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $${paramIndex} RETURNING *`, values);
        if (result.rows.length === 0) {
            throw new Error('Fornecedor não encontrado');
        }
        return result.rows[0];
    }
    static async delete(id) {
        const result = await this.query('DELETE FROM suppliers WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            throw new Error('Fornecedor não encontrado');
        }
    }
    static async getCategories() {
        const result = await this.query('SELECT DISTINCT category FROM suppliers WHERE category IS NOT NULL ORDER BY category');
        return result.rows.map((row) => row.category);
    }
    static async count(filters) {
        let query = 'SELECT COUNT(*) FROM suppliers WHERE 1=1';
        const params = [];
        if (filters?.status) {
            query += ' AND status = $1';
            params.push(filters.status);
        }
        const result = await this.query(query, params);
        return parseInt(result.rows[0].count);
    }
    static async findPaginated(page = 1, limit = 10, filters) {
        const offset = (page - 1) * limit;
        let countQuery = 'SELECT COUNT(*) FROM suppliers WHERE 1=1';
        let dataQuery = 'SELECT * FROM suppliers WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        if (filters) {
            if (filters.status) {
                const statusFilter = ` AND status = $${paramIndex}`;
                countQuery += statusFilter;
                dataQuery += statusFilter;
                params.push(filters.status);
                paramIndex++;
            }
            if (filters.category) {
                const categoryFilter = ` AND category = $${paramIndex}`;
                countQuery += categoryFilter;
                dataQuery += categoryFilter;
                params.push(filters.category);
                paramIndex++;
            }
            if (filters.search) {
                const searchFilter = ` AND (LOWER(name) LIKE LOWER($${paramIndex}) OR LOWER(cnpj) LIKE LOWER($${paramIndex}) OR LOWER(email) LIKE LOWER($${paramIndex}))`;
                countQuery += searchFilter;
                dataQuery += searchFilter;
                params.push(`%${filters.search}%`);
                paramIndex++;
            }
        }
        const countResult = await this.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(total / limit);
        dataQuery += ` ORDER BY name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        const dataParams = [...params, limit, offset];
        const dataResult = await this.query(dataQuery, dataParams);
        return {
            data: dataResult.rows,
            total,
            totalPages
        };
    }
    static async getStatistics() {
        const statusResult = await this.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'Ativo' THEN 1 END) as active,
                COUNT(CASE WHEN status = 'Inativo' THEN 1 END) as inactive
            FROM suppliers
        `);
        const categoryResult = await this.query(`
            SELECT category, COUNT(*) as count
            FROM suppliers
            WHERE category IS NOT NULL
            GROUP BY category
            ORDER BY count DESC
        `);
        return {
            total: parseInt(statusResult.rows[0].total),
            active: parseInt(statusResult.rows[0].active),
            inactive: parseInt(statusResult.rows[0].inactive),
            byCategory: categoryResult.rows.map((row) => ({
                category: row.category,
                count: parseInt(row.count)
            }))
        };
    }
}
exports.SupplierModel = SupplierModel;
//# sourceMappingURL=SupplierModel.js.map