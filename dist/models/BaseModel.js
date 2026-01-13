"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseModel = void 0;
const database_1 = require("../config/database");
class BaseModel {
    constructor(tableName) {
        this.tableName = tableName;
    }
    async findAll(options = {}) {
        try {
            const { page = 1, limit = 50, sort = 'id', order = 'ASC', search, ...filters } = options;
            let whereClause = 'WHERE 1=1';
            const params = [];
            let paramIndex = 1;
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    whereClause += ` AND ${key} = $${paramIndex}`;
                    params.push(value);
                    paramIndex++;
                }
            });
            if (search) {
                whereClause += ` AND (name ILIKE $${paramIndex} OR CAST(id AS TEXT) ILIKE $${paramIndex})`;
                params.push(`%${search}%`);
                paramIndex++;
            }
            const countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`;
            const countResult = await (0, database_1.query)(countQuery, params);
            const total = parseInt(countResult.rows[0].total);
            const offset = (page - 1) * limit;
            const dataQuery = `
        SELECT * FROM ${this.tableName} 
        ${whereClause} 
        ORDER BY ${sort} ${order} 
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
            params.push(limit, offset);
            const dataResult = await (0, database_1.query)(dataQuery, params);
            return {
                success: true,
                data: dataResult.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        }
        catch (error) {
            console.error(`Erro ao buscar registros de ${this.tableName}:`, error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async findById(id) {
        try {
            const result = await (0, database_1.query)(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
            if (result.rows.length === 0) {
                return {
                    success: false,
                    error: 'Registro não encontrado'
                };
            }
            return {
                success: true,
                data: result.rows[0]
            };
        }
        catch (error) {
            console.error(`Erro ao buscar registro por ID em ${this.tableName}:`, error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async create(data) {
        try {
            const fields = Object.keys(data);
            const values = Object.values(data);
            const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
            const queryText = `
        INSERT INTO ${this.tableName} (${fields.join(', ')}) 
        VALUES (${placeholders}) 
        RETURNING *
      `;
            const result = await (0, database_1.query)(queryText, values);
            return {
                success: true,
                data: result.rows[0],
                message: 'Registro criado com sucesso'
            };
        }
        catch (error) {
            console.error(`Erro ao criar registro em ${this.tableName}:`, error);
            if (error.code === '23505') {
                return {
                    success: false,
                    error: 'Já existe um registro com estes dados'
                };
            }
            if (error.code === '23503') {
                return {
                    success: false,
                    error: 'Referência inválida para outro registro'
                };
            }
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async update(id, data) {
        try {
            const cleanData = Object.entries(data)
                .filter(([_, value]) => value !== undefined && value !== null)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
            if (Object.keys(cleanData).length === 0) {
                return {
                    success: false,
                    error: 'Nenhum dado válido fornecido para atualização'
                };
            }
            const fields = Object.keys(cleanData);
            const values = Object.values(cleanData);
            const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
            const queryText = `
        UPDATE ${this.tableName} 
        SET ${setClause} 
        WHERE id = $${fields.length + 1} 
        RETURNING *
      `;
            const result = await (0, database_1.query)(queryText, [...values, id]);
            if (result.rows.length === 0) {
                return {
                    success: false,
                    error: 'Registro não encontrado'
                };
            }
            return {
                success: true,
                data: result.rows[0],
                message: 'Registro atualizado com sucesso'
            };
        }
        catch (error) {
            console.error(`Erro ao atualizar registro em ${this.tableName}:`, error);
            if (error.code === '23505') {
                return {
                    success: false,
                    error: 'Já existe um registro com estes dados'
                };
            }
            if (error.code === '23503') {
                return {
                    success: false,
                    error: 'Referência inválida para outro registro'
                };
            }
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async delete(id) {
        try {
            const result = await (0, database_1.query)(`DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`, [id]);
            if (result.rows.length === 0) {
                return {
                    success: false,
                    error: 'Registro não encontrado'
                };
            }
            return {
                success: true,
                data: result.rows[0],
                message: 'Registro deletado com sucesso'
            };
        }
        catch (error) {
            console.error(`Erro ao deletar registro em ${this.tableName}:`, error);
            if (error.code === '23503') {
                return {
                    success: false,
                    error: 'Não é possível deletar: registro está sendo usado em outros locais'
                };
            }
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async customQuery(queryText, params = []) {
        try {
            const result = await (0, database_1.query)(queryText, params);
            return {
                success: true,
                data: result.rows
            };
        }
        catch (error) {
            console.error('Erro ao executar query customizada:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async executeTransaction(callback) {
        try {
            const result = await (0, database_1.transaction)(callback);
            return {
                success: true,
                data: result
            };
        }
        catch (error) {
            console.error('Erro ao executar transação:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro interno do servidor'
            };
        }
    }
}
exports.BaseModel = BaseModel;
//# sourceMappingURL=BaseModel.js.map