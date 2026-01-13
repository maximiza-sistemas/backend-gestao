import { pool, query, transaction } from '../config/database';
import { ApiResponse, PaginationQuery, FilterQuery } from '../types';

export abstract class BaseModel {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  // Método genérico para buscar todos os registros
  async findAll(options: PaginationQuery & FilterQuery = {}): Promise<ApiResponse> {
    try {
      const {
        page = 1,
        limit = 50,
        sort = 'id',
        order = 'ASC',
        search,
        ...filters
      } = options;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      // Adiciona filtros dinâmicos
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          whereClause += ` AND ${key} = $${paramIndex}`;
          params.push(value);
          paramIndex++;
        }
      });

      // Adiciona busca se fornecida
      if (search) {
        // Assume que existe uma coluna 'name' para busca
        whereClause += ` AND (name ILIKE $${paramIndex} OR CAST(id AS TEXT) ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Query para contar total de registros
      const countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`;
      const countResult = await query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Query para buscar os dados paginados
      const offset = (page - 1) * limit;
      const dataQuery = `
        SELECT * FROM ${this.tableName} 
        ${whereClause} 
        ORDER BY ${sort} ${order} 
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const dataResult = await query(dataQuery, params);

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
    } catch (error) {
      console.error(`Erro ao buscar registros de ${this.tableName}:`, error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Método genérico para buscar por ID
  async findById(id: number): Promise<ApiResponse> {
    try {
      const result = await query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);

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
    } catch (error) {
      console.error(`Erro ao buscar registro por ID em ${this.tableName}:`, error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Método genérico para criar registro
  async create(data: any): Promise<ApiResponse> {
    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

      const queryText = `
        INSERT INTO ${this.tableName} (${fields.join(', ')}) 
        VALUES (${placeholders}) 
        RETURNING *
      `;

      const result = await query(queryText, values);

      return {
        success: true,
        data: result.rows[0],
        message: 'Registro criado com sucesso'
      };
    } catch (error: any) {
      console.error(`Erro ao criar registro em ${this.tableName}:`, error);

      // Trata erros específicos do PostgreSQL
      if (error.code === '23505') { // Violação de unique constraint
        return {
          success: false,
          error: 'Já existe um registro com estes dados'
        };
      }

      if (error.code === '23503') { // Violação de foreign key
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

  // Método genérico para atualizar registro
  async update(id: number, data: any): Promise<ApiResponse> {
    try {
      // Remove campos undefined/null
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

      const result = await query(queryText, [...values, id]);

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
    } catch (error: any) {
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

  // Método genérico para deletar registro
  async delete(id: number): Promise<ApiResponse> {
    try {
      const result = await query(`DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`, [id]);

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
    } catch (error: any) {
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

  // Método para executar query customizada
  protected async customQuery(queryText: string, params: any[] = []): Promise<ApiResponse> {
    try {
      const result = await query(queryText, params);
      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      console.error('Erro ao executar query customizada:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Método para executar transação
  protected async executeTransaction(callback: (client: any) => Promise<any>): Promise<ApiResponse> {
    try {
      const result = await transaction(callback);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Erro ao executar transação:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      };
    }
  }
}
