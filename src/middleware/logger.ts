import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { ActivityLog } from '../types';
import { query } from '../config/database';

// Configuração do Morgan para logs HTTP
export const httpLogger = morgan('combined', {
  // Só loga se não for ambiente de teste
  skip: (req, res) => process.env.NODE_ENV === 'test'
});

// Middleware para log de atividades do usuário
export const activityLogger = (action: string, tableName?: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Salva a função original de json para interceptar a resposta
    const originalJson = res.json;
    
    res.json = function(body: any) {
      // Se a operação foi bem-sucedida e temos um usuário logado
      if (body.success && req.user) {
        // Log assíncrono para não afetar a performance
        setImmediate(async () => {
          try {
            const recordId = body.data?.id || null;
            const userAgent = req.get('User-Agent') || null;
            const ipAddress = req.ip || req.connection.remoteAddress || null;

            await query(
              `INSERT INTO activity_logs (user_id, action, table_name, record_id, ip_address, user_agent) 
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [req.user!.id, action, tableName, recordId, ipAddress, userAgent]
            );
          } catch (error) {
            console.error('Erro ao salvar log de atividade:', error);
          }
        });
      }
      
      // Chama o método original
      return originalJson.call(this, body);
    };

    next();
  };
};

// Middleware para log de erros
export const errorLogger = (err: any, req: Request, res: Response, next: NextFunction): void => {
  // Log do erro
  console.error('Erro na aplicação:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user ? `${req.user.id} (${req.user.email})` : 'Não autenticado',
    timestamp: new Date().toISOString()
  });

  // Log assíncrono no banco se temos usuário
  if (req.user) {
    setImmediate(async () => {
      try {
        await query(
          `INSERT INTO activity_logs (user_id, action, ip_address, user_agent) 
           VALUES ($1, $2, $3, $4)`,
          [
            req.user!.id, 
            `Erro: ${err.message}`, 
            req.ip || req.connection.remoteAddress, 
            req.get('User-Agent')
          ]
        );
      } catch (logError) {
        console.error('Erro ao salvar log de erro:', logError);
      }
    });
  }

  next(err);
};

// Função para buscar logs de atividade
export const getActivityLogs = async (options: {
  userId?: number;
  page?: number;
  limit?: number;
  dateFrom?: Date;
  dateTo?: Date;
}): Promise<{ success: boolean; data?: ActivityLog[]; pagination?: any; error?: string }> => {
  try {
    const {
      userId,
      page = 1,
      limit = 50,
      dateFrom,
      dateTo
    } = options;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (userId) {
      whereClause += ` AND al.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (dateFrom) {
      whereClause += ` AND al.created_at >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereClause += ` AND al.created_at <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    // Contar total
    const countQuery = `SELECT COUNT(*) as total FROM activity_logs al ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Buscar dados
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT 
        al.*,
        u.name as user_name,
        u.email as user_email
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
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
    console.error('Erro ao buscar logs de atividade:', error);
    return {
      success: false,
      error: 'Erro interno do servidor'
    };
  }
};

// Função para limpar logs antigos (executar periodicamente)
export const cleanOldLogs = async (daysToKeep: number = 90): Promise<void> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await query(
      'DELETE FROM activity_logs WHERE created_at < $1',
      [cutoffDate]
    );

    console.log(`Limpeza de logs: ${result.rowCount} registros removidos`);
  } catch (error) {
    console.error('Erro ao limpar logs antigos:', error);
  }
};
